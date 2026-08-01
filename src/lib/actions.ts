"use server";

import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, getOnboardedUser, requireOnboarded } from "./auth";
import { hasBlobStore } from "./blob";
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

/**
 * Turn submitted handles into real account ids.
 *
 * Silently drops anything that is not a real account, the author themselves
 * (they are already the author) and anyone either party has blocked. Tagging is
 * a way to put your name on someone else's page, so it must not be usable to
 * reach across a block.
 */
async function resolveCredits(
  credits: { handle: string; role?: string }[],
  authorId: string,
): Promise<{ userId: string; role: string | null }[]> {
  if (credits.length === 0) return [];

  const handles = [
    ...new Set(credits.map((c) => c.handle.trim().replace(/^@/, "").toLowerCase())),
  ].filter(Boolean);
  if (handles.length === 0) return [];

  const [users, blocked] = await Promise.all([
    db.user.findMany({
      where: { handle: { in: handles }, suspendedAt: null },
      select: { id: true, handle: true },
    }),
    blockedUserIds(authorId),
  ]);

  const byHandle = new Map(users.map((u) => [u.handle!.toLowerCase(), u.id]));
  const seen = new Set<string>();
  const out: { userId: string; role: string | null }[] = [];

  for (const credit of credits) {
    const key = credit.handle.trim().replace(/^@/, "").toLowerCase();
    const userId = byHandle.get(key);
    if (!userId) continue;
    if (userId === authorId) continue;
    if (blocked.includes(userId)) continue;
    if (seen.has(userId)) continue;
    seen.add(userId);
    out.push({ userId, role: credit.role?.trim() || null });
  }

  return out;
}

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
    // Tags are shared rows across projects, so they are resolved before the
    // project is created and then connected to it.
    //
    // This deliberately does NOT run inside an interactive transaction.
    // Neon's pooled connection string puts PgBouncer in transaction-pooling
    // mode in front of Postgres, where consecutive statements can land on
    // different backend connections — so Prisma's interactive transactions
    // fail with "Transaction not found". A single nested `create` is one
    // statement and atomic on its own, which is all this needs.
    const tagIds: string[] = [];
    for (const label of data.tags) {
      const tagSlug = slugify(label);
      if (!tagSlug) continue;
      const tag = await db.tag.upsert({
        where: { slug: tagSlug },
        create: { slug: tagSlug, label },
        update: {},
        select: { id: true },
      });
      tagIds.push(tag.id);
    }

    const creditUserIds = await resolveCredits(data.credits, user.id);

    await db.project.create({
      data: {
        slug,
        title: data.title,
        description: data.description || null,
        sourceUrl: data.sourceUrl || null,
        sourceCredit: data.sourceCredit || null,
        authorId: user.id,
        credits: {
          create: creditUserIds.map((c) => ({ userId: c.userId, role: c.role })),
        },
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
        tags: {
          create: [...new Set(tagIds)].map((tagId) => ({ tagId })),
        },
      },
      select: { id: true },
    });
  } catch (error) {
    return failure(error);
  }

  revalidatePath("/community");
  revalidatePath(`/u/${user.handle}`);
  return { ok: true, data: { slug } };
}

/**
 * Edit a project.
 *
 * Children (images, colours, fonts, tags, credits) are replaced wholesale
 * rather than diffed: the form always submits the complete intended state, and
 * a delete-then-recreate is both simpler to reason about and impossible to get
 * subtly wrong. The slug never changes, so existing links keep working.
 *
 * Images removed in the editor have their blobs deleted too — otherwise every
 * edit leaks storage.
 */
