# 01 — Roadmap

Five phases, cheapest first. Each has a gate; the next phase does not start until the gate holds. Weeks are indicative for two people part-time.

Fonts are free and legally clear throughout (OFL / Apache / UFL), so nothing waits on a licensing deal.

---

## Phase 0 · Foundation — weeks 1–3 · **shipped**

| Owner | Work |
| --- | --- |
| Engineering | Next.js scaffold, TypeScript, Tailwind v4, font ingestion from `google/fonts` |
| Design + domain | Design system, first-module screens, plain-language licence doc |

**Deliverable** — running skeleton, full font catalogue, design system.

**Gate** ◂ Catalogue searchable, design system signed off. ✅

Two departures from plan, both deliberate: the catalogue ships as a committed JSON snapshot rather than Postgres (see [docs/README](./README.md)), and auth moves to Phase 2 where the first thing worth authenticating — the Kit — actually exists.

---

## Phase 1 · The wedge — weeks 4–9 · **live**

| Owner | Work |
| --- | --- |
| Engineering | Font Library, Type Scale, Colour Studio, URL font-ID, programmatic SEO |
| Design + domain | Module design, licensing and teaching copy, community seeding |

**Deliverable** — public, free, SEO-indexed tools. No login anywhere.

**Gate** ◂ Organic traffic rising, and repeat visits.

The gate is about *return*, not volume. A tool people use once and forget will not carry a product behind it. The metric to watch is the share of sessions from returning visitors, not the raw traffic line.

---

## Phase 2 · The Kit — weeks 10–17

| Owner | Work |
| --- | --- |
| Engineering | Accounts, Kit data model, bidirectional linking, versioning, unified export |
| Design + domain | Kit UX and onboarding, dogfooding on real client work |

**Deliverable** — the product: save a project and reopen it.

**Gate** ◂ Second-Kit rate healthy. **This is the core bet.**

One Kit is curiosity. A second Kit is a habit — someone reached for Baseline at the start of a new project instead of opening a blank Figma file. If that number is weak, the container is not the product and Phase 3 should not be built on top of it.

The register moment is a public tool's **"save to Kit"** — the single prompt that turns an anonymous visitor into an account.

---

## Phase 3 · Acquisition and revenue — weeks 18–28

| Owner | Work |
| --- | --- |
| Engineering | Image font-ID (glyph embeddings + pgvector), boards, paywall, affiliates |
| Design + domain | Free-alternative curation, launch, pricing feel |

**Deliverable** — revenue live, plus the flagship identification wedge.

**Gate** ◂ Free→paid conversion, and top-5 identification accuracy.

Image identification is the only part of the product that needs ML, and it arrives last on purpose: everything else works without it, and it is the most expensive thing to build and to be wrong about.

---

## Phase 4 · Scale and handoff — later

| Owner | Work |
| --- | --- |
| Engineering | Figma plugin, public API, team plan, commercial index |
| Design + domain | Design-systems partnerships, template library |

**Deliverable** — distribution surfaces and team expansion.

**Gate** ◂ Only after Phase 2 retention proves out.

The commercial index is metadata and buy links only. No file reference, ever — enforced in the schema, not in review.
