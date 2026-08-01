"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface Match {
  family: string;
  fontSlug: string;
  category: string;
  score: number;
  licensing:
    | {
        status: "open";
        licence: string;
        note: string;
        weights: number;
        isVariable: boolean;
      }
    | {
        status: "not-in-catalogue";
        note: string;
        alternatives: {
          slug: string;
          family: string;
          licence: string;
          reason: string;
        }[];
      };
}

interface Result {
  indexSize: number;
  lettersFound: number;
  imageWidth: number;
  imageHeight: number;
  durationMs: number;
  matches: Match[];
}

/**
 * Scores are similarities, not probabilities, and saying "94% confident" of a
 * shape match would be a lie. The banding is deliberately conservative and the
 * copy says shortlist, because that is what it is.
 */
function band(score: number) {
  if (score >= 0.9) return { label: "Very close", tone: "success" as const };
  if (score >= 0.82) return { label: "Close", tone: "accent" as const };
  if (score >= 0.72) return { label: "Possible", tone: "warning" as const };
  return { label: "Loose", tone: "neutral" as const };
}

export function ImageIdentify() {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(file: File) {
    setError(null);
    setResult(null);
    setLoading(true);
    setPreview(URL.createObjectURL(file));

    try {
      const form = new FormData();
      form.append("image", file);
      const response = await fetch("/api/identify/image", {
        method: "POST",
        body: form,
      });
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

  return (
    <div>
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
          {loading ? "Reading the letterforms…" : "Drop a screenshot here, or"}
        </p>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={loading}
          className="mt-2 h-9 rounded-control border border-line-strong bg-bg-raised px-4 text-sm text-fg hover:bg-bg-sunken disabled:opacity-50"
        >
          Choose an image
        </button>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) run(file);
          }}
          className="sr-only"
        />
        <p className="mt-3 text-2xs text-fg-subtle">
          PNG or JPEG · up to 8 MB · crop tight to one line of text
        </p>
      </div>

      {preview ? (
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
        <div className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
            <p className="text-sm text-fg">
              Closest matches from {result.indexSize.toLocaleString("en-GB")}{" "}
              indexed families
            </p>
            <p className="label-mono">
              {result.lettersFound} letterforms · {result.durationMs}ms
            </p>
          </div>

          <p className="py-3 text-xs text-fg-subtle">
            This compares letter shapes, so it is a shortlist rather than an
            answer. If you have the web page, the{" "}
            <Link href="/identify" className="text-accent hover:underline">
              URL reader
            </Link>{" "}
            is exact — it reads the page&rsquo;s own CSS.
          </p>

          <ul className="mt-2 space-y-2">
            {result.matches.map((match, index) => {
              const verdict = band(match.score);
              return (
                <li
                  key={match.fontSlug}
                  className="rounded-card border border-line bg-bg-raised p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="label-mono w-5">{index + 1}</span>
                      <Link
                        href={`/fonts/${match.fontSlug}`}
                        className="font-display text-base font-semibold hover:underline"
                      >
                        {match.family}
                      </Link>
                      <Badge tone={verdict.tone}>{verdict.label}</Badge>
                      {match.licensing.status === "open" ? (
                        <Badge tone="success">{match.licensing.licence}</Badge>
                      ) : (
                        <Badge tone="warning">Not open-licence</Badge>
                      )}
                    </div>
                    <span className="font-mono text-2xs text-fg-subtle">
                      {(match.score * 100).toFixed(1)}% shape match
                    </span>
                  </div>

                  {match.licensing.status === "not-in-catalogue" &&
                  match.licensing.alternatives.length ? (
                    <p className="mt-2 pl-8 text-2xs text-fg-subtle">
                      Free alternatives:{" "}
                      {match.licensing.alternatives.map((alt, i) => (
                        <span key={alt.slug}>
                          {i > 0 ? ", " : ""}
                          <Link
                            href={`/fonts/${alt.slug}`}
                            className="text-accent hover:underline"
                          >
                            {alt.family}
                          </Link>
                        </span>
                      ))}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
