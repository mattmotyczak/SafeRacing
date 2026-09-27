# Archive Report — Backend & Data-Layer Rigor

> **Reconstructed on 2026-09-26.** This change shipped as a single commit with no SDD artifacts — no proposal, no tasks, no verify report, in Engram or on disk. This report was written by reading commit `de74dbe` and the resulting code. It is a retrospective record, and it exists mainly to surface what was never verified.

**Change:** `backend-data-rigor` (Arc B)
**Status:** shipped, **never verified**
**Commit:** `de74dbe` — "Add migrations, DB runner, unified API & docs" (+583 / −110 across 15 files)
**Original plan:** `ORCHESTRATOR.md` Phases 5–9

## What shipped

| Deliverable | Status | Where |
|-------------|--------|-------|
| Schema versioned as SQL migrations | **Partial** | `db/migrations/0001_bootstrap.sql` |
| Dependency-free migration runner | Done | `db/apply.js`, `npm run db:apply` |
| `GET /api/questions/:mode` serving both modes | Done | `server.js:111-113` |
| Mode → table mapping + shared grouping helper | Done | `server.js:28-72` |
| `VITE_API_BASE_URL` env-driven fetch | Done | `src/App.tsx:21` |
| Legacy `/api/questions/easy` kept alive | Done | `server.js:106-108` |
| `metadata.json` AI Studio template deleted | Done | removed in `de74dbe` |
| Empty `src/db.ts` deleted | Done | removed in `de74dbe` |
| Obsolete SQL comment block deleted from `App.tsx` | Done | — |
| `README.md` rewritten for the real project | Done | — |
| Hard mode wired to the database | Done, with a deliberate fallback | `src/App.tsx:73-91` |
| **`neondb_guide.txt` cleaned** | **NOT DONE** | see GAP-3 |

## Where the implementation diverged from the plan

The Phase 6 decision table in `ORCHESTRATOR.md` recommended specific shapes. Six things did not go as planned:

1. **Three migrations collapsed into one.** The plan called for `0001_easy_schema.sql`, `0002_hard_schema.sql`, `0003_hard_seed.sql`. The commit ships a single `0001_bootstrap.sql` that creates the hard tables and seeds both modes. Fewer files, but no incremental history — every future change must either extend `0001` (rewriting applied history) or start at `0002` against a database whose easy tables were created outside the repo.

2. **The easy tables are never created.** `0001_bootstrap.sql` opens by creating `hard_questions` / `hard_answers`, then immediately seeds `easy_questions` / `easy_answers` with `INSERT ... SELECT`. It assumes they already exist on Neon. This is **GAP-1** and it breaks the documented setup path: `npm run db:apply` against a genuinely fresh database fails with `relation "easy_questions" does not exist`. It is also why the plan's Phase 8 verify item "migrations apply cleanly to a fresh Neon database" could never have passed.

3. **Column casing went lowercase.** The plan sketched `idHardQuestion`, `relatedToQuestion`; the migration and `MODE_CONFIG` both use `idhardquestion`, `relatedtoquestion`. This is *correct* — Postgres folds unquoted identifiers to lowercase — but it now contradicts `neondb_guide.txt`, which uses the quoted CamelCase form.

4. **No migration ledger.** The plan said "idempotent `IF NOT EXISTS`" and left the ledger question open. The runner replays every file on every invocation; idempotency lives entirely in the SQL (`WHERE NOT EXISTS` guards on every seed insert, since no unique constraint exists on question text). Zero dependencies, no tracking table, no record of what has run.

5. **`db_hard` was kept, not dropped.** The plan said hard mode must "drop `db_hard` entirely". It was kept as a documented offline fallback: the fetch effect falls back to the local array on network error or empty response (`src/App.tsx:73-91`), and `getNewQuestion` prefers the fetched bank when non-empty. This is a deliberate improvement over the plan for a demo that must run without a database — but it should have been an explicit decision, not a quiet one.

6. **Arc A's commit range was misattributed.** `ORCHESTRATOR.md` records Arc A as commits `89d4174` → `b2e635e`. Those are the palette tokens and the initial `ArcadeBackground` / `CarSprite` extraction. The actual pixelated-retro delta — `DESIGN.md` rewrite, `.glass-panel` → `.pixel-panel`, the 2× integer sprite scale, and the 3840 px dash seam fix — landed in **`e3ab269`**, a separate commit after `de74dbe`. Corrected in the rewritten `ORCHESTRATOR.md`.

## Verification debt

**No verify phase ever ran.** `ORCHESTRATOR.md` Phase 8 lists nine unchecked items; none were executed. Specifically unverified:

- [ ] `GET /api/questions/easy` and `/hard` both return the unified contract from Neon — needs `curl` against a running server with a reachable database.
- [ ] Hard mode in-game answers come from the DB, not `db_hard` — needs a network-tab check or a deliberate break of `db_hard`.
- [ ] Migrations are idempotent under double-apply — needs a live database.
- [ ] Migrations apply to a **fresh** database — **known to fail**, see GAP-1.
- [ ] `tsc --noEmit` clean, no new `any` — trivially checkable and presumed fine, but was not run as part of this change.
- [ ] README accuracy — done as part of the commit, not independently reviewed.

None of this is runnable in the current environment: there is no reachable Neon database and no browser tooling. The honest state of Arc B is **shipped, unverified**.

## Open gaps carried forward

| ID | Severity | Gap |
|----|----------|-----|
| GAP-1 | High | `easy_questions` / `easy_answers` are never created by any migration → fresh-DB bootstrap fails |
| GAP-2 | Medium | No verify report; every Phase 8 claim is unchecked |
| GAP-3 | Medium | `neondb_guide.txt` documents the wrong schema and now contradicts the code |
| GAP-4 | Low | Answer index is positional, derived from answer PK order at query time, not stored |

GAP-1 and GAP-2 are tracked as requirements in `openspec/specs/data-layer/spec.md` ("A fresh database MUST be bootstrappable from the repo alone" is explicitly marked NOT YET SATISFIED).

## Rollback

All changes are additive. Rollback = `git revert de74dbe`. The only destructive element is `db/migrations/0001_bootstrap.sql`, which inserts seed rows; reverting the commit does not un-insert them. To undo the data layer entirely, drop `hard_questions` and `hard_answers` and delete the seeded `easy_*` rows manually.

The `easy_*` remediation seed is non-destructive by construction: every insert is guarded by `WHERE NOT EXISTS` on the question text, so it cannot duplicate or overwrite live easy data.
