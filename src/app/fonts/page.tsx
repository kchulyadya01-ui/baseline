import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar } from "@/components/fonts/filter-bar";
import { FontCard } from "@/components/fonts/font-card";
import { ButtonLink } from "@/components/ui/button";
import {
  DEFAULT_PER_PAGE,
  getCatalogueMeta,
  queryFonts,
  subsetOptions,
} from "@/lib/fonts";
import { fontsCssUrl } from "@/lib/font-url";
import type { FontCategory, SortKey } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Font Library — every open-licence Google Font, licence-checked",
  description:
    "Search 1,900+ OFL, Apache and Ubuntu-licensed font families. Filter by category, script, variable axes and licence. Free to use commercially, no login.",
  alternates: { canonical: "/fonts" },
};

// Filters live in the URL, so each combination is its own cacheable page.
export const revalidate = 86400;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function FontsPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await props.searchParams;
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const result = queryFonts({
    q: single("q"),
    category: (single("category") as FontCategory) ?? "all",
    subset: single("subset"),
    variable: Boolean(single("variable")),
    italic: Boolean(single("italic")),
    license: (single("license") as "OFL-1.1") ?? "all",
    sort: (single("sort") as SortKey) ?? "popular",
    page: Number(single("page") ?? 1),
    perPage: DEFAULT_PER_PAGE,
  });

  const meta = getCatalogueMeta();

  // One stylesheet for the whole grid instead of one per card.
  const cssHref = result.fonts.length
    ? fontsCssUrl(result.fonts.map((f) => f.family))
    : null;

  return (
    <div className="mx-auto max-w-[76rem] px-5">
      {cssHref ? <link rel="stylesheet" href={cssHref} /> : null}

      <header className="pt-12 pb-6">
        <span className="label-mono">01 · Font Library</span>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight">
          Every open-licence family, with the small print in large type
        </h1>
        <p className="mt-4 max-w-2xl text-base text-fg-muted">
          {meta.count.toLocaleString("en-GB")} families from{" "}
          <a
            href={meta.source.repository}
            target="_blank"
            rel="noreferrer"
            className="text-fg underline underline-offset-4 decoration-line-strong hover:decoration-fg"
          >
            google/fonts
          </a>
          . All of them free for commercial work. The differences are in what
          you can do with the file itself, which is where people usually come
          unstuck. Synced {formatDate(meta.ingestedAt)}.
        </p>
      </header>

      <FilterBar subsets={subsetOptions()} total={meta.count} />

      <div className="flex items-baseline justify-between gap-4 py-6">
        <p className="text-sm text-fg-muted">
          {result.total.toLocaleString("en-GB")}{" "}
          {result.total === 1 ? "family" : "families"}
          {result.totalPages > 1
            ? ` · page ${result.page} of ${result.totalPages}`
            : ""}
        </p>
      </div>

      {result.fonts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.fonts.map((font) => (
            <FontCard key={font.slug} font={font} />
          ))}
        </div>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        params={params}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-card border border-dashed border-line-strong px-6 py-16 text-center">
      <p className="font-display text-lg font-medium">Nothing matches that</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
        You may have filtered your way into a corner. Try a broader category, or
        drop the script filter — most display faces only ever shipped Latin.
      </p>
      <ButtonLink href="/fonts" variant="secondary" size="sm" className="mt-5">
        Reset filters
      </ButtonLink>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  params,
}: {
  page: number;
  totalPages: number;
  params: SearchParams;
}) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "page" || value === undefined) continue;
      next.set(key, Array.isArray(value) ? value[0] : value);
    }
    if (target > 1) next.set("page", String(target));
    return next.toString() ? `/fonts?${next}` : "/fonts";
  };

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 py-12"
    >
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className="text-sm text-fg-muted hover:text-fg"
        >
          ← Previous
        </Link>
      ) : (
        <span />
      )}

      <span className="label-mono">
        {page} / {totalPages}
      </span>

      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          className="text-sm text-fg-muted hover:text-fg"
        >
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
