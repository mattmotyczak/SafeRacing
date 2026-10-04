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

Branch `new_designs`, HEAD `453b542` ("Migrate SDD to openspec; add question banks"). **`main` has received none of this work.**

| Arc | Scope | Status |
|-----|-------|--------|
| A | Arcade Retrofit — pixelated retro (8-bit) visual redesign | **Shipped, verified, reviewed, archived** |
| B | Backend & Data-Layer Rigor — migrations, unified API, hard mode from DB | **Shipped; data layer now verified** — see below |
| C | Cartoon daytime road scene + dimmed backdrop | **Proposed only — not started** |

Active change, `driving-safety-question-bank`: **committed as `a59386c`; `review` and `archive` are complete.** It closes gaps 1, 2, 7, 9 and 10, and leaves gap 8 open by design. Six planned checks in the change's `verify-report.md` §6 were never run — there is no local Postgres, `psql` or Docker on this machine — and that gap is recorded, not closed. The change is archived at `openspec/changes/archive/2026-09-28-driving-safety-question-bank/`.

Arc B's nine skipped Phase 8 checks have since been executed against the live database. Verified: both endpoints return the unified contract from a live database; migration idempotency under double-apply; a fresh-database bootstrap through a transactional throwaway-schema probe (22/22, three runs, zero residue). One check remains genuinely unverified — hard mode drawing from the DB rather than `db_hard` is confirmed only indirectly, by the returned option order matching the live scrambled primary keys rather than the authored order in `App.tsx`. The `fresh-db-bootstrap` change also fixed a second defect found along the way: seeded answer order was planner-dependent, so a freshly seeded database served a different option order than `db_easy`.

### Verified project facts

Read `openspec/specs/game/spec.md` and `openspec/specs/data-layer/spec.md` for the full requirement sets. The essentials:

- `src/App.tsx` (509 lines) is a single page with a four-state machine — `menu | mode_selection | playing | game_over` — and one `useEffect` fetcher per mode.
- Rendering is pure DOM/CSS plus one inline SVG. No canvas, no `requestAnimationFrame`, no JS animation loop anywhere.
- `GET /api/questions/:mode` serves both modes from one route, mapping mode → table pair through `MODE_CONFIG` in `server.js:28-41` and grouping JOINed rows via `groupQuestions()` in `server.js:46-72`.
- **Both modes now fall back to a real offline bank, not five inline questions.** `src/data/questions.easy.ts` (30) and `src/data/questions.hard.ts` (80) are imported at `src/App.tsx:14-15` and aliased to the historical `db_easy` / `db_hard` names, so the game stays playable with the backend down. The old inline 5-question F1 arrays are gone.
- **The live and offline banks are now 30 easy / 80 hard, with matching option order.** Verified 2026-09-28 against Neon: 30/120/80/320 rows, no smoke-test residue, and the first four easy questions return their correct option at index 1, 2, 3, 3 — identical to the TS bank. Gaps 1, 2, 7 and 10 are closed; see each entry.
- All sixteen live columns are lowercase. The old `neondb_guide.txt` snippet's quoted CamelCase form was never executed.
- **There is no test runner.** No test script, no test dependency, no config. Verification is `npx tsc --noEmit`, grep audits, contrast/geometry math written into the artifacts, ad-hoc draw simulations, and — for the data layer — a transactional throwaway-schema probe. Do not plan work that assumes a test suite exists.

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

**Closed gaps are kept in place, not deleted**, with the original finding and the evidence that closed it
preserved underneath. Gaps 1, 2, 7, 9 and 10 were closed by `driving-safety-question-bank` on
2026-09-28 and are now historical record. They are retained because the *reason each was a gap* is the
useful part — a future reader who re-derives one of these should not have to re-derive it from scratch.
Entries that remain genuinely open are 3 (resolved), 4, 5, 6, and **8**, which is now the
highest-priority open item.

### 1. Live `easy_*` tables contain smoke-test rows — **RESOLVED 2026-09-28**

Closed by the `driving-safety-question-bank` change, together with gap 7 — one destructive migration,
one approved scope, rather than two migrations against the same four tables.

Both rows and their answers are gone. Live `easy_questions` now holds **30** rows, zero of them
smoke-test residue, and `photostring` is null on every row. The 42,420-byte photo on the `Test` row
was **not snapshotted before deletion and is unrecoverable**; the F1 question text is recoverable
from git. That omission is recorded in the change's `verify-report.md` §6 and in `tasks.md` 1-2,
which are deliberately left unticked.

The original table, kept so the reason this was ever a gap survives:

