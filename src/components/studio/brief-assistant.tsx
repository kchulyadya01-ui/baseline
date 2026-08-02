"use client";

import Link from "next/link";
import { useState } from "react";
import { CodeBlock, CopyButton } from "@/components/ui/copy";
import { Badge } from "@/components/ui/primitives";
import { buildScale } from "@/lib/scale";
import { cn } from "@/lib/utils";

interface FontRef {
  slug: string;
  family: string;
  category: string;
  weights: number[];
  isVariable: boolean;
  license: { id: string; name: string };
}

interface Swatch {
  role: string;
  hex: string;
  adjustedFrom?: string;
}

interface Suggestion {
  rationale: string;
  displayFont: FontRef | null;
  bodyFont: FontRef | null;
  fontRationale: string;
  palette: Swatch[];
  paletteRationale: string;
  contrast: { label: string; ratio: number; level: string; passes: boolean }[];
  scaleRatio: number;
  scaleRationale: string;
  droppedFonts: string[];
}

const EXAMPLES = [
  "Identity for a jazz festival in Kathmandu. Warm, loud, a bit vintage.",
  "A quiet reading app for long-form essays. Should feel like paper.",
  "Packaging for a cold-pressed juice brand. Fresh, clean, a bit clinical.",
];

export function BriefAssistant() {
  const [brief, setBrief] = useState("");
  const [result, setResult] = useState<Suggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(text: string) {
    if (text.trim().length < 10) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const response = await fetch("/api/ai/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: text }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not generate that.");
        return;
      }
      setResult(data as Suggestion);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const families = result
    ? [result.displayFont?.family, result.bodyFont?.family].filter(
        (f): f is string => Boolean(f),
      )
    : [];

  const surface = result?.palette.find((s) => s.role === "surface")?.hex ?? "#ffffff";
  const textColour = result?.palette.find((s) => s.role === "text")?.hex ?? "#111111";

  const steps = result ? buildScale({
    base: 16,
    ratio: result.scaleRatio,
    stepsUp: 4,
    stepsDown: 1,
    round: 1,
    remBase: 16,
  }) : [];

  const tokens = result
    ? `:root {\n${result.palette
        .map((s) => `  --colour-${s.role}: ${s.hex};`)
        .join("\n")}\n\n  --font-display: '${result.displayFont?.family ?? ""}', serif;\n  --font-body: '${result.bodyFont?.family ?? ""}', sans-serif;\n  --scale-ratio: ${result.scaleRatio};\n}`
    : "";

  return (
    <div>
      {families.length ? (
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?${families
            .map((f) => `family=${f.replace(/ /g, "+")}:wght@400;700`)
            .join("&")}&display=swap`}
        />
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(brief);
        }}
      >
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={3}
          maxLength={1500}
          placeholder="What is it, who is it for, and how should it feel? Be specific — vague in, vague out."
          className="w-full rounded-card border border-line-strong bg-bg-raised px-4 py-3 text-base text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={loading || brief.trim().length < 10}
            className="h-10 rounded-control bg-accent px-5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Having a think…" : "Suggest a direction"}
          </button>
          <span className="text-2xs text-fg-subtle">{brief.length}/1500</span>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
        <span>Try:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setBrief(example);
              run(example);
            }}
            className="rounded-full border border-line-strong px-2.5 py-0.5 text-left text-fg-muted hover:text-fg"
          >
            {example.split(".")[0]}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-6 rounded-card border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-card border border-line bg-bg-sunken"
            />
          ))}
        </div>
      ) : null}

      {result ? (
        <div className="mt-10 space-y-10">
          <p className="max-w-2xl text-base leading-relaxed text-fg-muted">
            {result.rationale}
          </p>

          {/* Live preview, set in the suggested faces on the suggested surface. */}
          <section
            className="overflow-hidden rounded-card border border-line"
            style={{ background: surface, color: textColour }}
          >
            <div className="p-8">
              <p
                className="specimen text-4xl leading-tight"
                style={{
                  fontFamily: `'${result.displayFont?.family ?? "serif"}', serif`,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                {brief.split(/[.,]/)[0].slice(0, 40) || "The quick brown fox"}
              </p>
              <p
                className="specimen mt-4 max-w-xl text-base leading-relaxed"
                style={{ fontFamily: `'${result.bodyFont?.family ?? "sans-serif"}', sans-serif` }}
              >
                Body copy set in {result.bodyFont?.family ?? "the body face"}. This is
                what a paragraph looks like at the suggested size, on the suggested
                surface colour, with the pairing doing the work it was chosen for.
              </p>
              <div className="mt-6 flex gap-1.5">
                {result.palette.map((swatch) => (
                  <span
                    key={swatch.role}
                    className="h-8 w-8 rounded-md border border-black/10"
                    style={{ background: swatch.hex }}
                    title={`${swatch.role} ${swatch.hex}`}
                  />
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="label-mono mb-4">The pairing</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Display", font: result.displayFont },
                { label: "Body", font: result.bodyFont },
              ].map(({ label, font }) => (
                <div key={label} className="rounded-card border border-line bg-bg-raised p-5">
                  <div className="label-mono">{label}</div>
                  {font ? (
                    <>
                      <p
                        className="specimen mt-2 truncate text-3xl"
                        style={{ fontFamily: `'${font.family}', sans-serif` }}
                      >
                        {font.family}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Badge tone="success">{font.license.id}</Badge>
                        <Badge>{font.weights.length} weights</Badge>
                        {font.isVariable ? <Badge tone="accent">Variable</Badge> : null}
                      </div>
                      <Link
                        href={`/fonts/${font.slug}`}
                        className="mt-3 inline-block text-xs text-accent hover:underline"
                      >
                        Open the specimen →
                      </Link>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-fg-muted">
                      No catalogue match — see the note below.
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 max-w-2xl text-sm text-fg-muted">{result.fontRationale}</p>
            {result.droppedFonts.length ? (
              <p className="mt-2 text-xs text-fg-subtle">
                Suggested, then binned for not existing in the catalogue:{" "}
                {result.droppedFonts.join(", ")}. Only real families make it
                onto the page.
              </p>
            ) : null}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="label-mono">The palette</h2>
              <Link href="/colour" className="text-xs text-accent hover:underline">
                Open in the Colour Studio →
              </Link>
            </div>

            <div className="flex overflow-hidden rounded-card border border-line">
              {result.palette.map((swatch) => (
                <div key={swatch.role} className="flex-1">
                  <div className="h-24" style={{ background: swatch.hex }} />
                  <div className="bg-bg-raised px-2 py-2 text-center">
                    <div className="text-2xs font-medium text-fg">{swatch.role}</div>
                    <div className="font-mono text-[10px] text-fg-subtle">{swatch.hex}</div>
                    {swatch.adjustedFrom ? (
                      <div className="mt-0.5 text-[9px] text-warning">
                        fixed from {swatch.adjustedFrom}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 max-w-2xl text-sm text-fg-muted">{result.paletteRationale}</p>

            <table className="mt-4 w-full text-sm">
              <tbody>
                {result.contrast.map((pair) => (
                  <tr key={pair.label} className="border-b border-line last:border-b-0">
                    <td className="py-2 text-fg-muted">{pair.label}</td>
                    <td className="py-2 text-right font-mono text-xs">
                      {pair.ratio.toFixed(2)}:1
                    </td>
                    <td className="w-24 py-2 text-right">
                      <Badge tone={pair.passes ? "success" : "danger"}>{pair.level}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-2xs text-fg-subtle">
              Same WCAG maths the Colour Studio runs. Anything that failed was
              already nudged along its own hue until it passed — you are seeing
              the corrected version.
            </p>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="label-mono">The scale · ratio {result.scaleRatio}</h2>
              <Link
                href={`/type-scale${result.displayFont ? `?font=${result.displayFont.slug}` : ""}`}
                className="text-xs text-accent hover:underline"
              >
                Open in the Type Scale Studio →
              </Link>
            </div>
            <div className="overflow-hidden rounded-card border border-line bg-bg-raised">
              {steps.map((step) => (
                <div
                  key={step.step}
                  className="flex items-baseline gap-4 border-b border-line px-4 py-2.5 last:border-b-0"
                >
                  <span className="w-16 shrink-0 font-mono text-2xs text-fg-subtle">
                    {step.px}px
                  </span>
                  <span
                    className="specimen truncate text-fg"
                    style={{
                      fontFamily: `'${(step.step > 0 ? result.displayFont : result.bodyFont)?.family ?? "sans-serif"}', sans-serif`,
                      fontSize: `${Math.min(48, step.px)}px`,
                      lineHeight: step.lineHeight,
                    }}
                  >
                    {step.name}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 max-w-2xl text-sm text-fg-muted">{result.scaleRationale}</p>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="label-mono">Take it with you</h2>
              <CopyButton value={tokens} label="Copy tokens" />
            </div>
            <CodeBlock code={tokens} language="css" />
          </section>

          <p className={cn("text-xs text-fg-subtle")}>
            The fonts are real and the ratios are arithmetic. The taste is a
            starting point — take it into the studios and disagree with it.
          </p>
        </div>
      ) : null}
    </div>
  );
}
