import { NextResponse } from "next/server";
import { intentToSearchParams, parseSearchIntent } from "@/lib/ai-search";
import { GeminiError, isGeminiConfigured } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rate-limit";
import { isCommunityConfigured } from "@/lib/db";

/** POST /api/ai/search — plain language → catalogue filters. Never returns fonts. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "AI search is not configured on this deployment." },
      { status: 503 },
    );
  }

  const { query } = (await request.json().catch(() => ({}))) as { query?: string };
  if (!query?.trim()) {
    return NextResponse.json({ error: "Describe what you are after." }, { status: 400 });
  }

  if (isCommunityConfigured()) {
    const limit = await checkRateLimit("aiSearch", "shared");
    if (!limit.ok) {
      return NextResponse.json(
        { error: "AI search limit reached. Use the filters instead." },
        { status: 429 },
      );
    }
  }

  try {
    const intent = await parseSearchIntent(query);
    if (!intent) return NextResponse.json({ error: "AI unavailable." }, { status: 503 });

    return NextResponse.json(
      { intent, href: `/fonts?${intentToSearchParams(intent)}` },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof GeminiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not read that." }, { status: 500 });
  }
}
