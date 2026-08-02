import type { Metadata } from "next";
import {
  TypeScaleStudio,
  type FontOption,
} from "@/components/studio/type-scale-studio";
import { getFont, queryFonts } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Type Scale Studio — modular scale generator with CSS export",
  description:
    "Build a modular type scale from a base size and ratio. Live preview in any Google Font, suggested line heights and tracking, export to CSS variables, Tailwind v4 or design tokens.",
  alternates: { canonical: "/type-scale" },
};

export default async function TypeScalePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.searchParams;
  const requested = Array.isArray(params.font) ? params.font[0] : params.font;

  // The picker only needs a workable shortlist, not all 1,900 families.
  const shortlist = queryFonts({ sort: "popular", perPage: 120 }).fonts;
  const preselected = requested ? getFont(requested) : undefined;

  const options: FontOption[] = [
    ...(preselected ? [preselected] : []),
    ...shortlist.filter((f) => f.slug !== preselected?.slug),
  ].map((f) => ({ slug: f.slug, family: f.family, category: f.category }));

  return (
    <div className="mx-auto max-w-[76rem] px-5">
      <header className="pt-12 pb-8">
        <span className="label-mono">02 · Type Scale Studio</span>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight">
          One ratio, every size, no more eyeballing it
        </h1>
        <p className="mt-4 max-w-2xl text-base text-fg-muted">
          Pick a base size and a ratio and the scale falls out of the maths.
          Line height and tracking come suggested per step — tight up top, roomy
          for body copy — and the export is ready to paste before you&rsquo;ve
          finished reading this sentence.
        </p>
      </header>

      <TypeScaleStudio
        fonts={options}
        initialFont={
          preselected
            ? {
                slug: preselected.slug,
                family: preselected.family,
                category: preselected.category,
              }
            : undefined
        }
      />

      <section className="mt-16 grid gap-6 border-t border-line pt-10 sm:grid-cols-3">
        {[
          {
            title: "Why a ratio at all",
            body: "Sizes picked one at a time drift, and then you have a 23px and a 24px in the same layout doing nothing for each other. A ratio makes every step a deliberate multiple of the last, so headings relate to body copy instead of just being bigger than it.",
          },
          {
            title: "Line height moves with size",
            body: "Long body lines need air. A 60px headline emphatically does not, and 1.5 line height on a headline is the fastest way to make a layout look like a first draft. The suggestion falls as size rises, from about 1.6 at 16px to near 1.05 up top.",
          },
          {
            title: "Tracking is optical",
            body: "Big type looks loose at default spacing, small type looks cramped, and default spacing is smug about being right. Negative tracking above 24px and a touch of positive below 14px sorts both out.",
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