| id | question | answers | note |
|----|----------|---------|------|
| 1 | `Test` | 4 (`prueba exitosa` correct, 3× `prueba fallida`) | **was served to players**, plus a 42,420-byte base64 photo |
| 2 | `Second Test` | 0 | invisible — the `INNER JOIN` filtered it |

### 2. Live answer primary keys are interleaved, so online and offline option order differ — **RESOLVED 2026-09-28**

**The defect is gone, but note *why* — this gap did not close on its own merits.** The correct answer no
longer moves between the two sources: `0002` rewrote the live answer primary keys under the pinned
`ORDER BY v.ord` order, so the served order is now the authored order. Verified 2026-09-28 by reading
`array_agg(answer ORDER BY ideasyanswer)` for the first four easy questions and getting the correct
option at index **1, 2, 3, 3** — identical to `src/data/questions.easy.ts`.

The *fix* already existed before this change. What this change did was finally **run** it against the
database that had the defect, which is exactly what gap 10 was about. `fresh-db-bootstrap` had pinned
the seed order on 2026-09-26, but the `WHERE NOT EXISTS` guard meant it could never apply to a
database that already had the questions. So gaps 2 and 10 were always one problem wearing two
descriptions, and the destructive migration is what resolved both.

The original finding, kept for the record:

Because the live `easy_answers` primary keys were scattered across questions, the live easy option
order differed from `db_easy` for **every** question. Each response was internally consistent and the
correct answer was always identified, so the game was never wrong — but the online and offline
experience of one question were not the same, which undercut the offline fallback's role as a mirror.

**This was not cosmetic. The correct answer MOVED between the two sources.** Verified by direct query on
2026-09-28, comparing the same question served by `GET /api/questions/:mode` against the same question
in the `db_easy` / `db_hard` fallback array in `src/App.tsx`:

| Bank | Question | Correct option index online | Correct option index in the fallback | Delta |
|------|----------|-----------------------------|--------------------------------------|-------|
| easy | (same question, both sources) | **1** | **0** | 1 position |
| hard | (same question, both sources) | **3** | **1** | 2 positions |

The `arcade-scene-backdrop` answer-feedback work is unblocked: it can key off the resolved `answer`
index and assume the authored order, because the two sources now agree.

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

### 7. The seeded question bank is Formula 1-themed, contradicting the Purpose requirement — **RESOLVED 2026-09-28**

Closed by the `driving-safety-question-bank` change. The bank is now driving-safety content on both
sides: `src/data/questions.easy.ts` (30) and `src/data/questions.hard.ts` (80) replace the inline F1
arrays, and `db/migrations/0002_driving_safety_bank.sql` replaces the live rows. An F1-residue audit over
`db/**` and `src/**` returns **0 rows**.

The 110 hard questions are cited to a real source extraction — the GCBA *Manual del conductor*,
200 pages — with a printed page reference per question, and the speed limits are cited to Ley 24.449
art. 51 instead, because the manual's speed table is a graphic the text layer does not expose. The
extraction is documented in the change's `state.yaml`, including two traps that cost real time: the text
layer carries **no accents**, so any literal search silently returns zero, and PDF page index is offset
by one from the printed page. One source was also corrected against itself — the manual specifies a
**two**-second safe following distance, where a commercial study site claims one.

The original finding, kept for the record:

Found 2026-09-28 while migrating the context files. The product brief is a **driving-safety** game — that
is now a requirement (*The game is a driving-safety quiz for high-school students*,
`openspec/specs/game/spec.md`). The shipped data did not match it.

| Where | Offending content |
|-------|------------------|
| `db/migrations/0001_bootstrap.sql:86-99` (easy seed) | `¿Cuántos pilotos hay en un auto de F1?`; flags framed as racing flags (`Entrada a pits`, `Carrera terminada`) |
| `db/migrations/0001_bootstrap.sql:135-148` (hard seed) | `¿Cuál es el límite de velocidad en el Pit Lane?`, `DRS` / `ERS` / `KERS`, `¿Cuántos puntos recibe el ganador de un GP?`, tyre compounds `C1`–`C5` |
| `src/App.tsx:23-30` (old `db_easy`) | same as the easy seed |
| `src/App.tsx:31-38` (old `db_hard`) | same as the hard seed |

`db/migrations/0001_bootstrap.sql` states the seed is "transcribed verbatim from the `db_easy` /
`db_hard` arrays" — so a content change had to land in **both** the SQL and the fallback, or the banks
would diverge again.

