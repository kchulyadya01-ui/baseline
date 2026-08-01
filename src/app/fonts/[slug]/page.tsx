import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FontCard } from "@/components/fonts/font-card";
import { LicencePanel } from "@/components/fonts/licence-panel";
import { Specimen } from "@/components/fonts/specimen";
import { ButtonLink } from "@/components/ui/button";
import { DeveloperSnippets } from "@/components/fonts/developer-snippets";
import { SaveFontButton } from "@/components/community/save-font-button";
import { Badge, Card, Stat } from "@/components/ui/primitives";
import {
  fontCssUrl,
  fontsCssUrl,
  fontStack,
  formatBytes,
  googleFontsPageUrl,
} from "@/lib/font-url";
import { allFonts, getFont, similarFonts } from "@/lib/fonts";
import { formatDate } from "@/lib/utils";

/**
 * Programmatic SEO: one page per family, ~1,900 of them. These are the
 * acquisition channel, so they are statically rendered.
 *
 * The top slice is prebuilt; the long tail renders on first request and is then
 * cached. Prebuilding all 1,900 would add minutes to every deploy for pages
 * that get a handful of visits a month.
 */
export const dynamicParams = true;
export const revalidate = 604800; // a week — font metadata barely moves

export async function generateStaticParams() {
  return allFonts()
    .slice(0, 300)
    .map((font) => ({ slug: font.slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const font = getFont(slug);
  if (!font) return { title: "Font not found" };

  const designers = font.designers.length
    ? ` by ${font.designers.join(", ")}`
    : "";

  return {
    title: `${font.family} — free ${font.category.toLowerCase()} font, ${font.license.id}`,
    description:
      `${font.family}${designers} is a free ${font.category.toLowerCase()} typeface with ` +
      `${font.weights.length} weight${font.weights.length === 1 ? "" : "s"}` +
      `${font.isVariable ? ", variable axes" : ""}${font.hasItalic ? " and italics" : ""}. ` +
      `Licensed ${font.license.name} — free for commercial use. Preview it live and copy the CSS.`,
    alternates: { canonical: `/fonts/${font.slug}` },
    openGraph: {
      title: `${font.family} — free ${font.category.toLowerCase()} font`,
      description: `${font.license.name}. ${font.weights.length} weights. Preview and copy the CSS.`,
      type: "article",
    },
  };
}

export default async function FontPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const font = getFont(slug);
  if (!font) notFound();

  const similar = similarFonts(font);
  const cssHref = fontCssUrl(font);
  const similarHref = similar.length
    ? fontsCssUrl(similar.map((f) => f.family))
    : null;

  const importSnippet = `@import url('${cssHref}');\n\n.heading {\n  font-family: ${fontStack(font)};\n}`;
  const linkSnippet = `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="${cssHref}" rel="stylesheet">`;
  const nextSnippet = `import { ${font.family.replace(/[^A-Za-z0-9]/g, "_")} } from 'next/font/google'\n\nconst font = ${font.family.replace(/[^A-Za-z0-9]/g, "_")}({\n  subsets: ['latin'],\n  weight: [${font.weights.map((w) => `'${w}'`).join(", ")}],\n})`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: font.family,
    description: `${font.category} typeface licensed under ${font.license.name}.`,
    creator: font.designers.map((name) => ({ "@type": "Person", name })),
    license: font.license.url,
    dateCreated: font.dateAdded,
    dateModified: font.lastModified,
    isAccessibleForFree: true,
  };

  return (
    <div className="mx-auto max-w-[76rem] px-5">
      <link rel="stylesheet" href={cssHref} />
      {similarHref ? <link rel="stylesheet" href={similarHref} /> : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="pt-8 text-sm text-fg-muted">
        <Link href="/fonts" className="hover:text-fg">
          Font Library
        </Link>
        <span aria-hidden className="mx-2 text-fg-subtle">
          /
        </span>
        <span className="text-fg">{font.family}</span>
      </nav>

      <header className="border-b border-line pt-6 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1
              className="specimen text-5xl font-normal tracking-tight text-fg"
              style={{ fontFamily: fontStack(font) }}
            >
              {font.family}
            </h1>
            <p className="mt-3 text-sm text-fg-muted">
              {font.category}
              {font.designers.length
                ? ` · ${font.designers.join(", ")}`
                : ""}{" "}
              · added {formatDate(font.dateAdded)}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge tone="success">{font.license.id}</Badge>
              <Badge>{font.weights.length} weights</Badge>
              {font.isVariable ? (
                <Badge tone="accent">
                  Variable · {font.axes.map((a) => a.tag).join(" ")}
                </Badge>
              ) : null}
              {font.hasItalic ? <Badge>Italic</Badge> : null}
              <Badge>{formatBytes(font.sizeBytes)}</Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <ButtonLink
              href={`/type-scale?font=${font.slug}`}
              variant="primary"
              size="md"
            >
              Use in a type scale
            </ButtonLink>
            <SaveFontButton fontSlug={font.slug} family={font.family} />
            <a
              href={googleFontsPageUrl(font.family)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center rounded-control border border-line-strong px-4 text-sm text-fg-muted hover:text-fg"
            >
              Download
            </a>
          </div>
        </div>
      </header>

      <div className="grid gap-8 py-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-8">
          <Specimen font={font} />

          <DeveloperSnippets
            html={linkSnippet}
            css={importSnippet}
            next={nextSnippet}
          />
        </div>

        <aside className="space-y-6">
          <LicencePanel
            license={font.license}
            provenance={font.provenance}
            family={font.family}
          />

          <Card className="p-6">
            <h2 className="label-mono mb-4">Details</h2>
            <div className="space-y-4">
              <Stat label="Weights" value={font.weights.join(", ")} />
              <Stat
                label="Scripts"
                value={
                  <span className="text-fg-muted">
                    {font.subsets.slice(0, 6).join(", ")}
                    {font.subsets.length > 6
                      ? ` +${font.subsets.length - 6} more`
                      : ""}
                  </span>
                }
              />
              {font.isVariable ? (
                <Stat
                  label="Variable axes"
                  value={
                    <span className="font-mono text-xs">
                      {font.axes
                        .map((a) => `${a.tag} ${a.min}–${a.max}`)
                        .join(" · ")}
                    </span>
                  }
                />
              ) : null}
              <Stat label="Family size" value={formatBytes(font.sizeBytes)} />
              <Stat label="Updated" value={formatDate(font.lastModified)} />
            </div>
          </Card>
        </aside>
      </div>

      {similar.length ? (
        <section className="border-t border-line py-12">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Similar {font.category.toLowerCase()} faces
          </h2>
          <p className="mt-2 text-sm text-fg-muted">
            Same category, comparable reach. All free for commercial use.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((f) => (
              <FontCard key={f.slug} font={f} sample="Handgloves" />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
