"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

/**
 * Plain-language search.
 *
 * The model never picks fonts. It turns a sentence into filters, those filters
 * run against the same catalogue query the filter bar uses, and the results are
 * always real families in the real order. What you get back is a normal
 * filtered library page with a normal shareable URL.
 *
 * The interpretation is shown before navigating so a wrong reading is visible
 * rather than mysterious.
 */
export function AiSearch({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [loading, setLoading] = useState(false);

  if (!enabled) return null;

  async function run() {
    if (query.trim().length < 3) return;
    setError(null);
    setInterpretation(null);
    setLoading(true);
    try {
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not read that.");
        return;
      }
      setInterpretation(data.intent.interpretation);
      start(() => router.push(data.href, { scroll: false }));
    } catch {
      setError("Network error. The filters below still work.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4 rounded-card border border-accent-line bg-accent-soft/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label-mono shrink-0">Describe it instead</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="mt-2 flex flex-wrap gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="a condensed sans that holds up at small sizes"
          className="h-10 min-w-[16rem] flex-1 rounded-control border border-line-strong bg-bg-raised px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || pending || query.trim().length < 3}
          className="h-10 shrink-0 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading || pending ? "Reading…" : "Find it"}
        </button>
      </form>

      {interpretation ? (
        <p className={cn("mt-2 text-xs text-fg-muted")}>
          Read as: {interpretation} — filters applied below, adjust them freely.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
      {!interpretation && !error ? (
        <p className="mt-2 text-2xs text-fg-subtle">
          Turns a sentence into filters. It never picks the fonts — everything you
          see is the real catalogue, filtered.
        </p>
      ) : null}
    </div>
  );
}
