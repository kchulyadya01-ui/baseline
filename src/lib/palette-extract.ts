/**
 * Pull a colour palette out of an image.
 *
 * Deliberately arithmetic, not AI. The colours in a picture are a fact about
 * its pixels — asking a model to name them would be slower, cost money, and
 * return approximations of something we can measure exactly. Gemini is used
 * where judgement is needed; this is not that.
 *
 * Deterministic: the same image always yields the same palette, with no
 * seeding or iteration count to tune.
 */

import { oklchToHex, hexToOklch } from "./palette";

export interface ExtractedColour {
  hex: string;
  /** Share of sampled pixels this bucket accounts for, 0-1. */
  weight: number;
  role: "dominant" | "accent" | "neutral";
}

interface Pixel {
  r: number;
  g: number;
  b: number;
}

function toHex({ r, g, b }: Pixel): string {
  const part = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/**
 * @param rgba  raw RGBA bytes
 * @param count how many colours to return
 */
export function extractPalette(
  rgba: Uint8Array | Buffer,
  count = 6,
): ExtractedColour[] {
  const pixels: Pixel[] = [];
  const total = Math.floor(rgba.length / 4);

  // Sample rather than read every pixel: a phone photo is millions of pixels
  // and ~20k is far past the point where the palette stops changing.
  const step = Math.max(1, Math.floor(total / 20000));

  for (let i = 0; i < total; i += step) {
    const a = rgba[i * 4 + 3];
    if (a < 128) continue; // transparent areas are not part of the palette
    pixels.push({ r: rgba[i * 4], g: rgba[i * 4 + 1], b: rgba[i * 4 + 2] });
  }

  if (pixels.length === 0) return [];

  // Frequency over a quantised grid, not median cut.
  //
  // Median cut splits by pixel count and repeatedly cuts the *largest* cluster,
  // so on flat design colours it slices a dominant field in half while merging
  // two distinct ones — returning averages of colours that appear nowhere in
  // the image. Counting quantised colours instead finds the actual flat fields
  // exactly, and still degrades sensibly on photographs, where neighbouring
  // buckets simply merge in the dedup pass below.
  //
  // 5 bits per channel (>> 3): fine enough to keep near-neighbours apart, coarse
  // enough that JPEG noise lands in the same bucket.
  const BITS = 3;
  const counts = new Map<number, { n: number; r: number; g: number; b: number }>();

  for (const p of pixels) {
    const key =
      ((p.r >> BITS) << 10) | ((p.g >> BITS) << 5) | (p.b >> BITS);
    const bucket = counts.get(key);
    if (bucket) {
      bucket.n += 1;
      bucket.r += p.r;
      bucket.g += p.g;
      bucket.b += p.b;
    } else {
      counts.set(key, { n: 1, r: p.r, g: p.g, b: p.b });
    }
  }

  const sampled = pixels.length;

  const colours = [...counts.values()]
    .sort((a, b) => b.n - a.n)
    // Look at more buckets than requested: dedup will collapse the near ones.
    .slice(0, count * 5)
    .map((bucket) => {
      // Average the real member pixels, so the value is the colour actually
      // present rather than the centre of its grid cell.
      const hex = toHex({
        r: Math.round(bucket.r / bucket.n),
        g: Math.round(bucket.g / bucket.n),
        b: Math.round(bucket.b / bucket.n),
      });
      const oklch = hexToOklch(hex);
      const weight = bucket.n / sampled;
      return {
        hex,
        weight,
        role: (!oklch || oklch.c < 0.03
          ? "neutral"
          : weight > 0.18
            ? "dominant"
            : "accent") as ExtractedColour["role"],
        oklch,
      };
    });

  // Drop anything perceptually indistinguishable from a colour already kept.
  // Distance is measured in OKLCH because that is where "looks the same" and
  // "is numerically close" actually agree.
  const kept: typeof colours = [];
  for (const colour of colours) {
    if (kept.length >= count) break;
    if (colour.weight < 0.015) continue; // a sliver, not part of the palette
    const duplicate = kept.some((other) => {
      if (!colour.oklch || !other.oklch) return false;
      const dl = colour.oklch.l - other.oklch.l;
      const dc = colour.oklch.c - other.oklch.c;
      let dh = Math.abs(colour.oklch.h - other.oklch.h);
      if (dh > 180) dh = 360 - dh;
      // Hue matters less as chroma falls — two near-greys are the same colour
      // whatever their nominal hue.
      const chroma = Math.max(colour.oklch.c, other.oklch.c);
      return Math.hypot(dl, dc * 2, (dh / 180) * chroma * 2) < 0.06;
    });
    if (!duplicate) kept.push(colour);
  }

  return kept.map(({ hex, weight, role }) => ({ hex, weight, role }));
}

/**
 * Snap an extracted colour to a clean OKLCH value.
 *
 * Averaging pixels produces things like #3d5afd — visually identical to
 * #3d5afe but awkward in a spec. Round-tripping through OKLCH gives a value
 * that sits on the same ramp as everything the Colour Studio generates.
 */
export function tidy(hex: string): string {
  const oklch = hexToOklch(hex);
  if (!oklch) return hex;
  return oklchToHex({
    l: Math.round(oklch.l * 200) / 200,
    c: Math.round(oklch.c * 200) / 200,
    h: Math.round(oklch.h),
  });
}
