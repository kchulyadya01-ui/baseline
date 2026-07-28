"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface SlimFont {
  slug: string;
  family: string;
  category: string;
  license: string;
  weights: number;
  isVariable: boolean;
  reason?: string;
}

interface Detection {
  family: string;
  confidence: number;
  evidence: string[];
  seenIn: string[];
  weights: number[];
  licensing:
    | { status: "open"; font: SlimFont; licence: string; note: string }
    | { status: "not-in-catalogue"; note: string; alternatives: SlimFont[] };
}

interface Result {
  finalUrl: string;
  title: string | null;
  stylesheetsRead: number;
  stylesheetsSkipped: number;
  durationMs: number;
  detections: Detection[];
}

const EVIDENCE_LABEL: Record<string, string> = {
  "google-fonts": "Google Fonts stylesheet",
  "font-face": "@font-face rule",
  declaration: "CSS declaration",
};

const EXAMPLES = ["stripe.com", "vercel.com", "nytimes.com"];

export function IdentifyForm() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(target: string) {
    if (!target.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/identify/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not read that page.");
        return;
      }
      setResult(data as Result);
    } catch {
      setError("Network error — check the URL and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(url);
        }}
        className="flex flex-wrap gap-2"
      >
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="stripe.com"
          aria-label="Page URL"
          inputMode="url"
          spellCheck={false}
          className="min-w-[16rem] flex-1"
        />
        <Button type="submit" disabled={loading || !url.trim()}>
          {loading ? "Reading…" : "Identify fonts"}
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
        <span>Try:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setUrl(example);
              run(example);
            }}
            className="rounded-full border border-line-strong px-2.5 py-0.5 text-fg-muted hover:text-fg"
          >
            {example}
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
              className="h-24 animate-pulse rounded-card border border-line bg-bg-sunken"
            />
          ))}
        </div>
      ) : null}

      {result ? <Results result={result} /> : null}
    </div>
  );
}

function Results({ result }: { result: Result }) {
  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg">
            {result.title ?? result.finalUrl}
          </p>
          <p className="truncate text-xs text-fg-subtle">{result.finalUrl}</p>
        </div>
        <p className="label-mono shrink-0">
          {result.detections.length} found · {result.stylesheetsRead} stylesheet
          {result.stylesheetsRead === 1 ? "" : "s"} read · {result.durationMs}ms
        </p>
      </div>

      {result.detections.length === 0 ? (
        <p className="py-10 text-center text-sm text-fg-muted">
          No font families declared in that page&rsquo;s HTML or linked CSS. Some
          sites inject their styles with JavaScript, which a static read cannot
          see.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {result.detections.map((detection) => (
            <DetectionCard key={detection.family} detection={detection} />
          ))}
        </div>
      )}
    </div>
  );
}

function DetectionCard({ detection }: { detection: Detection }) {
  const { licensing } = detection;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold">
              {detection.family}
            </h3>
            <Badge tone={licensing.status === "open" ? "success" : "warning"}>
              {licensing.status === "open"
                ? licensing.licence
                : "Not open-licence"}
            </Badge>
            {detection.weights.length ? (
              <Badge>weights {detection.weights.join(", ")}</Badge>
            ) : null}
          </div>

          <p className="mt-2 max-w-xl text-sm text-fg-muted">
            {detection.licensing.note}
          </p>

          <p className="mt-2 font-mono text-2xs text-fg-subtle">
            {detection.evidence
              .map((e) => EVIDENCE_LABEL[e] ?? e)
              .join(" · ")}
            {detection.seenIn.length ? ` — ${detection.seenIn[0]}` : ""}
          </p>
        </div>

        <Confidence value={detection.confidence} />
      </div>

      {detection.licensing.status === "open" ? (
        <div className="border-t border-line bg-bg-sunken px-5 py-3">
          <Link
            href={`/fonts/${detection.licensing.font.slug}`}
            className="text-sm text-accent hover:underline"
          >
            Open {detection.licensing.font.family} in the library →
          </Link>
        </div>
      ) : (
        <div className="border-t border-line bg-bg-sunken px-5 py-4">
          <div className="label-mono mb-3">Free alternatives</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {detection.licensing.alternatives.map((alt) => (
              <Link
                key={alt.slug}
                href={`/fonts/${alt.slug}`}
                className="rounded-control border border-line bg-bg-raised p-3 transition-colors hover:border-line-strong"
              >
                <div className="truncate text-sm font-medium">{alt.family}</div>
                <div className="mt-1 text-2xs text-fg-subtle">{alt.reason}</div>
                <div className="mt-2 flex gap-1">
                  <Badge tone="success">{alt.license}</Badge>
                  {alt.isVariable ? <Badge tone="accent">Variable</Badge> : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function Confidence({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  return (
    <div className="w-28 shrink-0">
      <div className="label-mono mb-1 text-right">{percent}% confident</div>
      <div className="h-1.5 overflow-hidden rounded-full bg-bg-inset">
        <div
          className={cn(
            "h-full rounded-full",
            value >= 0.85
              ? "bg-success"
              : value >= 0.6
                ? "bg-accent"
                : "bg-warning",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
