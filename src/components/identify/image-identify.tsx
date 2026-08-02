"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CopyButton } from "@/components/ui/copy";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface Suggested {
  family: string;
  slug: string | null;
  inCatalogue: boolean;
  likelyCommercial: boolean;
  reasoning: string;
  aiConfidence: number;
  shapeScore: number | null;
  corroborated: boolean;
}

interface Match {
  family: string;
  fontSlug: string;
  category: string;
  score: number;
  licensing:
    | { status: "open"; licence: string; note: string; weights: number; isVariable: boolean }
    | {
        status: "not-in-catalogue";
        note: string;
        alternatives: { slug: string; family: string; licence: string; reason: string }[];
      };
}

interface Result {
  method: string;
  indexSize: number;
  lettersFound: number;
  durationMs: number;
  observations: string | null;
  suggested: Suggested[];
  matches: Match[];
  commercial: { family: string; alternatives: { slug: string; family: string; licence: string }[] }[];
  palette: { hex: string; weight: number; role: string }[];
}

function band(score: number) {
  if (score >= 0.9) return { label: "Very close", tone: "success" as const };
  if (score >= 0.82) return { label: "Close", tone: "accent" as const };
  if (score >= 0.72) return { label: "Possible", tone: "warning" as const };
  return { label: "Loose", tone: "neutral" as const };
}

