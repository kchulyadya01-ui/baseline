"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
}

/**
 * The main nav, with the current section marked.
 *
 * A CLIENT component deliberately, and deliberately small. `usePathname` is a
 * client hook, so highlighting happens in the browser and the server header
 * stays static — reading the route on the server would opt every page in the
 * app into dynamic rendering and cost the ~1,900 statically generated font
 * pages, which is exactly the regression this codebase already fixed once.
 *
 * Matching is prefix-based so a specimen page (/fonts/inter) still lights up
 * Font Library, and a project page (/community/some-slug) still lights up
 * Community.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav({
  items,
  variant = "desktop",
}: {
  items: NavItem[];
  variant?: "desktop" | "mobile";
}) {
  const pathname = usePathname();

  if (variant === "mobile") {
    // Same signal plus an underline: a tinted pill alone is easy to miss on a
    // crowded row that scrolls sideways.
    return (
      <nav
        className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden"
        aria-label="Sections"
      >
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-control px-3 py-1.5 text-xs transition-colors",
                active
                  ? "bg-accent-soft font-medium text-accent shadow-[inset_0_-2px_0_0_var(--accent)]"
                  : "text-fg-muted",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative rounded-control px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-fg-muted hover:bg-bg-sunken hover:text-fg",
              )}
            >
              {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
