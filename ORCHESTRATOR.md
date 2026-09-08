# ORCHESTRATOR.md — SafeRacing: Arcade Retrofit + Backend / Data-Layer Rigor

## Purpose

This file orchestrates autonomous, multi-phase implementation sessions for **SafeRacing** (a Spanish racing-safety quiz game: React 19 + Vite 6 + Tailwind v4 + motion frontend, Express + Neon Postgres backend). It's written to run under the **gentle-ai** SDD (Spec-Driven Development) orchestrator on top of **OpenCode**, using OpenCode's native skill loading, Plan/Build modes, and — if configured — Engram for persistent cross-session memory.

Target stack: **HTML, JavaScript, TypeScript, React, Node/Express, PostgreSQL (Neon)**.

Two independent arcs share this file:

- **Arc A — Arcade Retrofit (Phases 0–4, DONE):** pixel-arcade visual redesign. Implemented and verified on branch `new_designs` (commits `89d4174` → `b2e635e`). Keep these phases as reference — do not modify.
- **Arc B — Backend & Data-Layer Rigor (Phases 5–9, PENDING):** close the gaps found during the Arc A review — wire hard mode to the database, version the schema as migrations, and clean stale artifacts.

## Scope of Arc B (this extension)

1. Analyze the existing codebase (rendering approach, current theming, component structure).
2. Design and document a modernized, arcade-style color scheme in `DESIGN.md`.
3. Implement a seamless looping background.
4. Implement an animated car sprite.
5. Verify the result (visual, performance, type-safety, accessibility).
6. **Audit the live Neon schema** and the single `/api/questions/easy` endpoint; confirm whether `hard_questions`/`hard_answers` exist.
7. **Wire hard mode ("Realista") to the database** — today it runs from the hardcoded `db_hard` in `App.tsx`.
8. **Version the schema** as SQL migrations in the repo (currently zero `.sql` files; only `neondb_guide.txt` documents it).
9. **Clean stale artifacts:** empty `src/db.ts`, the obsolete SQL comment block in `App.tsx`, AI Studio template leftovers in `README.md`/`metadata.json`, hardcoded `http://localhost:3001`.
10. Verify end-to-end: both modes served from Neon, migrations idempotent, docs accurate.

---

## 0. Operating rules (apply for the whole session)

- **Work autonomously** through the phases below without pausing for confirmation, except where explicitly marked `[BLOCKING]`.
- **First action**: if the orchestrator doesn't already have write/run access to this repo (shell, file write, package manager), request it from the operator before doing anything else. This is the only upfront blocking step.
- **4-file rule**: if understanding the current rendering/animation flow requires reading 4+ files, delegate that reading to an explore sub-agent instead of doing it inline in the parent thread.
- **Multi-file write rule**: any phase touching 2+ non-trivial files runs through a single writer sub-agent, followed by a fresh reviewer pass before being marked done.
- **Incident rule**: after any wrong-directory error, failed build, or confusing test/lint output, stop and re-run a short audit (repo root check, `git status`, install state) before continuing.
- **Long-session rule**: after roughly 20 tool calls, or 5 exploratory reads, or 2 non-mechanical edits, pause, summarize progress, and either delegate the next chunk or re-plan.
- Parent/orchestrator thread stays thin: it tracks phase state and summaries; sub-agents do the actual reading/writing.
- If Engram (or equivalent persistent memory) is available, save at minimum: the chosen palette, the sprite/animation architecture decision, and each phase's verify notes — e.g. under keys like `sdd/arcade-retrofit/design`, `sdd/arcade-retrofit/apply-progress`, `sdd/arcade-retrofit/verify-report`.

---

## Phase 1 — Explore: Codebase Analysis *(sdd-explore)*

Delegate to an explore sub-agent. Deliverable: a short written inventory, not code changes.

Inventory:

