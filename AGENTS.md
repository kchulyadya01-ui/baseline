# Working in this repo

**Next.js 16 differs from older Next in ways that break familiar patterns.** Read the relevant guide in `node_modules/next/dist/docs/` before writing app-router code. In particular: `params` and `searchParams` are Promises and must be awaited, Turbopack is the default bundler, and `middleware` is now `proxy`.

## Conventions

- **Tailwind v4, CSS-first.** Tokens are defined in `src/app/globals.css` under `@theme` / `@theme inline`. There is no `tailwind.config.js`. A new radius or size goes in `@theme` so it generates a utility (`--radius-card` → `rounded-card`), not into an arbitrary-value class.
- **`src/lib/*` splits into two kinds of module.** `scale.ts`, `contrast.ts`, `palette.ts` and `font-url.ts` are pure — no framework imports, no I/O, usable on both sides. `fonts.ts`, `identify.ts` and `alternatives.ts` import `server-only`. Keep that boundary; the pure ones are what Phase 2 reuses.
- **Filters belong in the URL**, not in component state. A filtered library view should be shareable and cacheable.
- **Design tokens must pass their own contrast checks.** This app ships a WCAG tool; every foreground/background pair in `globals.css` clears 4.5:1 in light and dark.

- **The tools must keep working with no database.** `src/lib/db.ts` builds its client lazily for exactly this reason, and every community entry point checks `isCommunityConfigured()` first. Never import a Prisma query into a path the tools render.
- **Every community write goes through one gate.** `requireOnboarded()` in server components, `getOnboardedUser()` in route handlers. Those are the only places that check sign-in, onboarding and suspension. Do not add a second check somewhere else — add to those.

## Things not to change without reading the docs first

- **The Kit models in `prisma/schema.prisma` are dormant on purpose.** The community models are live; `Kit`, `TypeScale`, `Palette`, `Board` and friends are migrated but nothing reads them. Do not wire them up as a side effect of another task — see `docs/04-trd.md`.
- **`Font` has no file-path column, deliberately.** Commercial faces get `purchaseUrl` and nothing more. That is a legal guardrail expressed in the schema.
- **The SSRF guards in `src/lib/identify.ts` are load-bearing.** That endpoint fetches an arbitrary URL on behalf of an anonymous caller. Do not relax the scheme check, the DNS resolution check or the private-range checks.
- **Blocks are applied inside queries, never after fetching.** See `blockedUserIds()` in `src/lib/community.ts`. Filtering in the template means the row already travelled.
- **Denormalised counters are updated in the same transaction as the row they count.** `likeCount`, `saveCount`, `itemCount`. `npm run smoke` asserts this.
- **User uploads are never rendered through `next/image`.** It runs attacker-supplied bytes through sharp, which has unpatched CVEs. See the scoped rule override in `eslint.config.mjs`.
- **`src/data/fonts.json` is generated.** Edit `scripts/ingest-fonts.ts` and re-run `npm run ingest`; do not hand-edit the snapshot.

## Local database

The community section needs Postgres. Locally:

```bash
brew services start postgresql@17
createdb baseline_dev
echo 'DATABASE_URL="postgresql://'"$(whoami)"'@localhost:5432/baseline_dev"' >> .env.local
npx prisma migrate dev
```

## Checks before committing

```bash
npx tsc --noEmit && npx eslint . && npm run build
npm run smoke     # needs DATABASE_URL pointing at a local database
```

The build must pass **without** `DATABASE_URL` set as well — that is the case that proves the tools still deploy on their own.
