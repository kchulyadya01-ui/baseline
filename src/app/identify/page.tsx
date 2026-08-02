import type { Metadata } from "next";
import Link from "next/link";
import { IdentifyForm } from "@/components/identify/identify-form";
import { ImageIdentify } from "@/components/identify/image-identify";
import { isCommunityConfigured } from "@/lib/db";

export const metadata: Metadata = {
  title: "Font Identifier — find the fonts on any web page",
  description:
    "Paste a URL and read the fonts a page actually declares, straight from its CSS. Every result comes with its licence, and commercial faces come with free open-licence alternatives.",
  alternates: { canonical: "/identify" },
};

export const dynamic = "force-dynamic";

export default async function IdentifyPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.searchParams;
  const mode = params.mode === "image" ? "image" : "url";
  const imageAvailable = isCommunityConfigured();
  return (
    <div className="mx-auto max-w-[52rem] px-5">
      <header className="pt-12 pb-8">
        <span className="label-mono">04 · Font Identification</span>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          What is that site set in?
        </h1>
        <p className="mt-4 text-base text-fg-muted">
          Two ways in. Paste a URL and Baseline reads the page&rsquo;s own
          stylesheets — exact, no guessing. Or give it an image, from a file or
          your camera, and it reads the letterforms and pulls the colour palette
          out of the pixels. Either way, every result carries its licence and
          anything commercial comes with free alternatives you can ship.
        </p>
      </header>

      <nav className="mb-6 flex gap-1">
        {(
          [
            ["url", "From a URL"],
            ["image", "From an image"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={key === "url" ? "/identify" : "/identify?mode=image"}
            className={
              mode === key
                ? "rounded-control bg-bg-inset px-3 py-1.5 text-sm font-medium text-fg"
                : "rounded-control px-3 py-1.5 text-sm text-fg-muted hover:bg-bg-sunken hover:text-fg"
            }
          >
            {label}
          </Link>
        ))}
      </nav>

      {mode === "image" ? (
        imageAvailable ? (
          <ImageIdentify />
        ) : (
          <p className="rounded-card border border-line bg-bg-sunken p-4 text-sm text-fg-muted">
            Image identification needs the glyph index, which lives in the
            database. URL identification works without one.
          </p>
        )
      ) : (
        <IdentifyForm />
      )}

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="label-mono mb-5">How this works</h2>
        <ol className="space-y-4">
          {[
            {
              step: "01",
              title: "Google Fonts links — 95% confident",
              body: "A stylesheet URL like fonts.googleapis.com/css2?family=Inter names the family outright, along with the weights the page loads. There is nothing to infer.",
            },
            {
              step: "02",
              title: "@font-face rules — 88% confident",
              body: "The page self-hosts and declares the family name in its own CSS. Near-certain, though a self-hosted file can be renamed.",
            },
            {
              step: "03",
              title: "Plain declarations — 35–70% confident",
              body: "A font-family on html, body or :root describes the page's body text. Deeper in a stylesheet it may be for one component, or a fallback that never renders.",
            },
            {
              step: "04",
              title: "From an image instead",
              body: "Give it a photo or a screenshot and it does two things. Type: the letterforms are segmented and matched by shape against every indexed family, and where an AI reading is available it names candidates which the shape index then confirms or contradicts. Colour: the palette is measured from the pixels directly, no model involved. Type is a shortlist; the palette is exact.",
            },
          ].map((item) => (
            <li key={item.step} className="flex gap-4">
              <span className="label-mono shrink-0 pt-0.5">{item.step}</span>
              <div>
                <h3 className="text-sm font-medium text-fg">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
