import type { Metadata } from "next";
import { ColourStudio } from "@/components/studio/colour-studio";

export const metadata: Metadata = {
  title: "Colour Studio — OKLCH palette generator with WCAG contrast checks",
  description:
    "Build a colour palette in OKLCH, generate perceptually even ramps, and check every text pair against WCAG 2.1 AA and AAA. One-click fixes for failing pairs. Export CSS, Tailwind v4 or design tokens.",
  alternates: { canonical: "/colour" },
};

export default function ColourPage() {
  return (
    <div className="mx-auto max-w-[76rem] px-5">
      <header className="pt-12 pb-8">
        <span className="label-mono">03 · Colour Studio</span>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight">
          Palettes that pass, in a colour space that behaves
        </h1>
        <p className="mt-4 max-w-2xl text-base text-fg-muted">
          Ramps are generated in OKLCH, so a 500 in one hue looks as light as a
          500 in every other — something HSL never manages. Every text pair is
          checked against WCAG 2.1 as you go, and failing pairs come with a fix
          you can apply in one click.
        </p>
      </header>

      <ColourStudio />

      <section className="mt-16 grid gap-6 border-t border-line pt-10 sm:grid-cols-3">
        {[
          {
            title: "Why OKLCH",
            body: "HSL lightness is a lie: hsl(60 100% 50%) is a bright yellow, hsl(240 100% 50%) is a near-black blue. OKLCH lightness matches what your eye reports, so a ramp holds together across hues.",
          },
          {
            title: "Chroma has limits",
            body: "Very light and very dark tints cannot hold much chroma before they look muddy or leave the sRGB gamut entirely. Chroma follows a curve across the ramp and is clamped back into gamut where needed.",
          },
          {
            title: "Contrast is a formula",
            body: "WCAG 2.1 relative luminance, computed exactly. AA is 4.5:1 for body copy and 3:1 for large text and UI components; AAA is 7:1. No approximation, no model — an auditor gets the same numbers.",
          },
        ].map((item) => (
          <div key={item.title}>
            <h2 className="font-display text-base font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              {item.body}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
