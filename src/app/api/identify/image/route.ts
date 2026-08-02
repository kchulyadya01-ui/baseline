import { NextResponse } from "next/server";
import { readFontFromImage, resolveCandidates } from "@/lib/ai-font-id";
import { freeAlternatives } from "@/lib/alternatives";
import { isCommunityConfigured } from "@/lib/db";
import { findFontByFamilyName, getFont } from "@/lib/fonts";
import { isGeminiConfigured } from "@/lib/gemini";
import {
  decodeRgba,
  glyphIndexSize,
  identifyFromImage,
  ImageIdentifyError,
} from "@/lib/glyph-search";
import { extractPalette, tidy } from "@/lib/palette-extract";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/identify/image  (multipart/form-data, field: "image")
 *
 * Two things come out of one image: the typefaces, and the palette.
 *
 * TYPE is a hybrid. The glyph index measures shape distance across all ~1,900
 * indexed families; Gemini, when configured, separately names what it thinks it
 * sees — including commercial faces the catalogue will never contain. A name
 * Gemini offers is only promoted if the index agrees the shapes are close, so a
 * confident hallucination gets demoted by geometry rather than printed as fact.
 *
 * COLOUR is pure arithmetic — median cut over the actual pixels. No model
 * involved: the colours in an image are measurable, and asking would be slower,
 * costlier and less exact.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

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
      { error: "Send the image as multipart/form-data." },
      { status: 400 },
    );
  }

  if (!file) return NextResponse.json({ error: "No image received." }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That image is over 8 MB. Crop it first." },
      { status: 413 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Palette and glyph search are independent; the AI read is optional and
    // must never be able to fail the whole request.
    const [result, palette, ai] = await Promise.all([
      identifyFromImage(buffer),
      Promise.resolve()
        .then(() => {
          const { rgba } = decodeRgba(buffer);
          return extractPalette(rgba, 6).map((colour) => ({
            ...colour,
            hex: tidy(colour.hex),
            weight: Number(colour.weight.toFixed(3)),
          }));
        })
        .catch(() => []),
      (async () => {
        if (!isGeminiConfigured()) return null;
        const limit = await checkRateLimit("aiIdentify", "shared");
        if (!limit.ok) return null;
        try {
          const base64 = buffer.toString("base64");
          return await readFontFromImage(base64, file.type || "image/png");
        } catch {
          // The glyph index is the primary result; AI is an enhancement.
          return null;
        }
      })(),
    ]);

    // Score by shape, then let the index confirm or deny what Gemini named.
    const byFamily = new Map(result.matches.map((m) => [m.family.toLowerCase(), m]));
    const aiCandidates = ai ? resolveCandidates(ai.candidates) : [];

    const suggested = aiCandidates.map((candidate) => {
      const shape = byFamily.get(candidate.family.toLowerCase());
      return {
        family: candidate.family,
        slug: candidate.slug,
        inCatalogue: candidate.inCatalogue,
        likelyCommercial: candidate.likelyCommercial,
        reasoning: candidate.reasoning,
        aiConfidence: Number(candidate.confidence.toFixed(2)),
        // Present only when the index independently ranked the same family.
        shapeScore: shape ? Number(shape.score.toFixed(4)) : null,
        corroborated: Boolean(shape),
      };
    });

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

    // A commercial face Gemini named is exactly the case free alternatives
    // exist for, so attach them here too.
    const commercial = suggested
      .filter((s) => !s.inCatalogue)
      .map((s) => ({
        family: s.family,
        alternatives: freeAlternatives(s.family).map((alt) => ({
          slug: alt.font.slug,
          family: alt.font.family,
          licence: alt.font.license.id,
        })),
      }));

    return NextResponse.json(
      {
        method: ai ? "glyph-index + gemini" : "glyph-index",
        indexSize: await glyphIndexSize(),
        lettersFound: result.lettersFound,
        imageWidth: result.imageWidth,
        imageHeight: result.imageHeight,
        durationMs: result.durationMs,
        observations: ai?.observations ?? null,
        suggested,
        matches,
        commercial,
        palette,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ImageIdentifyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not read that image." }, { status: 500 });
  }
}
