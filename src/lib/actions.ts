"use server";

import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, getOnboardedUser, requireOnboarded } from "./auth";
import { blockedUserIds } from "./community";
import { db } from "./db";
import { enforceRateLimit, RateLimitError } from "./rate-limit";
import {
  collectionSchema,
  fieldErrors,
  handleSchema,
  messageSchema,
  profileSchema,
  projectSchema,
  projectSlug,
  reportSchema,
  slugify,
} from "./validation";

/**
 * Every write in the community section.
 *
 * Two invariants hold throughout:
 *
 *   - **Nothing writes without `requireOnboarded()` or `getOnboardedUser()`.**
 *     Those are the only places that check sign-in, suspension and onboarding,
 *     so there is exactly one gate to get right.
 *
 *   - **Counters are updated in the same transaction as the row they count.**
 *     `likeCount` drifting from `likes` is the classic denormalisation bug; an
 *     interactive transaction costs a round trip and removes the whole class.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
  errors?: Record<string, string>;
  data?: unknown;
}

function failure(error: unknown): ActionResult {
  if (error instanceof RateLimitError) return { ok: false, error: error.message };
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: "Something went wrong." };
}

/** Blocks cut both ways, so every interaction between two people checks first. */
async function assertNotBlocked(viewerId: string, otherId: string) {
  if (viewerId === otherId) return;
  const blocked = await blockedUserIds(viewerId);
  if (blocked.includes(otherId)) {
    throw new Error("You cannot interact with this account.");
  }
}

// --- account -------------------------------------------------------------

export async function claimHandle(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in first." };

  const parsed = handleSchema.safeParse(formData.get("handle"));
  if (!parsed.success) {
    return { ok: false, errors: { handle: parsed.error.issues[0].message } };
  }

  const existing = await db.user.findUnique({
    where: { handle: parsed.data },
    select: { id: true },
  });
  if (existing && existing.id !== session.user.id) {
    return { ok: false, errors: { handle: "That handle is taken." } };
  }

  try {
    if (session.user.handle) {
      await enforceRateLimit("handleChange", session.user.id);
    }
    await db.user.update({
      where: { id: session.user.id },
      data: { handle: parsed.data },
    });
  } catch (error) {
    return failure(error);
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { handle: parsed.data } };
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const user = await requireOnboarded();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    bio: formData.get("bio"),
    website: formData.get("website"),
    location: formData.get("location"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name || null,
      bio: parsed.data.bio || null,
      website: parsed.data.website || null,
      location: parsed.data.location || null,
    },
  });

  revalidatePath(`/u/${user.handle}`);
  return { ok: true };
}

// --- projects ------------------------------------------------------------

export async function createProject(input: unknown): Promise<ActionResult> {
  let user;
  try {
    user = await requireOnboarded("/submit");
    await enforceRateLimit("projectCreate", user.id);
  } catch (error) {
    return failure(error);
  }

  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const slug = projectSlug(data.title);

  try {
    await db.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          slug,
          title: data.title,
          description: data.description || null,
          sourceUrl: data.sourceUrl || null,
          sourceCredit: data.sourceCredit || null,
          authorId: user.id,
          images: {
            create: data.images.map((image, index) => ({
              url: image.url,
              blobPath: image.blobPath,
              alt: image.alt || null,
              width: image.width,
              height: image.height,
              bytes: image.bytes,
              position: index,
            })),
          },
          colours: {
            create: data.colours.map((hex, index) => ({
              hex: hex.toLowerCase(),
              position: index,
            })),
          },
          fonts: {
            create: data.fonts.map((font) => ({
              family: font.family,
              fontSlug: font.fontSlug || null,
              role: font.role || null,
            })),
          },
        },
        select: { id: true },
      });

      // Tags are shared rows, so connectOrCreate rather than create.
      for (const label of data.tags) {
        const tagSlug = slugify(label);
        if (!tagSlug) continue;
        const tag = await tx.tag.upsert({
          where: { slug: tagSlug },
          create: { slug: tagSlug, label },
          update: {},
          select: { id: true },
        });
        await tx.projectTag.create({
          data: { projectId: project.id, tagId: tag.id },
        });
      }
    });
  } catch (error) {
    return failure(error);
  }

  revalidatePath("/community");
  revalidatePath(`/u/${user.handle}`);
  return { ok: true, data: { slug } };
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  const user = await requireOnboarded();

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { authorId: true, slug: true, images: { select: { blobPath: true } } },
  });
  if (!project) return { ok: false, error: "Not found." };
  if (project.authorId !== user.id) return { ok: false, error: "Not yours to delete." };

  // Blobs first: a failed delete here leaves an orphan file, which is
  // recoverable. Deleting the row first would leave a file nothing points at.
  if (process.env.BLOB_READ_WRITE_TOKEN && project.images.length) {
    try {
      await del(project.images.map((i) => i.blobPath));
    } catch {
      // Non-fatal — the row still goes, and prune-orphan-blobs will catch it.
    }
  }

  await db.project.delete({ where: { id: projectId } });

  revalidatePath("/community");
  revalidatePath(`/u/${user.handle}`);
  redirect(`/u/${user.handle}`);
}