**`0001_bootstrap.sql` still contains all of the above, and that is deliberate.** It is immutable
history, and its `WHERE NOT EXISTS` guard on question *text* means editing it would have inserted the new
bank *alongside* the old — landing at 10 easy questions, 5 of them still F1. Any audit that reads
`0001` as a live-content failure is misreading it; the live content is `0002`.

### 8. The in-game footer still credits the university team — **BLOCKER, new**

Found 2026-09-28 by the fresh-eyes review pass, after gap 7. This is the worst of the migration's findings because it is **player-facing** and the Purpose requirement is now a *requirement*, not a preference.

| Where | Rendered to the player |
|-------|-----------------------|
| `src/App.tsx:472` | `Desarrollado por el Equipo Foxtrot` |
| `src/App.tsx:474` | `Proyecto Final` |

Rendered in the footer panel, bottom-right, to every player of the high-school build.

This directly violates *The game is a driving-safety quiz for high-school students*: a high-school student playing this is told it is somebody's final university project. Worse, gap 7 already established the content is F1-themed — so the shipped build currently reads as a university Formula 1 final project, which is the exact framing the migration deleted everywhere else.

**Why it survived.** The first version of the framing audit in `openspec/config.yaml` grepped only `universit|Team Foxtrot|Formula 1|Grand Prix`. The code says `Equipo Foxtrot` and `Proyecto Final` — Spanish, and never the English strings. The audit passed clean against a live violation. The audit pattern is now fixed to include `universidad|Equipo Foxtrot|Proyecto Final`; that fix is in this change.

**Not an agent's call — attribution.** Rewriting a credit line is not a copy decision, it is someone's
authorship. Deleting "Equipo Foxtrot" strips a name from work the team did; that is not mine to remove
unprompted. The options are roughly: keep the name and drop only `Proyecto Final`; keep both and add the
driving-safety framing; or replace with a school/instructor credit. **Needs a human decision from the
team**, then a one-line change in `src/App.tsx`.

**Still open as of 2026-09-28, and explicitly a non-goal of `driving-safety-question-bank`.** That change
closed the five content gaps around it but left this one untouched: the footer is an authorship decision
rather than a content one, and it lives in JSX. It is now the **highest-priority open gap** — the only
player-facing Purpose violation left in the project.

**Related tooling defect, still open.** `rules.verify.audits` in `openspec/config.yaml` is file-level
and its allowlist does not include `openspec/changes/**`. A change folder therefore cannot quote the
strings it exists to correct, so a gap-closing change cannot document what it removed without tripping
the audit. Worked around by referring to gaps by number and describing the offending literals rather than
quoting them. Two options, undecided: add `openspec/changes/**` with a correction-note reading rule, or
accept the constraint and document gaps by number only. Recorded in the change's `state.yaml` under
`tracked_gaps`.

### 9. Questions are drawn with replacement and options are never reshuffled — **RESOLVED 2026-09-28**

All three defects are fixed. `getNewQuestion` in `src/App.tsx:99-113` now:

- **shuffles** `options` with a Fisher–Yates pass and **remaps** `answer` by capturing the correct
  option's *text* before the swap and re-resolving its index after. Without the remap every correct
  answer would be scored wrong, and `tsc` cannot see that.
- **draws without replacement** until the bank is exhausted, tracked in an `askedIds` ref, and
  **excludes `lastId` at the lap seam** where `askedIds` is reset. This last guard is a bug fix, not a
  spec item: the first version shipped with a measured **2 immediate repeats in 4,000 easy draws**,
  which review missed and simulation caught. After the fix, 0 repeats in 30,000 draws per bank.

Bank size is no longer 5: 30 easy, 80 hard, from the files and from the live tables.

**The shipped rule is stronger than the one this gap and the change's `tasks.md` step 13 specify** —
they ask only that the *previously drawn* question be excluded. The stronger rule (full depletion plus
the seam guard) is what actually prevents repeats, and it is now the specified rule: the game delta
and `design.md` both carry the full depletion behaviour and the `lastId` seam guard.

The original finding, kept for the record:

Found 2026-09-28 while scoping the `driving-safety-question-bank` change. The entire draw was two lines,
`src/App.tsx:100-101`:

```ts
const randomIndex = Math.floor(Math.random() * db.length);
setCurrentQuestion(db[randomIndex]);
```

