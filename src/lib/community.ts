import "server-only";

import { db } from "./db";

/**
 * Read queries for the community section.
 *
 * Two rules run through all of it:
 *
 * 1. **Blocks are applied at the query, not in the template.** If A blocks B,
 *    B's work must not appear in A's feed, A's work must not appear in B's, and
 *    neither can open the other's profile. Filtering after fetching means the
 *    row still travelled, and one forgotten `.filter()` leaks it.
 *
 * 2. **Removed content stays queryable by its author and by moderators, and by
 *    nobody else.** Deleting outright would leave open reports pointing at
 *    nothing.
 */

/** Both directions: people I blocked, and people who blocked me. */
export async function blockedUserIds(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const rows = await db.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.blockerId === userId ? row.blockedId : row.blockerId);
  }
  return [...ids];
}

export const PROJECT_CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  likeCount: true,
  saveCount: true,
  publishedAt: true,
  author: { select: { id: true, handle: true, name: true, image: true } },
  images: {
    select: { url: true, alt: true, width: true, height: true },
    orderBy: { position: "asc" },
    take: 1,
  },
  colours: { select: { hex: true }, orderBy: { position: "asc" }, take: 5 },
  fonts: { select: { family: true, fontSlug: true }, take: 3 },
} as const;

export type FeedSort = "recent" | "popular" | "following";

export interface FeedOptions {
  sort?: FeedSort;
  tag?: string;
  fontSlug?: string;
  q?: string;
  viewerId?: string | null;
  cursor?: string;
  take?: number;
}

