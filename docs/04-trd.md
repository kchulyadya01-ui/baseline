# 04 — Technical requirements

Lean by design: no ML infrastructure until Phase 3, no search cluster until Postgres is outgrown, and no Postgres until there is something to write to it.

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | Next.js 16 App Router, TypeScript, Tailwind v4 | SSR for SEO on tool and font pages — the acquisition channel. Tailwind's `@theme` layer *is* the token export format |
| Rendering | CSS Font Loading via Google Fonts CSS2 | One stylesheet per grid, not one per card |
| Backend | Node route handlers | Catalogue reads and identification. Python arrives only for embeddings, in Phase 3 |
| Database | **Phase 1: none.** Phase 2: Postgres + pgvector | Relational integrity for the Kit graph, vector similarity in the same store |
| Storage | Phase 2: S3-compatible + CDN | Self-hosted OFL files, exports, board imagery |
| Async | Phase 2: Redis + BullMQ | Export, image-ID and extraction leave the request path |
| Colour | culori (OKLCH), WCAG 2.1 formula | Contrast is a fixed calculation; OKLCH ramps are a library, not a model |
| URL font-ID | Static CSS read (cheerio), Node runtime | Deterministic and serverless-compatible. See the departure note below |

### Two departures from the original plan

**Postgres deferred.** Phase 1 is read-only over ~2,000 rows. A build-time JSON snapshot scans in microseconds, deploys with zero configuration and costs nothing to keep online — which is exactly what a free wedge should cost. The schema is written and validated at `prisma/schema.prisma`, so the migration is a wiring job, not a design job. `queryFonts()` in `src/lib/fonts.ts` is the only function whose body changes.

**Playwright replaced by a static read.** The plan specified headless Chromium for computed styles. That needs a browser binary, which does not fit a serverless function, and the plan's own architecture already puts URL-ID behind a queue. Phase 1 reads the HTML and linked stylesheets directly: it catches Google Fonts links, `@import`s, `@font-face` rules, external stylesheets and inline `style` attributes. What it cannot see is CSS injected by JavaScript after load — and the UI says so rather than pretending otherwise. The headless path becomes a queued worker later, behind the same endpoint.

---

## Core data model

**Kit is the aggregate root.** Every child carries `kitId`.

```
USER
└── KIT — aggregate root
    ├── KITFONT      → FONT → LICENSE
    ├── FONT         → FONTVARIANT → GlyphEmbedding(512)
    ├── TYPESCALE    → ScaleStep
    ├── PALETTE      → Swatch → ContrastPair
    ├── BOARD        → BoardItem → ExtractedMeta
    └── KITVERSION   — immutable snapshots
```

That one denormalised `kitId` on every descendant is what makes *"change a colour → revalidate every contrast pair"* a single transactional query rather than cross-service orchestration. It is the decision most likely to be quietly compromised later, and the one that must not be.

Two other schema-level commitments:

- **`ContrastPair` is materialised, not computed on read.** Failing pairs need to be listed, counted and gated on. A view cannot be indexed by `(kitId, passesAA)`.
- **`Swatch` stores OKLCH alongside hex.** Ramp maths happens in OKLCH; round-tripping through hex loses precision on every edit.
- **`Font` has no file column.** Commercial faces get `purchaseUrl` and nothing else. The legal guardrail is in the schema, not in a code path someone can forget.

---

## API surface

| | Route | Status | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/fonts` | ✅ | Search and filter. Cached, public, `s-maxage=86400` |
| `POST` | `/api/identify/url` | ✅ | Deterministic page-font read, `no-store` |
| `GET` | `/api/fonts/:id` | ◻ | Currently served as the HTML page at `/fonts/[slug]` |
| `POST` | `/api/kits` | ◻ Phase 2 | |
| `GET` | `/api/kits/:id` | ◻ Phase 2 | Full Kit graph |
| `PATCH` | `/api/kits/:id` | ◻ Phase 2 | Mutate → triggers revalidation |
| `POST` | `/api/kits/:id/export` | ◻ Phase 2 | Async archive: tokens, CSS, PDF, licences |
| `POST` | `/api/identify/image` | ◻ Phase 3 | Async ML, queued job |

---

## Non-functional requirements

| Requirement | Target | Where it is enforced |
| --- | --- | --- |
| Catalogue search | < 400 ms | In-process array scan over the snapshot; server-rendered and cached |
| Scale recalculation | < 50 ms | Pure client-side maths, `src/lib/scale.ts`, no round trip |
| Contrast revalidation | < 100 ms | Pure client-side, whole palette, `src/lib/contrast.ts` |
| URL identification | < 6 s | 6 s fetch timeout, max 8 stylesheets, size-capped |
| p95 page load | < 2.5 s | Static prerender for the SEO surface |
| Passes its own WCAG AA | every pair | Design tokens in `globals.css` are chosen to clear 4.5:1 in both schemes |
| Licence accuracy | > 99 % | Directory membership, not inference. Provenance recorded per record |
| ID images purged | ≤ 30 days | Phase 3 — `IdentifyRequest.expiresAt`, GDPR |

---

## Font pipeline

1. Read `fonts.google.com/metadata/fonts` — family, category, designers, axes, subsets, popularity.
2. Read directory listings for `ofl/`, `apache/` and `ufl/` from the GitHub git-trees API. **Membership is the licence.** (Git trees, not the contents endpoint — contents caps at 1,000 entries and `ofl/` holds ~2,000.)
3. Join, normalise, record provenance, write `src/data/fonts.json`. Families with no licence directory are dropped rather than guessed at.
4. Phase 2: serve `.woff2` from our own CDN — permitted under the OFL — and always ship licence text with an export.
5. Sync nightly. The repository is openly licensed, so mirroring is allowed. **Never call upstream in a user request path.**
6. Commercial fonts: metadata and buy link only. No file reference, ever.

---

## Security

The identify endpoint accepts a URL from any anonymous caller, which makes it a server-side request forgery surface by construction. Mitigations in `src/lib/identify.ts`:

- Non-HTTP schemes (`file:`, `gopher:`, `data:`) rejected before any parsing.
- Hostnames resolved via DNS, and **every** returned address checked. Blocked: loopback, `10/8`, `172.16/12`, `192.168/16`, `169.254/16` (link-local, which is where cloud metadata lives), CGNAT `100.64/10`, IPv6 unique-local and link-local, and IPv4-mapped IPv6 forms of all of them.
- `.internal` and `.local` hostnames refused outright.
- 6-second timeout, 2 MB HTML cap, 1 MB per stylesheet, 8 stylesheets maximum.
- `/api/identify/` is disallowed in `robots.txt` — each call costs an outbound fetch.
