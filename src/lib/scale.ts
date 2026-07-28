/**
 * Modular type scale.
 *
 * Pure functions, no dependencies — this runs on every slider tick in the
 * browser and has to stay inside the "< 50ms, client-side, no round trip"
 * budget from the TRD.
 */

export interface ScaleRatio {
  name: string;
  value: number;
  note: string;
}

export const RATIOS: ScaleRatio[] = [
  { name: "Minor second", value: 1.067, note: "Dense UI, data tables" },
  { name: "Major second", value: 1.125, note: "Compact product UI" },
  { name: "Minor third", value: 1.2, note: "Safe default for apps" },
  { name: "Major third", value: 1.25, note: "Marketing + editorial" },
  { name: "Perfect fourth", value: 1.333, note: "Classic web ratio" },
  { name: "Augmented fourth", value: 1.414, note: "High contrast" },
  { name: "Perfect fifth", value: 1.5, note: "Bold, few steps" },
  { name: "Golden ratio", value: 1.618, note: "Dramatic, display-led" },
];

export interface ScaleConfig {
  /** Body size in px. Everything is derived from this. */
  base: number;
  ratio: number;
  /** Steps above base, e.g. 5 gives you through to a hero size. */
  stepsUp: number;
  /** Steps below base, for captions and legal text. */
  stepsDown: number;
  /** Round px to this precision. 0 = no rounding. */
  round: 0 | 1 | 0.5;
  /** rem base for the rem column — almost always 16. */
  remBase: number;
}

export const DEFAULT_SCALE: ScaleConfig = {
  base: 16,
  ratio: 1.25,
  stepsUp: 5,
  stepsDown: 2,
  round: 1,
  remBase: 16,
};

export interface ScaleStep {
  /** 0 is the base size; negatives are below it. */
  step: number;
  /** Tailwind-ish name: xs, sm, base, lg, xl, 2xl … */
  name: string;
  px: number;
  rem: number;
  /** Suggested line height, tightening as size grows. */
  lineHeight: number;
  /** Suggested tracking in em — display sizes want negative tracking. */
  letterSpacing: number;
}

const DOWN_NAMES = ["sm", "xs", "2xs", "3xs", "4xs"];
const UP_NAMES = ["lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl"];

function stepName(step: number): string {
  if (step === 0) return "base";
  if (step < 0) return DOWN_NAMES[-step - 1] ?? `down-${-step}`;
  return UP_NAMES[step - 1] ?? `up-${step}`;
}

function roundTo(value: number, precision: ScaleConfig["round"]): number {
  if (precision === 0) return Number(value.toFixed(3));
  return Math.round(value / precision) * precision;
}

/**
 * Line height falls as size rises: long body copy needs air, headlines don't.
 * Curve chosen to land near 1.6 at 16px and near 1.05 at 60px.
 */
export function suggestLineHeight(px: number): number {
  const lh = 1.65 - 0.22 * Math.log2(px / 16);
  return Number(Math.min(1.7, Math.max(1, lh)).toFixed(2));
}

/** Optical tracking: tighten display sizes, open up small text. */
export function suggestLetterSpacing(px: number): number {
  if (px >= 48) return -0.022;
  if (px >= 32) return -0.018;
  if (px >= 24) return -0.012;
  if (px >= 20) return -0.006;
  if (px >= 14) return 0;
  return 0.01;
}

export function buildScale(config: ScaleConfig = DEFAULT_SCALE): ScaleStep[] {
  const { base, ratio, stepsUp, stepsDown, round, remBase } = config;
  const steps: ScaleStep[] = [];

  for (let step = -stepsDown; step <= stepsUp; step += 1) {
    const raw = base * Math.pow(ratio, step);
    const px = roundTo(raw, round);
    steps.push({
      step,
      name: stepName(step),
      px,
      rem: Number((px / remBase).toFixed(4)),
      lineHeight: suggestLineHeight(px),
      letterSpacing: suggestLetterSpacing(px),
    });
  }

  return steps.reverse(); // biggest first, the way designers read a scale
}

/** Ratio implied by two sizes — for reverse-engineering an existing design. */
export function inferRatio(smaller: number, larger: number, steps = 1): number {
  if (smaller <= 0 || steps <= 0) return 1;
  return Number(Math.pow(larger / smaller, 1 / steps).toFixed(3));
}

// --- exports -------------------------------------------------------------

export function toCssVariables(steps: ScaleStep[]): string {
  const lines = steps
    .slice()
    .reverse()
    .map(
      (s) =>
        `  --text-${s.name}: ${s.rem}rem;\n` +
        `  --text-${s.name}-line-height: ${s.lineHeight};\n` +
        `  --text-${s.name}-tracking: ${s.letterSpacing}em;`,
    );
  return `:root {\n${lines.join("\n")}\n}`;
}

export function toTailwindTheme(steps: ScaleStep[]): string {
  const lines = steps
    .slice()
    .reverse()
    .map(
      (s) =>
        `  --text-${s.name}: ${s.rem}rem;\n` +
        `  --text-${s.name}--line-height: ${s.lineHeight};\n` +
        `  --text-${s.name}--letter-spacing: ${s.letterSpacing}em;`,
    );
  return `@theme {\n${lines.join("\n")}\n}`;
}

export function toDesignTokens(steps: ScaleStep[], config: ScaleConfig): string {
  const sizes = Object.fromEntries(
    steps
      .slice()
      .reverse()
      .map((s) => [
        s.name,
        {
          value: `${s.rem}rem`,
          type: "dimension",
          $extensions: {
            px: s.px,
            lineHeight: s.lineHeight,
            letterSpacing: `${s.letterSpacing}em`,
          },
        },
      ]),
  );

  return JSON.stringify(
    {
      $schema: "https://tr.designtokens.org/format/",
      fontSize: sizes,
      $extensions: {
        "app.baseline.scale": {
          base: config.base,
          ratio: config.ratio,
          stepsUp: config.stepsUp,
          stepsDown: config.stepsDown,
        },
      },
    },
    null,
    2,
  );
}
