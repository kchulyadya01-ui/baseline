# 02 — Feature scope

`M` must · `S` should · `C` could. Everything not listed is deliberately out of scope until later — the list is useful for what it excludes.

Status: ✅ built · ◻ planned

---

## Phase 0 · Foundation

| | Feature | | Notes |
| --- | --- | --- | --- |
| ✅ | Font ingestion — `google/fonts` → catalogue | `M` | Ships as a committed JSON snapshot, not Postgres |
| ✅ | Licence resolution by directory membership | `M` | `ofl/` `apache/` `ufl/` — no inference step |
| ✅ | Design system, tokens, light and dark | `M` | Tailwind v4 `@theme`; passes its own WCAG AA |
| ◻ | Nightly sync (cron) | `M` | Script exists; scheduling lands with the database |
| ◻ | Auth — email + OAuth | `M` | Moved to Phase 2: nothing to authenticate until the Kit exists |

## Phase 1 · Free tools — the wedge

| | Feature | | Notes |
| --- | --- | --- | --- |
| ✅ | Font Library — search, filter, specimen | `M` | Filters live in the URL; server-rendered |
| ✅ | Licensing display — plain-language | `M` | Per font, plus a dedicated `/licences` explainer |
| ✅ | Type Scale Studio — ratio + export | `M` | CSS vars, Tailwind v4, W3C design tokens |
| ✅ | Colour Studio — palette + WCAG | `M` | OKLCH ramps, contrast matrix, one-click fixes |
| ✅ | Font ID · URL mode | `M` | Static CSS read; evidence-ranked confidence |
| ✅ | Programmatic SEO — a page per font | `S` | ~1,900 pages, JSON-LD, sitemap-listed |
| ✅ | Free-alternative panel | — | Pulled forward from Phase 3; it is what makes an identification actionable |
| ✅ | Public catalogue API | — | `GET /api/fonts`, cached. Phase 4 starts from this shape |

## Phase 2 · The Kit

| | Feature | | Notes |
| --- | --- | --- | --- |
| ◻ | Design Kit — fonts + scale + palette, linked | `M` | Kit is the aggregate root |
| ◻ | Bidirectional linking | `M` | Change a colour → revalidate every contrast pair, one transaction |
| ◻ | Version history | `M` | Immutable snapshots of the whole graph |
| ◻ | Unified export — CSS, Tailwind, tokens, PDF | `M` | Always ships licence text alongside font files |
| ◻ | Share links | `S` | |
| ◻ | Kit templates | `C` | |

Schema for all of the above is written and validated in `prisma/schema.prisma`.

## Phase 3 · Wedge + money

| | Feature | | Notes |
| --- | --- | --- | --- |
| ◻ | Font ID · image mode | `M` | Glyph embeddings, pgvector cosine search |
| ◻ | Inspiration boards | `S` | |
| ◻ | Pro paywall — tiers, billing | `M` | |
| ◻ | Foundry affiliate links | `S` | Metadata and buy link only; never a file |
| ◻ | Confidence calibration loop | `S` | Feed corrections back into ranking |

---

## Explicitly out of scope

- **Font hosting for commercial faces.** Baseline will not serve a file it does not have the right to serve. The schema has no column for it.
- **A font editor.** Adjacent, enormous, and someone else's product.
- **AI-generated palettes or pairings.** Contrast is a formula and a ramp is a library. Generating them with a model would make the output non-reproducible for no gain.
- **A search cluster.** Postgres will not be outgrown for a long time, and it has not even been reached yet.
