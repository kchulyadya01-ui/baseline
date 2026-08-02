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
          Palettes that pass, in a colour space that isn&rsquo;t lying
        </h1>
        <p className="mt-4 max-w-2xl text-base text-fg-muted">
          Ramps are generated in OKLCH, so a 500 in one hue actually looks as
          light as a 500 in another — a trick HSL has never once managed. Every
          text pair is checked against WCAG as you go, and the ones that fail
          come with a fix you can take in a single click.
        </p>
      </header>

      <ColourStudio />

      <section className="mt-16 grid gap-6 border-t border-line pt-10 sm:grid-cols-3">
        {[
          {
            title: "Why OKLCH",
            body: "HSL lightness is a lie told with a straight face. hsl(60 100% 50%) is a searing yellow; hsl(240 100% 50%) is a near-black blue. Same number. OKLCH lightness matches what your eye reports, so a ramp holds together across hues instead of falling apart at blue.",
          },
          {
            title: "Chroma has limits",
            body: "Very light and very dark tints can only hold so much chroma before they go muddy or wander out of sRGB entirely and start rendering as something you did not ask for. Chroma follows a curve across the ramp and gets clamped back into gamut when it overreaches.",
          },
          {
            title: "Contrast is a formula",
            body: "WCAG 2.1 relative luminance, computed exactly. AA is 4.5:1 for body copy, 3:1 for large text and UI. AAA is 7:1. No approximation and definitely no AI — an auditor running the numbers gets the same answer you did, which is the entire point.",
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
