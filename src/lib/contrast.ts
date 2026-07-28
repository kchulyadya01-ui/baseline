/**
 * WCAG 2.1 contrast.
 *
 * Deliberately the plain formula, not a model: contrast is a fixed calculation
 * and the answer has to be the same one an auditor gets. Runs client-side on
 * every palette change (< 100ms for a whole palette, per the TRD).
 */

export type Rgb = { r: number; g: number; b: number };

export function parseHex(hex: string): Rgb | null {
  let value = hex.trim().replace(/^#/, "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio, 1–21. Order of arguments does not matter. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

export function contrastRatioHex(a: string, b: string): number | null {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return null;
  return contrastRatio(ca, cb);
}

export type WcagLevel = "AAA" | "AA" | "AA Large" | "Fail";

export interface ContrastVerdict {
  ratio: number;
  /** Body copy under 18pt / 14pt bold. */
  normalText: { aa: boolean; aaa: boolean };
  /** 18pt+ or 14pt+ bold. */
  largeText: { aa: boolean; aaa: boolean };
  /** Icons, borders, form outlines — WCAG 1.4.11. */
  uiComponents: boolean;
  level: WcagLevel;
}

export function judge(ratio: number): ContrastVerdict {
  const normalAa = ratio >= 4.5;
  const normalAaa = ratio >= 7;
  const largeAa = ratio >= 3;
  const largeAaa = ratio >= 4.5;

  const level: WcagLevel = normalAaa
    ? "AAA"
    : normalAa
      ? "AA"
      : largeAa
        ? "AA Large"
        : "Fail";

  return {
    ratio,
    normalText: { aa: normalAa, aaa: normalAaa },
    largeText: { aa: largeAa, aaa: largeAaa },
    uiComponents: ratio >= 3,
    level,
  };
}

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

/**
 * Nudge `foreground` along its own lightness until it clears `target` against
 * `background`. This is the "apply fix" branch of Flow A — the tool has to
 * offer the repair, not just the verdict.
 *
 * Returns null when even pure black and pure white both fail, which only
 * happens for mid-grey backgrounds at AAA.
 */
export function suggestAccessible(
  foreground: string,
  background: string,
  target = 4.5,
): string | null {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  if (!fg || !bg) return null;
  if (contrastRatio(fg, bg) >= target) return foreground;

  const bgLuminance = relativeLuminance(bg);
  // Push away from the background: darken on light, lighten on dark.
  const direction = bgLuminance > 0.35 ? -1 : 1;

  const mixTo = direction === -1 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };

  let best: string | null = null;
  for (let amount = 0.02; amount <= 1.0001; amount += 0.02) {
    const candidate: Rgb = {
      r: fg.r + (mixTo.r - fg.r) * amount,
      g: fg.g + (mixTo.g - fg.g) * amount,
      b: fg.b + (mixTo.b - fg.b) * amount,
    };
    if (contrastRatio(candidate, bg) >= target) {
      best = toHex(candidate);
      break;
    }
  }

  if (best) return best;

  // Last resort: whichever extreme actually passes.
  const black = { r: 0, g: 0, b: 0 };
  const white = { r: 255, g: 255, b: 255 };
  if (contrastRatio(black, bg) >= target) return "#000000";
  if (contrastRatio(white, bg) >= target) return "#ffffff";
  return null;
}
