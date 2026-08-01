"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/community/avatar";

interface Me {
  signedIn: boolean;
  handle: string | null;
  name: string | null;
  image: string | null;
  unread: number;
}

/**
 * The account corner of the header.
 *
 * Client-side and self-fetching on purpose: the header sits in the root layout,
 * so reading the session on the server there would make every page in the app
 * dynamic and give up static generation on the font pages that carry the SEO.
 * A slightly late avatar is a much smaller cost.
 */
export function HeaderAccount({ enabled }: { enabled: boolean }) {
  const [me, setMe] = useState<Me | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/me")
      .then((r) => r.json())
      .then((data: Me) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });
    return () => {
      cancelled = true;
    };
    // Re-read after navigation so signing in or out settles without a reload.
  }, [enabled, pathname]);

  if (!enabled) {
    return (
      <a
        href="https://github.com/kchulyadya01-ui/baseline"
        target="_blank"
        rel="noreferrer"
        className="hidden rounded-control px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg sm:block"
      >
        GitHub
      </a>
    );
  }

  // Reserve the width while unknown so the header does not shift.
  if (!me) return <span aria-hidden className="h-9 w-16" />;

  if (!me.signedIn) {
    return (
      <Link
        href="/signin"
        className="rounded-control px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg"
      >
        Sign in
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/messages"
        aria-label={me.unread ? `Messages, ${me.unread} unread` : "Messages"}
        className="relative rounded-control px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg"
      >
        Messages
        {me.unread ? (
          <span className="absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full bg-accent" />
        ) : null}
      </Link>
      <Link
        href={me.handle ? `/u/${me.handle}` : "/welcome"}
        aria-label="Your profile"
        className="ml-1 rounded-full transition-opacity hover:opacity-80"
      >
        <Avatar name={me.name} handle={me.handle} image={me.image} size="sm" />
      </Link>
    </>
  );
}
