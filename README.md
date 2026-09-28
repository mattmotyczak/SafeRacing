# SafeRacing

SafeRacing is a **driving-safety quiz game for high-school students**, in Spanish. Answer correctly and the car keeps moving; build a combo for a high score; answer wrong and you crash.

> **On the name.** "SafeRacing" is a product name, not a description of the content. The game teaches **driving and road safety** — the name is not a promise of Formula 1 content.
>
> **Current gaps.** The shipped build predates that decision in two places:
> - The seeded question bank is still Formula 1-themed (`¿Cuántos pilotos hay en un auto de F1?`, DRS/ERS/KERS, GP points, pit-lane limits) — open gap 7.
> - The in-game footer still reads `Desarrollado por el Equipo Foxtrot` / `Proyecto Final` — open gap 8.
>
> Both are tracked in [`openspec/status.md`](./openspec/status.md). The requirement itself is in [`openspec/specs/game/spec.md`](./openspec/specs/game/spec.md).

## Game Modes

- **Fácil (easy)** — beginner road-safety and traffic-rule questions.
- **Realista (hard)** — advanced rules, distances, and technical concepts.

Both question banks are served from a live Neon PostgreSQL database, with a local fallback for offline development.

## How it plays

Answer correctly and the car keeps moving; build a combo for score, and every 5 consecutive correct answers earns an extra life (max 5). Answer wrong and you crash — lose a life, and at zero the run ends. A question is only drawn once the car has stopped at the light, so the input is locked while you're moving.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4, motion, lucide-react |
| Backend | Node.js, Express 4, pg |
| Database | Neon (PostgreSQL), plain SQL migrations |

## Prerequisites

- Node.js 18+
- A Neon PostgreSQL connection string (`DATABASE_URL`)

## Setup & Run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root (see `.env.example`):

   ```bash
   DATABASE_URL=postgres://...
   VITE_API_BASE_URL=http://localhost:3001
   ```

3. Apply the database migrations:

   ```bash
   npm run db:apply
   ```

4. Start the backend API:

   ```bash
   npm start
   # or: node server.js
   ```

5. Start the frontend dev server:

   ```bash
   npm run dev
   ```

Open http://localhost:3000 to play. The API serves questions at `GET /api/questions/:mode` where `:mode` is `easy` or `hard`.

## API

One endpoint serves both modes and returns the same shape either way:

```http
GET /api/questions/:mode      # :mode is easy | hard
```

```json
[
  {
    "question": "¿Qué significa la bandera roja?",
    "options": ["Peligro, detener carrera", "Última vuelta", "Entrada a pits", "Carrera terminada"],
    "answer": 0,
    "photoString": null
  }
]
```

`answer` is the **index** of the correct option. `photoString`, when present, is a base64 JPEG rendered as a `data:image/jpeg;base64,…` URL.

| Status | Body | When |
|--------|------|------|
| 200 | array of questions | success |
| 400 | `{ "error": "Invalid mode '<mode>'. Allowed modes: easy, hard" }` | unknown mode |
| 500 | `{ "error": "Failed to fetch <mode> questions" }` | database unreachable |

`GET /api/questions/easy` also remains registered as a transitional alias for the same handler.

**Offline fallback.** Each mode keeps a 5-question bank hardcoded in `src/App.tsx`. If a fetch fails or returns an empty array, the game silently uses the local bank so it stays playable without the backend. This is deliberate — the game is used in a high-school setting where an unreachable database must not end the session.

## Database

Four tables — a questions/answers pair per mode, related one-to-many:

| Mode | Tables |
|------|--------|
| easy | `easy_questions` / `easy_answers` |
| hard | `hard_questions` / `hard_answers` |

The schema lives in `db/migrations/`. `npm run db:apply` replays every migration in filename order against Neon.

Migrations are idempotent by construction — `CREATE TABLE IF NOT EXISTS` for DDL, `WHERE NOT EXISTS` guards for seed inserts — so running `db:apply` repeatedly is safe. There is no migration ledger table; the runner simply re-executes everything and the SQL does the protecting. `0001_bootstrap.sql` creates all four tables before seeding any of them, so it also bootstraps a genuinely empty database from scratch.

> `neondb_guide.txt` at the repo root is a **tombstone**, not schema documentation. It once described a single `questions` table with quoted CamelCase identifiers and an `idAnswer` column that does not exist. Read `db/migrations/`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite frontend dev server (port 3000) |
| `npm start` | Start the Express backend API (port 3001, or `PORT`) |
| `npm run db:apply` | Apply `db/migrations/*.sql` to the database in order |
| `npm run build` | Production build of the frontend |
| `npm run preview` | Preview the production build |
| `npm run lint` | Type-check with `tsc --noEmit` |

There is no test suite. `npm run lint` (`tsc --noEmit`) plus the grep audits in `openspec/config.yaml` are the verification story.

## Project Structure

```
├── db/
│   ├── migrations/          # Versioned SQL migrations (0001_bootstrap.sql)
│   └── apply.js             # Dependency-free migration runner
├── src/
│   ├── components/
│   │   ├── ArcadeBackground.tsx   # Seamless CSS pixel-scene background
│   │   └── CarSprite.tsx          # Inline-SVG pixel car, lives-tier colored
│   ├── App.tsx             # Whole game: state machine, scoring, question flow
│   ├── index.css           # @theme design tokens, pixel-panel classes, keyframes
│   └── main.tsx            # React entry point
├── openspec/               # The spec store. See below.
├── server.js               # Express API: GET /api/questions/:mode
├── neondb_guide.txt        # Tombstone — a past mistake, kept because archives reference it
├── AGENTS.md               # Pointer + hard rules, for coding agents
├── ORCHESTRATOR.md         # Pointer to openspec/status.md
├── DESIGN.md               # Pointer to openspec/design/
├── .env.example            # Environment variable template
└── vite.config.ts          # Vite configuration
```

## Working on this project

Work is spec-driven. **Everything of substance lives in `openspec/`** — proposals, specs, designs, tasks, and verify reports are files in the repo, so the history is in git rather than in anyone's local memory.

| You want | Read |
|----------|------|
| Install and run it | this file |
| The requirements — source of truth | [`openspec/specs/game/spec.md`](./openspec/specs/game/spec.md), [`openspec/specs/data-layer/spec.md`](./openspec/specs/data-layer/spec.md) |
| Conventions, gotchas, read-order | [`openspec/conventions.md`](./openspec/conventions.md) |
| Current state, **open gaps**, change flow | [`openspec/status.md`](./openspec/status.md) |
| The *why* behind each decision | [`openspec/design/`](./openspec/design/) |
| SDD config, per-phase rules, verify audits | [`openspec/config.yaml`](./openspec/config.yaml) |
| Conventions for coding agents | [`AGENTS.md`](./AGENTS.md) |

The root `AGENTS.md`, `ORCHESTRATOR.md`, `DESIGN.md`, and `neondb_guide.txt` are pointers. They are kept as files — not deleted — because seven archived change folders reference them by path, and archived folders are never edited.
