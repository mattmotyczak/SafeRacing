# Conventions — SafeRacing

**Domain:** cross-cutting — applies to both `game` and `data-layer`.
**Source of truth for:** house style, the gotchas that bite, and the order in which you read things before editing.
**Not the source of truth for:** requirements (→ `openspec/specs/`), rationale (→ `openspec/design/`), current state (→ `openspec/status.md`).

This file was migrated from the root `AGENTS.md` on 2026-09-28. It holds only the content that had **no other home**. Every hard rule that already existed in a spec is listed here as a pointer, not a copy — see [Hard rules live in the specs](#hard-rules-live-in-the-specs).

## Project

SafeRacing is a **Spanish-language driving-safety quiz game for high-school students**. React 19 + Vite 6 + Tailwind v4 + motion frontend, Express 4 + Neon Postgres backend.

> **Naming.** "SafeRacing" is the product name only. The game is about **driving**, not Formula 1 — the name does not describe the content. Do not introduce Formula 1, Grand Prix, or "racing rules" framing into copy, specs, or design docs. Where historical artifacts say "racing quiz", treat that as the old name, not the brief.

## Run it

| Command | What it does |
|---------|--------------|
| `npm run dev` | Frontend on :3000 |
| `npm start` | API on :3001 |
| `npm run db:apply` | Replays `db/migrations/*.sql` against Neon |
| `npm run build` | Production build of the frontend |
| `npm run lint` | `tsc --noEmit` — the type gate and the lint gate are the same command |

The frontend needs `VITE_API_BASE_URL`; it defaults to `http://localhost:3001`. See `.env.example`.

## Hard rules live in the specs

Each rule is spec'd in exactly one place. Edit it there, not here.

| Rule | Where it is spec'd |
|------|--------------------|
| Every color in `src/**/*.tsx` resolves to an `@theme` token or `var(--color-*)`; the traffic-light family is the sole exception | `openspec/specs/game/spec.md` — *Visual token discipline*; `openspec/config.yaml` — `rules.apply.guidelines` |
| Zero blur — no `backdrop-blur`, no `blur()`, no `blur-*`, no soft shadows | `openspec/specs/game/spec.md` — *REMOVED: Blur and glow as a visual primitive* |
| Every scroll seam is a periodicity constraint: pan distance ≡ 0 (mod period) **at every viewport width** | `openspec/specs/game/spec.md` — *Seamless wrapping is a periodicity constraint, not a visual check*; `openspec/config.yaml` — `rules.design` |
| Animation is CSS-only — no `requestAnimationFrame`, no JS ticker, no per-component interval; layers paused unless `isMoving` | `openspec/specs/game/spec.md` — *Background scroll layers*, *Reduced motion is honored on every animated layer* |
| Every animated layer carries `motion-reduce:animate-none` **and** appears in the `prefers-reduced-motion` block at the bottom of `src/index.css` | `openspec/specs/game/spec.md` — *Reduced motion is honored on every animated layer* |
| No new runtime dependency without recording the tradeoff in `design.md` | `openspec/config.yaml` — `rules.apply.guidelines`; rationale in `openspec/design/` |
| Database identifiers are lowercase and unquoted | `openspec/specs/data-layer/spec.md` — *Four tables, mirror-schema pairs, lowercase identifiers* |

The hard rules were deliberately **not** copied into this file. They lived in `AGENTS.md`, `config.yaml`, `DESIGN.md`, and both specs simultaneously, and they drifted apart — `DESIGN.md` ended up asserting a verification status its own body contradicted. One home per rule.

## Conventions

camelCase identifiers, JSX in `.tsx`, `@/*` path alias, ESM throughout (`"type": "module"`). `server.js` and `db/apply.js` are plain JS.

Components open with a JSDoc block saying what they are, how they animate, and their license. Types are explicit on component props — `CarSpriteProps` and `ArcadeBackgroundProps` are the reference.

## Gotchas

**There is no test runner.** No test script, no test dependency, no config. Verification is `npx tsc --noEmit` plus the grep audits in `openspec/config.yaml` plus contrast/geometry arithmetic written into the artifact. Plan work accordingly — do not schedule a phase that assumes a suite exists, and do not add one uninvited.

**PowerShell line counting.** `(Get-Content -LiteralPath f).Count` is the line number. `Get-Content f | Measure-Object -Line` **undercounts** by skipping blank lines — it reported `App.tsx` as 444 when the file actually has 509. Every `file:line` reference in the specs was checked with `.Count`, and a `file:line` in a spec is only correct for the commit it was written against — re-check the anchor before reusing it.

**Migrations are idempotent by construction**, by one of three sanctioned mechanisms. `CREATE TABLE IF NOT EXISTS` for DDL. `WHERE NOT EXISTS` guards for seeds (`ON CONFLICT` is unavailable — no unique constraint on question text). And **blanket delete-and-reinsert**, which `0002_driving_safety_bank.sql` uses: inside one `BEGIN`/`COMMIT` it deletes every row in all four tables and re-inserts them, so a re-apply converges on an identical row set rather than accumulating. That third mechanism is a deliberate pattern here, not a mistake — it is the only formulation that makes the live bank byte-identical to a fresh one, and it retires stale rows in the same pass. It also means a re-apply **does** change rows even when the resulting state is identical, so do not describe an apply as a no-op. There is no ledger table, so every run replays every file. `0001_bootstrap.sql` creates all four tables before seeding any of them, so it bootstraps a genuinely empty database; verified 22/22 through a transactional throwaway-schema probe. Re-prove it with the technique in `openspec/changes/archive/2026-09-26-fresh-db-bootstrap/verify-report.md` — `BEGIN` → `CREATE SCHEMA <probe>` → `SET search_path` → run the file → assert → `ROLLBACK`.

**Seeded row order is load-bearing.** `SERIAL` assigns `nextval()` as rows reach the insert and `INSERT ... SELECT` guarantees no ordering, so every seeded `VALUES` row carries an explicit ordinal and every seed `INSERT` ends with `ORDER BY v.ord`. Without it the answer primary keys — and therefore the option order `server.js` reconstructs via `ORDER BY <answer pk>` — land in planner-dependent order. If you add or reorder a seeded row, renumber the ordinal.

**`neondb_guide.txt` is a tombstone, not schema documentation.** The file at the repo root is a 10-line stub that records the shape of the mistake — a single `questions` table with inline options, quoted CamelCase identifiers, and an `idAnswer` column that does not exist. Read-only introspection confirmed the live tables are all-lowercase, so the original snippet was never executed here. The migration header says the same thing. **Schema documentation is `db/migrations/`.**

**`answer` is positional.** It is not a stored column. `groupQuestions()` derives it from row arrival order, which the query pins with `ORDER BY` on the answers primary key. Renumbering answer rows silently changes every question's correct-option index.

**`db_easy` / `db_hard` are the offline fallback, not dead code.** They are module-level banks in `src/data/questions.easy.ts` (30 questions) and `src/data/questions.hard.ts` (80), imported by `src/App.tsx:14-15` under exactly those two names. Each mode's fetch falls back to its local bank on network error or empty response. That is what keeps the game playable without the backend — the identifiers are the historical F1-era names, and the contents are driving-safety content.

## Before you change behavior

Read `openspec/specs/` — the requirement-level source of truth, split into `game` and `data-layer`. If code and spec disagree, work out which is wrong before editing either.

`openspec/design/` holds the *why* behind those requirements, with the options and tradeoffs for each decision. `openspec/status.md` holds current state, the ranked list of open gaps, and the change flow — **read its "Open gaps" section before planning work**, so you do not re-plan something already done or duplicate a gap someone is already tracking.

New spec-driven work starts in `openspec/changes/{name}/`: `proposal.md` → `specs/{domain}/spec.md` delta → `design.md` → `tasks.md` → `verify-report.md` → archived to `openspec/changes/archive/YYYY-MM-DD-{name}/`.

## Before you commit

`main` has received none of the arcade or data-layer work; it all lives on `new_designs`. Confirm which branch you are on and what the PR is actually carrying.

**Never edit or delete a folder under `openspec/changes/archive/`.** Archived artifacts reference `AGENTS.md`, `DESIGN.md`, `ORCHESTRATOR.md`, `README.md`, and `neondb_guide.txt` by path. Those root files are kept alive as pointers for exactly that reason — do not delete them, even though their content now lives in `openspec/`.
