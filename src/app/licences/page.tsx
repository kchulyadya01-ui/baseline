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
    a: "Yes. Charge whatever you like. The OFL has no opinion on what you set with the font — commercial, editorial, packaging, broadcast — and no interest in how many designers touched it.",
  },
  {
    q: "Can I sell a logo I made with an OFL font?",
    a: "Yes. The logo is your artwork; the font was the tool. Nobody asks the pencil for a cut. What you cannot do is sell the font file itself, or bundle it as a product.",
  },
  {
    q: "Do I have to credit the designer?",
    a: "Not in the design itself. But if you redistribute the files — and self-hosting them on your site absolutely counts — the licence text has to travel with them. Baseline puts it in every export so you do not have to remember.",
  },
  {
    q: "What is a Reserved Font Name?",
    a: "Some OFL fonts reserve their name, which means you can hack the outlines about all you like but the result cannot go out still calling itself the original. Only applies if you distribute the modified font. Using it changes nothing.",
  },
  {
    q: "Is Apache 2.0 different in practice?",
    a: "Marginally looser — no reserved-name rule, no obligation to keep derivatives under the same licence. For everyday design work you will never notice the difference.",
  },
  {
    q: "What about the fonts already on my computer?",
    a: "This is the expensive one. Fonts bundled with macOS, Windows or Adobe are usually desktop-only. Embedding one in a website or app needs a licence you almost certainly do not have and did not know existed. The identifier flags these on sight.",
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
          The licence, without the lawyer
        </h1>
        <p className="mt-4 text-base text-fg-muted">
          All {meta.count.toLocaleString("en-GB")} families here are free for
          commercial use. The three licences differ in ways so small you could
          ignore them — except for exactly one clause, which catches everybody
          out at least once.
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
          The questions people actually ask
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
          How we know, rather than assume
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
          No inference, no vibes, no model asked politely for its opinion. Every
          font page links to the exact directory the claim came from. Commercial
          fonts are never indexed with a file reference — the identifier will
          happily name one, but Baseline will not hand it to you.
        </p>
        <p className="mt-4 text-2xs text-fg-subtle">
          Plain-language summary, not legal advice. If it ever comes to a
          disagreement, the linked licence text is what counts, not us.
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
