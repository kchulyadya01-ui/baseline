"use client";

import { useEffect, useRef, useState } from "react";
import { Input, Label, Select } from "@/components/ui/primitives";
import {
  DEFAULT_CONTENT,
  DEFAULT_STYLE,
  getSpec,
  LAYOUTS,
  SPECS,
  type LayoutId,
  type StationeryContent,
  type StationeryStyle,
} from "@/lib/stationery";
import { canvasSize, ensureFonts, exportPng, render } from "@/lib/stationery-render";
import { cn } from "@/lib/utils";

export interface FontOption {
  slug: string;
  family: string;
}

const PRESETS: { label: string; style: Partial<StationeryStyle> }[] = [
  { label: "Warm", style: { surface: "#faf7f2", ink: "#1c1917", accent: "#9a3412", muted: "#78716c" } },
  { label: "Ink", style: { surface: "#ffffff", ink: "#0f172a", accent: "#1e3a8a", muted: "#64748b" } },
  { label: "Forest", style: { surface: "#f4f7f4", ink: "#14261c", accent: "#166534", muted: "#5f6f66" } },
  { label: "Night", style: { surface: "#16181d", ink: "#f5f5f4", accent: "#e8a33d", muted: "#a8a29e" } },
  { label: "Blush", style: { surface: "#fdf2f4", ink: "#2b1216", accent: "#9f1239", muted: "#8a6a70" } },
];

/** On-screen scale: big enough to judge, small enough to fit beside controls. */
const PREVIEW_DPI = 5.2;

