import Link from "next/link";
import { Avatar } from "@/components/community/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth } from "@/lib/auth";
import { unreadCount } from "@/lib/community";
import { isCommunityConfigured } from "@/lib/db";

const TOOLS = [
  { href: "/fonts", label: "Font Library" },
  { href: "/type-scale", label: "Type Scale" },
  { href: "/colour", label: "Colour" },
  { href: "/identify", label: "Identify" },
];

export async function SiteHeader() {
  const communityOn = isCommunityConfigured();
  const session = communityOn ? await auth() : null;
  const user = session?.user ?? null;
  const unread = user?.id && user.handle ? await unreadCount(user.id) : 0;

  const nav = communityOn
    ? [
        ...TOOLS,
        { href: "/community", label: "Community" },
        { href: "/people", label: "People" },
      ]
    : TOOLS;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[76rem] items-center gap-6 px-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <span
            aria-hidden
            className="block h-4 w-4 border-b-2 border-accent"
            title="the baseline"
          />
          <span className="font-display text-base font-semibold tracking-tight">
            Baseline
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-control px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {communityOn && user ? (
            <>
              <Link
                href="/messages"
                aria-label={unread ? `Messages, ${unread} unread` : "Messages"}
                className="relative rounded-control px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg"
              >
                Messages
                {unread ? (
                  <span className="absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full bg-accent" />
                ) : null}
              </Link>
              <Link
                href={user.handle ? `/u/${user.handle}` : "/welcome"}
                aria-label="Your profile"
                className="ml-1 rounded-full transition-opacity hover:opacity-80"
              >
                <Avatar
                  name={user.name}
                  handle={user.handle}
                  image={user.image}
                  size="sm"
                />
              </Link>
            </>
          ) : communityOn ? (
            <Link
              href="/signin"
              className="rounded-control px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg"
            >
              Sign in
            </Link>
          ) : (
            <a
              href="https://github.com/kchulyadya01-ui/baseline"
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-control px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg sm:block"
            >
              GitHub
            </a>
          )}
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile nav — the tools are the product, so they stay one tap away. */}
      <nav className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-control px-3 py-1.5 text-xs text-fg-muted"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