- **Rendering approach** for anything visual/animated today: plain DOM + CSS, `<canvas>`, or SVG — and which is used where.
- **Existing animation loops**, if any: CSS `@keyframes`/`animation`, `requestAnimationFrame` usage, any game-loop/ticker abstraction already present.
- **Current theming**: where colors live (CSS custom properties, Tailwind config, styled-components theme, or hardcoded hex values scattered across components). This determines how disruptive the palette change will be.
- **Component structure**: which React components should host the background and the car (a `<GameCanvas>`, `<Hero>`, or page-level component?), and their current props/state shape in TypeScript.
- **Asset pipeline**: how images/sprite sheets are currently imported and served, and whether a car sprite asset already exists or needs to be created/sourced.
- **Performance budget**: any existing constraints (Lighthouse targets, low-end device support) the looping background/sprite must respect.

Output: a short `EXPLORE-NOTES.md` (or equivalent Engram entry) summarizing the above — used as input to Phase 2.

---

## Phase 2 — Design: Arcade Palette & `DESIGN.md` *(sdd-design)*

Delegate to a design sub-agent, using the Phase 1 notes as input.

Requirements for the new color scheme:

- Arcade/retro-neon direction: saturated primary + secondary hues (e.g. magenta/cyan/electric-blue family), a dark near-black background rather than plain white/gray, and one accent "highlight" color reserved for interactive/CTA elements.
- Maintain **WCAG AA contrast** (4.5:1 for body text, 3:1 for large text/UI) between text/background pairs — hard constraint, not a suggestion.
- Express the palette as **design tokens** (CSS custom properties, or the project's existing token mechanism from Phase 1) — not one-off hex values inside components.

Produce `DESIGN.md` at the repo root with, at minimum:

```markdown
# DESIGN.md

## Palette
| Token              | Value | Usage                       |
|---------------------|-------|------------------------------|
| --color-bg           | #...  | App background               |
| --color-primary      | #...  | Primary brand / UI accents   |
| --color-secondary    | #...  | Secondary accents            |
| --color-highlight    | #...  | CTAs, active states          |
| --color-text         | #...  | Body text (AA on --color-bg) |

## Typography
(existing or updated type scale, if touched)

## Background loop
- Technique: [CSS transform loop | canvas tile loop]
- Loop unit width/height, seam-matching approach, scroll speed

## Car sprite
- Source: sprite sheet [dimensions] x [frame count], or SVG frame set
- Animation technique: [CSS steps() | requestAnimationFrame frame-stepping]
- States: idle / driving / (optional: boost, crash)

## Accessibility notes
Contrast ratios for each text/background pairing above.
```

Sub-agent review before moving on: confirm contrast ratios pass AA, and that the chosen background/sprite techniques are compatible with the rendering approach found in Phase 1 (don't propose canvas if the rest of the app is pure CSS/DOM, unless justified).

---

## Phase 3 — Implement *(sdd-tasks → sdd-apply)*

Split into three isolated writer sub-agents, each producing one self-contained diff, reviewed before merge:

**3a. Looping background**
- Implement as a dedicated component (e.g. `ArcadeBackground.tsx`), typed with TS.
- Seamless loop: duplicate the background unit and translate both copies together, resetting the translation by exactly one unit-width on wrap (no visible seam/jump). If canvas-based, redraw a tiled pattern per frame instead.
- Drive the loop off a single `requestAnimationFrame` ticker (or CSS animation, per the Phase 2 decision) — no duplicate tickers per component.
- Respect `prefers-reduced-motion`: pause or drastically slow the loop when that OS setting is on.
- Clean up the animation frame/listener on unmount.

**3b. Car sprite**
- Implement as a typed component (e.g. `CarSprite.tsx`) accepting at least a `speed`/`state` prop.
- Frame-stepping via the technique chosen in `DESIGN.md`. If using a sprite sheet, load it once (not per-render) and step through frames on an interval tied to speed.
- Positioned in front of the looping background, aligned to it (same ground line).

**3c. Palette rollout**
- Replace old color tokens/hardcoded hex values found in Phase 1 with the new `DESIGN.md` tokens across affected components.
- No leftover hardcoded colors duplicating a token.

---

## Phase 4 — Verify *(sdd-verify)*

Delegate to a review sub-agent, separate from the ones that wrote the code. Produce a verify report:

- [ ] Visual: background loop has no visible seam/jump over several cycles; car sprite animates smoothly at the intended speed.
- [ ] Performance: sustained ~60fps on the animated view; no growing memory usage over a few minutes (no leaked RAF loops/listeners).
- [ ] `prefers-reduced-motion` respected.
- [ ] TypeScript: `tsc --noEmit` clean; no `any` introduced in the new components.
- [ ] Lint passes.
- [ ] Accessibility: contrast ratios in `DESIGN.md` verified against the actual rendered colors (not just the token table).
- [ ] No hardcoded pre-palette colors remain in touched components.

Review provides evidence, not authorization — normal repo policy (PR review, CI) still governs whether this ships.

---

# ARC B — Backend & Data-Layer Rigor (PENDING)

Known gaps from the Arc A review (2026-09-08):
- `GET /api/questions/easy` is the **only** endpoint; hard mode ("Realista") still uses hardcoded `db_hard` in `App.tsx`.
- The Neon schema is **not versioned**: zero `.sql`/migration files in the repo; the real schema is `easy_questions` (ideasyquestion, question, photostring) JOIN `easy_answers` (ideasyanswer, answer, iscorrect, relatedtoquestion).
- The SQL comment block in `App.tsx` (lines ~22–41) documents a **different, wrong schema** (single `questions` table with inline options) and contradicts reality.
- `src/db.ts` is an **empty dead file**.
- `README.md` and `metadata.json` still describe the default AI Studio telemetry dashboard template.
- Frontend fetches hardcoded `http://localhost:3001/...` — no env var for the API base URL.
- No SQL migrations, no verify report for the data layer.

---

## Phase 5 — Explore: Backend & Data-Layer Audit *(sdd-explore)*

Delegate to an explore sub-agent. Deliverable: a written inventory, not code changes.

Inventory:

- **Live Neon schema**: query/pull the actual DDL for `easy_questions` and `easy_answers` (exact column names, types, constraints). Confirm whether `hard_questions` / `hard_answers` already exist or must be created.
- **Row counts & photo size**: how many questions per table; is `photostring` base64 stored inline, and how large.
- **Backend surface**: every route in `server.js`, the `pg.Pool` config, env vars consumed (`DATABASE_URL`), error handling.
- **Frontend data wiring**: every place `App.tsx` fetches or falls back; the `mode` → data-source mapping; confirmation that `db_hard` is the only source for "Realista".
- **Stale artifacts list**: enumerate `src/db.ts`, the obsolete SQL comment in `App.tsx`, `README.md`, `metadata.json`, `.env.example` contents (allowed — it's committed), and all hardcoded base-URL sites in `src/`.
- **Migration tooling**: none present today — note whether `pg-migrate`, `node-pg-migrate`, or a plain `db/migrations/*.sql` folder is most consistent with the zero-dependency leaning of this repo.

Output: extend/refresh the `EXPLORE-NOTES.md` (or an Engram entry) with the schema DDL, endpoint list, and artifact inventory — input to Phase 6.

---

## Phase 6 — Design: Schema Versioning & Backend API *(sdd-design)*

Delegate to a design sub-agent, using the Phase 5 notes as input. Append the decisions to this same `ORCHESTRATOR.md` (keep history, just extend) and to `DESIGN.md`.

Decisions to lock (with tradeoffs — recommend one per row):

| Decision | Options | Tradeoff | Recommended |
|----------|---------|----------|-------------|
| Hard tables | (A) Mirror `hard_questions`/`hard_answers`, (B) generic `questions`/`answers` + `mode` column | (A) zero disruption to live easy data, consistent with existing JOIN logic; (B) cleaner but requires migrating live easy rows | **(A) Mirror schema** — easy is live with data; `db_hard`'s 5 questions become seed rows |
| Migration format | (A) Plain `db/migrations/NNNN_*.sql` + a runner script, (B) `node-pg-migrate`, (C) schema.sql single file | (A) zero new deps, git-versioned, idempotent `IF NOT EXISTS`; (B) maturity but new dependency + API to learn; (C) simplest but no incremental history | **(A) Plain sequential SQL files** — matches the no-dependency posture; a 10-line Node runner or manual `psql` apply |
| API shape | (A) `GET /api/questions/:mode`, (B) keep `/easy` + add `/hard`, (C) `/api/questions?mode=x` | (A) one route, mode param validated against `['easy','hard']`; (B) mirrors current code, minimal change; (C) query strings for filters | **(A) `GET /api/questions/:mode`** — single validated route, the mode toggle stays in the URL path |
| Response contract | One shape for both modes: `{ question, options[], answer, photoString }` | Guarantees the frontend can treat easy/hard identically | **Unified contract** — App.tsx already consumes exactly this shape from easy |
| API base URL | (A) `VITE_API_BASE_URL` env var with `http://localhost:3001` default, (B) relative proxy via Vite | (A) explicit, works for deployed client/server split; (B) cleaner in dev, needs Vite proxy config | **(A) `VITE_API_BASE_URL`** — explicit; default to localhost for dev, documented in `.env.example` |
| Photostring | (A) Keep base64 in DB, (B) move to hosted media URLs | (A) zero migration of existing rows, works offline; (B) smaller payloads but needs storage + URL rewriting | **(A) Keep base64** — pragmatic for a final-project scope; document max size |

Schema sketch to validate in Phase 7 (mirrors live easy DDL):

```sql
CREATE TABLE IF NOT EXISTS hard_questions (
  idHardQuestion  SERIAL PRIMARY KEY,
  question        TEXT NOT NULL,
  photoString     TEXT
);

CREATE TABLE IF NOT EXISTS hard_answers (
  idHardAnswer    SERIAL PRIMARY KEY,
  answer          TEXT NOT NULL,
  isCorrect       BOOLEAN NOT NULL DEFAULT FALSE,
  relatedToQuestion INTEGER NOT NULL REFERENCES hard_questions(idHardQuestion)
);
```

Seed goal: the 5 hardcoded `db_hard` questions in `App.tsx` must become seed rows, so the frontend can drop `db_hard` entirely.

---

## Phase 7 — Implement *(sdd-tasks → sdd-apply)*

Split into isolated writer sub-agents, each with its own self-contained diff, reviewed before merge:

**7a. Migrations & seed data**
- Create `db/migrations/0001_easy_schema.sql` (idempotent `IF NOT EXISTS` for `easy_questions`/`easy_answers` — matches the live DDL from Phase 5, no data loss).
- Create `db/migrations/0002_hard_schema.sql` and `0003_hard_seed.sql` — the discussed schema + the 5 `db_hard` questions as seed rows.
- If live Neon already has the hard tables, produce `0002` as compatibility/no-op guard and seed explicitly with `ON CONFLICT DO NOTHING` (define a natural-uniqueness guard, e.g. dedupe on `question` text, or document that you must not re-run seeds).
- Add a minimal, dependency-free runner (`db/apply.js` or documented `psql` commands in `db/README.md`) — no new npm packages.
- The seed data must be extracted from `App.tsx` `db_hard` verbatim (same questions, options, answer indices, order randomized later).

**7b. Backend endpoints**
- Refactor `server.js` only as much as Phase 6 decided: implement `GET /api/questions/:mode` validating `mode ∈ {easy, hard}`, reusing the existing JOIN + JS grouping logic via a shared helper (extract the current `easy`-only grouping into `groupQuestions(rows)`).
- Keep the existing `/api/questions/easy` route working (or deprecate with a `console.warn` only if the frontend stops using it — do not break it).
- Preserve the `catch → 500 { error }` pattern and pool configuration.

**7c. Frontend wiring**
- `App.tsx`: fetch per mode — `GET {VITE_API_BASE_URL}/api/questions/${mode}` — and remove the `mode === 'easy'` special-casing; keep the fallback to the local hardcoded arrays **only** for the offline case (document why).
- Replace the obsolete SQL schema comment block with a pointer to `db/migrations/`, or delete it entirely (recommended: delete — the migrations are the single source of truth now).
- Delete empty `src/db.ts` **unless Phase 6 decides it becomes a typed API client** (if so, implement the client there — never leave it empty).
- Add `VITE_API_BASE_URL` to `.env.example` and read it in `App.tsx` via `import.meta.env` (with `http://localhost:3001` fallback for dev).

**7d. Documentation cleanup**
- Rewrite `README.md`: real project name, what it is (Spanish quiz game, safety/F1), local run steps, the two-arc design overview. Keep the AI Studio template lines only if the app is also deployed there — otherwise strip them.
- Fix `metadata.json` description to match the quiz game (not "racing telemetry dashboard").
- Verify `.env.example` lists `DATABASE_URL` and `VITE_API_BASE_URL` with comments.

---

## Phase 8 — Verify *(sdd-verify)*

Delegate to a review sub-agent, separate from the writers. Produce a verify report with evidence:

- [ ] `GET /api/questions/easy` and `GET /api/questions/hard` both return unified `{ question, options[], answer, photoString }` arrays from Neon (curl against a running server).
- [ ] Hard mode in-game answers draw from the DB — proof: temporarily break `db_hard` locally or inspect network tab; the game must not use `db_hard`.
- [ ] Migrations apply cleanly to a **fresh** Neon database and are idempotent (apply twice, no error/no duplicates).
- [ ] No hardcoded `localhost:3001` or bare `http://` base URL remains in `src/` (grep audit).
- [ ] `tsc --noEmit` clean; `npm run lint` passes; no new `any`.
- [ ] `README.md` + `metadata.json` describe the real project (inspect, not just token presence).
- [ ] Stale artifacts removed: `src/db.ts` gone or repurposed; obsolete SQL comment gone.
- [ ] No N+1 or runaway row growth — answer count per question is exactly the option count.
- [ ] Optional-but-nice: `prefers-reduced-motion` and arcade visuals unaffected (regression check on the Arc A touches).

Review provides evidence, not authorization — same policy as Arc A.

---

## Phase 9 — Rollout

- Squash or keep commits in logical units (migrations / backend / frontend / docs) — use `git log --oneline` on feature branch before merging to `main`.
- Run `git status` + diff review before opening the PR; `main` has not received Arc A yet (`origin/HEAD -> main`, current branch `new_designs`) — decide whether Arc A merges first, then Arc B, or both together, and say why in the PR description.
- No destructive migrations: all changes additive/safe; git revert of the feature branch remains the rollback plan.

---

## Deliverables checklist (extended — Arc B items marked ⬛)

- [ ] `EXPLORE-NOTES.md` (or Engram entry) from Phase 1
- [ ] `DESIGN.md`
- [ ] `ArcadeBackground` component + loop logic
- [ ] `CarSprite` component + animation logic
- [ ] Palette rollout across existing components
- [ ] Verify report (Arc A)
- ⬛ `EXPLORE-NOTES.md` refreshed with live Neon DDL + endpoint inventory (Phase 5)
- ⬛ Migration files in `db/migrations/` — easy schema, hard schema, hard seed (idempotent)
- ⬛ `GET /api/questions/:mode` endpoint serving easy + hard from Neon
- ⬛ Hard mode wired to DB (no `db_hard` usage in game path)
- ⬛ `VITE_API_BASE_URL` env-driven fetch, no hardcoded base URL in `src/`
- ⬛ `App.tsx` stale SQL comment removed or pointed at migrations
- ⬛ `src/db.ts` deleted or repurposed (never empty)
- ⬛ `README.md` + `metadata.json` describe the real quiz project
- ⬛ Verify report (Arc B) — both modes, idempotency, offline fallback still works

---

Adjust component names, file paths, and the exact palette to the real project once Phase 1 exploration is done — the values above are the defaults a sub-agent should propose, not hardcode.
