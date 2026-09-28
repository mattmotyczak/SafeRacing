# Status — SafeRacing

**Purpose:** current state of the project, the ranked open gaps, artifact provenance, and how a change flows.
**Not the source of truth for:** requirements (→ `openspec/specs/`), house style (→ `openspec/conventions.md`), rationale (→ `openspec/design/`).

Migrated from the root `ORCHESTRATOR.md` on 2026-09-28. It was the only home for the open-gap list and the artifact-provenance table.

## Artifact store: OpenSpec, not Engram

**SDD artifacts are files in this repo, not Engram observations.** Configured in `openspec/config.yaml` as `artifact_store: openspec`.

| Artifact | Path |
|----------|------|
| Merged specs (source of truth) | `openspec/specs/{domain}/spec.md` |
| House style, conventions, gotchas | `openspec/conventions.md` |
| Design rationale (options + tradeoffs) | `openspec/design/` |
| Current state, open gaps, change flow | `openspec/status.md` (this file) |
| Active change | `openspec/changes/{change-name}/` |
| DAG state (survives compaction) | `openspec/changes/{change-name}/state.yaml` |
| Completed change | `openspec/changes/archive/YYYY-MM-DD-{change-name}/` |

Per-phase files follow the standard layout: `exploration.md`, `proposal.md`, `specs/{domain}/spec.md`, `design.md`, `tasks.md`, `verify-report.md`.

### Why this changed

The project previously ran with `artifact_store: engram`. That mode upserts by `topic_key`, so re-running a phase **overwrote** the previous version with no revision history, the artifacts never entered git, and they were not shareable with the team. The entire record of Arc A existed as nine local Engram observations plus a single archive report — invisible to anyone cloning the repo.

