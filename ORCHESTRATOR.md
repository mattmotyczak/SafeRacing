# ORCHESTRATOR.md — SafeRacing

## Purpose

This file orchestrates spec-driven work on **SafeRacing**: a Spanish racing-safety quiz game. React 19 + Vite 6 + Tailwind v4 + motion frontend, Express 4 + Neon Postgres backend. Built as a final university project by Team Foxtrot.

It runs under the **gentle-ai SDD orchestrator** on top of **OpenCode**, using OpenCode's native skill loading and Plan/Build modes.

## Artifact store: OpenSpec, not Engram

**SDD artifacts are files in this repo, not Engram observations.** Configured in `openspec/config.yaml` as `artifact_store: openspec`.

| Artifact | Path |
|----------|------|
| Source of truth (merged specs) | `openspec/specs/{domain}/spec.md` |
| Active change | `openspec/changes/{change-name}/` |
| DAG state (survives compaction) | `openspec/changes/{change-name}/state.yaml` |
| Completed change | `openspec/changes/archive/YYYY-MM-DD-{change-name}/` |

Per-phase files follow the standard layout: `exploration.md`, `proposal.md`, `specs/{domain}/spec.md`, `design.md`, `tasks.md`, `verify-report.md`.

### Why this changed

The project previously ran with `artifact_store: engram`. That mode upserts by `topic_key`, so re-running a phase **overwrote** the previous version with no revision history, the artifacts never entered git, and they were not shareable with the team. The entire record of Arc A existed as nine local Engram observations plus a single archive report — invisible to anyone cloning the repo.

On **2026-09-26** the store switched to `openspec` and every surviving Engram artifact was migrated into files (see the "Migrated artifacts" section below).

**Engram is still fine for ad-hoc memory** — bugfixes, discoveries, session summaries. It is not the artifact store for SDD phases. If an SDD phase tells you to `mem_save` an artifact, it is reading a stale mode; write the file instead.

## Current state

Branch `new_designs`, HEAD `1e616d0`, in sync with `origin/new_designs`. **`main` has received none of this work.**

| Arc | Scope | Status |
|-----|-------|--------|
| A | Arcade Retrofit — pixelated retro (8-bit) visual redesign | **Shipped, verified, reviewed, archived** |
| B | Backend & Data-Layer Rigor — migrations, unified API, hard mode from DB | **Shipped; data layer now verified** — see below |
| C | Cartoon daytime road scene + dimmed blurred backdrop | **Proposed only — not started** |

Arc B's nine skipped Phase 8 checks have since been executed against the live database. Verified: both endpoints return the unified contract from a live database; migration idempotency under double-apply; a fresh-database bootstrap through a transactional throwaway-schema probe (22/22, three runs, zero residue). One check remains genuinely unverified — hard mode drawing from the DB rather than `db_hard` is confirmed only indirectly, by the returned option order matching the live scrambled primary keys rather than the authored order in `App.tsx`. The `fresh-db-bootstrap` change also fixed a second defect found along the way: seeded answer order was planner-dependent, so a freshly seeded database served a different option order than `db_easy`.

### Verified project facts

Read `openspec/specs/game/spec.md` and `openspec/specs/data-layer/spec.md` for the full requirement sets. The essentials:

- `src/App.tsx` (484 lines) is a single page with a four-state machine — `menu | mode_selection | playing | game_over` — and one `useEffect` fetcher per mode.
- Rendering is pure DOM/CSS plus one inline SVG. No canvas, no `requestAnimationFrame`, no JS animation loop anywhere.
- `GET /api/questions/:mode` serves both modes from one route, mapping mode → table pair through `MODE_CONFIG` in `server.js:28-41` and grouping JOINed rows via `groupQuestions()` in `server.js:46-72`.
- Both modes keep a 5-question hardcoded fallback in `App.tsx` so the game is playable with the backend down. This is deliberate, documented behavior.
- The live `easy_*` tables hold **7** questions against the 5 in the repo — two are `Test` / `Second Test` smoke-test residue, and `Test` is served to players. See gap 1.
- All sixteen live columns are lowercase. `neondb_guide.txt`'s quoted CamelCase form was never executed.
- **There is no test runner.** No test script, no test dependency, no config. Verification is `npx tsc --noEmit`, grep audits, contrast/geometry math written into the artifacts, and — for the data layer — a transactional throwaway-schema probe. Do not plan work that assumes a test suite exists.