export function ImageIdentify() {
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  // Always release the camera — a live stream left running is a red dot on
  // someone's laptop and a genuine privacy problem.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  async function openCamera() {
    setError(null);
    // Phones get the native camera app via the capture attribute — better
    // controls, autofocus, and no permission prompt inside the page.
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      cameraInput.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      // The element only exists once cameraOpen has rendered.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setError("Could not open the camera. Check the browser's permissions.");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      stopCamera();
      run(new File([blob], "capture.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }

  async function run(file: File) {
    setError(null);
    setResult(null);
    setLoading(true);
    setPreview(URL.createObjectURL(file));

    try {
      const form = new FormData();
      form.append("image", file);
      const response = await fetch("/api/identify/image", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not read that image.");
        return;
      }
      setResult(data as Result);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const cssVars = result?.palette.length
    ? `:root {\n${result.palette
        .map((c, i) => `  --colour-${i + 1}: ${c.hex};`)
        .join("\n")}\n}`
    : "";

  return (
    <div>
      {cameraOpen ? (
        <div className="overflow-hidden rounded-card border border-line bg-black">
          <video ref={videoRef} playsInline muted className="max-h-[60vh] w-full object-contain" />
          <div className="flex items-center justify-between gap-3 bg-bg-raised p-3">
            <button
              type="button"
              onClick={stopCamera}
              className="h-9 rounded-control border border-line-strong px-3 text-sm text-fg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={capture}
              className="h-9 rounded-control bg-accent px-5 text-sm font-medium text-accent-fg"
            >
              Capture
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) run(file);
          }}
          className={cn(
            "rounded-card border-2 border-dashed p-8 text-center transition-colors",
            loading ? "border-accent bg-accent-soft" : "border-line-strong",
          )}
        >
          <p className="text-sm text-fg-muted">
            {loading ? "Squinting at the letterforms…" : "Drop an image here, or"}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={loading}
              className="h-9 rounded-control border border-line-strong bg-bg-raised px-4 text-sm text-fg hover:bg-bg-sunken disabled:opacity-50"
            >
              Choose a file
            </button>
            <button
              type="button"
              onClick={openCamera}
              disabled={loading}
              className="inline-flex h-9 items-center gap-2 rounded-control border border-line-strong bg-bg-raised px-4 text-sm text-fg hover:bg-bg-sunken disabled:opacity-50"
            >
              <span aria-hidden>◉</span> Use the camera
            </button>
          </div>
          <p className="mt-3 text-2xs text-fg-subtle">
            PNG or JPEG · up to 8 MB · posters, book covers, shop signs, screens
          </p>
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) run(file);
        }}
        className="sr-only"
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) run(file);
        }}
        className="sr-only"
      />

      {preview && !cameraOpen ? (
        <div className="mt-4 overflow-hidden rounded-card border border-line bg-bg-sunken">
          <img src={preview} alt="" className="max-h-52 w-full object-contain" />
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-card border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-8 space-y-8">
          {result.palette.length ? (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="label-mono">Palette</h2>
                <CopyButton value={cssVars} label="Copy CSS" />
              </div>
              <div className="flex overflow-hidden rounded-card border border-line">
                {result.palette.map((colour) => (
                  <div
                    key={colour.hex}
                    className="group relative"
                    style={{ background: colour.hex, flexGrow: Math.max(0.4, colour.weight * 6) }}
                    title={`${colour.hex} · ${colour.role}`}
                  >
                    <div className="h-20" />
                    <div className="bg-bg-raised px-2 py-1.5 text-center">
                      <div className="font-mono text-[10px] text-fg">{colour.hex}</div>
                      <div className="text-[9px] text-fg-subtle">{colour.role}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/colour"
                className="mt-2 inline-block text-xs text-accent hover:underline"
              >
                Check these for contrast in the Colour Studio →
              </Link>
            </section>
          ) : null}

          {result.suggested.length ? (
            <section>
              <h2 className="label-mono mb-1">Named by AI</h2>
              {result.observations ? (
                <p className="mb-3 text-xs text-fg-subtle">{result.observations}</p>
              ) : null}
              <ul className="space-y-2">
                {result.suggested.map((s) => (
                  <li key={s.family} className="rounded-card border border-line bg-bg-raised p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {s.slug ? (
                        <Link
                          href={`/fonts/${s.slug}`}
                          className="font-display text-base font-semibold hover:underline"
                        >
                          {s.family}
                        </Link>
                      ) : (
                        <span className="font-display text-base font-semibold">{s.family}</span>
                      )}
                      {s.corroborated ? (
                        <Badge tone="success">Shape agrees</Badge>
                      ) : (
                        <Badge tone="warning">Not corroborated</Badge>
                      )}
                      {!s.inCatalogue ? <Badge tone="neutral">Not in catalogue</Badge> : null}
                    </div>
                    <p className="mt-1.5 text-xs text-fg-muted">{s.reasoning}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-2xs text-fg-subtle">
                &ldquo;Shape agrees&rdquo; means the glyph index ranked that family too. If it
                does not say that, the AI is guessing and the geometry disagrees — believe
                the geometry.
              </p>
            </section>
          ) : null}

          {result.commercial.length ? (
            <section>
              <h2 className="label-mono mb-3">Free alternatives</h2>
              <ul className="space-y-2">
                {result.commercial.map((entry) => (
                  <li key={entry.family} className="text-sm">
                    <span className="text-fg-muted">Instead of {entry.family}: </span>
                    {entry.alternatives.map((alt, i) => (
                      <span key={alt.slug}>
                        {i > 0 ? ", " : ""}
                        <Link href={`/fonts/${alt.slug}`} className="text-accent hover:underline">
                          {alt.family}
                        </Link>
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
              <h2 className="label-mono">Closest by shape</h2>
              <p className="label-mono">
                {result.lettersFound} letterforms · {result.indexSize.toLocaleString("en-GB")}{" "}
                indexed · {result.durationMs}ms
              </p>
            </div>

            {result.matches.length === 0 ? (
              <p className="py-6 text-sm text-fg-muted">
                No letterforms it could read. The palette above is still good. For type,
                crop tighter to one line of text on a plain background and try again.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {result.matches.map((match, index) => {
                  const verdict = band(match.score);
                  return (
                    <li
                      key={match.fontSlug}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-bg-raised px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="label-mono w-5">{index + 1}</span>
                        <Link
                          href={`/fonts/${match.fontSlug}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {match.family}
                        </Link>
                        <Badge tone={verdict.tone}>{verdict.label}</Badge>
                        {match.licensing.status === "open" ? (
                          <Badge tone="success">{match.licensing.licence}</Badge>
                        ) : null}
                      </div>
                      <span className="font-mono text-2xs text-fg-subtle">
                        {(match.score * 100).toFixed(1)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-3 text-xs text-fg-subtle">
              Shape matching gives you a shortlist worth checking, not a verdict. If you
              have the actual page, the{" "}
              <Link href="/identify" className="text-accent hover:underline">
                URL reader
              </Link>{" "}
              simply reads the page&rsquo;s own CSS and tells you.
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
