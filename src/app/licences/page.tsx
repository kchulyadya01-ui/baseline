import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/primitives";
import { allFonts, getCatalogueMeta } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Font licences explained — OFL, Apache 2.0 and Ubuntu, in plain English",
  description:
    "What you may and may not do with an open-licence font: commercial use, embedding, modification, redistribution, and the one restriction people actually trip over.",
  alternates: { canonical: "/licences" },
};

const FAQ = [
  {
    q: "Can I use an OFL font in paid client work?",
    a: "Yes. The OFL places no restriction on what you set with the font — commercial, editorial, packaging, broadcast, all fine, with no additional licence and no per-seat counting.",
  },
  {
    q: "Can I sell a logo I made with an OFL font?",
    a: "Yes. The logo is your artwork; the font is a tool used to make it. What you cannot do is sell the font file itself, or bundle it as a product for sale.",
  },
  {
    q: "Do I have to credit the designer?",
    a: "Not in your design. If you redistribute the font files — self-hosting them on your site counts — you must include the licence text alongside them. Baseline ships that text in every export.",
  },
  {
    q: "What is a Reserved Font Name?",
    a: "Some OFL fonts reserve their name. You may modify the font, but the modified version must be released under a different name. This only applies when you distribute a modified font, not when you use it.",
  },
  {
    q: "Is Apache 2.0 different in practice?",
    a: "Slightly more permissive: it carries no reserved-name rule, and no obligation to keep derivatives under the same licence. For everyday design work the two are interchangeable.",
  },
  {
    q: "What about the fonts on my computer?",
    a: "Fonts bundled with macOS, Windows or Adobe apps are usually licensed for desktop use only. Embedding one in a website or app is a separate licence you probably do not have. Baseline's identifier flags these.",
  },
];

export default function LicencesPage() {
  const meta = getCatalogueMeta();
  const counts = allFonts().reduce<Record<string, number>>((acc, font) => {
    acc[font.license.id] = (acc[font.license.id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-[52rem] px-5">
      <header className="pt-12 pb-8">
        <span className="label-mono">Licensing</span>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          The licence, in plain English
        </h1>
        <p className="mt-4 text-base text-fg-muted">
          Every one of the {meta.count.toLocaleString("en-GB")} families in
          Baseline is free for commercial use. The differences between the three
          licences are narrow, and only one of them catches people out.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            id: "OFL-1.1",
            name: "SIL Open Font License",
            note: "The default for open type. Modify and redistribute freely; derivatives stay OFL, and reserved names must change.",
          },
          {
            id: "Apache-2.0",
            name: "Apache License 2.0",
            note: "Permissive with a patent grant. No reserved-name rule, no copyleft on derivatives.",
          },
          {
            id: "UFL-1.0",
            name: "Ubuntu Font Licence",
            note: "OFL-like, written for the Ubuntu family. Same practical freedoms for designers.",
          },
        ].map((licence) => (
          <Card key={licence.id} className="p-5">
            <div className="label-mono">{licence.id}</div>
            <h2 className="mt-2 font-display text-base font-semibold">
              {licence.name}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-fg-muted">
              {licence.note}
            </p>
            <p className="mt-3 font-mono text-2xs text-fg-subtle">
              {(counts[licence.id] ?? 0).toLocaleString("en-GB")} families
            </p>
          </Card>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Questions people actually ask
        </h2>
        <dl className="mt-6 divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <div key={item.q} className="py-5">
              <dt className="text-sm font-medium text-fg">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-fg-muted">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12 rounded-card border border-line bg-bg-sunken p-6">
        <h2 className="font-display text-base font-semibold">
          How Baseline knows
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          Licence is taken from directory membership in{" "}
          <a
            href={meta.source.repository}
            target="_blank"
            rel="noreferrer"
            className="text-fg underline underline-offset-4"
          >
            google/fonts
          </a>
          : a family under <code className="font-mono text-xs">ofl/</code> is OFL,
          under <code className="font-mono text-xs">apache/</code> is Apache 2.0.
          There is no inference step, and every font page links to the exact
          directory its claim came from. Commercial fonts are never indexed with
          a file reference — the identifier can name one, but Baseline will not
          serve it.
        </p>
        <p className="mt-4 text-2xs text-fg-subtle">
          This page is a plain-language summary and not legal advice. The linked
          licence text governs.
        </p>
        <Link
          href="/fonts"
          className="mt-5 inline-block text-sm text-accent hover:underline"
        >
          Browse the library →
        </Link>
      </section>
    </div>
  );
}
