"use client";

import { useState } from "react";
import { Label } from "@/components/ui/primitives";
import { fontStack } from "@/lib/font-url";
import type { FontRecord } from "@/lib/types";

const SAMPLES = [
  "Whereas disregard and contempt for human rights",
  "The quick brown fox jumps over the lazy dog",
  "Handgloves & Ampersands 0123456789",
];

export function Specimen({ font }: { font: FontRecord }) {
  const [text, setText] = useState(SAMPLES[0]);
  const [size, setSize] = useState(48);
  const [weight, setWeight] = useState(
    font.weights.includes(400) ? 400 : font.weights[0],
  );
  const [italic, setItalic] = useState(false);

  const stack = fontStack(font);

  return (
    <section className="rounded-card border border-line bg-bg-raised">
      <div className="flex flex-wrap items-end gap-5 border-b border-line p-4">
        <div className="min-w-[9rem] flex-1">
          <Label htmlFor="specimen-size">Size · {size}px</Label>
          <input
            id="specimen-size"
            type="range"
            min={12}
            max={160}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="mt-1"
          />
        </div>

        <div className="min-w-[9rem] flex-1">
          <Label htmlFor="specimen-weight">Weight · {weight}</Label>
          <input
            id="specimen-weight"
            type="range"
            min={0}
            max={font.weights.length - 1}
            step={1}
            value={font.weights.indexOf(weight)}
            onChange={(e) => setWeight(font.weights[Number(e.target.value)])}
            className="mt-1"
            disabled={font.weights.length < 2}
          />
        </div>

        {font.hasItalic ? (
          <button
            type="button"
            onClick={() => setItalic((v) => !v)}
            aria-pressed={italic}
            className={`h-8 rounded-control border px-3 text-xs transition-colors ${
              italic
                ? "border-accent bg-accent-soft text-accent"
                : "border-line-strong text-fg-muted hover:text-fg"
            }`}
          >
            Italic
          </button>
        ) : null}
      </div>

      <div className="p-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Specimen text — edit to preview your own copy"
          spellCheck={false}
          rows={2}
          className="specimen w-full resize-none bg-transparent text-fg outline-none"
          style={{
            fontFamily: stack,
            fontSize: `${size}px`,
            fontWeight: weight,
            fontStyle: italic ? "italic" : "normal",
            lineHeight: size > 40 ? 1.06 : 1.4,
            letterSpacing: size >= 48 ? "-0.022em" : size >= 24 ? "-0.012em" : "0",
          }}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {SAMPLES.map((sample, i) => (
            <button
              key={sample}
              type="button"
              onClick={() => setText(sample)}
              className="rounded-full border border-line-strong px-3 py-1 text-xs text-fg-muted hover:text-fg"
            >
              Sample {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-line p-6">
        <div className="label-mono mb-4">All weights</div>
        <div className="space-y-3">
          {font.weights.map((w) => (
            <div key={w} className="flex items-baseline gap-4">
              <span className="w-9 shrink-0 font-mono text-2xs text-fg-subtle">
                {w}
              </span>
              <span
                className="specimen truncate text-xl text-fg"
                style={{ fontFamily: stack, fontWeight: w }}
              >
                {font.family} — {text.slice(0, 42) || "Aa Bb Cc"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
