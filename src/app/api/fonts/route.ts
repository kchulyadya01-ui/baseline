import { NextResponse } from "next/server";
import { queryFonts } from "@/lib/fonts";
import type { FontCategory, SortKey } from "@/lib/types";

/**
 * GET /api/fonts — search and filter the catalogue.
 *
 * Public and read-only, so it is cached at the edge. The Phase 4 public API
 * starts here; keeping the shape stable now avoids a breaking change later.
 */
export const revalidate = 86400;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const result = queryFonts({
    q: params.get("q") ?? undefined,
    category: (params.get("category") as FontCategory) ?? "all",
    subset: params.get("subset") ?? undefined,
    variable: params.get("variable") === "1" || params.get("variable") === "true",
    italic: params.get("italic") === "1" || params.get("italic") === "true",
    license: (params.get("license") as "OFL-1.1") ?? "all",
    sort: (params.get("sort") as SortKey) ?? "popular",
    page: Number(params.get("page") ?? 1),
    perPage: Math.min(100, Number(params.get("perPage") ?? 24)),
  });

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
