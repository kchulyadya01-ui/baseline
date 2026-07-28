"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input, Label, Select } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Sans Serif",
  "Serif",
  "Display",
  "Handwriting",
  "Monospace",
];

const SORTS = [
  { key: "popular", label: "Most popular" },
  { key: "newest", label: "Recently added" },
  { key: "name", label: "A–Z" },
  { key: "size", label: "Smallest file" },
];

const LICENCES = [
  { key: "OFL-1.1", label: "OFL 1.1" },
  { key: "Apache-2.0", label: "Apache 2.0" },
  { key: "UFL-1.0", label: "Ubuntu FL" },
];

export function FilterBar({
  subsets,
  total,
}: {
  subsets: { value: string; count: number }[];
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  // Debounce typing so the server render isn't chasing every keystroke.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const timer = setTimeout(() => update({ q, page: null }), 220);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "" || value === "all") next.delete(key);
      else next.set(key, value);
    }
    // Any filter change resets pagination — page 3 of a different result set is meaningless.
    if (!("page" in changes)) next.delete("page");
    startTransition(() => {
      router.push(next.toString() ? `/fonts?${next}` : "/fonts", {
        scroll: false,
      });
    });
  }

  const category = params.get("category") ?? "all";
  const activeFilters = ["category", "subset", "variable", "italic", "license"].filter(
    (key) => params.get(key),
  ).length;

  return (
    <div
      className={cn(
        "sticky top-14 z-30 -mx-5 border-b border-line bg-bg/90 px-5 py-4 backdrop-blur-md transition-opacity",
        isPending && "opacity-70",
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[15rem] flex-1">
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${total.toLocaleString("en-GB")} families or designers…`}
              aria-label="Search fonts"
              className="pl-9"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
            >
              ⌕
            </span>
          </div>

          <div className="w-[10.5rem]">
            <Select
              aria-label="Sort"
              value={params.get("sort") ?? "popular"}
              onChange={(e) => update({ sort: e.target.value })}
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => update({ category: null })}
            className={chip(category === "all")}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => update({ category: c })}
              className={chip(category === c)}
            >
              {c}
            </button>
          ))}

          <span aria-hidden className="mx-1 h-4 w-px bg-line" />

          <button
            type="button"
            onClick={() =>
              update({ variable: params.get("variable") ? null : "1" })
            }
            className={chip(Boolean(params.get("variable")))}
          >
            Variable
          </button>
          <button
            type="button"
            onClick={() => update({ italic: params.get("italic") ? null : "1" })}
            className={chip(Boolean(params.get("italic")))}
          >
            Has italic
          </button>

          <div className="ml-auto flex items-center gap-2">
            <Label htmlFor="subset" className="hidden sm:block">
              Script
            </Label>
            <Select
              id="subset"
              aria-label="Script subset"
              value={params.get("subset") ?? "all"}
              onChange={(e) => update({ subset: e.target.value })}
              className="h-8 w-[9.5rem] text-xs"
            >
              <option value="all">Any script</option>
              {subsets.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.value} ({s.count})
                </option>
              ))}
            </Select>

            <Select
              aria-label="Licence"
              value={params.get("license") ?? "all"}
              onChange={(e) => update({ license: e.target.value })}
              className="h-8 w-[7.5rem] text-xs"
            >
              <option value="all">Any licence</option>
              {LICENCES.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
            </Select>

            {activeFilters > 0 || q ? (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  router.push("/fonts", { scroll: false });
                }}
                className="text-xs text-fg-muted underline underline-offset-4 hover:text-fg"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function chip(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1 text-xs transition-colors",
    active
      ? "border-accent bg-accent-soft text-accent"
      : "border-line-strong text-fg-muted hover:border-fg-subtle hover:text-fg",
  );
}
