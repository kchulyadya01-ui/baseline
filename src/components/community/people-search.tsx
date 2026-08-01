"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Search box for /people. The query lives in the URL so a search is
 * shareable and the back button behaves.
 */
export function PeopleSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initialQuery);
  const [isPending, start] = useTransition();

  // Debounced, so the server is not chasing every keystroke.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const timer = setTimeout(() => {
      start(() => {
        router.push(q.trim() ? `/people?q=${encodeURIComponent(q.trim())}` : "/people", {
          scroll: false,
        });
      });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className={cn("relative transition-opacity", isPending && "opacity-70")}>
      <Input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search people by name, handle or bio…"
        aria-label="Search people"
        autoComplete="off"
        className="h-11 pl-9"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
      >
        ⌕
      </span>
      {q ? (
        <button
          type="button"
          onClick={() => setQ("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-fg-subtle hover:text-fg"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
