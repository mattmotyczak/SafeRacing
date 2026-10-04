# AGENTS.md — SafeRacing

> **This file is a pointer.** The conventions, gotchas, and hard rules moved into `openspec/` on 2026-09-28. The hard rules below are **kept inline on purpose** — you auto-load this file and would never open `openspec/` — but each one is spec'd in exactly one place, and that place is not here. Edit it there.

SafeRacing is a **Spanish-language driving-safety quiz game for high-school students**. React 19 + Vite 6 + Tailwind v4 + motion frontend, Express 4 + Neon Postgres backend.

> **Naming.** "SafeRacing" is a product name, not a description of the content. The game is about driving, not Formula 1. Do not introduce Grand Prix or F1 framing into copy, specs, or design docs.

## Where things live

| You want | Read |
|----------|------|
| **Requirements** — the source of truth | `openspec/specs/game/spec.md`, `openspec/specs/data-layer/spec.md` |
| **Conventions, gotchas, read-order** | `openspec/conventions.md` |
| **Current state, open gaps, change flow** | `openspec/status.md` |
| **Why each decision was made** | `openspec/design/` |
| **SDD config, per-phase rules, verify audits** | `openspec/config.yaml` |
| **Active change** | `openspec/changes/{name}/` |

## Run it

| Command | What it does |
|---------|--------------|
| `npm run dev` | Frontend on :3000 |
| `npm start` | API on :3001 |
| `npm run db:apply` | Replays `db/migrations/*.sql` against Neon |
| `npm run lint` | `tsc --noEmit` — the type gate and the lint gate are the same command |

The frontend needs `VITE_API_BASE_URL`; it defaults to `http://localhost:3001`. See `.env.example`.

## Hard rules

Each is spec'd in exactly one place. That place is authoritative — this list is a summary, not a copy.

1. **Colors come from tokens.** Every color in `src/**/*.tsx` resolves to a Tailwind v4 `@theme` token or a `var(--color-*)`. The one exception is the traffic-light family — `bg-red-500`, `bg-yellow-500`, `bg-green-500` and their `/opacity` variants, plus the three stoplight glow shadows at `App.tsx:226-228`. New scene colors go in as `--color-scene-*` tokens in `src/index.css`. → *game spec, Visual token discipline*

2. **Zero blur.** No `backdrop-blur`, no `blur()`, no `blur-` utilities, no soft shadows. Glow is a hard offset shadow (`4px 4px 0 var(--color-hard-shadow)`). A glow you want to try goes behind a `/* DEBUG-DELETABLE */` marker with a removal note, defaulting to a pixel-block SVG filter. → *game spec, REMOVED: Blur and glow*

3. **Every seam is a periodicity constraint.** For a `translateX(0 → -50%)` loop the pan distance must be congruent to `0` modulo the layer's period **at every viewport width**. Verify the arithmetic before writing the CSS — `1920 mod 192 = 0` is why the dash layer uses two fixed `w-[1920px]` tiles in a `w-[3840px]` flex row, and why a `w-1/2` dash tile is wrong (`1100 mod 192 = 140` collapses the gap). → *game spec, Seamless wrapping*

4. **Animation is CSS-only.** No `requestAnimationFrame`, no JS ticker, no per-component interval. Layers are `animation-play-state: paused` by default and run only while `isMoving` is true. Every animated layer carries `motion-reduce:animate-none` **and** is listed in the `prefers-reduced-motion` block at the bottom of `src/index.css`. New layer, new entry in both places. → *game spec, Reduced motion*

5. **No new runtime dependencies** without recording the tradeoff in `design.md`. The zero-dependency posture is deliberate — `db/apply.js` is hand-rolled rather than pulling in `node-pg-migrate`, for exactly this reason. → *config.yaml, rules.apply.guidelines*

6. **Write database identifiers lowercase and unquoted.** Postgres folds unquoted identifiers to lowercase. `MODE_CONFIG` in `server.js` is the only place table and column names reach SQL text; mode validation happens against a two-value allowlist before any query runs. → *data-layer spec, Four tables*

## Before you change behavior

Read `openspec/specs/` first. If code and spec disagree, work out which is wrong before editing either. `openspec/status.md` holds the ranked list of open gaps — **read its "Open gaps" section before planning work** so you do not re-plan something already done.

New spec-driven work starts in `openspec/changes/{name}/`: `proposal.md` → `specs/{domain}/spec.md` delta → `design.md` → `tasks.md` → `verify-report.md` → archived to `openspec/changes/archive/YYYY-MM-DD-{name}/`.

## Before you commit

`main` has received none of the arcade or data-layer work; it all lives on `new_designs`. Confirm which branch you are on and what the PR is actually carrying.

**Never edit or delete a folder under `openspec/changes/archive/`.** Archived artifacts reference `AGENTS.md`, `DESIGN.md`, `ORCHESTRATOR.md`, `README.md`, and `neondb_guide.txt` by path. Those root files are kept as pointers for exactly that reason — do not delete them, even though their content now lives in `openspec/`.
