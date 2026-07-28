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
    body: "Every open-licence family, searchable by category, script, variable axes and licence — with the licence written in plain language, not legalese.",
  },
  {
    index: "02",
    href: "/type-scale",
    title: "Type Scale Studio",
    body: "Base size and ratio in, a full scale out — with line height and tracking suggested per step, previewed in the font you actually chose.",
  },
  {
    index: "03",
    href: "/colour",
    title: "Colour Studio",
    body: "OKLCH ramps that stay perceptually even across hues, with every text pair checked against WCAG 2.1 and a one-click fix for the ones that fail.",
  },
  {
    index: "04",
    href: "/identify",
    title: "Font Identification",
    body: "Paste a URL and read what a page is really set in, straight from its CSS. Commercial faces come back with free alternatives.",
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
    "Under the OFL this is the one thing you may not do.",
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
            The typography and colour decisions,
            <span className="text-fg-subtle"> made once and exported.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">
            Four tools for anyone who sets type — first project or fifteenth
            year. Find a font and know exactly what you may do with it, build a
            scale that holds together, and prove your palette is readable before
            it ships.
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
              &ldquo;Free for personal use&rdquo; is where projects go wrong
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-fg-muted">
              Every family here is OFL, Apache 2.0 or Ubuntu-licensed — free for
              commercial work, with no per-seat maths and no invoice at the end
              of the project. Baseline never indexes a commercial font file, and
              every licence claim links back to the exact directory in{" "}
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
              the faces everyone reaches for
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