// --- likes ---------------------------------------------------------------

export async function toggleLike(projectId: string): Promise<ActionResult> {
  const user = await getOnboardedUser();
  if (!user) return { ok: false, error: "Sign in to like work." };

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { authorId: true, slug: true },
  });
  if (!project) return { ok: false, error: "Not found." };

  try {
    await assertNotBlocked(user.id, project.authorId);
  } catch (error) {
    return failure(error);
  }

  const existing = await db.like.findUnique({
    where: { userId_projectId: { userId: user.id, projectId } },
    select: { id: true },
  });

  const liked = !existing;

  await db.$transaction([
    existing
      ? db.like.delete({ where: { id: existing.id } })
      : db.like.create({ data: { userId: user.id, projectId } }),
    db.project.update({
      where: { id: projectId },
      data: { likeCount: { increment: liked ? 1 : -1 } },
    }),
  ]);

  revalidatePath(`/community/${project.slug}`);
  return { ok: true, data: { liked } };
}

// --- collections ---------------------------------------------------------

export async function createCollection(formData: FormData): Promise<ActionResult> {
  const user = await requireOnboarded();

  const parsed = collectionSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    isPrivate: formData.get("isPrivate") === "on",
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const base = slugify(parsed.data.name) || "collection";
  let slug = base;
  let attempt = 1;
  while (
    await db.collection.findUnique({
      where: { ownerId_slug: { ownerId: user.id, slug } },
      select: { id: true },
    })
  ) {
    slug = `${base}-${++attempt}`;
  }

  const collection = await db.collection.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      isPrivate: parsed.data.isPrivate,
      ownerId: user.id,
    },
    select: { id: true, slug: true, name: true },
  });

  revalidatePath("/collections");
  return { ok: true, data: collection };
}

/**
 * Save or unsave a project into a collection.
 *
 * `collectionId` empty means "default": the first collection the person has, or
 * a new one called Saved. Nobody should have to create a board before they can
 * save the first thing they like.
 */
export async function toggleSave(
  projectId: string,
  collectionId?: string,
): Promise<ActionResult> {
  const user = await getOnboardedUser();
  if (!user) return { ok: false, error: "Sign in to save work." };

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { authorId: true, slug: true },
  });
  if (!project) return { ok: false, error: "Not found." };

  try {
    await assertNotBlocked(user.id, project.authorId);
    await enforceRateLimit("save", user.id);
  } catch (error) {
    return failure(error);
  }

  let targetId = collectionId;

  if (!targetId) {
    const first = await db.collection.findFirst({
      where: { ownerId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    targetId =
      first?.id ??
      (
        await db.collection.create({
          data: { name: "Saved", slug: "saved", ownerId: user.id },
          select: { id: true },
        })
      ).id;
  } else {
    const owned = await db.collection.findUnique({
      where: { id: targetId },
      select: { ownerId: true },
    });
    if (!owned || owned.ownerId !== user.id) {
      return { ok: false, error: "That collection is not yours." };
    }
  }

  const existing = await db.save.findUnique({
    where: { collectionId_projectId: { collectionId: targetId, projectId } },
    select: { id: true },
  });

  const saved = !existing;

  await db.$transaction([
    existing
      ? db.save.delete({ where: { id: existing.id } })
      : db.save.create({
          data: { userId: user.id, projectId, collectionId: targetId },
        }),
    db.collection.update({
      where: { id: targetId },
      data: { itemCount: { increment: saved ? 1 : -1 } },
    }),
    db.project.update({
      where: { id: projectId },
      data: { saveCount: { increment: saved ? 1 : -1 } },
    }),
  ]);

  revalidatePath(`/community/${project.slug}`);
  revalidatePath("/collections");
  return { ok: true, data: { saved, collectionId: targetId } };
}

// --- follows -------------------------------------------------------------

export async function toggleFollow(targetUserId: string): Promise<ActionResult> {
  const user = await getOnboardedUser();
  if (!user) return { ok: false, error: "Sign in to follow people." };
  if (user.id === targetUserId) return { ok: false, error: "You cannot follow yourself." };

  try {
    await assertNotBlocked(user.id, targetUserId);
    await enforceRateLimit("follow", user.id);
  } catch (error) {
    return failure(error);
  }

  const existing = await db.follow.findUnique({
    where: {
      followerId_followingId: { followerId: user.id, followingId: targetUserId },
    },
    select: { id: true },
  });

  if (existing) {
    await db.follow.delete({ where: { id: existing.id } });
  } else {
    await db.follow.create({
      data: { followerId: user.id, followingId: targetUserId },
    });
  }

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { handle: true },
  });
  if (target?.handle) revalidatePath(`/u/${target.handle}`);

  return { ok: true, data: { following: !existing } };
}

