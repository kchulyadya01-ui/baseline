import Link from "next/link";
import { HeaderAccount } from "@/components/site/header-account";
import { SiteNav, type NavItem } from "@/components/site/site-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { isCommunityConfigured } from "@/lib/db";

const TOOLS: NavItem[] = [
  { href: "/fonts", label: "Font Library" },
  { href: "/type-scale", label: "Type Scale" },
  { href: "/colour", label: "Colour" },
  { href: "/identify", label: "Identify" },
  { href: "/assistant", label: "Assistant" },
];

/**
 * Deliberately NOT async, and it does not call `auth()`.
 *
 * The header renders inside the root layout, so any server-side session read
 * here opts the entire application into dynamic rendering — which silently
 * cost static generation on the ~1,900 font pages that carry the site's SEO.
 * `isCommunityConfigured()` only reads an env var, which is static-safe. The
 * signed-in state is fetched by <HeaderAccount /> and the current section is
 * resolved by <SiteNav />, both on the client, for the same reason.
 */
export function SiteHeader() {
  const communityOn = isCommunityConfigured();

  // People lives under Community rather than beside it — it is a way of
  // navigating the community, not a sixth tool.
  const nav = communityOn
    ? [...TOOLS, { href: "/community", label: "Community" }]
    : TOOLS;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[76rem] items-center gap-6 px-5">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <span
            aria-hidden
            className="block h-4 w-4 border-b-2 border-accent"
            title="the baseline"
          />
          <span className="font-display text-base font-semibold tracking-tight">
            Baseline
          </span>
        </Link>

        <div className="min-w-0 flex-1">
          <SiteNav items={nav} />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <HeaderAccount enabled={communityOn} />
          <ThemeToggle />
        </div>
      </div>

      {/* The tools are the product, so on mobile they stay one tap away. */}
      <SiteNav items={nav} variant="mobile" />
    </header>
  );
}