export function StationeryStudio({ fonts }: { fonts: FontOption[] }) {
  const [specId, setSpecId] = useState("business-card");
  const [layout, setLayout] = useState<LayoutId>("classic");
  const [face, setFace] = useState<"front" | "back">("front");
  const [guides, setGuides] = useState(true);
  const [content, setContent] = useState<StationeryContent>(DEFAULT_CONTENT);
  const [style, setStyle] = useState<StationeryStyle>(DEFAULT_STYLE);
  const [exporting, setExporting] = useState(false);
  const [loadedFonts, setLoadedFonts] = useState<string | null>(null);

  const frontRef = useRef<HTMLCanvasElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);

  const spec = getSpec(specId);
  const families = [...new Set([style.displayFont, style.bodyFont])];

  // Canvas silently falls back to a system font if the webfont has not loaded,
  // so nothing is drawn until the pair is ready.
  //
  // Keyed on the font pair alone, not the whole style object — otherwise every
  // colour tweak re-ran the font loader for fonts that were already loaded.
  const fontKey = `${style.displayFont}|${style.bodyFont}`;
  const fontsReady = loadedFonts === fontKey;

  useEffect(() => {
    let cancelled = false;
    ensureFonts({ ...DEFAULT_STYLE, ...style }).then(() => {
      if (!cancelled) setLoadedFonts(fontKey);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontKey]);

  useEffect(() => {
    if (!fontsReady) return;
    const options = {
      spec,
      layout,
      content,
      style,
      dpi: PREVIEW_DPI * (window.devicePixelRatio || 1),
      guides,
      includeBleed: false,
    } as const;

    if (frontRef.current) render(frontRef.current, { ...options, face: "front" });
    if (spec.hasBack && backRef.current) {
      render(backRef.current, { ...options, face: "back" });
    }
  }, [spec, layout, content, style, guides, fontsReady, face]);

  async function download(which: "front" | "back") {
    setExporting(true);
    try {
      const blob = await exportPng({
        spec,
        layout,
        content,
        style,
        face: which,
        dpi: 300,
        guides: false,
        includeBleed: true,
      });
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${spec.id}-${which}-300dpi.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const exportSize = canvasSize(spec, 300, true);
  const set = <K extends keyof StationeryContent>(key: K, value: string) =>
    setContent((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?${families
          .map((f) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700`)
          .join("&")}&display=swap`}
      />

      <div className="grid gap-8 lg:grid-cols-[20rem_1fr]">
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="space-y-4 rounded-card border border-line bg-bg-raised p-5">
            <div>
              <Label htmlFor="piece">Piece</Label>
              <Select
                id="piece"
                value={specId}
                onChange={(e) => {
                  setSpecId(e.target.value);
                  setFace("front");
                }}
                className="mt-1"
              >
                {SPECS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} · {s.width} × {s.height} mm
                  </option>
                ))}
              </Select>
              <p className="mt-1.5 text-2xs leading-relaxed text-fg-subtle">{spec.note}</p>
            </div>

            <div>
              <Label>Layout</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    title={l.note}
                    onClick={() => setLayout(l.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-2xs transition-colors",
                      layout === l.id
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-line-strong text-fg-muted hover:text-fg",
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-fg-muted">
              <input
                type="checkbox"
                checked={guides}
                onChange={(e) => setGuides(e.target.checked)}
              />
              Show bleed, trim and safe guides
            </label>
          </div>

          <div className="space-y-3 rounded-card border border-line bg-bg-raised p-5">
            <div className="label-mono">Type</div>
            <div>
              <Label htmlFor="display">Display</Label>
              <Select
                id="display"
                value={style.displayFont}
                onChange={(e) => setStyle((p) => ({ ...p, displayFont: e.target.value }))}
                className="mt-1 h-8 text-xs"
              >
                {fonts.map((f) => (
                  <option key={f.slug} value={f.family}>
                    {f.family}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="body">Body</Label>
              <Select
                id="body"
                value={style.bodyFont}
                onChange={(e) => setStyle((p) => ({ ...p, bodyFont: e.target.value }))}
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

          <div className="space-y-3 rounded-card border border-line bg-bg-raised p-5">
            <div className="flex items-center justify-between">
              <span className="label-mono">Colour</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setStyle((p) => ({ ...p, ...preset.style }))}
                  className="rounded-full border border-line-strong px-2.5 py-1 text-2xs text-fg-muted hover:text-fg"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {(
              [
                ["surface", "Surface"],
                ["ink", "Ink"],
                ["accent", "Accent"],
                ["muted", "Muted"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <input
                  type="color"
                  value={style[key]}
                  onChange={(e) => setStyle((p) => ({ ...p, [key]: e.target.value }))}
                  aria-label={label}
                  className="h-8 w-8 shrink-0 rounded-md"
                />
                <div className="min-w-0 flex-1">
                  <Label>{label}</Label>
                  <Input
                    value={style[key]}
                    onChange={(e) => setStyle((p) => ({ ...p, [key]: e.target.value }))}
                    spellCheck={false}
                    className="mt-0.5 h-7 font-mono text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2.5 rounded-card border border-line bg-bg-raised p-5">
            <div className="label-mono">Details</div>
            {(
              [
                ["name", "Name"],
                ["role", "Role"],
                ["company", "Company"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["website", "Website"],
                ["address", "Address"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  value={content[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="mt-0.5 h-8 text-xs"
                />
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="rounded-card border border-line bg-bg-sunken p-8">
            <div className="flex flex-wrap items-start gap-8">
              <figure>
                <canvas
                  ref={frontRef}
                  style={{
                    width: `${spec.width * PREVIEW_DPI}px`,
                    height: `${spec.height * PREVIEW_DPI}px`,
                    maxWidth: "100%",
                  }}
                  className="rounded-sm shadow-lg"
                />
                <figcaption className="label-mono mt-3">Front</figcaption>
              </figure>

              {spec.hasBack ? (
                <figure>
                  <canvas
                    ref={backRef}
                    style={{
                      width: `${spec.width * PREVIEW_DPI}px`,
                      height: `${spec.height * PREVIEW_DPI}px`,
                      maxWidth: "100%",
                    }}
                    className="rounded-sm shadow-lg"
                  />
                  <figcaption className="label-mono mt-3">Back</figcaption>
                </figure>
              ) : null}
            </div>

            {guides ? (
              <div className="mt-6 flex flex-wrap gap-4 text-2xs text-fg-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-[rgb(220,38,38)]" /> bleed {spec.bleed}mm
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-[rgb(37,99,235)]" /> trim
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-[rgb(22,163,74)]" /> safe {spec.safe}mm
                </span>
                <span className="text-fg-subtle">
                  Guides are preview only — they are never in the export.
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => download("front")}
              disabled={exporting || !fontsReady}
              className="h-10 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {exporting ? "Rendering…" : "Download front · 300 DPI"}
            </button>
            {spec.hasBack ? (
              <button
                type="button"
                onClick={() => download("back")}
                disabled={exporting || !fontsReady}
                className="h-10 rounded-control border border-line-strong px-4 text-sm text-fg-muted transition-colors hover:text-fg disabled:opacity-50"
              >
                Download back
              </button>
            ) : null}
            <span className="text-2xs text-fg-subtle">
              {exportSize.width} × {exportSize.height} px · bleed included · CMYK
              conversion happens at the printer
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
