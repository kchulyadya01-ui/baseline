import { NextResponse } from "next/server";
import { suggestForProject } from "@/lib/ai-community";
import { getOnboardedUser } from "@/lib/auth";
import { GeminiError, isGeminiConfigured } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/ai/project — an uploaded image URL → draft alt text, title,
 * description, tags, fonts and colours for the submit form.
 *
 * Takes a Blob URL rather than the bytes: the image is already uploaded by the
 * time this is useful, and re-posting 8 MB through a serverless function to
 * describe it would be wasteful.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!isGeminiConfigured()) {
    return NextResponse.json({ error: "AI helpers are not configured." }, { status: 503 });
  }

  const user = await getOnboardedUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const limit = await checkRateLimit("aiProject", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "AI limit reached. Try again later." },
      { status: 429 },
    );
  }

  const { imageUrl } = (await request.json().catch(() => ({}))) as { imageUrl?: string };
  if (!imageUrl || !/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(imageUrl)) {
    // Only our own blob store. Otherwise this is an open image fetcher.
    return NextResponse.json({ error: "Upload the image first." }, { status: 400 });
  }

  try {
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      return NextResponse.json({ error: "Could not read that image." }, { status: 502 });
    }
    const mimeType = response.headers.get("content-type") ?? "image/jpeg";
    const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");

    const suggestions = await suggestForProject(base64, mimeType);
    if (!suggestions) return NextResponse.json({ error: "AI unavailable." }, { status: 503 });

    return NextResponse.json(suggestions, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof GeminiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not describe that image." }, { status: 500 });
  }
}
