import "server-only";

import { db } from "./db";

/**
 * Fixed-window rate limiting, stored in Postgres.
 *
 * Postgres rather than Redis because there is no Redis yet and adding one for
 * this alone is not worth the moving part. The write is a single upsert; at the
 * volumes a new community sees it is not close to being the bottleneck. When it
 * becomes one, this module's signature is what moves to Redis, not its callers.
 *
 * Fixed window over sliding window is a deliberate trade: a caller can burst at
 * a window boundary and briefly get 2x the limit. For "stop someone posting 400
 * projects an hour" that is entirely acceptable, and it costs one row instead
 * of one row per event.
 */

export interface RateLimitRule {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export const LIMITS = {
  // Uploading is the expensive one — it costs storage and is the main spam vector.
  projectCreate: { limit: 10, windowSeconds: 3600 },
  imageUpload: { limit: 60, windowSeconds: 3600 },
  // Generous enough for a real conversation, tight enough to stop a blast.
  messageSend: { limit: 60, windowSeconds: 3600 },
  // A new account messaging many different people quickly is the harassment
  // pattern worth stopping, so this one counts distinct conversations started.
  conversationStart: { limit: 10, windowSeconds: 86400 },
  follow: { limit: 200, windowSeconds: 3600 },
  save: { limit: 300, windowSeconds: 3600 },
  // Reposting is the cheapest way to spam a feed, so it is tighter than saving:
  // a save is private, a repost is broadcast to everyone following you.
  repost: { limit: 60, windowSeconds: 3600 },
  report: { limit: 20, windowSeconds: 86400 },
  handleChange: { limit: 3, windowSeconds: 2592000 },
  // AI calls cost money per request, so these are tighter than anything else.
  // The brief assistant is the most expensive and the least likely to be
  // needed in volume; search is cheap enough to be generous with.
  aiBrief: { limit: 20, windowSeconds: 3600 },
  aiSearch: { limit: 240, windowSeconds: 3600 },
  aiProject: { limit: 40, windowSeconds: 3600 },
  aiIdentify: { limit: 40, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

export type LimitName = keyof typeof LIMITS;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(
  name: LimitName,
  subject: string,
): Promise<RateLimitResult> {
  const rule = LIMITS[name];
  const now = new Date();
  const key = `${name}:${subject}`;

  const existing = await db.rateLimit.findUnique({ where: { key } });

  // No record, or the previous window has passed: start a fresh one.
  if (!existing || existing.windowEnds <= now) {
    const windowEnds = new Date(now.getTime() + rule.windowSeconds * 1000);
    await db.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, windowEnds },
      update: { count: 1, windowEnds },
    });
    return { ok: true, remaining: rule.limit - 1, resetAt: windowEnds };
  }

  if (existing.count >= rule.limit) {
    return { ok: false, remaining: 0, resetAt: existing.windowEnds };
  }

  const updated = await db.rateLimit.update({
    where: { key },
    data: { count: { increment: 1 } },
  });

  return {
    ok: true,
    remaining: Math.max(0, rule.limit - updated.count),
    resetAt: existing.windowEnds,
  };
}

export class RateLimitError extends Error {
  constructor(readonly resetAt: Date) {
    const minutes = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 60000));
    super(`Too many requests. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`);
    this.name = "RateLimitError";
  }
}

/** Throws instead of returning a result. For server actions. */
export async function enforceRateLimit(name: LimitName, subject: string) {
  const result = await checkRateLimit(name, subject);
  if (!result.ok) throw new RateLimitError(result.resetAt);
  return result;
}

/**
 * Drop windows that closed over a day ago. Called opportunistically rather
 * than on a schedule — there is no cron yet, and the table is tiny.
 */
export async function pruneRateLimits() {
  const cutoff = new Date(Date.now() - 86400 * 1000);
  await db.rateLimit.deleteMany({ where: { windowEnds: { lt: cutoff } } });
}
