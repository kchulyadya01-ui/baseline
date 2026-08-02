import { NextResponse } from "next/server";
import { getOnboardedUser } from "@/lib/auth";
import { rampsFor, suggestFromBrief } from "@/lib/ai-brief";
import { GeminiError, isGeminiConfigured } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rate-limit";
import { isCommunityConfigured } from "@/lib/db";

/** POST /api/ai/brief — { brief } → verified pairing, palette and scale. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "The AI assistant is not configured on this deployment." },
      { status: 503 },
    );
  }

  const { brief } = (await request.json().catch(() => ({}))) as { brief?: string };
  if (!brief?.trim() || brief.trim().length < 10) {
    return NextResponse.json(
      { error: "Describe the project in a sentence or two." },
      { status: 400 },
    );
  }

  // Signed-in users get a per-account allowance. Anonymous callers share a
  // pooled one — this costs money per call and the endpoint is public.
  if (isCommunityConfigured()) {
    const user = await getOnboardedUser();
    const limit = await checkRateLimit("aiBrief", user?.id ?? "anonymous");
    if (!limit.ok) {
      return NextResponse.json(
        { error: "AI limit reached. Try again shortly." },
        { status: 429 },
      );
    }
  }

  try {
    const suggestion = await suggestFromBrief(brief);
    if (!suggestion) {
      return NextResponse.json({ error: "AI unavailable." }, { status: 503 });
    }
    return NextResponse.json(
      { ...suggestion, ramps: rampsFor(suggestion.palette) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof GeminiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not generate that." }, { status: 500 });
  }
}
