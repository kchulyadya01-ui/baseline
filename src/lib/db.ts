import "server-only";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma client, created lazily.
 *
 * Lazily because the tools half of the site has no database and must build and
 * run without one. Constructing the client at module load would throw during
 * `next build` on any page that merely imports this file — including the shared
 * header. The proxy defers construction to the first actual query, which only
 * happens after `isCommunityConfigured()` has said there is a database.
 *
 * `@prisma/adapter-pg` rather than the Neon-specific adapter keeps the same
 * code working against any Postgres — a plain local instance in development,
 * Neon in production. Neon's pooled connection string puts pgbouncer in front,
 * which is what stops a serverless function exhausting connections.
 *
 * The globalThis cache stops `next dev` opening a new pool on every hot reload.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. The community section needs a database; " +
        "see README.md for setup.",
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/**
 * The client is cached on globalThis in EVERY environment, production included.
 *
 * The familiar "only cache outside production" snippet exists for a long-running
 * server that builds its client once at module scope anyway. Here the client is
 * built lazily behind a proxy, so skipping the cache in production meant every
 * single property access — `db.project`, `db.tag`, `db.$transaction` — created a
 * new PrismaClient with its own connection pool. Pools churned and were disposed
 * mid-request, surfacing as "Transaction not found … or was obtained before
 * disconnecting" when posting a project.
 *
 * On serverless, reusing one client across warm invocations is what you want.
 */
function getClient(): PrismaClient {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getClient(), property, receiver);
  },
});

/**
 * Whether the community section can run at all. Every community entry point
 * checks this and renders an explanation instead of throwing.
 */
export function isCommunityConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// Blob configuration lives in src/lib/blob.ts — there is more than one way the
// SDK authenticates, and it is not a database concern.
