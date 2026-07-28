import { clampChroma, converter, formatHex, oklch as toOklch } from "culori";

/**
 * Palette generation in OKLCH.
 *
 * OKLCH because it is perceptually uniform: hold lightness constant across
 * hues and the swatches actually look equally light, which HSL never manages.
 * Ramps are a library here, not a model — same input, same output, every time.
 */

export interface Oklch {
  l: number; // 0–1
  c: number; // 0–0.4ish
  h: number; // 0–360
}

const rgb = converter("rgb");

export function hexToOklch(hex: string): Oklch | null {
  const parsed = toOklch(hex);
  if (!parsed) return null;
  return { l: parsed.l ?? 0, c: parsed.c ?? 0, h: parsed.h ?? 0 };
}

export function oklchToHex({ l, c, h }: Oklch): string {
  const clamped = clampChroma({ mode: "oklch", l, c, h }, "oklch");
  return formatHex(clamped) ?? "#000000";
}

export function isInSrgb({ l, c, h }: Oklch): boolean {
  const converted = rgb({ mode: "oklch", l, c, h });
  if (!converted) return false;
  const eps = 1e-4;
  return (
    converted.r >= -eps &&
    converted.r <= 1 + eps &&
    converted.g >= -eps &&
    converted.g <= 1 + eps &&
    converted.b >= -eps &&
    converted.b <= 1 + eps
  );
}

export const RAMP_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** Target lightness per stop. Tuned so 500 sits where a brand colour usually lives. */
const RAMP_LIGHTNESS: Record<number, number> = {
  50: 0.975,
  100: 0.945,
  200: 0.895,
  300: 0.83,
  400: 0.74,
  500: 0.64,
  600: 0.55,
  700: 0.47,
  800: 0.39,
  900: 0.31,
  950: 0.23,
};

export interface RampStep {
  stop: number;
  hex: string;
  oklch: Oklch;
  /** True when the requested chroma had to be pulled in to fit sRGB. */
  clamped: boolean;
}

/**
 * Chroma follows a bell curve across the ramp: near-white and near-black tints
 * hold very little chroma before they look muddy, mid-tones hold the most.
 */
function chromaAt(stop: number, seedChroma: number): number {
  const t = RAMP_LIGHTNESS[stop];
  const bell = 1 - Math.pow(Math.abs(t - 0.62) / 0.62, 1.6);
  return Math.max(0.004, seedChroma * Math.max(0.08, bell));
}

export function buildRamp(seedHex: string): RampStep[] {
  const seed = hexToOklch(seedHex);
  if (!seed) return [];

  return RAMP_STOPS.map((stop) => {
    const target: Oklch = {
      l: RAMP_LIGHTNESS[stop],
      c: chromaAt(stop, seed.c),
      h: seed.h,
    };
    const clamped = !isInSrgb(target);
    const hex = oklchToHex(target);
    return { stop, hex, oklch: hexToOklch(hex) ?? target, clamped };
  });
}

/** The ramp stop closest in lightness to the seed — where the brand colour "is". */
export function nearestStop(seedHex: string): number {
  const seed = hexToOklch(seedHex);
  if (!seed) return 500;
  return RAMP_STOPS.reduce((best, stop) =>
    Math.abs(RAMP_LIGHTNESS[stop] - seed.l) <
    Math.abs(RAMP_LIGHTNESS[best] - seed.l)
      ? stop
      : best,
  );
}

// --- harmony -------------------------------------------------------------

export type Harmony =
  | "complementary"
  | "analogous"
  | "triadic"
  | "split"
  | "tetradic"
  | "monochrome";

export const HARMONIES: { key: Harmony; label: string; note: string }[] = [
  { key: "monochrome", label: "Monochrome", note: "One hue, full range" },
  { key: "analogous", label: "Analogous", note: "Calm, closely related" },
  { key: "complementary", label: "Complementary", note: "Maximum tension" },
  { key: "split", label: "Split complement", note: "Contrast, less shouty" },
  { key: "triadic", label: "Triadic", note: "Balanced and vivid" },
  { key: "tetradic", label: "Tetradic", note: "Four-way, needs a lead" },
];

const OFFSETS: Record<Harmony, number[]> = {
  monochrome: [0],
  analogous: [0, -30, 30],
  complementary: [0, 180],
  split: [0, 150, 210],
  triadic: [0, 120, 240],
  tetradic: [0, 90, 180, 270],
};

export function harmonyHexes(seedHex: string, harmony: Harmony): string[] {
  const seed = hexToOklch(seedHex);
  if (!seed) return [seedHex];
  return OFFSETS[harmony].map((offset) =>
    oklchToHex({ ...seed, h: (seed.h + offset + 360) % 360 }),
  );
}

// --- roles ---------------------------------------------------------------

export interface Swatch {
  /** Semantic role, which is what actually gets exported as a token. */
  role: string;
  hex: string;
  locked?: boolean;
}

export const DEFAULT_ROLES = [
  "primary",
  "secondary",
  "accent",
  "neutral",
  "surface",
] as const;

// --- exports -------------------------------------------------------------

export function paletteToCss(swatches: Swatch[], ramps: Record<string, RampStep[]>): string {
  const lines: string[] = [];
  for (const swatch of swatches) {
    lines.push(`  /* ${swatch.role} */`);
    lines.push(`  --color-${swatch.role}: ${swatch.hex};`);
    for (const step of ramps[swatch.role] ?? []) {
      lines.push(`  --color-${swatch.role}-${step.stop}: ${step.hex};`);
    }
  }
  return `:root {\n${lines.join("\n")}\n}`;
}

export function paletteToTailwind(
  swatches: Swatch[],
  ramps: Record<string, RampStep[]>,
): string {
  const lines: string[] = [];
  for (const swatch of swatches) {
    for (const step of ramps[swatch.role] ?? []) {
      lines.push(`  --color-${swatch.role}-${step.stop}: ${step.hex};`);
    }
  }
  return `@theme {\n${lines.join("\n")}\n}`;
}

export function paletteToTokens(
  swatches: Swatch[],
  ramps: Record<string, RampStep[]>,
): string {
  const color: Record<string, unknown> = {};
  for (const swatch of swatches) {
    const scale: Record<string, unknown> = {};
    for (const step of ramps[swatch.role] ?? []) {
      scale[String(step.stop)] = {
        value: step.hex,
        type: "color",
        $extensions: {
          oklch: `oklch(${(step.oklch.l * 100).toFixed(1)}% ${step.oklch.c.toFixed(3)} ${step.oklch.h.toFixed(1)})`,
        },
      };
    }
    color[swatch.role] = { base: { value: swatch.hex, type: "color" }, ...scale };
  }
  return JSON.stringify(
    { $schema: "https://tr.designtokens.org/format/", color },
    null,
    2,
  );
}