## Operating rules

- **Read the specs first.** `openspec/specs/` is the source of truth. If code and spec disagree, the code is the bug — or the spec is stale; determine which before editing either.
- **Request access up front** if the orchestrator lacks write/run access to the repo. This is the only blocking step.
- **4-file rule** — if understanding a flow needs 4+ files, delegate the reading to an explore sub-agent rather than reading inline in the parent thread.
- **Multi-file write rule** — any change touching 2+ non-trivial files goes through a single writer sub-agent, then a fresh reviewer pass.
- **Incident rule** — after any wrong-directory error, failed build, or confusing lint output, stop and re-audit (repo root, `git status`, install state) before continuing.
- **Long-session rule** — after ~20 tool calls, 5 exploratory reads, or 2 non-mechanical edits: pause, summarize, then delegate or re-plan.
- Keep the parent thread thin. It tracks state and summaries; sub-agents do the reading and writing.
- **Never introduce a hardcoded hex or `rgba()` in `src/**/*.tsx`.** Use an `@theme` token. The only exception is the traffic-light utilities and the three stoplight glow shadows at `App.tsx:226-228`.
- **Never add a runtime dependency** without recording the tradeoff in `design.md`. The repo's zero-dependency posture is a deliberate, documented choice — `db/apply.js` is hand-rolled rather than pulling in `node-pg-migrate` for exactly this reason.

## Open gaps, in priority order

These are the real outstanding items. Everything else is done.

### 1. Live `easy_*` tables contain smoke-test rows — HIGH

The live database has two rows in `easy_questions` that are development residue:

| id | question | answers | note |
|----|----------|---------|------|
| 1 | `Test` | 4 (`prueba exitosa` correct, 3× `prueba fallida`) | **served to players**, plus a 42,420-byte base64 photo |
| 2 | `Second Test` | 0 | invisible — the `INNER JOIN` filters it |

`Test` is returned by `GET /api/questions/easy`, so a player has a **1-in-6 chance** of drawing a nonsense question with a random image. Easy mode serves 6 questions where the repo models 5.

`Second Test` is harmless today precisely because it has no answers, which is a fragile thing to rely on — a single answer row would make it visible with an empty or `-1` option set.

**Fix:** delete both rows and their answers. That is production data deletion, so it needs explicit sign-off rather than an agent's judgement. Until then, note that `db_easy` in `src/App.tsx` and the live easy table disagree on question count.

### 2. Live answer primary keys are interleaved, so online and offline option order differ — MEDIUM

Because the live `easy_answers` primary keys are scattered across questions, the live easy option order differs from `db_easy` for **every** question. Each response is internally consistent and the correct answer is always identified, so the game is never wrong — but the online and offline experience of one question are not the same, which undercuts the offline fallback's role as a mirror.

The `fresh-db-bootstrap` change fixed this for *freshly seeded* databases by pinning seed order. Reordering existing rows needs a destructive migration (rewrite PKs, or add a display-ordinal column) — a separate, explicitly-approved change.

### 3. `neondb_guide.txt` documents the wrong schema — MEDIUM (downgraded from HIGH)

It shows a single `questions` table with inline options, quoted CamelCase identifiers (`q."idEasyQuestion"`), and an `idAnswer` column that does not exist. It contradicts `db/migrations/0001_bootstrap.sql` and `server.js`.

**It is no longer a live hazard.** Read-only `information_schema` introspection confirmed all sixteen live columns are lowercase with the documented types, so the quoted CamelCase snippet was never executed against this database. It is stale documentation only. Delete it or replace it with a pointer to `db/migrations/`.

### 4. No repeatable data-layer verification — MEDIUM

The data layer is verified, but only by ad-hoc scripts that were written, run, and deleted. There is no durable way to re-check the schema, the seed, or the endpoint contract after a change. A committed script is the obvious answer, but the one written for `fresh-db-bootstrap` hardcodes expected row counts and would rot the moment a question is added — so it needs a count-free invariant design first (every question has ≥2 answers and exactly one correct; the ordinal column is contiguous; the endpoint contract holds for both modes).

Until that exists, the technique is documented in `openspec/changes/archive/2026-09-26-fresh-db-bootstrap/verify-report.md` and is reproducible on demand.

### 5. `answer` index is positional — LOW

