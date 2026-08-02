import Link from "next/link";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/community", label: "Feed", match: "feed" },
  { href: "/people", label: "People", match: "people" },
  { href: "/collections", label: "Collections", match: "collections" },
];

/**
 * Sub-navigation shared by the community pages.
 *
 * People and Collections sit under Community rather than in the top bar: they
 * are ways of moving around the community, not separate destinations, and the
 * main nav should stay about the tools.
 */
export function CommunityNav({ active }: { active: "feed" | "people" | "collections" }) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-line pb-3">
      {SECTIONS.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          aria-current={active === section.match ? "page" : undefined}
          className={cn(
            "rounded-control px-3 py-1.5 text-sm transition-colors",
            active === section.match
              ? "bg-accent-soft font-medium text-accent"
              : "text-fg-muted hover:bg-bg-sunken hover:text-fg",
          )}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}
