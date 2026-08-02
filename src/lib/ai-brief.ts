import "server-only";

import { contrastRatioHex, judge, suggestAccessible } from "./contrast";
import { allFonts, findFontByFamilyName, getFont } from "./fonts";
import { generateStructured, isGeminiConfigured, S } from "./gemini";
import { buildRamp, hexToOklch } from "./palette";
import type { FontRecord } from "./types";

/**
 * Brief → type pairing and palette.
 *
 * Gemini reads the brief and proposes; the existing tools then verify. Fonts
 * that are not in the catalogue are dropped rather than shown, and every colour
 * pair is put through the same WCAG check the Colour Studio uses — with the
 * same one-click fix applied automatically when a pair fails.
 *
 * That last part matters: a model asked for "warm and loud" will cheerfully
 * return ochre text on a red ground. The contrast maths is not a suggestion, so
 * the palette that comes back has already been repaired.
 */

export interface BriefSuggestion {
  rationale: string;
  displayFont: FontRecord | null;
  bodyFont: FontRecord | null;
  fontRationale: string;
  palette: {
    role: string;
    hex: string;
    /** Set when the colour had to be adjusted to pass contrast. */
    adjustedFrom?: string;
  }[];
  paletteRationale: string;
  contrast: {
    label: string;
    ratio: number;
    level: string;
    passes: boolean;
  }[];
  scaleRatio: number;
  scaleRationale: string;
  droppedFonts: string[];
}

interface RawSuggestion {
  rationale: string;
  displayFont: string;
  bodyFont: string;
  fontRationale: string;
  palette: { role: string; hex: string }[];
  paletteRationale: string;
  scaleRatio: number;
  scaleRationale: string;
}

const SCHEMA = S.object(
  {
    rationale: S.string("Two sentences on the direction you are taking and why"),
    displayFont: S.string("Exact Google Fonts family name for headings"),
    bodyFont: S.string("Exact Google Fonts family name for body text"),
    fontRationale: S.string("One or two sentences on why this pairing suits the brief"),
    palette: S.array(
      S.object(
        {
          role: S.enum(
            ["primary", "secondary", "accent", "neutral", "surface", "text"],
            "Semantic role",
          ),
          hex: S.string("Hex colour like #3d5afe"),
        },
        ["role", "hex"],
      ),
      "Four to six colours, including a 'surface' background and a 'text' colour",
    ),
    paletteRationale: S.string("One or two sentences on the colour thinking"),
    scaleRatio: S.number("Modular scale ratio between 1.067 and 1.618"),
    scaleRationale: S.string("One sentence on why this ratio"),
  },
  [
    "rationale",
    "displayFont",
    "bodyFont",
    "fontRationale",
    "palette",
    "paletteRationale",
    "scaleRatio",
    "scaleRationale",
  ],
);

function buildPrompt(brief: string, shortlist: string[]): string {
  return `You are a typographer and colourist advising on a design brief.

THE BRIEF
${brief}

Choose a display face and a body face for this brief, a palette, and a modular
type scale ratio.

CHOOSE FONTS ONLY FROM THIS LIST. Anything not on it will be discarded:
${shortlist.join(", ")}

Guidance:
- The display and body faces should be different unless the brief calls for a
  single-family system. Pair on contrast of structure, not similarity.
- Give a 'surface' colour (the background) and a 'text' colour that will sit on
  it. Aim for real contrast: text on surface should be readable, not stylish.
- Ratio: 1.2 for dense interfaces, 1.25 for general work, 1.333-1.5 for
  editorial and posters, higher only for display-led layouts.
- Be specific about the brief, not generic. If it names a decade, a mood or a
  medium, let that show in the choices.`;
}

export async function suggestFromBrief(
  brief: string,
): Promise<BriefSuggestion | null> {
  if (!isGeminiConfigured()) return null;

  // A shortlist rather than all 1,934 names: a shorter list keeps the model on
  // real families, and the most-used faces are the ones a brief usually wants.
  const shortlist = allFonts()
    .slice(0, 220)
    .map((font) => font.family);

  const raw = await generateStructured<RawSuggestion>({
    prompt: buildPrompt(brief.slice(0, 1500), shortlist),
    schema: SCHEMA,
    temperature: 0.7, // this one IS a creative task
    timeoutMs: 25000,
  });

  const dropped: string[] = [];
  const resolve = (name: string): FontRecord | null => {
    const match = findFontByFamilyName(name) ?? getFont(name.toLowerCase());
    if (!match) dropped.push(name);
    return match ?? null;
  };

  const displayFont = resolve(raw.displayFont ?? "");
  const bodyFont = resolve(raw.bodyFont ?? "");

  // --- verify the palette --------------------------------------------------
  const swatches = (raw.palette ?? [])
    .filter((entry) => /^#[0-9a-fA-F]{6}$/.test(entry.hex ?? ""))
    .slice(0, 6)
    .map((entry) => ({ role: entry.role, hex: entry.hex.toLowerCase() }));

  const surface = swatches.find((s) => s.role === "surface")?.hex ?? "#ffffff";

  const palette = swatches.map((swatch) => {
    if (swatch.role === "surface") return swatch;
    const ratio = contrastRatioHex(swatch.hex, surface);
    // Only text is held to the body-copy threshold; an accent used for a shape
    // does not need 4.5:1, so it is checked at the UI-component level.
    const target = swatch.role === "text" ? 4.5 : 3;
    if (ratio !== null && ratio < target) {
      const fixed = suggestAccessible(swatch.hex, surface, target);
      if (fixed && fixed !== swatch.hex) {
        return { ...swatch, hex: fixed, adjustedFrom: swatch.hex };
      }
    }
    return swatch;
  });

  const contrast = palette
    .filter((swatch) => swatch.role !== "surface")
    .map((swatch) => {
      const ratio = contrastRatioHex(swatch.hex, surface) ?? 1;
      const verdict = judge(ratio);
      return {
        label: `${swatch.role} on surface`,
        ratio: Number(ratio.toFixed(2)),
        level: verdict.level,
        passes: swatch.role === "text" ? verdict.normalText.aa : verdict.uiComponents,
      };
    });

  const ratio = Math.min(1.618, Math.max(1.067, raw.scaleRatio || 1.25));

  return {
    rationale: raw.rationale ?? "",
    displayFont,
    bodyFont,
    fontRationale: raw.fontRationale ?? "",
    palette,
    paletteRationale: raw.paletteRationale ?? "",
    contrast,
    scaleRatio: Number(ratio.toFixed(3)),
    scaleRationale: raw.scaleRationale ?? "",
    droppedFonts: dropped,
  };
}

/** Ramps for the verified palette, generated by the existing OKLCH library. */
export function rampsFor(palette: { role: string; hex: string }[]) {
  return Object.fromEntries(
    palette.map((swatch) => [
      swatch.role,
      { ramp: buildRamp(swatch.hex), oklch: hexToOklch(swatch.hex) },
    ]),
  );
}
