# AGENTS.md

SafeRacing — a Spanish racing-safety quiz game. React 19 + Vite 6 + Tailwind v4 + motion frontend, Express 4 + Neon Postgres backend. Final university project, Team Foxtrot.

## Run it

| Command | What it does |
|---------|--------------|
| `npm run dev` | Frontend on :3000 |
| `npm start` | API on :3001 |
| `npm run db:apply` | Replays `db/migrations/*.sql` against Neon |
| `npm run lint` | `tsc --noEmit` — the type gate and the lint gate are the same command |

The frontend needs `VITE_API_BASE_URL`; it defaults to `http://localhost:3001`. See `.env.example`.

## Hard rules

**SDD artifacts are files, not memory.** Write every spec-driven artifact under `openspec/changes/{name}/` and merge results into `openspec/specs/`. A skill that tells you to `mem_save` an SDD artifact is running a stale persistence mode — write the file instead. Engram is for ad-hoc memory only (bugfixes, discoveries, session summaries). Config: `openspec/config.yaml`.

**Colors come from tokens.** Every color in `src/**/*.tsx` resolves to a Tailwind v4 `@theme` token or a `var(--color-*)`. The one exception is the traffic-light family — `bg-red-500`, `bg-yellow-500`, `bg-green-500` and their `/opacity` variants, plus the three stoplight glow shadows at `App.tsx:226-228`. Those are semantically distinct from the arcade accent palette and were reviewed and accepted. Add new scene colors as `--color-scene-*` tokens in `src/index.css`.

**Zero blur.** The visual contract is hard-edged pixel art: no `backdrop-blur`, no `blur()`, no `blur-` utilities, no soft shadows. Glow becomes a hard offset shadow (`4px 4px 0 var(--color-hard-shadow)`); a glow you want to try goes behind a `/* DEBUG-DELETABLE */` marker with a removal note, defaulting to a pixel-block SVG filter so the shipped state still honours the contract.

**Every seam is a periodicity constraint.** For a `translateX(0 → -50%)` scroll loop, the pan distance must be congruent to `0` modulo the layer's period **at every viewport width**. Verify the arithmetic before writing the CSS — `1920 mod 192 = 0` is why the dash layer uses two fixed `w-[1920px]` tiles in a `w-[3840px]` flex row, and why a `w-1/2` dash tile is wrong (1100 mod 192 = 140 collapses the gap and seams every cycle). Changing a layer's period means redoing this sum.

**Animation is CSS-only.** No `requestAnimationFrame`, no JS ticker, no per-component interval. Layers are `animation-play-state: paused` by default and run only while `isMoving` is true. Every animated layer carries `motion-reduce:animate-none` **and** is listed in the `prefers-reduced-motion` block at the bottom of `src/index.css`. New layer, new entry in both places.

**No new runtime dependencies without recording the tradeoff in `design.md`.** The zero-dependency posture is deliberate — `db/apply.js` is hand-rolled rather than pulling in `node-pg-migrate`, for exactly this reason.

**Write database identifiers lowercase and unquoted.** Postgres folds unquoted identifiers to lowercase. `MODE_CONFIG` in `server.js` is the only place table and column names reach SQL text; mode validation happens against a two-value allowlist before any query runs.

## Conventions

camelCase identifiers, JSX in `.tsx`, `@/*` path alias, ESM throughout (`"type": "module"`). `server.js` and `db/apply.js` are plain JS. Components open with a JSDoc block saying what they are, how they animate, and their license. Types are explicit on component props — `CarSpriteProps` and `ArcadeBackgroundProps` are the reference.

## Gotchas

**There is no test runner.** No test script, no test dependency, no config. Verification is `npx tsc --noEmit` plus the grep audits in `openspec/config.yaml` plus contrast/geometry arithmetic written into the artifact. Plan work accordingly — do not schedule a phase that assumes a suite exists, and do not add one uninvited.

**Migrations are idempotent by construction.** `CREATE TABLE IF NOT EXISTS` for DDL, `WHERE NOT EXISTS` guards for seeds (`ON CONFLICT` is unavailable — no unique constraint on question text), and no ledger table, so every run replays every file. `0001_bootstrap.sql` creates all four tables before seeding any of them, so it bootstraps a genuinely empty database; verified 22/22 through a transactional throwaway-schema probe. Re-prove it with the technique in `openspec/changes/archive/2026-09-26-fresh-db-bootstrap/verify-report.md` — `BEGIN` → `CREATE SCHEMA <probe>` → `SET search_path` → run the file → assert → `ROLLBACK`.

**Seeded row order is load-bearing.** `SERIAL` assigns `nextval()` as rows reach the insert and `INSERT ... SELECT` guarantees no ordering, so every seeded `VALUES` row carries an explicit ordinal and every seed `INSERT` ends with `ORDER BY v.ord`. Without it the answer primary keys — and therefore the option order `server.js` reconstructs via `ORDER BY <answer pk>` — land in planner-dependent order. If you add or reorder a seeded row, renumber the ordinal.

**`neondb_guide.txt` is a historical artifact, not schema documentation.** It shows a single `questions` table with inline options, quoted CamelCase identifiers, and an `idAnswer` column that does not exist. Read-only introspection confirmed the live tables are all-lowercase, so that snippet was never executed here. The migration header says the same thing.

**`answer` is positional.** It is not a stored column. `groupQuestions()` derives it from row arrival order, which the query pins with `ORDER BY` on the answers primary key. Renumbering answer rows silently changes every question's correct-option index.

**`db_easy` / `db_hard` in `App.tsx` are the offline fallback, not dead code.** Each mode's fetch falls back to its local 5-question bank on network error or empty response. That is what keeps the game playable without the backend.

## Before you change behavior

Read `openspec/specs/` — the requirement-level source of truth, split into `game` and `data-layer`. If code and spec disagree, work out which is wrong before editing either.

`DESIGN.md` holds the *why* behind those requirements, with the options and tradeoffs for each decision. `ORCHESTRATOR.md` holds current state, the ranked list of open gaps, and the change flow — **read its "Open gaps" section before planning work**, so you do not re-plan something already done or duplicate a gap someone is already tracking.

New spec-driven work starts in `openspec/changes/{name}/`: `proposal.md` → `specs/{domain}/spec.md` delta → `design.md` → `tasks.md` → `verify-report.md` → archived to `openspec/changes/archive/YYYY-MM-DD-{name}/`. A proposed change not yet started is in `openspec/changes/arcade-scene-backdrop/`.

## Before you commit

`main` has received none of the arcade or data-layer work; it all lives on `new_designs`. Confirm which branch you are on and what the PR is actually carrying.
