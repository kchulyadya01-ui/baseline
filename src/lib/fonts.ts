import "server-only";

import catalogue from "@/data/fonts.json";
import type {
  FontCatalogue,
  FontCategory,
  FontQuery,
  FontRecord,
  SortKey,
} from "./types";

/**
 * Catalogue access.
 *
 * The snapshot is a build-time import, so search is an in-process array scan —
 * no round trip, comfortably inside the "< 400ms server-rendered" budget for
 * ~2k rows. When the catalogue outgrows this (commercial index, Phase 4), the
 * only thing that changes is the body of `queryFonts`; every caller keeps working.
 */
const data = catalogue as unknown as FontCatalogue;

export const CATEGORIES: FontCategory[] = [
  "Sans Serif",
  "Serif",
  "Display",
  "Handwriting",
  "Monospace",
];

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Most popular" },
  { key: "newest", label: "Recently added" },
  { key: "name", label: "A–Z" },
  { key: "size", label: "Smallest file" },
];

export const DEFAULT_PER_PAGE = 48;

export function getCatalogueMeta() {
  return {
    count: data.count,
    ingestedAt: data.ingestedAt,
    source: data.source,
  };
}

export function allFonts(): FontRecord[] {
  return data.fonts;
}

export function getFont(slug: string): FontRecord | undefined {
  return data.fonts.find((f) => f.slug === slug);
}

/**
 * Look a family up by the name a stylesheet uses, which is rarely the name
 * Google publishes: "SourceCodePro", "Source Code Pro" and "source-code-pro"
 * are all the same face. Normalising to bare alphanumerics catches all three.
 */
const byNormalisedName = new Map<string, FontRecord>();
for (const font of data.fonts) {
  byNormalisedName.set(normaliseFamily(font.family), font);
}

export function normaliseFamily(family: string): string {
  return family.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function findFontByFamilyName(family: string): FontRecord | undefined {
  const key = normaliseFamily(family);
  const direct = byNormalisedName.get(key);
  if (direct) return direct;

  // Variable-font builds often append a suffix: "InterVariable", "Roboto-VF".
  const stripped = key.replace(/(variable|vf|var)$/, "");
  return stripped !== key ? byNormalisedName.get(stripped) : undefined;
}

/** Every subset present in the catalogue, most common first. */
export function subsetOptions(): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const font of data.fonts) {
    for (const subset of font.subsets) {
      counts.set(subset, (counts.get(subset) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function matches(font: FontRecord, needle: string): boolean {
  if (font.family.toLowerCase().includes(needle)) return true;
  if (font.slug.includes(needle)) return true;
  return font.designers.some((d) => d.toLowerCase().includes(needle));
}

/** Exact family match, then prefix, then substring — so "inter" ranks Inter first. */
function relevance(font: FontRecord, needle: string): number {
  const name = font.family.toLowerCase();
  if (name === needle) return 0;
  if (name.startsWith(needle)) return 1;
  if (name.includes(needle)) return 2;
  return 3;
}

const comparators: Record<SortKey, (a: FontRecord, b: FontRecord) => number> = {
  popular: (a, b) => a.popularity - b.popularity,
  newest: (a, b) => b.dateAdded.localeCompare(a.dateAdded),
  name: (a, b) => a.family.localeCompare(b.family),
  size: (a, b) => a.sizeBytes - b.sizeBytes,
};

export interface FontQueryResult {
  fonts: FontRecord[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export function queryFonts(query: FontQuery = {}): FontQueryResult {
  const {
    q = "",
    category = "all",
    subset,
    variable,
    italic,
    license = "all",
    sort = "popular",
    page = 1,
    perPage = DEFAULT_PER_PAGE,
  } = query;

  const needle = q.trim().toLowerCase();

  let results = data.fonts.filter((font) => {
    if (category !== "all" && font.category !== category) return false;
    if (subset && !font.subsets.includes(subset)) return false;
    if (variable && !font.isVariable) return false;
    if (italic && !font.hasItalic) return false;
    if (license !== "all" && font.license.id !== license) return false;
    if (needle && !matches(font, needle)) return false;
    return true;
  });

  results = needle
    ? results.sort(
        (a, b) =>
          relevance(a, needle) - relevance(b, needle) || comparators[sort](a, b),
      )
    : results.sort(comparators[sort]);

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;

  return {
    fonts: results.slice(start, start + perPage),
    total,
    page: safePage,
    perPage,
    totalPages,
  };
}

/** Same category, nearest popularity — a cheap "if you like this" without embeddings. */
export function similarFonts(font: FontRecord, limit = 6): FontRecord[] {
  return data.fonts
    .filter((f) => f.slug !== font.slug && f.category === font.category)
    .sort(
      (a, b) =>
        Math.abs(a.popularity - font.popularity) -
        Math.abs(b.popularity - font.popularity),
    )
    .slice(0, limit);
}

export { fontCssUrl, fontsCssUrl, fontStack, formatBytes } from "./font-url";
