import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 keeps the connection URL out of schema.prisma.
 *
 * Dormant in Phase 1 — nothing connects to a database yet. When the Kit lands
 * (Phase 2), set DATABASE_URL to a Postgres instance with pgvector available
 * and run `npx prisma migrate dev`.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