export async function getFeed({
  sort = "recent",
  tag,
  fontSlug,
  q,
  viewerId = null,
  cursor,
  take = 24,
}: FeedOptions) {
  const excluded = await blockedUserIds(viewerId);

  let followingIds: string[] | undefined;
  if (sort === "following") {
    if (!viewerId) return { projects: [], nextCursor: null };
    const follows = await db.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    followingIds = follows.map((f) => f.followingId);
    if (followingIds.length === 0) return { projects: [], nextCursor: null };
  }

  const projects = await db.project.findMany({
    where: {
      status: "PUBLISHED",
      ...(excluded.length ? { authorId: { notIn: excluded } } : {}),
      ...(followingIds ? { authorId: { in: followingIds } } : {}),
      ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
      ...(fontSlug ? { fonts: { some: { fontSlug } } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { fonts: { some: { family: { contains: q, mode: "insensitive" as const } } } },
            ],
          }
        : {}),
    },
    select: PROJECT_CARD_SELECT,
    orderBy:
      sort === "popular"
        ? [{ likeCount: "desc" }, { publishedAt: "desc" }]
        : [{ publishedAt: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = projects.length > take;
  return {
    projects: hasMore ? projects.slice(0, take) : projects,
    nextCursor: hasMore ? projects[take - 1].id : null,
  };
}

export async function getProject(slug: string, viewerId: string | null) {
  const project = await db.project.findUnique({
    where: { slug },
    include: {
      author: {
        select: {
          id: true,
          handle: true,
          name: true,
          image: true,
          bio: true,
          website: true,
        },
      },
      images: { orderBy: { position: "asc" } },
      colours: { orderBy: { position: "asc" } },
      fonts: true,
      tags: { include: { tag: true } },
    },
  });

  if (!project) return null;

  // Removed content: visible to its author only, so an appeal has something
  // to look at. Everyone else gets a 404, not a "this was removed" page —
  // that would leak the existence of the post.
  if (project.status === "REMOVED" && project.authorId !== viewerId) return null;
  if (project.status === "DRAFT" && project.authorId !== viewerId) return null;

  if (viewerId && viewerId !== project.authorId) {
    const blocked = await blockedUserIds(viewerId);
    if (blocked.includes(project.authorId)) return null;
  }

  return project;
}

/** Viewer-specific state for a project: liked, saved, following the author. */
export async function getViewerState(projectId: string, authorId: string, viewerId: string | null) {
  if (!viewerId) {
    return { liked: false, savedIn: [] as string[], following: false, isAuthor: false };
  }
  const [like, saves, follow] = await Promise.all([
    db.like.findUnique({
      where: { userId_projectId: { userId: viewerId, projectId } },
      select: { id: true },
    }),
    db.save.findMany({
      where: { userId: viewerId, projectId },
      select: { collectionId: true },
    }),
    viewerId === authorId
      ? Promise.resolve(null)
      : db.follow.findUnique({
          where: {
            followerId_followingId: { followerId: viewerId, followingId: authorId },
          },
          select: { id: true },
        }),
  ]);

  return {
    liked: Boolean(like),
    savedIn: saves.map((s) => s.collectionId),
    following: Boolean(follow),
    isAuthor: viewerId === authorId,
  };
}

export async function getProfile(handle: string, viewerId: string | null) {
  const user = await db.user.findUnique({
    where: { handle },
    select: {
      id: true,
      handle: true,
      name: true,
      image: true,
      bio: true,
      website: true,
      location: true,
      createdAt: true,
      suspendedAt: true,
      _count: { select: { projects: true, followers: true, following: true } },
    },
  });

  if (!user) return null;

  if (viewerId && viewerId !== user.id) {
    const blocked = await blockedUserIds(viewerId);
    if (blocked.includes(user.id)) return null;
  }

  return user;
}

export async function getUserProjects(userId: string, viewerId: string | null) {
  return db.project.findMany({
    where: {
      authorId: userId,
      // The author sees their own drafts and removed posts; nobody else does.
      ...(viewerId === userId ? {} : { status: "PUBLISHED" }),
    },
    select: { ...PROJECT_CARD_SELECT, status: true },
    orderBy: { publishedAt: "desc" },
    take: 48,
  });
}

export async function getCollections(ownerId: string, viewerId: string | null) {
  return db.collection.findMany({
    where: {
      ownerId,
      ...(viewerId === ownerId ? {} : { isPrivate: false }),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isPrivate: true,
      itemCount: true,
      updatedAt: true,
      saves: {
        select: {
          project: {
            select: {
              slug: true,
              images: {
                select: { url: true, alt: true },
                orderBy: { position: "asc" },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 4,
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCollection(
  ownerHandle: string,
  slug: string,
  viewerId: string | null,
) {
  const collection = await db.collection.findFirst({
    where: { slug, owner: { handle: ownerHandle } },
    include: {
      owner: { select: { id: true, handle: true, name: true, image: true } },
      saves: {
        include: { project: { select: PROJECT_CARD_SELECT } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!collection) return null;
  if (collection.isPrivate && collection.ownerId !== viewerId) return null;

  const excluded = await blockedUserIds(viewerId);
  if (excluded.length) {
    collection.saves = collection.saves.filter(
      (save) => !excluded.includes(save.project.author.id),
    );
  }

  return collection;
}

// --- messaging -----------------------------------------------------------

export async function getConversations(userId: string) {
  const memberships = await db.conversationMember.findMany({
    where: { userId, leftAt: null },
    select: {
      lastReadAt: true,
      conversation: {
        select: {
          id: true,
          lastMessageAt: true,
          members: {
            where: { userId: { not: userId } },
            select: {
              user: { select: { id: true, handle: true, name: true, image: true } },
            },
          },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, createdAt: true, senderId: true },
          },
        },
      },
    },
    orderBy: { conversation: { lastMessageAt: "desc" } },
  });

  const excluded = await blockedUserIds(userId);

  return memberships
    .filter((m) => {
      const other = m.conversation.members[0]?.user;
      return other && !excluded.includes(other.id);
    })
    .map((m) => {
      const latest = m.conversation.messages[0] ?? null;
      return {
        id: m.conversation.id,
        other: m.conversation.members[0].user,
        lastMessage: latest,
        lastMessageAt: m.conversation.lastMessageAt,
        unread: Boolean(
          latest &&
            latest.senderId !== userId &&
            (!m.lastReadAt || latest.createdAt > m.lastReadAt),
        ),
      };
    });
}

export async function getConversation(conversationId: string, userId: string) {
  const membership = await db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { id: true },
  });
  if (!membership) return null;

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      members: {
        select: {
          userId: true,
          user: { select: { id: true, handle: true, name: true, image: true } },
        },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: 200,
        select: {
          id: true,
          body: true,
          createdAt: true,
          senderId: true,
        },
      },
    },
  });

  if (!conversation) return null;

  const other = conversation.members.find((m) => m.userId !== userId)?.user ?? null;
  if (!other) return null;

  const blocked = await blockedUserIds(userId);

  return {
    id: conversation.id,
    other,
    messages: conversation.messages,
    // The thread stays readable after a block; it just cannot be replied to.
    isBlocked: blocked.includes(other.id),
  };
}

export async function unreadCount(userId: string): Promise<number> {
  const conversations = await getConversations(userId);
  return conversations.filter((c) => c.unread).length;
}
