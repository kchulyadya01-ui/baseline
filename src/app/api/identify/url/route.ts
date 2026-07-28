import { NextResponse } from "next/server";
import { freeAlternatives } from "@/lib/alternatives";
import { findFontByFamilyName } from "@/lib/fonts";
import { identifyFromUrl, IdentifyError } from "@/lib/identify";
import type { FontRecord } from "@/lib/types";

/**
 * POST /api/identify/url
 *
 * Reads a page's CSS and reports the font families it declares, each matched
 * against the open-licence catalogue. Families we don't have are treated as
 * commercial and answered with curated free alternatives — the "commercial
 * font? → show OFL lookalikes" branch of Flow B.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Payload {
  url?: unknown;
}

function slimFont(font: FontRecord) {
  return {
    slug: font.slug,
    family: font.family,
    category: font.category,
    license: font.license.id,
    weights: font.weights.length,
    isVariable: font.isVariable,
  };
}

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Send JSON with a url field." }, { status: 400 });
  }

  if (typeof body.url !== "string" || !body.url.trim()) {
    return NextResponse.json({ error: "A url is required." }, { status: 400 });
  }

  try {
    const result = await identifyFromUrl(body.url);

    const detections = result.detections.map((detection) => {
      const match = findFontByFamilyName(detection.family);
      return {
        ...detection,
        licensing: match
          ? {
              status: "open" as const,
              font: slimFont(match),
              licence: match.license.id,
              note: `Free for commercial use under ${match.license.name}.`,
            }
          : {
              status: "not-in-catalogue" as const,
              note:
                "Not in the open-licence catalogue — most likely a commercial " +
                "or system font. Check its licence before using it.",
              alternatives: freeAlternatives(detection.family).map((alt) => ({
                ...slimFont(alt.font),
                reason: alt.reason,
              })),
            },
      };
    });

    return NextResponse.json(
      {
        url: result.url,
        finalUrl: result.finalUrl,
        title: result.title,
        method: "static-css-read",
        stylesheetsRead: result.stylesheetsRead,
        stylesheetsSkipped: result.stylesheetsSkipped,
        durationMs: result.durationMs,
        detections,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof IdentifyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "That page took too long to respond." },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: "Could not read that page." },
      { status: 502 },
    );
  }
}
