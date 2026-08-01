import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getOnboardedUser } from "@/lib/auth";
import { hasBlobStore } from "@/lib/blob";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Client-upload token exchange.
 *
 * The browser uploads straight to Vercel Blob; this route only decides whether
 * it may. That keeps large files off the serverless function entirely, which
 * matters because a 4.5 MB request body is the hard limit on the function path.
 *
 * Two scopes, with deliberately different rules:
 *
 *   project  — images only, up to 8 MB. These are rendered inline on public
 *              pages, so the type list stays narrow.
 *   message  — images or documents, up to 25 MB. A file sent in a private
 *              thread is downloaded, not rendered, so a wider list is fine —
 *              but executables and scripts stay out regardless.
 *
 * Everything is enforced before a token is issued: signed in, onboarded, inside
 * the hourly allowance, and an allowed content type.
 */

export const runtime = "nodejs";

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

const DOCUMENT_TYPES = [
  "application/pdf",
  "application/zip",
  "application/postscript", // .ai, .eps
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "application/rtf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "font/otf",
  "font/ttf",
  "font/woff",
  "font/woff2",
];

const SCOPES = {
  project: { types: IMAGE_TYPES, maxBytes: 8 * 1024 * 1024, prefix: "projects" },
  message: {
    types: [...IMAGE_TYPES, ...DOCUMENT_TYPES],
    maxBytes: 25 * 1024 * 1024,
    prefix: "messages",
  },
} as const;

type ScopeName = keyof typeof SCOPES;

export async function POST(request: Request) {
  if (!hasBlobStore()) {
    return NextResponse.json(
      { error: "Uploads are not configured on this deployment." },
      { status: 503 },
    );
  }

  const user = await getOnboardedUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to upload." }, { status: 401 });
  }

  const limit = await checkRateLimit("imageUpload", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Upload limit reached. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000),
          ),
        },
      },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // The scope comes from the client, so it is validated rather than
        // trusted: an unknown value falls back to the narrower project rules.
        let scope: ScopeName = "project";
        try {
          const parsed = clientPayload ? JSON.parse(clientPayload) : null;
          if (parsed?.scope === "message") scope = "message";
        } catch {
          // Malformed payload — keep the stricter default.
        }

        const rules = SCOPES[scope];
        return {
          allowedContentTypes: [...rules.types],
          maximumSizeInBytes: rules.maxBytes,
          addRandomSuffix: true,
          // Bound to the uploader so a leaked token cannot write elsewhere.
          pathname: `${rules.prefix}/${user.id}`,
          tokenPayload: JSON.stringify({ userId: user.id, scope }),
        };
      },
      onUploadCompleted: async () => {
        // The blob exists but no row does yet — that happens when the form or
        // the message is submitted. Blobs whose row never arrives are orphans.
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 },
    );
  }
}
