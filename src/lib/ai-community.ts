import "server-only";

import { findFontByFamilyName } from "./fonts";
import { generateStructured, isGeminiConfigured, S } from "./gemini";

/**
 * AI helpers for posting a project.
 *
 * Everything here is a DRAFT. It lands in the form fields for the author to
 * edit or delete before anything is posted — nothing is written on their behalf
 * and nothing is submitted automatically.
 *
 * That is deliberate for alt text especially. Generated alt text is far better
 * than the empty string most people leave, and far worse than a sentence
 * written by someone who knows what the image is for. Putting it in the field
 * rather than in the database gets the first without pretending it is the
 * second.
 */

export interface ProjectSuggestions {
  altText: string;
  title: string;
  description: string;
  tags: string[];
  fonts: { family: string; slug: string | null; role: string; inCatalogue: boolean }[];
  colours: string[];
}

const SCHEMA = S.object(
  {
    altText: S.string(
      "One factual sentence describing what is visible, for a screen reader. " +
        "Describe content, not aesthetics. No 'image of'.",
    ),
    title: S.string("A short project title, under 60 characters"),
    description: S.string("Two or three sentences on what the work appears to be"),
    tags: S.array(S.string(), "Three to six lowercase single-word tags"),
    fonts: S.array(
      S.object(
        {
          family: S.string("Exact typeface family name visible in the artwork"),
          role: S.enum(["display", "heading", "body", "mono"], "How it is used"),
        },
        ["family", "role"],
      ),
      "Typefaces you can actually identify in the image. Empty if unsure.",
    ),
    colours: S.array(S.string(), "Three to six dominant hex colours, e.g. #3d5afe"),
  },
  ["altText", "title", "description", "tags", "fonts", "colours"],
);

const PROMPT = `You are helping a designer post their work to a portfolio site.

Look at the image and produce:

- altText: one factual sentence for a screen reader. Say what is actually
  shown — the subject, the medium, the text if it is legible. Do not begin
  with "image of" or "a picture showing". Do not editorialise about quality.
- title: short and concrete. Not "Modern Design Project".
- description: two or three sentences on what the work appears to be and what
  is notable about how it is made.
- tags: three to six lowercase single words. Medium and discipline, not mood.
  e.g. branding, poster, editorial, packaging, typography.
- fonts: only typefaces you can genuinely identify from the letterforms. An
  empty list is the right answer when you cannot tell. Do not guess.
- colours: the dominant colours actually present, as hex.`;

export async function suggestForProject(
  base64: string,
  mimeType: string,
): Promise<ProjectSuggestions | null> {
  if (!isGeminiConfigured()) return null;

  const raw = await generateStructured<{
    altText: string;
    title: string;
    description: string;
    tags: string[];
    fonts: { family: string; role: string }[];
    colours: string[];
  }>({
    prompt: PROMPT,
    image: { mimeType, data: base64 },
    schema: SCHEMA,
    temperature: 0.4,
    timeoutMs: 25000,
  });

  return {
    altText: (raw.altText ?? "").trim().slice(0, 200),
    title: (raw.title ?? "").trim().slice(0, 120),
    description: (raw.description ?? "").trim().slice(0, 2000),
    tags: (raw.tags ?? [])
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 1 && tag.length <= 30)
      .slice(0, 6),
    // Same grounding rule as everywhere else: a name that does not resolve is
    // kept but flagged, never silently linked to a catalogue page.
    fonts: (raw.fonts ?? []).slice(0, 6).map((font) => {
      const match = findFontByFamilyName(font.family ?? "");
      return {
        family: match?.family ?? (font.family ?? "").trim(),
        slug: match?.slug ?? null,
        role: ["display", "heading", "body", "mono"].includes(font.role)
          ? font.role
          : "",
        inCatalogue: Boolean(match),
      };
    }).filter((font) => font.family),
    colours: (raw.colours ?? [])
      .map((hex) => hex.trim().toLowerCase())
      .filter((hex) => /^#[0-9a-f]{6}$/.test(hex))
      .slice(0, 6),
  };
}
