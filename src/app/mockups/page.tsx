import type { Metadata } from "next";
import { StationeryStudio } from "@/components/studio/stationery-studio";
import { queryFonts } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Stationery Mockups — business cards, letterheads and envelopes",
  description:
    "Free stationery mockups at real print dimensions. Business cards, letterheads, compliment slips, envelopes and postcards with correct bleed and safe areas, set in any of 1,900+ open-licence fonts. Export at 300 DPI.",
  alternates: { canonical: "/mockups" },
};

export default function MockupsPage() {
  const fonts = queryFonts({ sort: "popular", perPage: 200 }).fonts.map((font) => ({
    slug: font.slug,
    family: font.family,
  }));

  return (
    <div className="mx-auto max-w-[76rem] px-5">
      <header className="pt-12 pb-8">
        <span className="label-mono">06 · Stationery Mockups</span>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight">
          Stationery that a printer will actually accept
        </h1>
        <p className="mt-4 max-w-2xl text-base text-fg-muted">
          Business cards, letterheads, compliment slips, envelopes and postcards
          at real trim sizes, with the bleed and safe margins most free mockup
          tools quietly leave out. Set it in any of the {(1934).toLocaleString("en-GB")}{" "}
          open-licence families and export at 300 DPI.
        </p>
      </header>

      <StationeryStudio fonts={fonts} />

      <section className="mt-16 grid gap-6 border-t border-line pt-10 sm:grid-cols-3">
        {[
          {
            title: "Bleed is not optional",
            body: "Guillotines drift by a millimetre or so, and a design that stops exactly at the trim gets a white hairline down one edge. Anything touching the edge runs 3mm past it. The export includes that bleed; the preview shows the trim so you can see what people will hold.",
          },
          {
            title: "Safe margins, honestly placed",
            body: "Type too close to the cut looks like a mistake even when it survives. The green guide is where to stop. On the DL envelope it is wider at the bottom right, because that is where a sorting machine expects to read and printing over it is a bad idea.",
          },
          {
            title: "Why it draws to canvas",
            body: "An SVG exported from a browser does not carry its webfonts, so it opens on someone else's machine set in Times. Drawing to canvas with the font loaded bakes the letterforms into pixels, so the file you hand over is the file you designed.",
          },
        ].map((item) => (
          <div key={item.title}>
            <h2 className="font-display text-base font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
