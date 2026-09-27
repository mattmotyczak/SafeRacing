# Spec — Data Layer

**Domain:** `data-layer`
**Source of truth:** `server.js`, `db/apply.js`, `db/migrations/0001_bootstrap.sql`, the data-fetch half of `src/App.tsx`, as of commit `1e616d0` (branch `new_designs`).
**Verification model:** no test runner. Requirements name their check: `tsc`, grep audit, SQL read, or a documented manual/`curl` check.

## ADDED Requirements

### Requirement: Four tables, mirror-schema pairs, lowercase identifiers

The database SHALL hold one questions/answers table pair per mode, with a 1:N relation from answers to questions. All four tables SHALL be created by `db/migrations/`, so a fresh database is bootstrappable from the repo alone.

| Table | Columns |
|-------|---------|
| `easy_questions` | `ideasyquestion` (PK, `SERIAL`), `question VARCHAR(255) NOT NULL`, `photostring TEXT` |
| `easy_answers` | `ideasyanswer` (PK, `SERIAL`), `answer VARCHAR(255) NOT NULL`, `iscorrect BOOLEAN NOT NULL`, `relatedtoquestion INTEGER NOT NULL` → `easy_questions(ideasyquestion)` |
| `hard_questions` | `idhardquestion` (PK, `SERIAL`), `question VARCHAR(255) NOT NULL`, `photostring TEXT` |
| `hard_answers` | `idhardanswer` (PK, `SERIAL`), `answer VARCHAR(255) NOT NULL`, `iscorrect BOOLEAN NOT NULL`, `relatedtoquestion INTEGER NOT NULL` → `hard_questions(idhardquestion)` |

Identifiers MUST be written lowercase and unquoted. **Postgres folds unquoted identifiers to lowercase**, so a query written as `q.idHardQuestion` resolves to the same column as `q.idhardquestion` — but writing them lowercase everywhere is what keeps the SQL and the JS from disagreeing.

**Verified against the live database.** All sixteen columns across the four tables are lowercase, with the types above and `nextval` defaults on both primary keys. `neondb_guide.txt` shows the quoted CamelCase form (`q."idEasyQuestion"`, `a."idAnswer"`, `a."relatedToQuestion"`) and an `idAnswer` column that does not exist — that snippet was never executed against this database, so it is a historical artifact rather than schema documentation. An earlier draft of this spec carried a live hazard warning on the possibility that the easy columns were mixed-case; read-only `information_schema` introspection disproved it.

`photostring` holds a base64-encoded JPEG, rendered client-side as `data:image/jpeg;base64,<photostring>`.

#### Scenario: A fresh database bootstraps from the repo alone
- **Given** a database with no `easy_*` or `hard_*` tables
- **When** `npm run db:apply` runs
- **Then** all four tables are created, 5 questions and 20 answers are seeded per mode, and the run exits 0

#### Scenario: Applying against the existing instance changes nothing
- **Given** the live database, where all four tables already exist
- **When** `npm run db:apply` runs
- **Then** the `CREATE TABLE IF NOT EXISTS` statements are no-ops and the guarded seeds insert no rows

**Verify:** code read of `MODE_CONFIG` (`server.js:28-41`); `information_schema` introspection of all four tables against Neon. Both paths executed — see `openspec/changes/archive/2026-09-26-fresh-db-bootstrap/verify-report.md`.

### Requirement: Seeded option order is deterministic and matches the offline fallback

Every seeded row SHALL carry an explicit ordinal, and every seed `INSERT` SHALL end with `ORDER BY` on that ordinal. `SERIAL` assigns `nextval()` as rows reach the insert, and `INSERT ... SELECT` guarantees no ordering, so without the ordinal the primary keys — and therefore the option order `server.js` reconstructs via `ORDER BY <answer pk>` — are assigned in planner-dependent order.

The effect that matters: a freshly seeded database MUST present the same option order as the corresponding hardcoded bank in `src/App.tsx`, so the online and offline experiences of one question agree.

#### Scenario: A freshly seeded question resolves to the same option order as its offline twin
- **Given** a database bootstrapped from the repo alone
- **When** a seeded easy question is served
- **Then** its `options` array and `answer` index match `db_easy` in `src/App.tsx` for the same question

**Verify:** transactional throwaway-schema probe — see the archived `verify-report.md`.

### Requirement: One unified, mode-validated question endpoint

`GET /api/questions/:mode` SHALL serve both modes from a single route. `mode` MUST be validated against `{easy, hard}`; an unknown mode MUST return HTTP 400 with `{ error: "Invalid mode '<mode>'. Allowed modes: easy, hard" }`.

The mode MUST select the table pair via a lookup (`MODE_CONFIG`), never via string interpolation of user input into SQL. The only interpolated identifiers are the four values from that fixed map.

#### Scenario: Both modes return the same shape
- **Given** a running server and a reachable database
- **When** `GET /api/questions/easy` and `GET /api/questions/hard` are called
- **Then** both return a JSON array of `{ question, options, answer, photoString }`

#### Scenario: An unknown mode is rejected, not queried
- **Given** a running server
- **When** `GET /api/questions/medium` is called
- **Then** the response is 400 with the allowed-modes error, and no query reaches Postgres

