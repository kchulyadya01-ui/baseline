import "server-only";

import { allFonts, getFont, normaliseFamily } from "./fonts";
import type { FontRecord } from "./types";

/**
 * Free alternatives for commercial faces.
 *
 * A curated seed list, not a similarity model: "what can I use instead of
 * Helvetica Now" is a judgement call about voice, and a designer's answer beats
 * a distance metric. This is the file the design/domain side owns — Phase 3
 * calls it "free-alternative curation".
 *
 * Keys are lowercased family names as they appear in CSS.
 */
const CURATED: Record<string, string[]> = {
  // Grotesques
  helvetica: ["inter", "archivo", "manrope"],
  "helvetica neue": ["inter", "archivo", "manrope"],
  "helvetica now": ["inter", "archivo", "figtree"],
  arial: ["arimo", "inter", "public-sans"],
  "neue haas grotesk": ["inter", "archivo", "public-sans"],
  "aktiv grotesk": ["inter", "archivo", "manrope"],
  "founders grotesk": ["archivo", "space-grotesk", "figtree"],
  "suisse int'l": ["inter", "archivo", "public-sans"],
  graphik: ["figtree", "manrope", "inter"],
  "gt america": ["archivo", "inter", "public-sans"],
  circular: ["nunito-sans", "figtree", "manrope"],
  "proxima nova": ["montserrat", "figtree", "nunito-sans"],
  "brandon grotesque": ["josefin-sans", "montserrat", "raleway"],
  gotham: ["montserrat", "figtree", "archivo"],
  avenir: ["nunito-sans", "figtree", "montserrat"],
  "avenir next": ["nunito-sans", "figtree", "montserrat"],
  futura: ["jost", "poppins", "questrial"],
  "din next": ["barlow", "archivo-narrow", "saira"],
  "univers": ["roboto-condensed", "barlow", "archivo"],
  "sofia pro": ["poppins", "figtree", "manrope"],
  "national 2": ["archivo", "inter", "public-sans"],
  sohne: ["inter", "archivo", "public-sans"],
  "söhne": ["inter", "archivo", "public-sans"],
  "gt walsheim": ["poppins", "figtree", "jost"],
  "maison neue": ["archivo", "inter", "manrope"],
  "neue montreal": ["archivo", "space-grotesk", "inter"],
  "untitled sans": ["inter", "public-sans", "archivo"],
  "basis grotesque": ["archivo", "space-grotesk", "inter"],
  "apercu": ["figtree", "jost", "manrope"],
  "moderat": ["archivo", "inter", "figtree"],

  // Text serifs
  garamond: ["eb-garamond", "cormorant-garamond", "crimson-pro"],
  "adobe garamond": ["eb-garamond", "cormorant-garamond", "spectral"],
  "minion pro": ["crimson-pro", "source-serif-4", "spectral"],
  caslon: ["libre-caslon-text", "eb-garamond", "lora"],
  baskerville: ["libre-baskerville", "eb-garamond", "lora"],
  georgia: ["gelasio", "lora", "source-serif-4"],
  "times new roman": ["tinos", "source-serif-4", "lora"],
  "freight text": ["source-serif-4", "spectral", "lora"],
  tiempos: ["source-serif-4", "spectral", "crimson-pro"],
  "canela": ["playfair-display", "cormorant", "bodoni-moda"],
  "gt sectra": ["fraunces", "young-serif", "instrument-serif"],
  didot: ["bodoni-moda", "playfair-display", "cormorant"],
  bodoni: ["bodoni-moda", "playfair-display", "libre-bodoni"],
  "publico": ["source-serif-4", "spectral", "newsreader"],

  // Monospace
  "sf mono": ["jetbrains-mono", "ibm-plex-mono", "roboto-mono"],
  "operator mono": ["jetbrains-mono", "fira-code", "victor-mono"],
  "berkeley mono": ["jetbrains-mono", "ibm-plex-mono", "space-mono"],
  menlo: ["ibm-plex-mono", "jetbrains-mono", "roboto-mono"],
  consolas: ["jetbrains-mono", "ibm-plex-mono", "inconsolata"],

  // Apple / Microsoft system faces — not licensable for the web at all
  "sf pro": ["inter", "figtree", "public-sans"],
  "sf pro display": ["inter", "figtree", "manrope"],
  "sf pro text": ["inter", "public-sans", "figtree"],
  "-apple-system": ["inter", "public-sans", "figtree"],
  "segoe ui": ["inter", "public-sans", "open-sans"],
  calibri: ["carlito", "open-sans", "lato"],
  cambria: ["caladea", "source-serif-4", "lora"],
  verdana: ["open-sans", "noto-sans", "inter"],
  tahoma: ["open-sans", "noto-sans", "inter"],
};

