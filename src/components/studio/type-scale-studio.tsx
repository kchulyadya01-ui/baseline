"use client";

import { useMemo, useState } from "react";
import { CodeBlock } from "@/components/ui/copy";
import { Input, Label, Select } from "@/components/ui/primitives";
import { fontStack } from "@/lib/font-url";
import {
  buildScale,
  DEFAULT_SCALE,
  RATIOS,
  toCssVariables,
  toDesignTokens,
  toTailwindTheme,
  type ScaleConfig,
} from "@/lib/scale";
import { cn } from "@/lib/utils";

export interface FontOption {
  slug: string;
  family: string;
  category: string;
}

const PREVIEW_COPY: Record<string, string> = {
  "8xl": "Baseline",
  "7xl": "Baseline",
  "6xl": "Baseline",
  "5xl": "Set the scale once",
  "4xl": "Set the scale once",
  "3xl": "Every size, one ratio",
  "2xl": "Every size, one ratio",
  xl: "A heading that has to hold a page together",
  lg: "A heading that has to hold a page together",
  base: "Body copy is the size everything else is measured against. Get it right first, then let the ratio do the rest.",
  sm: "Supporting copy, captions, form hints.",
  xs: "Legal, metadata, timestamps.",
  "2xs": "The smallest thing you should ever ship.",
};

type ExportFormat = "css" | "tailwind" | "tokens";

export function TypeScaleStudio({
  fonts,
  initialFont,
}: {
  fonts: FontOption[];
  initialFont?: FontOption;
}) {
  const [config, setConfig] = useState<ScaleConfig>(DEFAULT_SCALE);
  const [headingFont, setHeadingFont] = useState(
    initialFont?.family ?? "Inter Tight",
  );
  const [bodyFont, setBodyFont] = useState("Inter");
  const [format, setFormat] = useState<ExportFormat>("css");

  const steps = useMemo(() => buildScale(config), [config]);

  const exported = useMemo(() => {
    if (format === "css") return toCssVariables(steps);
    if (format === "tailwind") return toTailwindTheme(steps);
    return toDesignTokens(steps, config);
  }, [format, steps, config]);

  const set = <K extends keyof ScaleConfig>(key: K, value: ScaleConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const families = [headingFont, bodyFont].filter(
    (f, i, arr) => arr.indexOf(f) === i,
  );

  return (
    <>
      {/* Preview fonts are user-chosen, so the stylesheet is built at render. */}
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?${families
          .map((f) => `family=${f.replace(/ /g, "+")}:wght@400;500;700`)
          .join("&")}&display=swap`}
      />

      <div className="grid gap-8 lg:grid-cols-[19rem_1fr]">
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="space-y-6 rounded-card border border-line bg-bg-raised p-5">
            <div>
              <Label htmlFor="base">Base size · {config.base}px</Label>
              <input
                id="base"
                type="range"
                min={12}
                max={24}
                step={1}
                value={config.base}
                onChange={(e) => set("base", Number(e.target.value))}
                className="mt-1"
              />
              <p className="mt-1 text-2xs text-fg-subtle">
                16px is the browser default. Below 14px, body copy starts to hurt.
              </p>
            </div>

            <div>
              <Label htmlFor="ratio">Ratio · {config.ratio}</Label>
              <input
                id="ratio"
                type="range"
                min={1.05}
                max={1.7}
                step={0.001}
                value={config.ratio}
                onChange={(e) => set("ratio", Number(e.target.value))}
                className="mt-1"
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {RATIOS.map((r) => (
                  <button
                    key={r.name}
                    type="button"
                    title={r.note}
                    onClick={() => set("ratio", r.value)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-2xs transition-colors",
                      Math.abs(config.ratio - r.value) < 0.001
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-line-strong text-fg-muted hover:text-fg",
                    )}
                  >
                    {r.value}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-2xs text-fg-subtle">
                {RATIOS.find((r) => Math.abs(config.ratio - r.value) < 0.001)
                  ?.note ?? "Custom ratio"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="up">Steps up</Label>
                <Input
                  id="up"
                  type="number"
                  min={1}
                  max={9}
                  value={config.stepsUp}
                  onChange={(e) =>
                    set("stepsUp", Math.min(9, Math.max(1, Number(e.target.value))))
                  }
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="down">Steps down</Label>
                <Input
                  id="down"
                  type="number"
                  min={0}
                  max={5}
                  value={config.stepsDown}
                  onChange={(e) =>
                    set(
                      "stepsDown",
                      Math.min(5, Math.max(0, Number(e.target.value))),
                    )
                  }
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="round">Rounding</Label>
              <Select
                id="round"
                value={String(config.round)}
                onChange={(e) =>
                  set("round", Number(e.target.value) as ScaleConfig["round"])
                }
                className="mt-1 h-8 text-xs"
              >
                <option value="1">Whole pixels</option>
                <option value="0.5">Half pixels</option>
                <option value="0">Exact (no rounding)</option>
              </Select>
            </div>

            <div className="border-t border-line pt-5">
              <Label htmlFor="heading-font">Heading font</Label>
              <Select
                id="heading-font"
                value={headingFont}
                onChange={(e) => setHeadingFont(e.target.value)}
                className="mt-1 h-8 text-xs"
              >
                {fonts.map((f) => (
                  <option key={f.slug} value={f.family}>
                    {f.family}
                  </option>
                ))}
              </Select>

              <Label htmlFor="body-font" className="mt-4">
                Body font
              </Label>
              <Select
                id="body-font"
                value={bodyFont}
                onChange={(e) => setBodyFont(e.target.value)}
                className="mt-1 h-8 text-xs"
              >
                {fonts.map((f) => (
                  <option key={f.slug} value={f.family}>
                    {f.family}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-8">
          <section className="overflow-hidden rounded-card border border-line bg-bg-raised">
            {steps.map((step) => {
              const isBody = step.step <= 0;
              const family = isBody ? bodyFont : headingFont;
              return (
                <div
                  key={step.step}
                  className="flex gap-5 border-b border-line px-5 py-4 last:border-b-0"
                >
                  <div className="w-24 shrink-0 pt-1">
                    <div className="font-mono text-2xs text-accent">
                      {step.name}
                    </div>
                    <div className="mt-1 font-mono text-2xs text-fg-subtle">
                      {step.px}px
                    </div>
                    <div className="font-mono text-2xs text-fg-subtle">
                      {step.rem}rem
                    </div>
                    <div className="font-mono text-2xs text-fg-subtle">
                      {step.lineHeight} lh
                    </div>
                  </div>
                  <p
                    className="specimen min-w-0 flex-1 text-fg"
                    style={{
                      fontFamily: fontStack({
                        family,
                        category: isBody ? "Sans Serif" : "Sans Serif",
                      }),
                      fontSize: `${step.px}px`,
                      lineHeight: step.lineHeight,
                      letterSpacing: `${step.letterSpacing}em`,
                      fontWeight: isBody ? 400 : 600,
                    }}
                  >
                    {PREVIEW_COPY[step.name] ?? "The quick brown fox"}
                  </p>
                </div>
              );
            })}
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
    </>
  );
}
