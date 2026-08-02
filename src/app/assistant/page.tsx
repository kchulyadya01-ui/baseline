import type { Metadata } from "next";
import Link from "next/link";
import { BriefAssistant } from "@/components/studio/brief-assistant";
import { isGeminiConfigured } from "@/lib/gemini";

export const metadata: Metadata = {
  title: "Brief Assistant — type and colour from a written brief",
  description:
    "Describe a project in plain words and get a font pairing from the open-licence catalogue, a palette that already passes WCAG, and a type scale ratio. Every font is real and every contrast pair is checked.",
  alternates: { canonical: "/assistant" },
};

export const dynamic = "force-dynamic";

export default function AssistantPage() {
  const available = isGeminiConfigured();

  return (
    <div className="mx-auto max-w-[52rem] px-5">
      <header className="pt-12 pb-8">
        <span className="label-mono">05 · Brief Assistant</span>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          Start from the brief, not the blank page
        </h1>
        <p className="mt-4 text-base text-fg-muted">
          Describe the project in a sentence or two. Back comes a pairing drawn
          from the {(1934).toLocaleString("en-GB")} open-licence families, a
          palette, and a scale ratio — all of it put through the same checks the
          other tools run, so nothing arrives untested.
        </p>
      </header>

      {available ? (
        <BriefAssistant />
      ) : (
        <p className="rounded-card border border-line bg-bg-sunken p-4 text-sm text-fg-muted">
          The assistant needs a Gemini API key on this deployment. The{" "}
          <Link href="/type-scale" className="text-accent hover:underline">
            Type Scale
          </Link>{" "}
          and{" "}
          <Link href="/colour" className="text-accent hover:underline">
            Colour
          </Link>{" "}
          studios work without one.
        </p>
      )}

      <section className="mt-16 grid gap-6 border-t border-line pt-10 sm:grid-cols-3">
        {[
          {
            title: "Only real fonts",
            body: "Every suggestion is checked against the catalogue first. Invent a font and it gets binned before it reaches you — and listed as binned, so you can see what it tried to get away with.",
          },
          {
            title: "The contrast is not a suggestion",
            body: "Ask for warm and loud and any model will cheerfully hand you ochre on red. Every pair goes through the same WCAG maths the Colour Studio uses, and anything that fails gets nudged along its own hue until it passes, before you ever see it.",
          },
          {
            title: "A start, not an answer",
            body: "The fonts are real and the ratios are arithmetic. The taste is the part worth arguing with — so argue with it. Everything links straight into the studios so you can overrule it in about four seconds.",
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
