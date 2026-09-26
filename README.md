# SafeRacing

SafeRacing is an arcade-style Formula 1 racing quiz game. Drive down the track, answer flag-and-racing questions to keep your car alive, and build combos for a high score. One wrong answer and you crash.

Built as a final university project by Team Foxtrot.

## Game Modes

- **Fácil (easy)** — beginner flag and racing questions.
- **Realista (hard)** — advanced racing rules, strategy, and records.

Both question banks are served from a live Neon PostgreSQL database, with a local fallback for offline development.

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

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite frontend dev server (port 3000) |
| `npm start` | Start the Express backend API (port 3001, or `PORT`) |
| `npm run db:apply` | Apply `db/migrations/*.sql` to the database in order |
| `npm run build` | Production build of the frontend |
| `npm run preview` | Preview the production build |
| `npm run lint` | Type-check with `tsc --noEmit` |

## Project Structure

```
├── db/
│   ├── migrations/   # Versioned SQL migrations (0001_bootstrap.sql)
│   └── apply.js      # Dependency-free migration runner
├── src/              # React frontend (game, components, styles)
├── server.js         # Express API: GET /api/questions/:mode
├── .env.example      # Environment variable template
└── vite.config.ts    # Vite configuration
```