# The build packet

Six documents. Together they answer *why*, *what the experience is*, *how the machine works*, and *in what order it gets built*.

| Doc | Answers |
| --- | --- |
| [01 — Roadmap](./01-roadmap.md) | The order, and the gate each phase must clear |
| [02 — Feature scope](./02-feature-scope.md) | What is in and, more usefully, what is deliberately out |
| [03 — IA & user flows](./03-ia-and-flows.md) | The map (every screen) and the movie (the path through a job) |
| [04 — Technical requirements](./04-trd.md) | Stack, data model, API surface, non-functional targets |
| [05 — System architecture](./05-architecture.md) | How the running pieces connect |
| [06 — Who owns what](./06-ownership.md) | The engineering / design split |
| [07 — The community section](./07-community.md) | Post, save, collections, messaging — and the moderation model |

> **PRD = why · IA + Flows = the experience · TRD + Architecture = the machine · Roadmap = the order.**

Demand validation was intentionally skipped. This is the *how*, not the *whether*.

## Where the docs and the code diverge

Two deliberate departures from the original plan, both recorded here rather than hidden in a commit:

1. **The catalogue is a build-time JSON snapshot, not Postgres.** Phase 1 has no writes and ~2,000 rows. A relational store buys nothing yet and costs a provisioning step, a connection pool and a monthly bill. The Prisma schema in `prisma/schema.prisma` is written and validated; it is simply not connected. `queryFonts()` is the only function that changes when it is.

2. **URL identification is a static CSS read, not Playwright.** Headless Chromium does not fit in a serverless function, and the plan's own architecture diagram already puts URL-ID behind a queue. Phase 1 ships the deterministic static read now; the browser path becomes a worker later without changing the endpoint's contract.