`answer` is not a stored column. `groupQuestions()` derives it from row arrival order, which the query pins with `ORDER BY` on the answers primary key. It is deterministic today, but it is an implicit contract: renumbering answer rows silently changes every question's correct-option index. A stored ordinal, or an `ORDER BY` on a stable semantic column, would make it explicit. The `ord` column added to the seed data is a step in that direction but is not persisted.

### 6. Carried-over Arc A follow-ups — LOW

Still open, none blocking:

| ID | Finding |
|----|---------|
| R2-1 | `--car-color` custom property is set in `CarSprite.tsx:92` and never consumed |
| R2-2 | SVG `<rect>` `rx` attributes contradict the zero-radius / hard-corner contract |
| R2-3 | Legacy `@theme` tokens still present at `index.css:19-30` |
| R4-1 | Google Fonts `@import` at `index.css:1` — FOUT reflow vs the no-layout-shift claim in `DESIGN.md` |
| R3-2 | No automated seam regression test — there is no test runner |
| — | `AnimatePresence` entrance transitions are not gated on `prefers-reduced-motion` |
| — | `bg-slate-900/20` on the ground layer could be promoted to a token |

## Migrated artifacts

Written on 2026-09-26 from Engram observations, which are retained for traceability:

| Folder | From | Contents |
|--------|------|----------|
| `openspec/changes/archive/2026-09-01-arcade-retrofit/` | obs #39, #42–#47, #51, #52 | `state.yaml`, `verify-report.md`, `archive-report.md` (incl. the reconstructed task list) |
| `openspec/changes/archive/2026-09-26-backend-data-rigor/` | nothing — reconstructed from commit `de74dbe` | `state.yaml`, `archive-report.md` |
| `openspec/changes/arcade-scene-backdrop/` | obs #54 | `state.yaml`, `exploration.md` |

Arc A's design was never a separate artifact — it was written straight to the repo's `DESIGN.md`, which remains the canonical design document. The current `openspec/specs/game/spec.md` is the post-merge source of truth.

**Commit attribution correction:** the old file recorded Arc A as `89d4174` → `b2e635e`. Those commits are the palette tokens and the initial `ArcadeBackground` / `CarSprite` extraction. The pixelated-retro delta itself — the `DESIGN.md` rewrite, `.glass-panel` → `.pixel-panel`, the 2× integer sprite scale, and the 3840 px dash seam fix — landed in **`e3ab269`**, after Arc B's `de74dbe`.

## Next change: `arcade-scene-backdrop`

Proposed, specced at plan level, not started. Read `openspec/changes/arcade-scene-backdrop/exploration.md`.

Replace the abstract in-game gradient background with a daytime cartoon pixel landscape — sky, sun, clouds, far hills, trees, road with rumble strips — and render a dimmed copy of the same scene as the out-of-game page backdrop.

Three things carry over from Arc A and must not regress:

1. **The periodicity rule.** Every layer's period must divide 1920 px, or the wrap seams. The dash layer's `w-[3840px]` flex container and the `flex` class at `ArcadeBackground.tsx:88` (the R3-1 fix) stay exactly as they are.
2. **The zero-blur contract.** The blur comparison toggle must default to a pixel-block SVG filter, not a real `blur()`. Everything belonging to the toggle — button, state, filter classes, hidden SVG `<filter>` defs — must be marked `/* DEBUG-DELETABLE */` with a removal guideline.
3. **Token discipline.** New `--color-scene-*` tokens in `@theme`; no hex in `.tsx`.

## Working agreement for future changes

1. `sdd-propose` → `proposal.md` in a new `openspec/changes/{name}/` folder.
2. `sdd-spec` → `specs/{domain}/spec.md` delta using `## ADDED/MODIFIED/REMOVED Requirements`, RFC 2119 keywords, Given/When/Then scenarios. A requirement no test can check must say so and name its verification method.
3. `sdd-design` → `design.md`. Decisions with options and tradeoffs, one recommended choice each. For any CSS `translateX` loop, state the periodicity constraint explicitly.
4. `sdd-tasks` → `tasks.md`, grouped by deliverable, each completable in one session.
5. `sdd-apply` → edit the files, tick tasks in `tasks.md`.
6. `sdd-verify` → `verify-report.md` with real command output. Evidence, not authorization — normal repo policy still governs whether work ships.
7. `sdd-archive` → move the folder to `archive/YYYY-MM-DD-{name}/` and merge deltas into `openspec/specs/`. Never edit or delete an archived folder.
