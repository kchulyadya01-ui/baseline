import type { FontRecord } from "./types";

/**
 * Google Fonts CSS2 URL building. Pure, so client components can use it too.
 *
 * Phase 1 serves specimens from Google's CDN. The TRD's self-hosted .woff2
 * requirement lands with the export engine in Phase 2 — export has to ship the
 * real files plus licence text anyway, so the CDN work belongs there.
 */

export function familyParam(family: string): string {
  return family.replace(/ /g, "+");
}

/** One stylesheet for a whole grid of previews — 48 families, one request. */
export function fontsCssUrl(families: string[], weights: number[] = [400]): string {
  const params = families
    .map((f) => `family=${familyParam(f)}:wght@${weights.join(";")}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/** Full stylesheet for a single family: every weight it actually ships. */
export function fontCssUrl(
  font: Pick<FontRecord, "family" | "weights" | "hasItalic">,
  opts: { weights?: number[]; italic?: boolean } = {},
): string {
  const requested = (opts.weights ?? font.weights).filter((w) =>
    font.weights.includes(w),
  );
  const list = requested.length ? requested : [400];
  const italic = (opts.italic ?? font.hasItalic) && font.hasItalic;

  const spec = italic
    ? `ital,wght@${list.flatMap((w) => [`0,${w}`, `1,${w}`]).join(";")}`
    : `wght@${list.join(";")}`;

  return `https://fonts.googleapis.com/css2?family=${familyParam(font.family)}:${spec}&display=swap`;
}

export function googleFontsPageUrl(family: string): string {
  return `https://fonts.google.com/specimen/${familyParam(family)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** CSS font-family stack with a category-appropriate fallback. */
export function fontStack(font: Pick<FontRecord, "family" | "category">): string {
  const fallbacks: Record<string, string> = {
    "Sans Serif": "sans-serif",
    Serif: "serif",
    Monospace: "monospace",
    Display: "cursive",
    Handwriting: "cursive",
  };
  return `'${font.family}', ${fallbacks[font.category] ?? "sans-serif"}`;
}