**Verify:** code read (`server.js:74-113`); live check — `GET /api/questions/easy` and `/hard` both returned 200 with the same shape, and `/medium` returned 400 with the exact error body.

### Requirement: Answer index is derived from answer primary-key order

`groupQuestions(rows)` SHALL build each question's `options` array in the order rows arrive, and SHALL set `answer` to the index at which `iscorrect` was true. The query MUST therefore `ORDER BY` the answers primary key — `answer` is a positional index, never a stored column.

The grouping MUST assign `answer: -1` for a question with no correct answer, so a malformed row is visible rather than silently resolving to option 0.

#### Scenario: A question with no correct answer does not silently pick option 0
- **Given** a question whose answer rows all have `iscorrect = false`
- **When** the endpoint serializes it
- **Then** `answer` is `-1`

**Verify:** code read of `groupQuestions` (`server.js:46-72`).

### Requirement: Legacy easy route stays live as a transitional alias

`GET /api/questions/easy` MUST remain registered and MUST delegate to the same `sendQuestions('easy', res)` handler as the unified route. It MUST NOT be removed while any consumer might still call it.

**Verify:** code read (`server.js:106-108`).

### Requirement: Database failures return 500 and never leak internals

A query failure MUST be caught, logged server-side with the mode, and answered with HTTP 500 and `{ error: "Failed to fetch <mode> questions" }`. Pool credentials, SQL text, and driver messages MUST NOT reach the client.

**Verify:** code read of the `catch` block (`server.js:99-102`).

### Requirement: The API base URL is environment-driven

The frontend MUST read the API base from `import.meta.env.VITE_API_BASE_URL`, defaulting to `http://localhost:3001` when unset. No bare `http://` API base URL may be hardcoded in `src/`.

**Verify:** code read (`src/App.tsx:21`); grep for `localhost:3001` in `src/` — the single hit is that default.

### Requirement: Offline fallback is a specified behavior, not a leftover

If a mode's fetch rejects, or resolves to an empty or falsy array, the game MUST fall back to that mode's hardcoded 5-question bank (`db_easy` / `db_hard`) and log the reason. This is a deliberate product decision for a university demo that must run without a database, and it MUST be documented as such rather than treated as dead code.

**Verify:** code read (`src/App.tsx:53-91`).

### Requirement: The schema is versioned as ordered, idempotent SQL files

Schema changes SHALL be added as `db/migrations/NNNN_name.sql`, applied in filename order by `db/apply.js` (`npm run db:apply`).

Every statement MUST be safe to re-run:

- DDL uses `CREATE TABLE IF NOT EXISTS`.
- Seed inserts use a `WHERE NOT EXISTS` guard. `ON CONFLICT` is NOT available because no unique constraint exists on the question text.

There is deliberately **no migration ledger table** — the runner replays every file on every invocation, and idempotency is achieved in the SQL itself. This keeps the runner dependency-free (`pg` + `dotenv` only, both already required) at the cost of re-executing every statement on each run.

#### Scenario: Applying twice is a no-op
- **Given** a database with `0001_bootstrap.sql` already applied
- **When** `npm run db:apply` runs a second time
- **Then** no duplicate questions or answers are created and no error is raised

**Verify:** SQL read; double-apply executed — the migration was run twice in the same transaction against a throwaway schema and every row count was unchanged (see the archived `verify-report.md`).

### Requirement: TLS configuration has a single source of truth

Both `server.js` and `db/apply.js` SHALL strip any `sslmode` parameter from `DATABASE_URL` before creating the pool, and SHALL set `ssl: { rejectUnauthorized: false }` on the pool itself. A `sslmode` in the URL and a pool `ssl` option together are ambiguous — stripping the parameter removes the ambiguity.

**Verify:** code read (`server.js:16-25`, `db/apply.js:20-27`). This duplication is deliberate; the two files run in separate processes and cannot share a helper without adding a module.

### Requirement: A fresh database MUST be bootstrappable from the repo alone

**SATISFIED** by `fresh-db-bootstrap`. `db/migrations/0001_bootstrap.sql` now creates all four tables before seeding any of them, so the empty-database path no longer fails with `relation "easy_questions" does not exist`. The requirement is retained as the standalone statement of intent; the schema detail lives under *Four tables, mirror-schema pairs, lowercase identifiers*.

`npm run db:apply` is now valid against a new database and in CI, not only against the pre-existing Neon instance.

**Verify:** executed through a transactional throwaway-schema probe — the migration file was run verbatim against an empty namespace and all 22 assertions passed, three consecutive runs. `npm run db:apply` itself has not been exercised against a separately provisioned empty database.

## REMOVED Requirements

### Requirement: Hardcoded base URL
`(Reason: replaced by VITE_API_BASE_URL. Migration: complete.)`

### Requirement: Obsolete inline SQL schema comment in App.tsx
The comment block that documented a single `questions` table with inline options was wrong — the real schema is a 4-table questions/answers pair — and has been deleted. `db/migrations/` is now the only schema documentation.

### Requirement: Empty `src/db.ts` and the `metadata.json` AI Studio template
`(Reason: dead file and leftover template text. Migration: complete — both deleted, README rewritten.)`
