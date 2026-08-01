import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unreadCount } from "@/lib/community";
import { isCommunityConfigured } from "@/lib/db";

/**
 * GET /api/me — the small amount of session state the header needs.
 *
 * The header lives in the root layout. Reading the session there with `auth()`
 * opts every route in the application into dynamic rendering, which quietly
 * cost the ~1,900 statically generated font pages that are the whole SEO
 * surface. The header stays static and asks for this instead.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_OUT = {
  signedIn: false,
  handle: null,
  name: null,
  image: null,
  unread: 0,
};

export async function GET() {
  if (!isCommunityConfigured()) {
    return NextResponse.json(SIGNED_OUT, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(SIGNED_OUT, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const unread = session.user.handle ? await unreadCount(session.user.id) : 0;

  return NextResponse.json(
    {
      signedIn: true,
      handle: session.user.handle,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
      unread,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
