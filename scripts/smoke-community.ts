/**
 * Community smoke test.
 *
 * Exercises the invariants that are easy to get wrong and expensive to find in
 * production: block filtering happening inside the query, denormalised counters
 * staying in step with the rows they count, and conversations being reused
 * rather than duplicated.
 *
 * Runs against whatever DATABASE_URL points at and cleans up after itself.
 * Never point it at production.
 *
 *   DATABASE_URL=postgresql://…/baseline_dev npx tsx scripts/smoke-community.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
if (/neon\.tech|vercel|amazonaws/.test(connectionString)) {
  console.error("Refusing to run against what looks like a hosted database.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}`, detail === undefined ? "" : detail);
  }
}

const TAG = `smoke-${Date.now()}`;

async function main() {
  console.log("→ creating fixtures");

  const [alice, bob, mallory] = await Promise.all(
    ["alice", "bob", "mallory"].map((name) =>
      db.user.create({
        data: {
          email: `${name}-${TAG}@example.test`,
          handle: `${name}-${TAG}`.slice(0, 24),
          name: name[0].toUpperCase() + name.slice(1),
        },
      }),
    ),
  );

  const aliceProject = await db.project.create({
    data: {
      slug: `alice-${TAG}`,
      title: "Alice's poster",
      authorId: alice.id,
      images: {
        create: {
          url: "https://example.test/a.png",
          blobPath: `p/${TAG}/a.png`,
          width: 1200,
          height: 800,
          bytes: 1000,
        },
      },
      colours: { create: [{ hex: "#3d5afe", position: 0 }] },
      fonts: { create: [{ family: "Inter", fontSlug: "inter", role: "body" }] },
    },
  });

  const malloryProject = await db.project.create({
    data: {
      slug: `mallory-${TAG}`,
      title: "Mallory's poster",
      authorId: mallory.id,
      images: {
        create: {
          url: "https://example.test/m.png",
          blobPath: `p/${TAG}/m.png`,
          width: 1000,
          height: 1000,
          bytes: 900,
        },
      },
    },
  });

  // --- blocks ------------------------------------------------------------
  console.log("→ blocks");

  await db.block.create({ data: { blockerId: alice.id, blockedId: mallory.id } });

  const blockRows = await db.block.findMany({
    where: { OR: [{ blockerId: alice.id }, { blockedId: alice.id }] },
  });
  const aliceBlocks = blockRows.map((r) =>
    r.blockerId === alice.id ? r.blockedId : r.blockerId,
  );
  check("alice's block list contains mallory", aliceBlocks.includes(mallory.id));

  const malloryBlockRows = await db.block.findMany({
    where: { OR: [{ blockerId: mallory.id }, { blockedId: mallory.id }] },
  });
  const malloryBlocks = malloryBlockRows.map((r) =>
    r.blockerId === mallory.id ? r.blockedId : r.blockerId,
  );
  check(
    "block is symmetric — mallory's list contains alice",
    malloryBlocks.includes(alice.id),
  );

  const aliceFeed = await db.project.findMany({
    where: {
      status: "PUBLISHED",
      authorId: { notIn: aliceBlocks },
      slug: { contains: TAG },
    },
    select: { id: true },
  });
  check(
    "mallory's work is absent from alice's feed",
    !aliceFeed.some((p) => p.id === malloryProject.id),
  );
  check(
    "alice's own work is still in her feed",
    aliceFeed.some((p) => p.id === aliceProject.id),
  );

  const bobFeed = await db.project.findMany({
    where: { status: "PUBLISHED", slug: { contains: TAG } },
    select: { id: true },
  });
  check("an unrelated viewer sees both", bobFeed.length === 2);

  // --- counters ----------------------------------------------------------
  console.log("→ counters");

  await db.$transaction([
    db.like.create({ data: { userId: bob.id, projectId: aliceProject.id } }),
    db.project.update({
      where: { id: aliceProject.id },
      data: { likeCount: { increment: 1 } },
    }),
  ]);

  let fresh = await db.project.findUniqueOrThrow({
    where: { id: aliceProject.id },
    select: { likeCount: true, _count: { select: { likes: true } } },
  });
  check(
    "likeCount matches the like rows after liking",
    fresh.likeCount === fresh._count.likes,
    fresh,
  );

  const like = await db.like.findUniqueOrThrow({
    where: { userId_projectId: { userId: bob.id, projectId: aliceProject.id } },
  });
  await db.$transaction([
    db.like.delete({ where: { id: like.id } }),
    db.project.update({
      where: { id: aliceProject.id },
      data: { likeCount: { decrement: 1 } },
    }),
  ]);

  fresh = await db.project.findUniqueOrThrow({
    where: { id: aliceProject.id },
    select: { likeCount: true, _count: { select: { likes: true } } },
  });
  check(
    "likeCount matches after unliking",
    fresh.likeCount === 0 && fresh._count.likes === 0,
    fresh,
  );

  let duplicateRejected = false;
  await db.like.create({ data: { userId: bob.id, projectId: aliceProject.id } });
  try {
    await db.like.create({ data: { userId: bob.id, projectId: aliceProject.id } });
  } catch {
    duplicateRejected = true;
  }
  check("a second like from the same person is rejected", duplicateRejected);

  // --- collections -------------------------------------------------------
  console.log("→ collections");

  const boardOne = await db.collection.create({
    data: { name: "Refs", slug: `refs-${TAG}`, ownerId: bob.id },
  });
  const boardTwo = await db.collection.create({
    data: { name: "Posters", slug: `posters-${TAG}`, ownerId: bob.id },
  });

  await db.save.create({
    data: { userId: bob.id, projectId: aliceProject.id, collectionId: boardOne.id },
  });
  await db.save.create({
    data: { userId: bob.id, projectId: aliceProject.id, collectionId: boardTwo.id },
  });
  check("the same project can sit in two collections", true);

  let duplicateSaveRejected = false;
  try {
    await db.save.create({
      data: { userId: bob.id, projectId: aliceProject.id, collectionId: boardOne.id },
    });
  } catch {
    duplicateSaveRejected = true;
  }
  check(
    "saving twice into the same collection is rejected",
    duplicateSaveRejected,
  );

  let duplicateSlugRejected = false;
  try {
    await db.collection.create({
      data: { name: "Refs again", slug: `refs-${TAG}`, ownerId: bob.id },
    });
  } catch {
    duplicateSlugRejected = true;
  }
  check("collection slugs are unique per owner", duplicateSlugRejected);

  // --- messaging ---------------------------------------------------------
  console.log("→ messaging");

  const conversation = await db.conversation.create({
    data: { members: { create: [{ userId: alice.id }, { userId: bob.id }] } },
  });

  const found = await db.conversation.findFirst({
    where: {
      AND: [
        { members: { some: { userId: alice.id } } },
        { members: { some: { userId: bob.id } } },
      ],
    },
    select: { id: true },
  });
  check(
    "an existing thread is found rather than duplicated",
    found?.id === conversation.id,
  );

  const before = await db.conversation.findUniqueOrThrow({
    where: { id: conversation.id },
    select: { lastMessageAt: true },
  });
  await new Promise((resolve) => setTimeout(resolve, 15));

  await db.$transaction([
    db.message.create({
      data: {
        conversationId: conversation.id,
        senderId: alice.id,
        body: "Nice type on that poster.",
      },
    }),
    db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  const after = await db.conversation.findUniqueOrThrow({
    where: { id: conversation.id },
    select: { lastMessageAt: true },
  });
  check(
    "lastMessageAt advances when a message is sent",
    after.lastMessageAt > before.lastMessageAt,
  );

  const bobMembership = await db.conversationMember.findUniqueOrThrow({
    where: { conversationId_userId: { conversationId: conversation.id, userId: bob.id } },
    select: { lastReadAt: true },
  });
  const latest = await db.message.findFirstOrThrow({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
  });
  check(
    "an unsent-to member reads as unread",
    latest.senderId !== bob.id &&
      (!bobMembership.lastReadAt || latest.createdAt > bobMembership.lastReadAt),
  );

  // --- cascades ----------------------------------------------------------
  console.log("→ cascades");

  await db.project.delete({ where: { id: aliceProject.id } });

  const orphanImages = await db.projectImage.count({
    where: { blobPath: { contains: TAG } },
  });
  const orphanLikes = await db.like.count({ where: { projectId: aliceProject.id } });
  const orphanSaves = await db.save.count({ where: { projectId: aliceProject.id } });
  check("deleting a project removes its images", orphanImages === 1, orphanImages);
  check("deleting a project removes its likes", orphanLikes === 0);
  check("deleting a project removes its saves", orphanSaves === 0);

  // --- cleanup -----------------------------------------------------------
  console.log("→ cleaning up");
  await db.user.deleteMany({
    where: { email: { contains: TAG } },
  });
  await db.tag.deleteMany({ where: { slug: { contains: TAG } } });

  const leftoverUsers = await db.user.count({ where: { email: { contains: TAG } } });
  const leftoverProjects = await db.project.count({
    where: { slug: { contains: TAG } },
  });
  check("fixtures removed", leftoverUsers === 0 && leftoverProjects === 0);

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main()
  .catch((error) => {
    console.error("\n✗ smoke test threw:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