| Defect | What actually happened | Why it mattered |
|--------|------------------------|-----------------|
| **Draw with replacement** | `Math.random()` indexed the whole bank; nothing recorded what was drawn last | The same question could come up twice in a row. Back-to-back repeats read as a bug to the player. |
| **Option order never reshuffled** | `options` and `answer` passed through exactly as received | The correct answer sat at a fixed index for every question, in both sources. A player learned a *position*, not a *fact*. See gap 2. |
| **The bank was 5 questions** | 5 easy, 5 hard | 5 questions × 4 fixed option positions is 20 stable slots, memorisable in one sitting. |

### 10. The live database was seeded before the ordering fix and never converged — **RESOLVED 2026-09-28**

Closed by running the fix, which was always the whole point. `db/migrations/0002_driving_safety_bank.sql`
deleted the four game tables' rows and re-inserted them under the pinned `ORDER BY v.ord` order, so a
freshly seeded database and the live one now converge on identical content. Applied against Neon on
2026-09-28 with an approved, exactly-enumerated deletion scope; `0001_bootstrap.sql` was left unedited,
since its text guard appends rather than replaces.

**The live instance is now verified against the requirement it used to fail** — that was the open
question in the original entry, since the `fresh-db-bootstrap` probe only ever exercised the
empty-database path. Live: 30 / 120 / 80 / 320 rows, zero questions without exactly 4 answers or
exactly one correct, zero F1 rows, `photostring` null throughout, and
`easy_questions_ideasyquestion_seq.last_value = 30` so the sequence restarted rather than appended.

Two verification notes worth keeping. The report that `0002` inserted "a max of 50 rows per table" was
**wrong** — `db/apply.js:38` sends each file in a single `pool.query` with no chunking, and the explicit
`BEGIN`/`COMMIT` means a failed run can only leave 0 rows or all 550, so the reported 50/50/50/30 state
was impossible. It was a Neon console page boundary. And the throwaway-schema and fault-injection checks
for `0002` were **not** run — there is no local Postgres, `psql`, or Docker here — so `0002` has been
executed exactly once, against production. The live double-apply idempotency check is also unrun. All
three are recorded in the change's `verify-report.md` §6 and left unticked in `tasks.md`.

The original finding, kept for the record:

All four seed inserts in `db/migrations/0001_bootstrap.sql` end with `ORDER BY v.ord` — lines `81`,
`112`, `130`, `161`. That pin was added by `fresh-db-bootstrap` on 2026-09-26.

**The live Neon database was seeded by the pre-fix version of the file, and the fix could never be
re-applied to it.** The seed inserts are guarded by `WHERE NOT EXISTS (SELECT 1 FROM easy_questions e
WHERE e.question = v.question)` — a guard on question **text** — so on a database that already had the
questions the corrected file inserts nothing and the scrambled primary keys stay scrambled.

| | Freshly seeded database | Live Neon database (before `0002`) |
|---|---|---|
| Seeded by | corrected `0001`, `ORDER BY v.ord` present | pre-fix `0001`, `nextval()` order was planner-dependent |
| `easy_questions` id order | matches the seed's `ord` | **did not match** the seed's `ord` |
| Effective option order | matches `db_easy` | differed from `db_easy` for every question (gap 2) |

This was the root cause of gap 2, and a different problem from it. Gap 2 was the *defect*; gap 10 was
that the *fix for it was never run against the database that had the defect*.

### 11. The database also hosts `neon_auth`, which this project does not own — **BOUNDARY, standing**

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

**This does not "close" — it is a standing constraint**, and it is deliberately not listed among the
gaps closed by `driving-safety-question-bank`. Two things were checked on 2026-09-28 and one of them is
only half-proved:

- `0002` names no `neon_auth` object and contains no `DROP` of any kind, so it **cannot** have touched
  those 9 tables. That is a statement about the file's contents, and it holds.
- The **strong** form — that the 9 tables' row counts are unchanged — was **not** verified. No
  before/after snapshot was taken (`tasks.md` 16 and 19, left unticked), because the apply ran without
  one. A reviewer should treat `neon_auth` as *probably* untouched rather than *proven* untouched, and
  snapshot it before the next data-layer change.

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

**`driving-safety-question-bank` is closed out** — committed as `a59386c`, reviewed and archived at
`openspec/changes/archive/2026-09-28-driving-safety-question-bank/`, with its evidence in that
folder's `verify-report.md`. Six planned checks there were never run (§6) and remain outstanding, so
a second `npm run db:apply` is still the cheapest way to close the idempotency half.
`arcade-scene-backdrop` is unblocked on one of its dependencies — it can assume the authored option
order, because gaps 2 and 10 are closed.

Read `openspec/changes/arcade-scene-backdrop/exploration.md` and `proposal.md`.

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
