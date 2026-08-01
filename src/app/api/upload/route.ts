import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getOnboardedUser } from "@/lib/auth";
import { isBlobConfigured } from "@/lib/blob";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Client-upload token exchange for project images.
 *
 * The browser uploads straight to Vercel Blob; this route only decides whether
 * it may. That keeps large files off the serverless function entirely, which
 * matters because a 4.5 MB request body is the hard limit on the function path.
 *
 * Three things are enforced here, before any token is issued:
 *   - the caller is signed in and onboarded (anonymous uploads would be a
 *     free file host for anyone who found the endpoint)
 *   - they are inside their hourly upload allowance
 *   - the content type is an image we are willing to serve
 *
 * `addRandomSuffix` keeps one person's filename from overwriting another's, and
 * the userId prefix makes orphaned blobs traceable back to an account.
 */

export const runtime = "nodejs";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(request: Request) {
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: "Uploads are not configured on this deployment." },
      { status: 503 },
    );
  }

  const user = await getOnboardedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to upload images." },
      { status: 401 },
    );
  }

  const limit = await checkRateLimit("imageUpload", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Upload limit reached. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000)) } },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        maximumSizeInBytes: MAX_BYTES,
        addRandomSuffix: true,
        // Bound to the uploader so a leaked token cannot be reused to write
        // anywhere else in the store.
        pathname: `projects/${user.id}`,
        tokenPayload: JSON.stringify({ userId: user.id }),
      }),
      onUploadCompleted: async () => {
        // The blob exists but no ProjectImage row does yet — that happens when
        // the form is submitted. Blobs whose project never gets created are
        // orphans; see scripts/prune-orphan-blobs.ts.
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