export interface Alternative {
  font: FontRecord;
  reason: string;
}

/** Fallback when the name isn't in the curated list: popular faces per category. */
const CATEGORY_FALLBACK: Record<string, string[]> = {
  serif: ["source-serif-4", "lora", "spectral"],
  mono: ["jetbrains-mono", "ibm-plex-mono", "roboto-mono"],
  display: ["playfair-display", "fraunces", "archivo-black"],
  script: ["dancing-script", "caveat", "great-vibes"],
  sans: ["inter", "figtree", "manrope"],
};

function guessCategory(family: string): keyof typeof CATEGORY_FALLBACK {
  const name = family.toLowerCase();
  if (/(mono|code|consol|courier|typewriter)/.test(name)) return "mono";
  if (/(serif|garamond|caslon|baskerv|bodoni|didot|times|georgia|roman)/.test(name))
    return "serif";
  if (/(script|hand|brush|signature|calligra)/.test(name)) return "script";
  if (/(display|black|poster|headline|stencil)/.test(name)) return "display";
  return "sans";
}

/**
 * Alternatives for a family that isn't in the open-licence catalogue.
 * Returns [] for families we already have — there's nothing to substitute.
 */
/**
 * CSS never spells a family the way a foundry does: "SF Pro Display" arrives as
 * "SFProDisplay", "sf-pro-display" or "SFProDisplay-Regular". Index the curated
 * keys the same way we normalise catalogue names so all of those land.
 */
const CURATED_BY_KEY = new Map(
  Object.entries(CURATED).map(([name, slugs]) => [normaliseFamily(name), slugs]),
);

const WEIGHT_SUFFIX =
  /(thin|extralight|ultralight|light|regular|book|medium|semibold|demibold|bold|extrabold|black|heavy|italic|oblique|variable|vf|var|web|text|display)+$/;

function curatedFor(family: string): string[] | undefined {
  const key = normaliseFamily(family);
  const direct = CURATED_BY_KEY.get(key);
  if (direct) return direct;

  // "sohnevar" -> "sohne", "helveticaneuebold" -> "helveticaneue"
  const stripped = key.replace(WEIGHT_SUFFIX, "");
  return stripped && stripped !== key ? CURATED_BY_KEY.get(stripped) : undefined;
}

export function freeAlternatives(family: string, limit = 3): Alternative[] {
  const curated = curatedFor(family);

  if (curated) {
    const found = curated
      .map((slug) => getFont(slug))
      .filter((f): f is FontRecord => Boolean(f))
      .slice(0, limit);
    if (found.length) {
      return found.map((font, index) => ({
        font,
        reason:
          index === 0
            ? `Closest match in proportion and weight range`
            : `Curated alternative to ${family}`,
      }));
    }
  }

  const fallback = CATEGORY_FALLBACK[guessCategory(family)]
    .map((slug) => getFont(slug))
    .filter((f): f is FontRecord => Boolean(f))
    .slice(0, limit);

  if (fallback.length) {
    return fallback.map((font) => ({
      font,
      reason: `Popular open-licence ${font.category.toLowerCase()} face`,
    }));
  }

  // Last resort: whatever the catalogue's most popular families are.
  return allFonts()
    .slice(0, limit)
    .map((font) => ({ font, reason: "Widely used open-licence family" }));
}
