import { z } from "zod";

/** Shared input validation. Used by server actions and route handlers alike. */

const RESERVED_HANDLES = new Set([
  "admin", "api", "auth", "signin", "signout", "signup", "welcome", "settings",
  "about", "help", "support", "terms", "privacy", "legal", "baseline", "root",
  "moderator", "mod", "staff", "team", "official", "community", "collections",
  "messages", "fonts", "colour", "color", "type-scale", "identify", "licences",
  "licenses", "roadmap", "u", "user", "users", "me", "new", "edit", "delete",
  "suspended", "report", "null", "undefined",
]);

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "At least 3 characters.")
  .max(24, "At most 24 characters.")
  .regex(
    /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/,
    "Letters, numbers, hyphens and underscores. Must start and end with a letter or number.",
  )
  .refine((value) => !RESERVED_HANDLES.has(value), "That handle is reserved.");

export const profileSchema = z.object({
  name: z.string().trim().max(60).optional().or(z.literal("")),
  bio: z.string().trim().max(280).optional().or(z.literal("")),
  website: z
    .string()
    .trim()
    .max(200)
    .refine(
      (value) => !value || /^https?:\/\/.+\..+/.test(value),
      "Must be a full URL starting with http:// or https://",
    )
    .optional()
    .or(z.literal("")),
  location: z.string().trim().max(60).optional().or(z.literal("")),
});

export const hexSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a hex colour like #3d5afe");

export const projectSchema = z.object({
  title: z.string().trim().min(3, "Give it a title.").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  // Posting someone else's work is allowed. Claiming it is not — hence credit.
  sourceUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) => !value || /^https?:\/\/.+\..+/.test(value),
      "Must be a full URL starting with http:// or https://",
    )
    .optional()
    .or(z.literal("")),
  sourceCredit: z.string().trim().max(200).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
  fonts: z
    .array(
      z.object({
        family: z.string().trim().min(1).max(80),
        fontSlug: z.string().trim().max(80).optional().or(z.literal("")),
        role: z.string().trim().max(20).optional().or(z.literal("")),
      }),
    )
    .max(8)
    .default([]),
  colours: z.array(hexSchema).max(12).default([]),
  // People tagged on the work. Handles are resolved to accounts server-side;
  // anything that does not match a real account is dropped rather than stored
  // as a dangling name.
  credits: z
    .array(
      z.object({
        handle: z.string().trim().min(1).max(24),
        role: z.string().trim().max(60).optional().or(z.literal("")),
      }),
    )
    .max(12)
    .default([]),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        blobPath: z.string().min(1),
        alt: z.string().trim().max(200).optional().or(z.literal("")),
        width: z.number().int().positive().max(20000),
        height: z.number().int().positive().max(20000),
        bytes: z.number().int().positive(),
      }),
    )
    .min(1, "Add at least one image.")
    .max(10, "Ten images maximum."),
});

export const collectionSchema = z.object({
  name: z.string().trim().min(1, "Name it something.").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  isPrivate: z.boolean().default(false),
});

export const messageSchema = z.object({
  body: z.string().trim().min(1, "Write something.").max(4000),
});

export const reportSchema = z.object({
  reason: z.enum([
    "SPAM",
    "HARASSMENT",
    "STOLEN_WORK",
    "SEXUAL_CONTENT",
    "VIOLENCE",
    "OTHER",
  ]),
  detail: z.string().trim().max(1000).optional().or(z.literal("")),
});

// --- slugs ---------------------------------------------------------------

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Slugs must be unique and unguessable enough not to be enumerable. */
export function projectSlug(title: string): string {
  const base = slugify(title) || "project";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

/** A first suggestion, from the email local part. The user can change it. */
export function suggestHandle(email: string | null | undefined): string {
  const local = (email ?? "").split("@")[0] ?? "";
  const cleaned = local.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const base = cleaned.length >= 3 ? cleaned.slice(0, 20) : "designer";
  return RESERVED_HANDLES.has(base) ? `${base}-1` : base;
}

/** Flatten a ZodError into { field: message } for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
