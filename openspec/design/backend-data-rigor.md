# Design — Backend & Data-Layer Rigor

> **Record.** Rationale for the shipped Arc B. Migrated from `DESIGN.md` Part 2 on 2026-09-28.
> **Status:** shipped in commit `de74dbe`; **data layer verified on 2026-09-26** — see [Verification debt](#verification-debt). Full record: `openspec/changes/archive/2026-09-26-backend-data-rigor/`.
> **Requirements:** `openspec/specs/data-layer/spec.md`.

> **Correction.** The header of the original `DESIGN.md` Part 2 read "**Never verified**" while the *Verification debt* section lower in the same file read "Paid on 2026-09-26." That contradiction is a direct artifact of keeping design rationale in a root file outside the spec store, with no one reconciling it. The verification is paid; the header was stale.

## Technical Approach

Replace the ad-hoc data access — one hardcoded easy-only endpoint, a hardcoded `db_hard` array standing in for the hard mode, and an unversioned database — with a versioned schema, a single mode-validated endpoint serving both modes from Neon, and an env-driven API base URL. A local fallback bank per mode is kept on purpose so the game still runs with the backend down.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| Hard-mode tables | (A) Mirror `hard_questions`/`hard_answers`, (B) generic `questions`/`answers` + `mode` column | (A) zero disruption to live easy data, reuses the existing JOIN shape; (B) cleaner model but requires migrating live easy rows | **(A) Mirror schema** — easy is live with data; a generic table would mean a risky live migration for a project that must stay working |
| Migration format | (A) Plain `db/migrations/NNNN_*.sql` + a hand-rolled runner, (B) `node-pg-migrate`, (C) one `schema.sql` | (A) zero new deps, git-versioned; (B) mature but a new dependency and API to learn; (C) simplest but no incremental history | **(A) Plain sequential SQL files** — matches the repo's zero-dependency posture |
| Migration ledger | (A) A `schema_migrations` table, (B) no ledger, idempotency in the SQL itself | (A) records what ran, but adds a table and write-path state; (B) zero state, every statement must be re-runnable | **(B) No ledger** — every statement is `CREATE TABLE IF NOT EXISTS` or guarded by `WHERE NOT EXISTS`. `ON CONFLICT` is unavailable because no unique constraint exists on question text |
| API shape | (A) `GET /api/questions/:mode`, (B) keep `/easy` and add `/hard`, (C) `?mode=` query | (A) one route, mode validated against a fixed set; (B) mirrors the old code most closely; (C) query strings for filters | **(A) `GET /api/questions/:mode`** — the mode toggle stays in the URL path, and the handler is shared with the legacy alias |
| Response contract | One shape for both modes: `{ question, options[], answer, photoString }` | Guarantees the frontend treats easy and hard identically | **Unified contract** — `App.tsx` already consumed exactly this shape from easy |
| Answer index | (A) Store an ordinal column, (B) derive from answer primary-key order | (A) explicit and stable; (B) zero schema change, deterministic via `ORDER BY` | **(B) Derived** — see [Open risk](#open-risk-answer-index-is-positional) |
| API base URL | (A) `VITE_API_BASE_URL` with a localhost default, (B) relative Vite proxy | (A) explicit, works for a deployed client/server split; (B) cleaner in dev but needs proxy config | **(A) `VITE_API_BASE_URL`**, defaulting to `http://localhost:3001` |
| Local fallback | (A) Keep a hardcoded bank per mode, (B) drop it and require the backend | (A) the game is playable offline; (B) one source of truth | **(A) Keep it** — a classroom demo that dies when the database is unreachable is not a demo. This **contradicts** the original plan to drop `db_hard` entirely; the reversal was deliberate |
| `photostring` | (A) Keep base64 inline, (B) move to hosted media URLs | (A) zero migration of existing rows; (B) smaller payloads but needs storage and URL rewriting | **(A) Keep base64** — pragmatic at this scope; render client-side as `data:image/jpeg;base64,…` |

## Schema

Four tables, one questions/answers pair per mode, related 1:N. All identifiers lowercase and unquoted — **Postgres folds unquoted identifiers to lowercase**, so `q.idHardQuestion` and `q.idhardquestion` resolve to the same column, but writing them lowercase everywhere is what keeps the SQL, the JS and the docs from disagreeing.

```sql
-- created by db/migrations/0001_bootstrap.sql
CREATE TABLE IF NOT EXISTS hard_questions (
  idhardquestion SERIAL PRIMARY KEY,
  question      VARCHAR(255) NOT NULL,
  photostring   TEXT
);

CREATE TABLE IF NOT EXISTS hard_answers (
  idhardanswer    SERIAL PRIMARY KEY,
  answer          VARCHAR(255) NOT NULL,
  iscorrect       BOOLEAN NOT NULL,
  relatedtoquestion INTEGER NOT NULL REFERENCES hard_questions(idhardquestion)
);
```

`easy_questions` / `easy_answers` have the same shape (`ideasyquestion` / `ideasyanswer` / `relatedtoquestion`) and pre-date the repo.

> **Resolved hazard.** This section used to carry a warning that `neondb_guide.txt` might mean the live easy columns were genuinely mixed-case. Read-only `information_schema` introspection on 2026-09-26 disproved it — all sixteen live columns are lowercase. `neondb_guide.txt` has been reduced to a tombstone; `db/migrations/` is the only schema documentation.

## Endpoint Contract

```
GET /api/questions/:mode        mode ∈ { easy, hard }
  200 → [{ question, options[], answer, photoString }]
  400 → { error: "Invalid mode '<mode>'. Allowed modes: easy, hard" }
  500 → { error: "Failed to fetch <mode> questions" }

GET /api/questions/easy         transitional alias → same handler
```

Design points:

- **Mode selects tables through a fixed map, never string interpolation of user input.** `MODE_CONFIG` (`server.js:28-41`) holds the only four identifiers that reach the SQL text. The mode itself is validated before any query runs, so an unknown mode never reaches Postgres.
- **`answer` is a positional index derived at query time.** `groupQuestions()` (`server.js:46-72`) appends each row's answer to `options` and records the index where `iscorrect` was true. The query pins row order with `ORDER BY` on the answers primary key, which is what makes the index deterministic. A question with no correct answer serializes as `answer: -1` rather than silently resolving to option 0.
- **500s leak nothing.** Pool credentials, SQL text and driver messages stay server-side; the client gets a mode-scoped message.
- **The legacy `/api/questions/easy` route stays registered** and delegates to the same `sendQuestions('easy', res)`. It is not removed while a consumer might still call it.

## Migration Strategy

`db/apply.js` reads `db/migrations/*.sql` in filename order and executes each sequentially against Neon. It reuses `pg` and `dotenv` — both already required by the server — so it adds **zero dependencies**.

Idempotency lives entirely in the SQL, not in runner state:

- DDL uses `CREATE TABLE IF NOT EXISTS`.
- Every seed insert is guarded by a `WHERE NOT EXISTS` subquery. `ON CONFLICT` cannot be used: there is no unique constraint on the question text.
- `0001_bootstrap.sql` seeds 5 easy + 5 hard questions with 20 answers each, transcribed verbatim from the `db_easy` / `db_hard` arrays in `App.tsx`.

Because there is no ledger, the runner replays every file on every invocation. That is the accepted cost of the zero-dependency posture.

TLS is configured in one place per process: `sslmode` is stripped from `DATABASE_URL`, then the pool sets `ssl: { rejectUnauthorized: false }`. A `sslmode` in the URL and a pool `ssl` option together are ambiguous; stripping removes the ambiguity. `server.js` and `db/apply.js` duplicate this five-line block deliberately — they run in separate processes and sharing it would mean adding a module.

## Frontend Wiring

```ts
const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
```

One `useEffect` per mode fetches `${apiBase}/api/questions/${mode}`. On a network error **or an empty array**, that mode falls back to its hardcoded bank and logs why. `getNewQuestion` prefers the fetched bank when non-empty.

The obsolete SQL comment block that documented a single `questions` table with inline options was deleted — it was wrong, and `db/migrations/` is now the only schema documentation. The empty `src/db.ts` and the `metadata.json` AI Studio template were deleted in the same commit.

## Verification debt

**Paid on 2026-09-26.** A live database turned out to be reachable, so the skipped checks were executed. Results:

- [x] Both endpoints return the unified contract from a live database — `GET /api/questions/easy` and `/hard` both 200 with the same shape; `/medium` 400 with the exact error body.
- [~] Hard mode draws from the DB, not `db_hard` — confirmed **indirectly**: the returned option order follows the live scrambled primary keys (`answer` indices 1–3, e.g. `80 km/h` at index 3), which `db_hard` could not produce since it authors them in order. Not confirmed by network tab or by deliberately breaking `db_hard`.
- [x] Migrations are idempotent under double-apply — the file was run twice in one transaction against a throwaway schema; every row count unchanged.
- [x] Migrations apply to a **fresh** database — the file was executed verbatim against an empty namespace, 22/22 assertions, three consecutive runs. This also uncovered a second defect, planner-dependent seed ordering, now fixed. See `openspec/changes/archive/2026-09-26-fresh-db-bootstrap/`.
- [x] `tsc --noEmit` clean, no new `any`.

The technique that made the fresh-database check possible: `BEGIN` → `CREATE SCHEMA <probe>` → `SET search_path` → run the migration file → assert → `ROLLBACK`. Unqualified table names resolve to the throwaway schema, so the real empty-database path executes and nothing persists. Uncommitted work cannot survive a session, so residue is impossible — confirmed afterwards against the live instance.

The honest state of this arc is **shipped and data-layer verified**, with the indirect hard-mode check above as the one remaining caveat.

## Open risk: answer index is positional

`answer` is not a stored column. It is recomputed on every request from row arrival order, which the query pins with `ORDER BY` on the answers primary key. Deterministic today, but an implicit contract: renumbering answer rows silently changes every question's correct-option index, and no schema-level guard would catch it. A stored ordinal column, or an `ORDER BY` on a stable semantic column, would make the guarantee explicit.

Verification sharpened this from theory to practice. The live `easy_answers` primary keys are interleaved across questions, so the live easy option order differs from `db_easy` for every question — each response is internally consistent, so the game is never wrong, but the online and offline experience of one question differ. The `ord` column now in the seed data makes *fresh* databases match `db_easy`; it is a seed-time constant, not a persisted column, so existing rows are unaffected.

Tracked as open gap 5 in `openspec/status.md`.

## Rollback

All changes are additive. `git revert de74dbe` restores the code. The migration itself inserted seed rows, which a revert does not un-insert — undoing the data layer entirely means dropping `hard_questions` / `hard_answers` and deleting the seeded `easy_*` rows by hand. The easy remediation seed is non-destructive by construction: every insert is guarded by `WHERE NOT EXISTS` on the question text, so it cannot duplicate or overwrite live easy data.

## Threat Matrix

Minimal, and unchanged by this arc:

- **SQL injection** — the only interpolated SQL identifiers come from the fixed `MODE_CONFIG` map; the `:mode` parameter is validated against a two-value allowlist and never reaches the query text.
- **Credential exposure** — `DATABASE_URL` is read from the environment only, never logged, and connection strings are stripped of `sslmode` rather than echoed. 500 responses carry no driver detail.
- **Data exposure** — `GET /api/questions/:mode` is unauthenticated and serves the full question bank including base64 images. Acceptable for a public quiz; it would not be for a real assessment, where answers would need to stay server-side.
