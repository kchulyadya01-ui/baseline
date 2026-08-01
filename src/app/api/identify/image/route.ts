import { NextResponse } from "next/server";
import { freeAlternatives } from "@/lib/alternatives";
import { findFontByFamilyName, getFont } from "@/lib/fonts";
import {
  glyphIndexSize,
  identifyFromImage,
  ImageIdentifyError,
} from "@/lib/glyph-search";
import { isCommunityConfigured } from "@/lib/db";

/**
 * POST /api/identify/image  (multipart/form-data, field: "image")
 *
 * Segments letterforms out of a screenshot and matches them against the glyph
 * index. Every result is joined back to the catalogue so it carries a licence,
 * and anything that is not open-licence still gets free alternatives — the same
 * treatment the URL identifier gives, because a name on its own is not
 * actionable.
 *
 * Needs a database: the descriptors live in Postgres. Without one this returns
 * 503 rather than pretending, in keeping with the rest of the community layer.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isCommunityConfigured()) {
    return NextResponse.json(
      {
        error:
          "Image identification needs the glyph index, which needs a database. " +
          "URL identification works without one.",
      },
      { status: 503 },
    );
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("image");
    if (value instanceof File) file = value;
  } catch {
    return NextResponse.json(
      { error: "Send the screenshot as multipart/form-data." },
      { status: 400 },
    );
  }

  if (!file) {
    return NextResponse.json({ error: "No image received." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That image is over 8 MB. Crop it to the text first." },
      { status: 413 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await identifyFromImage(buffer);

    const matches = result.matches.map((match) => {
      const catalogued = getFont(match.fontSlug) ?? findFontByFamilyName(match.family);
      return {
        family: match.family,
        fontSlug: match.fontSlug,
        category: match.category,
        score: Number(match.score.toFixed(4)),
        licensing: catalogued
          ? {
              status: "open" as const,
              licence: catalogued.license.id,
              note: `Free for commercial use under ${catalogued.license.name}.`,
              weights: catalogued.weights.length,
              isVariable: catalogued.isVariable,
            }
          : {
              status: "not-in-catalogue" as const,
              note: "Not in the open-licence catalogue.",
              alternatives: freeAlternatives(match.family).map((alt) => ({
                slug: alt.font.slug,
                family: alt.font.family,
                licence: alt.font.license.id,
                reason: alt.reason,
              })),
            },
      };
    });

    return NextResponse.json(
      {
        method: "glyph-raster-match",
        indexSize: await glyphIndexSize(),
        lettersFound: result.lettersFound,
        imageWidth: result.imageWidth,
        imageHeight: result.imageHeight,
        durationMs: result.durationMs,
        matches,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ImageIdentifyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Could not read that image." },
      { status: 500 },
    );
  }
}