On **2026-09-26** the store switched to `openspec` and every surviving Engram artifact was migrated into files (see [Migrated artifacts](#migrated-artifacts)).

**Engram is still fine for ad-hoc memory** — bugfixes, discoveries, session summaries. It is not the artifact store for SDD phases. If an SDD phase tells you to `mem_save` an artifact, it is reading a stale mode; write the file instead.

## Current state

Branch `new_designs`, HEAD `e26fcf1` ("Document SDD migration and data-layer fixes"). **`main` has received none of this work.**

| Arc | Scope | Status |
|-----|-------|--------|
| A | Arcade Retrofit — pixelated retro (8-bit) visual redesign | **Shipped, verified, reviewed, archived** |
| B | Backend & Data-Layer Rigor — migrations, unified API, hard mode from DB | **Shipped; data layer now verified** — see below |
| C | Cartoon daytime road scene + dimmed backdrop | **Proposed only — not started** |

Arc B's nine skipped Phase 8 checks have since been executed against the live database. Verified: both endpoints return the unified contract from a live database; migration idempotency under double-apply; a fresh-database bootstrap through a transactional throwaway-schema probe (22/22, three runs, zero residue). One check remains genuinely unverified — hard mode drawing from the DB rather than `db_hard` is confirmed only indirectly, by the returned option order matching the live scrambled primary keys rather than the authored order in `App.tsx`. The `fresh-db-bootstrap` change also fixed a second defect found along the way: seeded answer order was planner-dependent, so a freshly seeded database served a different option order than `db_easy`.

### Verified project facts

Read `openspec/specs/game/spec.md` and `openspec/specs/data-layer/spec.md` for the full requirement sets. The essentials:

- `src/App.tsx` (484 lines) is a single page with a four-state machine — `menu | mode_selection | playing | game_over` — and one `useEffect` fetcher per mode.
- Rendering is pure DOM/CSS plus one inline SVG. No canvas, no `requestAnimationFrame`, no JS animation loop anywhere.
- `GET /api/questions/:mode` serves both modes from one route, mapping mode → table pair through `MODE_CONFIG` in `server.js:28-41` and grouping JOINed rows via `groupQuestions()` in `server.js:46-72`.
- Both modes keep a 5-question hardcoded fallback in `App.tsx` so the game is playable with the backend down. This is deliberate, documented behavior.
- The live `easy_*` tables hold **7** questions against the 5 in the repo — two are `Test` / `Second Test` smoke-test residue, and `Test` is served to players. See gap 1.
- All sixteen live columns are lowercase. The old `neondb_guide.txt` snippet's quoted CamelCase form was never executed.
- **There is no test runner.** No test script, no test dependency, no config. Verification is `npx tsc --noEmit`, grep audits, contrast/geometry math written into the artifacts, and — for the data layer — a transactional throwaway-schema probe. Do not plan work that assumes a test suite exists.

### Operating rules

- **Read the specs first.** `openspec/specs/` is the source of truth. If code and spec disagree, the code is the bug — or the spec is stale; determine which before editing either.
- **Request access up front** if the orchestrator lacks write/run access to the repo. This is the only blocking step.
- **4-file rule** — if understanding a flow needs 4+ files, delegate the reading to an explore sub-agent rather than reading inline in the parent thread.
- **Multi-file write rule** — any change touching 2+ non-trivial files goes through a single writer sub-agent, then a fresh reviewer pass.
- **Incident rule** — after any wrong-directory error, failed build, or confusing lint output, stop and re-audit (repo root, `git status`, install state) before continuing.
- **Long-session rule** — after ~20 tool calls, 5 exploratory reads, or 2 non-mechanical edits: pause, summarize, then delegate or re-plan.
- Keep the parent thread thin. It tracks state and summaries; sub-agents do the reading and writing.

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

**This is not cosmetic. The correct answer MOVES between the two sources.** Verified by direct query on 2026-09-28, comparing the same question served by `GET /api/questions/:mode` against the same question in the `db_easy` / `db_hard` fallback array in `src/App.tsx`:

| Bank | Question | Correct option index online | Correct option index in the fallback | Delta |
|------|----------|-----------------------------|--------------------------------------|-------|
| easy | (same question, both sources) | **1** | **0** | 1 position |
| hard | (same question, both sources) | **3** | **1** | 2 positions |

Both responses are individually correct — `options[answer]` resolves to the right string in each — so scoring is never wrong. What is wrong is that a player who learns the offline layout, or who answers the same question twice across a backend restart, has to re-learn which *position* is right rather than recalling which *fact* is right. It is also a prerequisite for the `arcade-scene-backdrop` answer-feedback work, which must key off the resolved `answer` index and therefore cannot assume the authored order.

The `fresh-db-bootstrap` change fixed this for *freshly seeded* databases by pinning seed order. Reordering existing rows needs a destructive migration (rewrite PKs, or add a display-ordinal column) — a separate, explicitly-approved change. See also gap 10, which records that the live instance was seeded *before* that fix and never converged.

### 3. `neondb_guide.txt` documented the wrong schema — **RESOLVED 2026-09-28**

It showed a single `questions` table with inline options, quoted CamelCase identifiers (`q."idEasyQuestion"`), and an `idAnswer` column that does not exist. It contradicted `db/migrations/0001_bootstrap.sql` and `server.js`.

**It was never a live hazard.** Read-only `information_schema` introspection confirmed all sixteen live columns are lowercase with the documented types, so the quoted CamelCase snippet was never executed against this database.

**Closed:** the file's 124 lines of wrong code were replaced with a tombstone that points at `db/migrations/`. The path is kept because seven archived change folders reference it, and archived folders are never edited.

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
| R4-1 | Google Fonts `@import` at `index.css:1` — FOUT reflow vs the no-layout-shift claim in `openspec/design/arcade-retrofit.md` |
| R3-2 | No automated seam regression test — there is no test runner |
| — | `AnimatePresence` entrance transitions are not gated on `prefers-reduced-motion` |
| — | `CarSprite.tsx:119` (`.car-aura`) lacks `motion-reduce:animate-none`, so the reduced-motion rule's "both places" requirement is unsatisfiable as written — the `prefers-reduced-motion` block at `index.css:127-134` *does* cover it with `animation: none !important`, so behavior is correct; only the documented pattern is wrong. Found 2026-09-28. |
| — | `bg-slate-900/20` on the ground layer could be promoted to a token |

### 7. The seeded question bank is Formula 1-themed, contradicting the Purpose requirement — **MEDIUM, new**

Found 2026-09-28 while migrating the context files. The product brief is a **driving-safety** game — that is now a requirement (*The game is a driving-safety quiz for high-school students*, `openspec/specs/game/spec.md`). The shipped data does not match it.

| Where | Offending content |
|-------|------------------|
| `db/migrations/0001_bootstrap.sql:86-99` (easy seed) | `¿Cuántos pilotos hay en un auto de F1?`; flags framed as racing flags (`Entrada a pits`, `Carrera terminada`) |
| `db/migrations/0001_bootstrap.sql:135-148` (hard seed) | `¿Cuál es el límite de velocidad en el Pit Lane?`, `DRS` / `ERS` / `KERS`, `¿Cuántos puntos recibe el ganador de un GP?`, tyre compounds `C1`–`C5` |
| `src/App.tsx:23-30` (`db_easy`) | same as the easy seed |
| `src/App.tsx:31-38` (`db_hard`) | same as the hard seed |
| live `easy_*` tables | 2 smoke-test rows on top of that (gaps 1) |

`db/migrations/0001_bootstrap.sql` states the seed is "transcribed verbatim from the `db_easy` / `db_hard` arrays" — so a content change must land in **both** the SQL seed and the `App.tsx` fallback, or the online and offline banks diverge again (the exact failure `fresh-db-bootstrap` fixed for *order*; this would be *content*).

**Not an agent's call.** Rewriting a question bank is a content decision, and the easy mode also has production rows live that nobody has signed off on deleting (gap 1). It needs a new SDD change, and probably a decision on whether gap 1 is folded into it.

### 8. The in-game footer still credits the university team — **BLOCKER, new**

Found 2026-09-28 by the fresh-eyes review pass, after gap 7. This is the worst of the migration's findings because it is **player-facing** and the Purpose requirement is now a *requirement*, not a preference.

| Where | Rendered to the player |
|-------|-----------------------|
| `src/App.tsx:472` | `Desarrollado por el Equipo Foxtrot` |
| `src/App.tsx:474` | `Proyecto Final` |

Rendered in the footer panel, bottom-right, to every player of the high-school build.

This directly violates *The game is a driving-safety quiz for high-school students*: a high-school student playing this is told it is somebody's final university project. Worse, gap 7 already established the content is F1-themed — so the shipped build currently reads as a university Formula 1 final project, which is the exact framing the migration deleted everywhere else.

**Why it survived.** The first version of the framing audit in `openspec/config.yaml` grepped only `universit|Team Foxtrot|Formula 1|Grand Prix`. The code says `Equipo Foxtrot` and `Proyecto Final` — Spanish, and never the English strings. The audit passed clean against a live violation. The audit pattern is now fixed to include `universidad|Equipo Foxtrot|Proyecto Final`; that fix is in this change.

**Not an agent's call — attribution.** Rewriting a credit line is not a copy decision, it is someone's authorship. Deleting "Equipo Foxtrot" strips a name from work the team did; that is not mine to remove unprompted. The options are roughly: keep the name and drop only `Proyecto Final`; keep both and add the driving-safety framing; or replace with a school/instructor credit. **Needs a human decision from the team**, then a one-line change in `src/App.tsx`.

### 9. Questions are drawn with replacement and options are never reshuffled — MEDIUM, new

Found 2026-09-28 while scoping the `driving-safety-question-bank` change. The entire draw is two lines, `src/App.tsx:100-101`:

```ts
const randomIndex = Math.floor(Math.random() * db.length);
setCurrentQuestion(db[randomIndex]);
```

Three defects in those two lines.

| Defect | What actually happens | Why it matters |
|--------|----------------------|----------------|
| **Draw with replacement** | `Math.random()` indexes the whole bank; nothing records what was drawn last | The same question can come up twice in a row. Back-to-back repeats read as a bug to the player, even though the mechanism is a plain uniform draw. |
| **Option order is never reshuffled** | `options` and `answer` are passed through exactly as received, from either the live bank or the fallback | The correct answer sits at a fixed index for every question, in both sources. A player learns a *position*, not a *fact*. See gap 2 — the index is not even the same in the two sources. |
| **The bank is 5 questions** | 5 easy, 5 hard today | 5 questions × 4 fixed option positions is 20 stable slots. It is memorisable in a single sitting, and once memorised the game tests recall of its own layout rather than of road-safety knowledge. |

Draw-with-replacement is a defensible design in a game that ends when lives run out. It stops being defensible when the bank *is* the content: with five questions the repetition is visible as repetition, not absorbed as difficulty.

**Fix:** reshuffle `options` on every draw and remap `answer` to follow the correct option; track the previously drawn question and exclude it from the next draw when the bank holds more than one entry. Client-side, in `getNewQuestion`. Specified in `openspec/changes/driving-safety-question-bank/specs/game/spec.md`.

### 10. The live database was seeded before the ordering fix and never converged — MEDIUM, new

Found 2026-09-28 while scoping `driving-safety-question-bank`. All four seed inserts in `db/migrations/0001_bootstrap.sql` end with `ORDER BY v.ord` — lines `81`, `112`, `130`, `161`. That pin was added by `fresh-db-bootstrap` on 2026-09-26.

**The live Neon database was seeded by the pre-fix version of the file, and the fix was never re-applied to it.** It cannot be, not by re-running: the seed inserts are guarded by `WHERE NOT EXISTS (SELECT 1 FROM easy_questions e WHERE e.question = v.question)` — a guard on question **text** — so on a database that already has the questions the corrected file inserts nothing and the scrambled primary keys stay scrambled.

| | Freshly seeded database | Live Neon database |
|---|---|---|
| Seeded by | corrected `0001`, `ORDER BY v.ord` present | pre-fix `0001`, `nextval()` order was planner-dependent |
| `easy_questions` id order | matches the seed's `ord` | **does not match** the seed's `ord` |
| Effective option order | matches `db_easy` | differs from `db_easy` for every question (gap 2) |

The consequence is that the *Seeded option order is deterministic and matches the offline fallback* requirement in `openspec/specs/data-layer/spec.md` is satisfied **only for a fresh namespace**. It was verified that way — the transactional throwaway-schema probe creates a schema and runs the file into it, so by construction it is the empty-database path. The live instance was never brought into line, and that requirement's *Then its `options` array and `answer` index match `db_easy`* scenario does not hold against Neon.

This is the root cause of gap 2, and it is a different problem from it. Gap 2 is the *defect* — interleaved answer primary keys. Gap 10 is that the *fix for it was never run against the database that has the defect*.

**Fix:** a new `0002` migration that deletes the game's rows and re-inserts them under the pinned order, so a fresh database and the live database converge on identical content. Not editing `0001` — see the rationale in `openspec/changes/driving-safety-question-bank/design.md`. The delete is production data deletion, and the maintainer's explicit approval of that deletion is recorded — with the exact enumerated scope — in that change's `design.md`. It covers writing the migration; **running it against live Neon is a second, separate gate** and is task 17 in that change's `tasks.md`. Note that gap 1 below is folded into the same migration rather than deferred, because a separate change for two rows would mean applying two destructive migrations to the same four tables.

### 11. The database also hosts `neon_auth`, which this project does not own — **BOUNDARY, new**

Found 2026-09-28 by direct query. The connection in `DATABASE_URL` is not a game-only database. It holds two schemas:

| Schema | Tables | Owner |
|--------|--------|-------|
| `public` | 4 — `easy_questions`, `easy_answers`, `hard_questions`, `hard_answers` | this project |
| `neon_auth` | 9 — `account`, `invitation`, `jwks`, `member`, `organization`, `project_config`, `session`, `user`, `verification` | **Neon Auth** — not this project |

`public` holds exactly the four game tables and nothing else. `neon_auth` is Neon's own authentication service — users, sessions, organisations, invitations, JWT signing keys — provisioned into the same database. It has nothing to do with the game, and nothing in this repo references it.

**The "four tables" claim in `openspec/specs/data-layer/spec.md` was scoped to the game and read as a claim about the database.** It is not one. The requirement has been rewritten to say *four game tables in `public`*, and to state the boundary as a prohibition rather than as a footnote.

**Why this is filed as a gap and not a passing note.** Two operations that are routine in a scratch database are destructive here:

- `db/migrations/*.sql` runs unqualified DDL and DML against whatever `search_path` resolves to. Every file today happens to touch only `public`, and the runner (`db/apply.js`) pins no schema — so the isolation is a property of the current file contents, not an enforced boundary.
- **`DROP SCHEMA public CASCADE` has never been run here and must never be.** It would take the four game tables with it and leave `neon_auth` orphaned, because Neon's auth service expects to own this database. It is also exactly the command that appears in a casual "reset the dev database" instruction and gets pasted without the second thought it deserves.

**Fix:** no code change — the runner and the SQL are left alone. The boundary is now stated as a requirement in `openspec/specs/data-layer/spec.md`, with the `DROP SCHEMA public CASCADE` prohibition made explicit so a future reader meets it as a rule rather than as trivia. Anyone touching the data layer needs to know this is a shared database, not a scratch one.

## Migrated artifacts

### From Engram, 2026-09-26

Written from Engram observations, which are retained for traceability:

| Folder | From | Contents |
|--------|------|----------|
| `openspec/changes/archive/2026-09-01-arcade-retrofit/` | obs #39, #42–#47, #51, #52 | `state.yaml`, `verify-report.md`, `archive-report.md` (incl. the reconstructed task list) |
| `openspec/changes/archive/2026-09-26-backend-data-rigor/` | nothing — reconstructed from commit `de74dbe` | `state.yaml`, `archive-report.md` |
| `openspec/changes/arcade-scene-backdrop/` | obs #54 | `state.yaml`, `exploration.md` |

Arc A's design was never a separate artifact — it was written straight to the repo's `DESIGN.md`. That file is now `openspec/design/arcade-retrofit.md`; the root `DESIGN.md` is a pointer. The current `openspec/specs/game/spec.md` is the post-merge source of truth.

**Commit attribution correction:** the old file recorded Arc A as `89d4174` → `b2e635e`. Those commits are the palette tokens and the initial `ArcadeBackground` / `CarSprite` extraction. The pixelated-retro delta itself — the `DESIGN.md` rewrite, `.glass-panel` → `.pixel-panel`, the 2× integer sprite scale, and the 3840 px dash seam fix — landed in **`e3ab269`**, after Arc B's `de74dbe`.

### From root context files, 2026-09-28

| From | To | What moved |
|------|----|------------|
| `AGENTS.md` | `openspec/conventions.md` | Conventions, gotchas, read-order. The 6 hard rules were **not** copied — they were already in `config.yaml` and the specs. |
| `AGENTS.md` | `openspec/specs/game/spec.md` | New *Purpose* requirement. |
| `ORCHESTRATOR.md` | `openspec/status.md` (this file) | Open gaps, verified facts, provenance, change flow. |
| `DESIGN.md` Part 1 | `openspec/design/arcade-retrofit.md` | Arc A rationale, contrast matrices, token tables, seam math. |
| `DESIGN.md` Part 2 | `openspec/design/backend-data-rigor.md` | Arc B rationale, decision tables, schema, endpoint contract. |
| `DESIGN.md` Part 2 header | `openspec/design/backend-data-rigor.md` | The self-contradicting "**Never verified**" claim was corrected to reflect the 2026-09-26 verification. |
| `neondb_guide.txt` | tombstone at the same path | Closes gap 3. Kept at the original path because archived folders reference it. |
| `README.md` framing | `openspec/specs/game/spec.md` | "final university project by Team Foxtrot" → high-school driving-safety quiz. |
| `config.yaml` context block | corrected in place | Same framing fix. |
| — | `openspec/changes/arcade-scene-backdrop/proposal.md` | Reconstructed; `state.yaml` referenced a file that did not exist. |

**Root files that remain as pointers:** `AGENTS.md`, `ORCHESTRATOR.md`, `DESIGN.md`. Seven archived change folders reference them by path, and `config.yaml` forbids editing archived folders — so the paths stay.

## Next change: `arcade-scene-backdrop`

Proposed, not started. Read `openspec/changes/arcade-scene-backdrop/exploration.md` and `proposal.md`.

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
