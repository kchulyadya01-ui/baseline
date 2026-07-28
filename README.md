# Baseline

Typography and colour tools for graphic designers at any level — beginner to professional. Free, no login, licence-checked.

Four public tools, built from the [build packet](./docs) in `docs/`:

| Tool | Route | What it does |
| --- | --- | --- |
| **Font Library** | `/fonts` | 1,934 open-licence families, searchable by category, script, variable axes and licence — each with a plain-language licence summary and a link to its source directory |
| **Type Scale Studio** | `/type-scale` | Modular scale from a base size and ratio, with suggested line height and tracking per step. Exports CSS variables, Tailwind v4 `@theme`, or W3C design tokens |
| **Colour Studio** | `/colour` | OKLCH ramps that stay perceptually even across hues, every text pair checked against WCAG 2.1, and a one-click fix for pairs that fail |
| **Font Identifier** | `/identify` | Reads a page's real CSS and reports the families it declares, with licence status and free alternatives for commercial faces |

Plus ~1,900 programmatic SEO pages at `/fonts/[slug]` — the acquisition channel.

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router), TypeScript | SSR for SEO on tool and font pages |
| Styling | Tailwind v4, CSS-first `@theme` tokens | The token layer doubles as the export format |
| Colour | [culori](https://culorijs.org) — OKLCH + WCAG 2.1 | Contrast is a fixed formula, not a model |
| Catalogue | Build-time JSON snapshot of `google/fonts` | Zero-dependency deploy; ~2k rows scan in well under the 400ms budget |
| Font ID | Static CSS read (cheerio) on a Node route | Deterministic, and no browser binary in a serverless function |
| Phase 2 | Postgres + pgvector via Prisma — **dormant** | Schema settled early, deliberately not wired up |

**No database, no environment variables and no external services are required to run or deploy this.** That is deliberate: Phase 1 is the free wedge, and it should cost nothing to keep online.

---

## Getting started

```bash
npm install
npm run dev            # http://localhost:3000
```

Other scripts:

```bash
npm run build          # production build, prerenders ~313 pages
npm run ingest         # refresh src/data/fonts.json from google/fonts
npm run lint
```

### Refreshing the font catalogue

`src/data/fonts.json` is committed so the build never touches the network. Regenerate it with:

```bash
GITHUB_TOKEN=$(gh auth token) npm run ingest
```

The script reads two sources:

1. `fonts.google.com/metadata/fonts` — family, category, designers, axes, subsets, popularity
2. the GitHub git-trees API — directory membership under `ofl/`, `apache/` and `ufl/`

Licence comes from **directory membership, not inference**: a family under `ofl/` is OFL, full stop. Every record carries the path it came from, and every font page links back to it. That is how the ">99% licence accuracy" requirement is met without a parsing step that can drift.

`GITHUB_TOKEN` is optional but recommended — unauthenticated GitHub API calls are capped at 60/hour.

---

## Project layout

```
src/
  app/
    page.tsx                    landing
    fonts/page.tsx              library — filters live in the URL
    fonts/[slug]/page.tsx       specimen + licence + CSS snippets (SEO surface)
    type-scale/page.tsx
    colour/page.tsx
    identify/page.tsx
    licences/page.tsx           plain-language licensing
    roadmap/page.tsx
    api/fonts/route.ts          catalogue search — cached, public
    api/identify/url/route.ts   URL font-ID
    sitemap.ts  robots.ts
  components/
    fonts/  studio/  identify/  site/  ui/
  lib/
    fonts.ts        catalogue access, search, ranking      (server-only)
    identify.ts     CSS extraction + SSRF guards           (server-only)
    alternatives.ts curated free-alternative map           (server-only)
    scale.ts        modular scale maths + exports          (pure)
    contrast.ts     WCAG 2.1 luminance, ratios, fixes      (pure)
    palette.ts      OKLCH ramps, harmony, exports          (pure)
    font-url.ts     Google Fonts CSS2 URL building         (pure)
  data/fonts.json   committed catalogue snapshot
scripts/ingest-fonts.ts
prisma/schema.prisma            Phase 2 — dormant, see docs/04-trd.md
docs/                           the build packet
```

The pure modules in `lib/` carry no framework imports and no I/O. They are the parts worth unit-testing, and the parts Phase 2 reuses unchanged on the server.

---

## Notable implementation decisions

**Filters live in the URL.** `/fonts?category=Serif&variable=1` is a real, cacheable, shareable, indexable page. Search runs server-side against the in-process snapshot.

**One stylesheet per grid, not per card.** A 48-font page requests a single Google Fonts CSS2 URL naming all 48 families.

**The identifier never guesses.** It reports what a page's CSS declares, ranked by evidence: a Google Fonts stylesheet URL (0.95), an `@font-face` rule (0.88), a `font-family` on `html`/`body`/`:root` (0.70), anything deeper (0.35–0.62). Styles injected by JavaScript after load are invisible to a static read, and the tool says so rather than pretending otherwise.

**The identify endpoint is SSRF-guarded.** It takes a URL from anyone on the internet, so non-HTTP schemes are rejected, hostnames are resolved, and anything landing in a private, loopback, link-local or CGNAT range — including `169.254.169.254` — is refused before a request is made.

**Family names are normalised before matching.** Stylesheets say `SourceCodePro`, `sohne-var`, `Inter-Variable`; the catalogue says `Source Code Pro`. Matching strips to bare alphanumerics and trims weight and variable suffixes, so real matches are not missed and real commercial faces are not mislabelled as open.

**Commercial fonts are never given a file reference.** The Phase 2 `Font` model has a `purchaseUrl` and no file column at all. The legal guardrail lives in the schema, not in a code path someone can forget.

**The app passes its own contrast checks.** Every foreground/background pair in the design system clears WCAG AA in both light and dark. A contrast tool that fails its own audit is not a contrast tool.

---

## Deployment

Deployed on Vercel. No environment variables are required.

Optional:

| Variable | Effect |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for `sitemap.xml`, `robots.txt` and OG metadata. Defaults to the Vercel URL |
| `DATABASE_URL` | Phase 2 only. Nothing reads it yet |

---

## Roadmap

Phase 0 (foundation) and Phase 1 (the free tools) are live. Phase 2 is the Kit — accounts, a saved project linking fonts, scale and palette together, version history, unified export. See [`docs/01-roadmap.md`](./docs/01-roadmap.md) for the gate each phase has to clear first, or `/roadmap` in the running app.

---

## Licensing

Baseline indexes and links to fonts; it does not sell or relicense any of them. Every family in the catalogue is OFL 1.1, Apache 2.0 or Ubuntu Font Licence, and every licence claim links to its source directory in [google/fonts](https://github.com/google/fonts).

The application code is MIT.