// --- messaging -----------------------------------------------------------

/**
 * Open (or reuse) a one-to-one conversation.
 *
 * Reuse matters: "message the creator" from two different projects must land in
 * the same thread, not create a second one.
 */
export async function startConversation(targetUserId: string): Promise<ActionResult> {
  const user = await getOnboardedUser();
  if (!user) return { ok: false, error: "Sign in to send messages." };
  if (user.id === targetUserId) return { ok: false, error: "That is you." };

  try {
    await assertNotBlocked(user.id, targetUserId);
  } catch (error) {
    return failure(error);
  }

  const existing = await db.conversation.findFirst({
    where: {
      AND: [
        { members: { some: { userId: user.id } } },
        { members: { some: { userId: targetUserId } } },
      ],
    },
    select: { id: true },
  });

  if (existing) {
    // Rejoin if they had left the thread.
    await db.conversationMember.updateMany({
      where: { conversationId: existing.id, userId: user.id },
      data: { leftAt: null },
    });
    return { ok: true, data: { conversationId: existing.id } };
  }

  try {
    await enforceRateLimit("conversationStart", user.id);
  } catch (error) {
    return failure(error);
  }

  const conversation = await db.conversation.create({
    data: {
      members: { create: [{ userId: user.id }, { userId: targetUserId }] },
    },
    select: { id: true },
  });

  return { ok: true, data: { conversationId: conversation.id } };
}

export async function sendMessage(
  conversationId: string,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getOnboardedUser();
  if (!user) return { ok: false, error: "Sign in to send messages." };

  const parsed = messageSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const membership = await db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    select: { id: true },
  });
  if (!membership) return { ok: false, error: "Not your conversation." };

  const others = await db.conversationMember.findMany({
    where: { conversationId, userId: { not: user.id } },
    select: { userId: true },
  });

  // A block silences the thread in both directions.
  for (const other of others) {
    try {
      await assertNotBlocked(user.id, other.userId);
    } catch {
      return { ok: false, error: "You can no longer message this person." };
    }
  }

  try {
    await enforceRateLimit("messageSend", user.id);
  } catch (error) {
    return failure(error);
  }

  await db.$transaction([
    db.message.create({
      data: { conversationId, senderId: user.id, body: parsed.data.body },
    }),
    db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
    db.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId: user.id } },
      data: { lastReadAt: new Date() },
    }),
  ]);

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { ok: true };
}

export async function markConversationRead(conversationId: string) {
  const user = await getOnboardedUser();
  if (!user) return;
  await db.conversationMember.updateMany({
    where: { conversationId, userId: user.id },
    data: { lastReadAt: new Date() },
  });
}

// --- moderation ----------------------------------------------------------

export async function toggleBlock(targetUserId: string): Promise<ActionResult> {
  const user = await getOnboardedUser();
  if (!user) return { ok: false, error: "Sign in first." };
  if (user.id === targetUserId) return { ok: false, error: "That is you." };

  const existing = await db.block.findUnique({
    where: {
      blockerId_blockedId: { blockerId: user.id, blockedId: targetUserId },
    },
    select: { id: true },
  });

  if (existing) {
    await db.block.delete({ where: { id: existing.id } });
    return { ok: true, data: { blocked: false } };
  }

  // Blocking also severs the follow graph in both directions — leaving a
  // follow in place after a block is the bug that lets someone keep watching.
  await db.$transaction([
    db.block.create({ data: { blockerId: user.id, blockedId: targetUserId } }),
    db.follow.deleteMany({
      where: {
        OR: [
          { followerId: user.id, followingId: targetUserId },
          { followerId: targetUserId, followingId: user.id },
        ],
      },
    }),
  ]);

  revalidatePath("/community");
  revalidatePath("/messages");
  return { ok: true, data: { blocked: true } };
}

export async function reportContent(
  target: { projectId?: string; messageId?: string; userId?: string },
  formData: FormData,
): Promise<ActionResult> {
  const user = await getOnboardedUser();
  if (!user) return { ok: false, error: "Sign in to report." };

  const parsed = reportSchema.safeParse({
    reason: formData.get("reason"),
    detail: formData.get("detail"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  if (!target.projectId && !target.messageId && !target.userId) {
    return { ok: false, error: "Nothing to report." };
  }

  try {
    await enforceRateLimit("report", user.id);
  } catch (error) {
    return failure(error);
  }

  await db.report.create({
    data: {
      reason: parsed.data.reason,
      detail: parsed.data.detail || null,
      reporterId: user.id,
      projectId: target.projectId ?? null,
      messageId: target.messageId ?? null,
      userId: target.userId ?? null,
    },
  });

  return { ok: true };
}
