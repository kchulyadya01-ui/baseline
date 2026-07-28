import type { Metadata } from "next";
import { Badge } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Roadmap — what ships when",
  description:
    "Baseline's build plan: five phases, cheapest first, each with a gate that has to hold before the next one starts.",
  alternates: { canonical: "/roadmap" },
};

const PHASES = [
  {
    id: "Phase 0",
    when: "Weeks 1–3",
    title: "Foundation",
    status: "done" as const,
    items: [
      "Next.js scaffold, TypeScript, Tailwind v4",
      "Font ingestion from google/fonts, licence by directory",
      "Design system: tokens, primitives, light and dark",
    ],
    gate: "Catalogue searchable, design system signed off",
  },
  {
    id: "Phase 1",
    when: "Weeks 4–9",
    title: "The wedge — free tools",
    status: "shipping" as const,
    items: [
      "Font Library with plain-language licensing",
      "Type Scale Studio with CSS, Tailwind and token export",
      "Colour Studio: OKLCH ramps, WCAG checks, one-click fixes",
      "Font identification, URL mode",
      "Programmatic SEO — a page per family",
    ],
    gate: "Organic traffic rising, repeat visits",
  },
  {
    id: "Phase 2",
    when: "Weeks 10–17",
    title: "The Kit — the container",
    status: "next" as const,
    items: [
      "Accounts, then the Kit data model with Kit as aggregate root",
      "Bidirectional linking: change a colour, revalidate every contrast pair",
      "Version history as immutable snapshots",
      "Unified export — CSS, Tailwind, tokens, PDF, with licence text",
    ],
    gate: "Second-Kit rate healthy — the core bet",
  },
  {
    id: "Phase 3",
    when: "Weeks 18–28",
    title: "Acquisition and revenue",
    status: "later" as const,
    items: [
      "Image font identification via glyph embeddings and pgvector",
      "Free-alternative panel, curated",
      "Inspiration boards",
      "Pro tier and billing",
    ],
    gate: "Free→paid conversion, top-5 identification accuracy",
  },
  {
    id: "Phase 4",
    when: "Later",
    title: "Scale and handoff",
    status: "later" as const,
    items: [
      "Figma plugin",
      "Public API",
      "Team plan",
      "Commercial font index — metadata and buy links only, never files",
    ],
    gate: "Only after Phase 2 retention proves out",
  },
];

const TONE = {
  done: { label: "Shipped", tone: "success" as const },
  shipping: { label: "Live now", tone: "accent" as const },
  next: { label: "Next", tone: "warning" as const },
  later: { label: "Later", tone: "neutral" as const },
};

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-[52rem] px-5">
      <header className="pt-12 pb-8">
        <span className="label-mono">Build plan</span>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          Cheapest first, and each phase has to earn the next
        </h1>
        <p className="mt-4 text-base text-fg-muted">
          The free tools come before the account, and the account comes before
          the paywall. Each phase carries a gate — if the gate does not hold, the
          next phase does not start.
        </p>
      </header>

      <div className="space-y-4 pb-8">
        {PHASES.map((phase) => (
          <section
            key={phase.id}
            className="rounded-card border border-line bg-bg-raised p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <span className="label-mono">{phase.id}</span>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  {phase.title}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={TONE[phase.status].tone}>
                  {TONE[phase.status].label}
                </Badge>
                <span className="label-mono">{phase.when}</span>
              </div>
            </div>

            <ul className="mt-4 space-y-1.5">
              {phase.items.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-fg-muted">
                  <span aria-hidden className="text-fg-subtle">
                    ▸
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <p className="mt-4 border-t border-line pt-3 text-xs text-fg-subtle">
              <span className="font-mono uppercase tracking-wider text-accent">
                Gate
              </span>{" "}
              ◂ {phase.gate}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
