import Link from "next/link";
import { FontCard } from "@/components/fonts/font-card";
import { ButtonLink } from "@/components/ui/button";
import { getCatalogueMeta, queryFonts } from "@/lib/fonts";
import { fontsCssUrl } from "@/lib/font-url";

const TOOLS = [
  {
    index: "01",
    href: "/fonts",
    title: "Font Library",
    body: "Every open-licence family, searchable by category, script, variable axes and licence. The licence is written in words a human uses, not the ones a lawyer bills for.",
  },
  {
    index: "02",
    href: "/type-scale",
    title: "Type Scale Studio",
    body: "Base size and ratio in, a whole scale out. Line height and tracking suggested per step, previewed in the font you actually picked rather than whatever the tool felt like.",
  },
  {
    index: "03",
    href: "/colour",
    title: "Colour Studio",
    body: "OKLCH ramps that stay evenly light across hues, because HSL has been lying to you for years. Every text pair checked against WCAG, and one click to fix the ones that fail.",
  },
  {
    index: "04",
    href: "/identify",
    title: "Font Identification",
    body: "Paste a URL and read what a page is actually set in, straight from its CSS. Or point your camera at a poster. Commercial faces come back with free lookalikes.",
  },
];

const PERMISSIONS: [string, string, boolean][] = [
  [
    "Use it commercially",
    "Client work, products, packaging, ads. No extra licence.",
    true,
  ],
  [
    "Embed and self-host",
    "Websites, apps, PDFs, video. Ship the font with your work.",
    true,
  ],
  ["Modify it", "New weights, tweaked glyphs, subset for performance.", true],
  [
    "Sell the font file itself",
    "The one thing OFL says no to. Sell the poster, not the typeface.",
    false,
  ],
];

export default function Home() {
  const meta = getCatalogueMeta();
  const featured = queryFonts({ sort: "popular", perPage: 6 }).fonts;

  return (
    <div>
      <link rel="stylesheet" href={fontsCssUrl(featured.map((f) => f.family))} />

      <section className="border-b border-line">
        <div className="mx-auto max-w-[76rem] px-5 py-20 sm:py-28">
          <span className="label-mono">
            Free · no login · {meta.count.toLocaleString("en-GB")} families
          </span>

          <h1 className="mt-5 max-w-4xl font-display text-4xl font-semibold leading-[1.03] tracking-tight sm:text-5xl">
            Stop picking fonts
            <span className="text-fg-subtle"> like you&rsquo;re guessing.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">
            Five tools for anyone who sets type, whether this is project one or
            project four hundred. Find a font and know exactly what you&rsquo;re
            allowed to do with it. Build a scale that isn&rsquo;t just vibes. Find
            out your palette is unreadable now, rather than from a client.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/fonts" size="lg">
              Browse the library
            </ButtonLink>
            <ButtonLink href="/identify" variant="secondary" size="lg">
              Identify a font
            </ButtonLink>
          </div>

          <dl className="mt-16 grid max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              [meta.count.toLocaleString("en-GB"), "Families"],
              ["100%", "Free commercially"],
              ["OKLCH", "Colour space"],
              ["WCAG 2.1", "Contrast checks"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="label-mono">{label}</dt>
                <dd className="mt-1 font-display text-2xl font-semibold tracking-tight">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-[76rem] px-5 py-20">
        <div className="mb-10 flex items-baseline gap-3">
          <span className="label-mono">The tools</span>
          <span className="text-sm text-fg-subtle">
            all free, all without an account
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group rounded-card border border-line bg-bg-raised p-7 transition-colors hover:border-line-strong hover:bg-bg-sunken"
            >
              <span className="label-mono">{tool.index}</span>
              <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">
                {tool.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                {tool.body}
              </p>
              <span className="mt-5 inline-block text-sm text-accent">
                Open{" "}
                <span
                  aria-hidden
                  className="inline-block transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-bg-sunken">
        <div className="mx-auto grid max-w-[76rem] gap-10 px-5 py-16 lg:grid-cols-2">
          <div>
            <span className="label-mono">
              Why licensing is a first-class citizen here
            </span>
            <h2 className="mt-3 max-w-md font-display text-2xl font-semibold tracking-tight">
              &ldquo;Free for personal use&rdquo; is how invoices happen
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-fg-muted">
              Every family here is OFL, Apache 2.0 or Ubuntu-licensed. Free for
              commercial work, no per-seat arithmetic, no surprise bill three
              months in. Baseline never indexes a commercial font file, and every
              licence claim links straight back to the directory in{" "}
              <a
                href={meta.source.repository}
                target="_blank"
                rel="noreferrer"
                className="text-fg underline underline-offset-4"
              >
                google/fonts
              </a>{" "}
              it came from.
            </p>
            <Link
              href="/licences"
              className="mt-5 inline-block text-sm text-accent hover:underline"
            >
              What each licence actually permits →
            </Link>
          </div>

          <div className="space-y-3">
            {PERMISSIONS.map(([title, body, allowed]) => (
              <div
                key={title}
                className="flex gap-4 rounded-card border border-line bg-bg-raised p-4"
              >
                <span
                  aria-hidden
                  className={allowed ? "text-success" : "text-danger"}
                >
                  {allowed ? "✓" : "✕"}
                </span>
                <div>
                  <div className="text-sm font-medium">{title}</div>
                  <div className="mt-0.5 text-xs text-fg-muted">{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[76rem] px-5 py-20">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="label-mono">Most used</span>
            <span className="text-sm text-fg-subtle">
              the ones everybody reaches for first
            </span>
          </div>
          <Link href="/fonts" className="text-sm text-accent hover:underline">
            All {meta.count.toLocaleString("en-GB")} →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((font) => (
            <FontCard key={font.slug} font={font} sample="Handgloves" />
          ))}
        </div>
      </section>
    </div>
  );
}
