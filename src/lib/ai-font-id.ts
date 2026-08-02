import "server-only";

import { findFontByFamilyName } from "./fonts";
import { generateStructured, isGeminiConfigured, S } from "./gemini";

/**
 * Gemini's half of image-mode font identification.
 *
 * The two halves are good at opposite things. Gemini has read the internet and
 * can often name a typeface on sight — including commercial faces that will
 * never be in an open-licence catalogue. The glyph index cannot name anything,
 * but it can measure how closely a shape actually matches, which Gemini cannot.
 *
 * So Gemini proposes and the index scores. A name Gemini offers is only ranked
 * above the index's own candidates if the index agrees the shapes are close.
 * That way a confident hallucination gets demoted by geometry rather than
 * printed as fact.
 *
 * Nothing here is ever the source of a licence claim. Licences come from the
 * catalogue, which comes from google/fonts.
 */

export interface AiCandidate {
  family: string;
  /** Gemini's own stated confidence, 0-1. Advisory only — the index re-ranks. */
  confidence: number;
  reasoning: string;
  /** True when Gemini believes this is a commercial face. */
  likelyCommercial: boolean;
}

export interface AiReading {
  candidates: AiCandidate[];
  /** What the model could actually see — useful when it finds nothing. */
  observations: string;
}

const SCHEMA = S.object(
  {
    candidates: S.array(
      S.object(
        {
          family: S.string("Exact typeface family name, e.g. 'Playfair Display'"),
          confidence: S.number("0 to 1"),
          reasoning: S.string("One short sentence on the letterform evidence"),
          likelyCommercial: S.boolean("True if this is a commercial/foundry font"),
        },
        ["family", "confidence", "reasoning", "likelyCommercial"],
      ),
      "Up to 5 candidate typefaces, most likely first",
    ),
    observations: S.string(
      "One sentence on the visible letterform characteristics: serif style, " +
        "contrast, width, terminals, x-height",
    ),
  },
  ["candidates", "observations"],
);

const PROMPT = `You are a typographer identifying a typeface from an image.

Look at the letterforms only — not the words, the colours, or the layout.
Attend to: serif treatment (none, slab, bracketed, hairline), stroke contrast,
terminal shapes, aperture, x-height relative to cap height, width, and the
construction of 'a', 'g', 'e' and 'R' in particular.

Name up to five specific typeface families you believe this could be, most
likely first. Use exact family names as a foundry or Google Fonts would write
them. Prefer naming a specific family over a generic description.

If the image contains no legible text, return an empty candidates array and say
so in observations. Do not guess wildly — a short honest list beats a long
speculative one.`;

export async function readFontFromImage(
  base64: string,
  mimeType: string,
): Promise<AiReading | null> {
  if (!isGeminiConfigured()) return null;

  const reading = await generateStructured<AiReading>({
    prompt: PROMPT,
    image: { mimeType, data: base64 },
    schema: SCHEMA,
    temperature: 0.1,
    timeoutMs: 20000,
  });

  return {
    observations: reading.observations ?? "",
    candidates: (reading.candidates ?? [])
      .filter((c) => c.family?.trim())
      .slice(0, 5)
      .map((c) => ({
        family: c.family.trim(),
        confidence: Math.min(1, Math.max(0, c.confidence ?? 0)),
        reasoning: c.reasoning ?? "",
        likelyCommercial: Boolean(c.likelyCommercial),
      })),
  };
}

export interface ResolvedCandidate extends AiCandidate {
  /** Set when the name resolves to a real family in the catalogue. */
  slug: string | null;
  inCatalogue: boolean;
}

/**
 * Resolve names against the catalogue.
 *
 * A name that resolves is a real open-licence family and can be linked. A name
 * that does not is kept but clearly marked — it is usually a commercial face,
 * which is genuinely useful to know, and the free-alternatives machinery
 * already handles that case. What never happens is a nonexistent font being
 * presented as though it were in the library.
 */
export function resolveCandidates(candidates: AiCandidate[]): ResolvedCandidate[] {
  return candidates.map((candidate) => {
    const match = findFontByFamilyName(candidate.family);
    return {
      ...candidate,
      // Use the catalogue's spelling when it resolves, not the model's.
      family: match?.family ?? candidate.family,
      slug: match?.slug ?? null,
      inCatalogue: Boolean(match),
    };
  });
}
