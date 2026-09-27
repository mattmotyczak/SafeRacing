# SafeRacing

SafeRacing is an arcade-style Formula 1 racing quiz game. Drive down the track, answer flag-and-racing questions to keep your car alive, and build combos for a high score. One wrong answer and you crash.

Built as a final university project by Team Foxtrot.

## Game Modes

- **Fácil (easy)** — beginner flag and racing questions.
- **Realista (hard)** — advanced racing rules, strategy, and records.

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

**Offline fallback.** Each mode keeps a 5-question bank hardcoded in `src/App.tsx`. If a fetch fails or returns an empty array, the game silently uses the local bank so it stays playable without the backend. This is deliberate.

## Database

Four tables — a questions/answers pair per mode, related one-to-many:

| Mode | Tables |
|------|--------|
| easy | `easy_questions` / `easy_answers` |
| hard | `hard_questions` / `hard_answers` |

The schema lives in `db/migrations/`. `npm run db:apply` replays every migration in filename order against Neon.

Migrations are idempotent by construction — `CREATE TABLE IF NOT EXISTS` for DDL, `WHERE NOT EXISTS` guards for seed inserts — so running `db:apply` repeatedly is safe. There is no migration ledger table; the runner simply re-executes everything and the SQL does the protecting. `0001_bootstrap.sql` creates all four tables before seeding any of them, so it also bootstraps a genuinely empty database from scratch.

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
├── openspec/
│   ├── config.yaml         # SDD configuration
│   ├── specs/              # Source of truth: game + data-layer
│   └── changes/            # Active and archived spec-driven changes
├── server.js               # Express API: GET /api/questions/:mode
├── DESIGN.md               # Design rationale for both arcs
├── ORCHESTRATOR.md         # SDD workflow, current state, open gaps
├── AGENTS.md               # Conventions for coding agents
├── .env.example            # Environment variable template
└── vite.config.ts          # Vite configuration
```

## Working on this project

Design and architecture decisions are documented, not just implied:

| File | What it holds |
|------|---------------|
| `AGENTS.md` | Conventions, commands, and hard rules for coding agents |
| `openspec/specs/` | Requirement-level source of truth, per domain |
| `ORCHESTRATOR.md` | Current state, open gaps, and how changes flow |
| `DESIGN.md` | The *why* behind each decision, with tradeoffs |

Work is spec-driven: proposals, specs, designs, tasks and verify reports live as files under `openspec/changes/`, so history is in git rather than in anyone's local memory.
