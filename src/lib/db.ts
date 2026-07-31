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
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

function getClient(): PrismaClient {
  return globalForPrisma.prisma ?? createClient();
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

/** Uploads need the Blob store on top of the database. */
export function isUploadConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
