import { defineConfig } from "prisma/config";

/**
 * Prisma 7 keeps the connection URL out of schema.prisma.
 *
 * `process.env.DATABASE_URL ?? ""` rather than prisma/config's `env()` helper:
 * that helper throws when the variable is missing, which breaks `prisma
 * generate` during a build that has no database — and the tools half of the
 * site is deliberately buildable and deployable without one.
 *
 * Generating a client needs no connection. Anything that does — `migrate`,
 * `studio`, `db push` — fails with a clear error from the driver instead, which
 * is the right moment to notice the variable is unset.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
