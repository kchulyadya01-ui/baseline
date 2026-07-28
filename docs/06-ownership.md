# 06 — Who owns what

The split runs on the real fault line: one side owns the machine, the other owns the voice and the distribution. In Phase 0 the design deliverables need nothing from the code, so both sides can sprint in parallel from day one.

---

## Engineering

- App, infrastructure, database, deploy
- Font ingestion and the nightly sync pipeline
- All module logic — scale maths, contrast, palette generation
- Kit data model and bidirectional linking
- Export engine and the programmatic SEO pages
- URL identification (Phase 1), image identification and ML (Phase 3)
- Analytics and the metrics dashboard

## Design + domain

- Design system and all product design
- Module specs — what to build, and what "good" looks like
- Plain-language licence summaries
- Curated collections and teaching copy
- Dogfooding on real client projects (user zero)
- Community seeding and launch distribution
- Free-alternative curation for identification

---

## The files design owns

Two files in this repository are design-and-domain territory, not engineering, and they are structured so they can be edited without touching logic:

| File | What it holds |
| --- | --- |
| `src/lib/alternatives.ts` | The curated map of commercial face → free alternatives. "What can I use instead of Söhne" is a judgement about voice; a distance metric will not answer it |
| `src/components/fonts/licence-panel.tsx` | The plain-language licence copy — including the catch people actually trip over |

Adding an alternative is a one-line change to a map. No code review of logic is required, only of the recommendation.

---

## Next actions

1. **Settle the partnership** — equity split and weekly hours, in writing, before more code.
2. **Two to three days in person** — lock scope, build the design system together, run the first design-to-code handoff live.
3. ~~Stand up the repo and font pipeline~~ ✅ done — scaffold, catalogue and design system are live.
4. **Expand the curated alternatives map and the licence copy** — no dependency on the code, and the highest-leverage thing the design side can do today.
5. **Read the traffic before touching the Kit.** Phase 1 is shipped; the Phase 1 gate is *repeat visits*, not launch. Instrument, wait, then decide.