export async function updateProject(
  projectId: string,
  input: unknown,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireOnboarded();
  } catch (error) {
    return failure(error);
  }

  const existing = await db.project.findUnique({
    where: { id: projectId },
    select: {
      authorId: true,
      slug: true,
      status: true,
      images: { select: { blobPath: true } },
    },
  });
  if (!existing) return { ok: false, error: "Not found." };
  if (existing.authorId !== user.id) {
    return { ok: false, error: "Not yours to edit." };
  }
  if (existing.status === "REMOVED") {
    return { ok: false, error: "A moderator removed this post; it cannot be edited." };
  }

  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  try {
    const tagIds: string[] = [];
    for (const label of data.tags) {
      const tagSlug = slugify(label);
      if (!tagSlug) continue;
      const tag = await db.tag.upsert({
        where: { slug: tagSlug },
        create: { slug: tagSlug, label },
        update: {},
        select: { id: true },
      });
      tagIds.push(tag.id);
    }

    const creditUserIds = await resolveCredits(data.credits, user.id);

    await db.project.update({
      where: { id: projectId },
      data: {
        title: data.title,
        description: data.description || null,
        sourceUrl: data.sourceUrl || null,
        sourceCredit: data.sourceCredit || null,
        images: {
          deleteMany: {},
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
          deleteMany: {},
          create: data.colours.map((hex, index) => ({
            hex: hex.toLowerCase(),
            position: index,
          })),
        },
        fonts: {
          deleteMany: {},
          create: data.fonts.map((font) => ({
            family: font.family,
            fontSlug: font.fontSlug || null,
            role: font.role || null,
          })),
        },
        tags: {
          deleteMany: {},
          create: [...new Set(tagIds)].map((tagId) => ({ tagId })),
        },
        credits: {
          deleteMany: {},
          create: creditUserIds.map((c) => ({ userId: c.userId, role: c.role })),
        },
      },
    });

    // Blobs for images the editor dropped. Done after the row is consistent,
    // so a storage failure never leaves the post pointing at a deleted file.
    const keptPaths = new Set(data.images.map((i) => i.blobPath));
    const orphaned = existing.images
      .map((i) => i.blobPath)
      .filter((path) => !keptPaths.has(path));
    if (hasBlobStore() && orphaned.length) {
      try {
        await del(orphaned);
      } catch {
        // Non-fatal; prune-orphan-blobs picks these up.
      }
    }
  } catch (error) {
    return failure(error);
  }

  revalidatePath(`/community/${existing.slug}`);
  revalidatePath("/community");
  revalidatePath(`/u/${user.handle}`);
  return { ok: true, data: { slug: existing.slug } };
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
  if (hasBlobStore() && project.images.length) {
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

// --- reposts -------------------------------------------------------------

/**
 * Repost or un-repost someone's project.
 *
 * A repost points at the original — it never copies the images or the author,
 * so the credit cannot drift and there is only ever one canonical page for a
 * piece of work. Reposting your own project is refused: it is an endorsement of
 * someone else, and self-reposting is just a way to jump the feed twice.
 */
export async function toggleRepost(
  projectId: string,
  comment?: string,
): Promise<ActionResult> {
  const user = await getOnboardedUser();
  if (!user) return { ok: false, error: "Sign in to repost." };

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { authorId: true, slug: true, status: true },
  });
  if (!project) return { ok: false, error: "Not found." };
  if (project.status !== "PUBLISHED") {
    return { ok: false, error: "That post is not available." };
  }
  if (project.authorId === user.id) {
    return { ok: false, error: "You cannot repost your own work." };
  }

  try {
    await assertNotBlocked(user.id, project.authorId);
    await enforceRateLimit("repost", user.id);
  } catch (error) {
    return failure(error);
  }

  const existing = await db.repost.findUnique({
    where: { userId_projectId: { userId: user.id, projectId } },
    select: { id: true },
  });

  const reposted = !existing;
  const trimmed = comment?.trim().slice(0, 280) || null;

  await db.$transaction([
    existing
      ? db.repost.delete({ where: { id: existing.id } })
      : db.repost.create({
          data: { userId: user.id, projectId, comment: trimmed },
        }),
    db.project.update({
      where: { id: projectId },
      data: { repostCount: { increment: reposted ? 1 : -1 } },
    }),
  ]);

  revalidatePath(`/community/${project.slug}`);
  revalidatePath("/community");
  revalidatePath(`/u/${user.handle}`);
  return { ok: true, data: { reposted } };
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
 * Create a folder and drop a project straight into it.
 *
 * The save menu needs this because the alternative is leaving the page to make
 * a folder and coming back — which is exactly the moment someone gives up and
 * the save never happens. Naming and saving are one action.
 */
export async function createCollectionAndSave(
  projectId: string,
  name: string,
  isPrivate = false,
): Promise<ActionResult> {
  const user = await getOnboardedUser();
  if (!user) return { ok: false, error: "Sign in to save work." };

  const parsed = collectionSchema.safeParse({ name, description: "", isPrivate });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

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
      isPrivate: parsed.data.isPrivate,
      ownerId: user.id,
      itemCount: 1,
      saves: { create: { userId: user.id, projectId } },
    },
    select: { id: true, name: true, isPrivate: true },
  });

  await db.project.update({
    where: { id: projectId },
    data: { saveCount: { increment: 1 } },
  });

  revalidatePath(`/community/${project.slug}`);
  revalidatePath("/collections");
  return { ok: true, data: { collection } };
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
