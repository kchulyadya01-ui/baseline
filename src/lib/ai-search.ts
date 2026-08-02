import "server-only";

import { generateStructured, isGeminiConfigured, S } from "./gemini";
import type { FontCategory, SortKey } from "./types";

/**
 * Plain language → catalogue filters.
 *
 * Gemini never picks the fonts here. It only translates "a condensed sans that
 * works at small sizes" into `{category: "Sans Serif", maxWidthRatio: 0.55}`,
 * and those filters run against the same `queryFonts()` the library already
 * uses. Results are therefore always real catalogue entries in the real order —
 * the model changes the question, never the answer.
 *
 * The alternative, asking a model to list fonts matching a phrase, produces
 * confident lists containing fonts that do not exist. This cannot.
 */

export interface SearchIntent {
  /** Free-text terms to match against family name and designer. */
  q?: string;
  category?: FontCategory | "all";
  subset?: string;
  variable?: boolean;
  italic?: boolean;
  sort?: SortKey;
  /** Structural hints applied after the query, from the descriptor metrics. */
  maxWidthRatio?: number;
  minWidthRatio?: number;
  wantsHighContrast?: boolean;
  wantsLowContrast?: boolean;
  /** What the model understood, shown to the user so the mapping is visible. */
  interpretation: string;
}

const CATEGORIES = ["Sans Serif", "Serif", "Display", "Handwriting", "Monospace"];

const SUBSETS = [
  "latin", "latin-ext", "cyrillic", "cyrillic-ext", "greek", "greek-ext",
  "vietnamese", "arabic", "hebrew", "devanagari", "thai", "korean",
  "japanese", "chinese-simplified",
];

const SCHEMA = S.object(
  {
    q: S.string("Search terms for the family or designer name. Empty if the query is purely descriptive."),
    category: S.enum([...CATEGORIES, "all"], "Typeface category"),
    subset: S.enum([...SUBSETS, "any"], "Writing system required"),
    variable: S.boolean("True only if variable axes were explicitly asked for"),
    italic: S.boolean("True only if italics were explicitly asked for"),
    sort: S.enum(["popular", "newest", "name", "size"], "Result ordering"),
    maxWidthRatio: S.number("Set ~0.55 for condensed/narrow, else 0"),
    minWidthRatio: S.number("Set ~0.85 for extended/wide, else 0"),
    wantsHighContrast: S.boolean("True for didone/high-contrast/elegant"),
    wantsLowContrast: S.boolean("True for monolinear/even-weight/geometric"),
    interpretation: S.string("One short sentence: what you understood the request to mean"),
  },
  ["category", "sort", "interpretation"],
);

const PROMPT = `Turn a designer's plain-language font request into search filters.

Rules:
- Do NOT name specific fonts. You are producing filters, not results.
- 'q' is for name or designer searches only ("something by Vernon Adams").
  Leave it empty when the request is purely descriptive ("a warm serif").
- Only set 'variable' or 'italic' when explicitly requested.
- "condensed", "narrow", "tall" -> maxWidthRatio 0.55
  "extended", "wide" -> minWidthRatio 0.85
- "didone", "high contrast", "elegant", "fashion" -> wantsHighContrast
- "geometric", "monolinear", "even weight", "technical" -> wantsLowContrast
- "for small sizes", "for body text", "readable" -> Sans Serif or Serif,
  never Display or Handwriting.
- Default sort to popular unless recency or file size is asked for.

The request:
`;

export async function parseSearchIntent(query: string): Promise<SearchIntent | null> {
  if (!isGeminiConfigured()) return null;

  const raw = await generateStructured<Record<string, unknown>>({
    prompt: `${PROMPT}${query.slice(0, 400)}`,
    schema: SCHEMA,
    temperature: 0.1,
    timeoutMs: 15000,
  });

  const str = (key: string) => {
    const value = raw[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };
  const num = (key: string) => {
    const value = raw[key];
    return typeof value === "number" && value > 0 ? value : undefined;
  };

  const category = str("category");
  const subset = str("subset");

  return {
    q: str("q"),
    category:
      category && category !== "all" ? (category as FontCategory) : "all",
    subset: subset && subset !== "any" ? subset : undefined,
    variable: raw.variable === true,
    italic: raw.italic === true,
    sort: (str("sort") as SortKey) ?? "popular",
    maxWidthRatio: num("maxWidthRatio"),
    minWidthRatio: num("minWidthRatio"),
    wantsHighContrast: raw.wantsHighContrast === true,
    wantsLowContrast: raw.wantsLowContrast === true,
    interpretation: str("interpretation") ?? "",
  };
}

/** The structural hints, as a URL query the Font Library already understands. */
export function intentToSearchParams(intent: SearchIntent): URLSearchParams {
  const params = new URLSearchParams();
  if (intent.q) params.set("q", intent.q);
  if (intent.category && intent.category !== "all") params.set("category", intent.category);
  if (intent.subset) params.set("subset", intent.subset);
  if (intent.variable) params.set("variable", "1");
  if (intent.italic) params.set("italic", "1");
  if (intent.sort && intent.sort !== "popular") params.set("sort", intent.sort);
  if (intent.maxWidthRatio) params.set("maxWidth", String(intent.maxWidthRatio));
  if (intent.minWidthRatio) params.set("minWidth", String(intent.minWidthRatio));
  if (intent.wantsHighContrast) params.set("contrast", "high");
  if (intent.wantsLowContrast) params.set("contrast", "low");
  return params;
}
