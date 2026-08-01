import { NextResponse } from "next/server";
import { getOnboardedUser } from "@/lib/auth";
import { db, isCommunityConfigured } from "@/lib/db";

/**
 * GET /api/collections?fontSlug=inter
 *
 * The viewer's folders, plus which of them already hold this font.
 *
 * This exists so the font pages can stay statically rendered. They are ~1,900
 * programmatic SEO pages and the acquisition channel for the whole site; making
 * them dynamic to read one session would trade that away for a save button.
 * The button fetches its own state instead.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCommunityConfigured()) {
    return NextResponse.json(
      { signedIn: false, collections: [], savedIn: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const user = await getOnboardedUser();
  if (!user) {
    return NextResponse.json(
      { signedIn: false, collections: [], savedIn: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const fontSlug = new URL(request.url).searchParams.get("fontSlug");

  const [collections, saves] = await Promise.all([
    db.collection.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true, isPrivate: true },
      orderBy: { updatedAt: "desc" },
    }),
    fontSlug
      ? db.savedFont.findMany({
          where: { userId: user.id, fontSlug },
          select: { collectionId: true },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json(
    {
      signedIn: true,
      collections,
      savedIn: saves.map((s) => s.collectionId),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
