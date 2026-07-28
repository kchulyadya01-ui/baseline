"use client";

import { useMemo, useState } from "react";
import { CodeBlock } from "@/components/ui/copy";
import { Badge, Input, Label } from "@/components/ui/primitives";
import {
  contrastRatioHex,
  formatRatio,
  judge,
  suggestAccessible,
} from "@/lib/contrast";
import {
  buildRamp,
  harmonyHexes,
  HARMONIES,
  hexToOklch,
  nearestStop,
  paletteToCss,
  paletteToTailwind,
  paletteToTokens,
  type Harmony,
  type RampStep,
  type Swatch,
} from "@/lib/palette";
import { cn } from "@/lib/utils";

const INITIAL: Swatch[] = [
  { role: "primary", hex: "#3d5afe" },
  { role: "neutral", hex: "#4a5568" },
  { role: "surface", hex: "#f7f8fa" },
];

type ExportFormat = "css" | "tailwind" | "tokens";

export function ColourStudio() {
  const [swatches, setSwatches] = useState<Swatch[]>(INITIAL);
  const [harmony, setHarmony] = useState<Harmony>("monochrome");
  const [format, setFormat] = useState<ExportFormat>("css");

  const ramps = useMemo(() => {
    const out: Record<string, RampStep[]> = {};
    for (const swatch of swatches) out[swatch.role] = buildRamp(swatch.hex);
    return out;
  }, [swatches]);

  const pairs = useMemo(() => buildPairs(swatches, ramps), [swatches, ramps]);
  const failing = pairs.filter((p) => !p.verdict.normalText.aa);

  const exported = useMemo(() => {
    if (format === "css") return paletteToCss(swatches, ramps);
    if (format === "tailwind") return paletteToTailwind(swatches, ramps);
    return paletteToTokens(swatches, ramps);
  }, [format, swatches, ramps]);

  function setHex(role: string, hex: string) {
    setSwatches((prev) =>
      prev.map((s) => (s.role === role ? { ...s, hex } : s)),
    );
  }

  function applyHarmony(next: Harmony) {
    setHarmony(next);
    const hexes = harmonyHexes(swatches[0].hex, next);
    if (next === "monochrome") return;
    setSwatches((prev) =>
      prev.map((s, i) => (i === 0 ? s : { ...s, hex: hexes[i] ?? s.hex })),
    );
  }

  function addSwatch() {
    const role = `custom-${swatches.length + 1}`;
    setSwatches((prev) => [...prev, { role, hex: "#7c3aed" }]);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[19rem_1fr]">
      <aside className="lg:sticky lg:top-32 lg:self-start">
        <div className="space-y-5 rounded-card border border-line bg-bg-raised p-5">
          <div>
            <div className="label-mono mb-2">Swatches</div>
            <div className="space-y-2.5">
              {swatches.map((swatch) => (
                <SwatchRow
                  key={swatch.role}
                  swatch={swatch}
                  onChange={(hex) => setHex(swatch.role, hex)}
                  onRemove={
                    swatches.length > 1
                      ? () =>
                          setSwatches((prev) =>
                            prev.filter((s) => s.role !== swatch.role),
                          )
                      : undefined
                  }
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addSwatch}
              className="mt-3 w-full rounded-control border border-dashed border-line-strong py-2 text-xs text-fg-muted hover:text-fg"
            >
              + Add swatch
            </button>
          </div>

          <div className="border-t border-line pt-5">
            <div className="label-mono mb-2">Harmony from primary</div>
            <div className="flex flex-wrap gap-1">
              {HARMONIES.map((h) => (
                <button
                  key={h.key}
                  type="button"
                  title={h.note}
                  onClick={() => applyHarmony(h.key)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-2xs transition-colors",
                    harmony === h.key
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-line-strong text-fg-muted hover:text-fg",
                  )}
                >
                  {h.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-2xs text-fg-subtle">
              {HARMONIES.find((h) => h.key === harmony)?.note}
            </p>
          </div>

          <div
            className={cn(
              "rounded-control border p-3 text-xs",
              failing.length
                ? "border-danger/30 bg-danger-soft text-danger"
                : "border-success/30 bg-success-soft text-success",
            )}
          >
            {failing.length ? (
              <>
                <strong>{failing.length}</strong> pair
                {failing.length === 1 ? "" : "s"} below AA. Fix them before
                export.
              </>
            ) : (
              <>Every text pair clears WCAG AA.</>
            )}
          </div>
        </div>
      </aside>

      <div className="min-w-0 space-y-10">
        {swatches.map((swatch) => (
          <section key={swatch.role}>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-base font-semibold">
                {swatch.role}
              </h2>
              <span className="label-mono">
                {describeOklch(swatch.hex)}
              </span>
            </div>
            <Ramp
              steps={ramps[swatch.role] ?? []}
              seedStop={nearestStop(swatch.hex)}
              onPick={(hex) => setHex(swatch.role, hex)}
            />
          </section>
        ))}

        <section>
          <h2 className="label-mono mb-3">Contrast pairs</h2>
          <div className="overflow-hidden rounded-card border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-sunken">
                  <th className="px-4 py-2.5 text-left font-medium">Pair</th>
                  <th className="px-4 py-2.5 text-left font-medium">Preview</th>
                  <th className="px-4 py-2.5 text-right font-medium">Ratio</th>
                  <th className="px-4 py-2.5 text-right font-medium">Verdict</th>
                  <th className="px-4 py-2.5 text-right font-medium">Fix</th>
                </tr>
              </thead>
              <tbody>
                {pairs.map((pair) => (
                  <tr
                    key={pair.label}
                    className="border-b border-line last:border-b-0"
                  >
                    <td className="px-4 py-3 font-mono text-2xs text-fg-muted">
                      {pair.label}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block rounded px-2.5 py-1 text-sm"
                        style={{
                          background: pair.background,
                          color: pair.foreground,
                        }}
                      >
                        Sample text
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatRatio(pair.verdict.ratio)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge
                        tone={
                          pair.verdict.level === "Fail"
                            ? "danger"
                            : pair.verdict.level === "AA Large"
                              ? "warning"
                              : "success"
                        }
                      >
                        {pair.verdict.level}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {pair.verdict.normalText.aa ? (
                        <span className="text-2xs text-fg-subtle">—</span>
                      ) : pair.fix ? (
                        <button
                          type="button"
                          onClick={() => setHex(pair.foregroundRole, pair.fix!)}
                          className="font-mono text-2xs text-accent underline underline-offset-4"
                        >
                          use {pair.fix}
                        </button>
                      ) : (
                        <span className="text-2xs text-fg-subtle">
                          no fix at this hue
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-2xs text-fg-subtle">
            WCAG 2.1: AA needs 4.5:1 for body copy, 3:1 for large text (18pt, or
            14pt bold) and UI components. AAA needs 7:1.
          </p>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="label-mono">Export</h2>
            <div className="flex gap-1">
              {(
                [
                  ["css", "CSS variables"],
                  ["tailwind", "Tailwind v4"],
                  ["tokens", "Design tokens"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormat(key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    format === key
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-line-strong text-fg-muted hover:text-fg",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <CodeBlock
            code={exported}
            language={format === "tokens" ? "json" : "css"}
          />
        </section>
      </div>
    </div>
  );
}

function SwatchRow({
  swatch,
  onChange,
  onRemove,
}: {
  swatch: Swatch;
  onChange: (hex: string) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={swatch.hex}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${swatch.role} colour`}
        className="h-8 w-8 shrink-0 rounded-md"
      />
      <div className="min-w-0 flex-1">
        <Label className="truncate">{swatch.role}</Label>
        <Input
          value={swatch.hex}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${swatch.role} hex`}
          spellCheck={false}
          className="mt-0.5 h-7 font-mono text-xs"
        />
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${swatch.role}`}
          className="shrink-0 px-1 text-fg-subtle hover:text-danger"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

function Ramp({
  steps,
  seedStop,
  onPick,
}: {
  steps: RampStep[];
  seedStop: number;
  onPick: (hex: string) => void;
}) {
  return (
    <div className="grid grid-cols-6 overflow-hidden rounded-card border border-line sm:grid-cols-11">
      {steps.map((step) => {
        const onLight = (contrastRatioHex("#111318", step.hex) ?? 1) >= 4.5;
        return (
          <button
            key={step.stop}
            type="button"
            onClick={() => onPick(step.hex)}
            title={`${step.hex}${step.clamped ? " (clamped to sRGB)" : ""}`}
            className="group relative aspect-[3/4] w-full"
            style={{ background: step.hex }}
          >
            <span
              className="absolute inset-x-0 bottom-1 text-center font-mono text-[9px]"
              style={{ color: onLight ? "#111318" : "#ffffff" }}
            >
              {step.stop}
            </span>
            {step.stop === seedStop ? (
              <span
                className="absolute inset-x-0 top-1 text-center font-mono text-[9px]"
                style={{ color: onLight ? "#111318" : "#ffffff" }}
              >
                ●
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

interface Pair {
  label: string;
  foreground: string;
  background: string;
  foregroundRole: string;
  verdict: ReturnType<typeof judge>;
  fix: string | null;
}

/**
 * Every swatch against the lightest and darkest ends of each ramp — the pairs
 * a designer actually ships: text on surface, text on brand.
 */
function buildPairs(
  swatches: Swatch[],
  ramps: Record<string, RampStep[]>,
): Pair[] {
  const backgrounds: { label: string; hex: string }[] = [
    { label: "white", hex: "#ffffff" },
    { label: "near-black", hex: "#111318" },
  ];

  for (const swatch of swatches) {
    const ramp = ramps[swatch.role] ?? [];
    const light = ramp.find((s) => s.stop === 100);
    if (light) backgrounds.push({ label: `${swatch.role}-100`, hex: light.hex });
  }

  const pairs: Pair[] = [];
  for (const swatch of swatches) {
    for (const background of backgrounds) {
      const ratio = contrastRatioHex(swatch.hex, background.hex);
      if (ratio === null) continue;
      const verdict = judge(ratio);
      pairs.push({
        label: `${swatch.role} on ${background.label}`,
        foreground: swatch.hex,
        background: background.hex,
        foregroundRole: swatch.role,
        verdict,
        fix: verdict.normalText.aa
          ? null
          : suggestAccessible(swatch.hex, background.hex, 4.5),
      });
    }
  }
  return pairs;
}

function describeOklch(hex: string): string {
  const value = hexToOklch(hex);
  if (!value) return hex;
  return `L ${(value.l * 100).toFixed(0)}% · C ${value.c.toFixed(3)} · H ${value.h.toFixed(0)}°`;
}
