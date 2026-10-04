# Spec — Data Layer

**Domain:** `data-layer`
**Source of truth:** `server.js`, `db/apply.js`, `db/migrations/0001_bootstrap.sql`, the data-fetch half of `src/App.tsx`, as of commit `e26fcf1` (branch `new_designs`).
**Verification model:** no test runner. Requirements name their check: `tsc`, grep audit, SQL read, or a documented manual/`curl` check.

## ADDED Requirements

### Requirement: Four tables, mirror-schema pairs, lowercase identifiers

The database SHALL hold one questions/answers table pair per mode, with a 1:N relation from answers to questions. All four tables SHALL be created by `db/migrations/`, so a fresh database is bootstrappable from the repo alone.

**"Four tables" is a claim about the game, not a claim about the database.** All four live in the **`public`** schema, and `public` contains nothing else this project owns.

| Schema | Tables | Owner |
|--------|--------|-------|
| `public` | `easy_questions`, `easy_answers`, `hard_questions`, `hard_answers` | this project — the entire game |
| `neon_auth` | `account`, `invitation`, `jwks`, `member`, `organization`, `project_config`, `session`, `user`, `verification` | **Neon Auth — not this project** |

The same Neon database hosts `neon_auth` beside `public`. It is Neon's own authentication service — users, sessions, organisations, invitations, and JWT signing keys — and it is entirely unrelated to the game. No table in it is referenced by `server.js`, `db/apply.js`, or any migration. See the requirement *The game owns the `public` schema only* for what that forbids.

| Table | Schema | Columns |
|-------|--------|---------|
| `easy_questions` | `public` | `ideasyquestion` (PK, `SERIAL`), `question VARCHAR(255) NOT NULL`, `photostring TEXT` |
| `easy_answers` | `public` | `ideasyanswer` (PK, `SERIAL`), `answer VARCHAR(255) NOT NULL`, `iscorrect BOOLEAN NOT NULL`, `relatedtoquestion INTEGER NOT NULL` → `public.easy_questions(ideasyquestion)` |
| `hard_questions` | `public` | `idhardquestion` (PK, `SERIAL`), `question VARCHAR(255) NOT NULL`, `photostring TEXT` |
| `hard_answers` | `public` | `idhardanswer` (PK, `SERIAL`), `answer VARCHAR(255) NOT NULL`, `iscorrect BOOLEAN NOT NULL`, `relatedtoquestion INTEGER NOT NULL` → `public.hard_questions(idhardquestion)` |

Identifiers MUST be written lowercase and unquoted. **Postgres folds unquoted identifiers to lowercase**, so a query written as `q.idHardQuestion` resolves to the same column as `q.idhardquestion` — but writing them lowercase everywhere is what keeps the SQL and the JS from disagreeing.

`VARCHAR(255)` on `question` and `answer` is a live constraint, not a formality: any new or rewritten question text MUST fit 255 characters or the insert fails at runtime rather than at review.

**Verified against the live database.** All sixteen columns across the four tables are lowercase, with the types above and `nextval` defaults on both primary keys. The root `neondb_guide.txt` is now a **tombstone** — on 2026-09-28 its 124 lines of sample code were replaced with a short notice, because the snippet it carried showed the quoted CamelCase form (`q."idEasyQuestion"`, `a."idAnswer"`, `a."relatedToQuestion"`) and an `idAnswer` column that does not exist. That snippet was never executed against this database. The file is kept at its original path only because archived change folders reference it and archived folders are never edited. **Schema documentation is `db/migrations/`.** An earlier draft of this spec carried a live hazard warning on the possibility that the easy columns were mixed-case; read-only `information_schema` introspection disproved it.

`photostring` holds a base64-encoded JPEG, rendered client-side as `data:image/jpeg;base64,<photostring>`.

#### Scenario: A fresh database bootstraps from the repo alone
- **Given** a database with no `easy_*` or `hard_*` tables
- **When** `npm run db:apply` runs
- **Then** all four tables are created, 30 easy and 80 hard questions with 120 easy and 320 hard answers are seeded, and the run exits 0

#### Scenario: Applying against the existing instance changes nothing
- **Given** the live database, where all four tables already exist
- **When** `npm run db:apply` runs
- **Then** the `CREATE TABLE IF NOT EXISTS` statements are no-ops and the `0001` guarded seeds insert no rows, while `0002` replays as a blanket delete-and-reinsert that lands the same rows it landed the first time — so the re-apply converges on an identical row set rather than changing nothing outright

#### Scenario: The four game tables are the only game objects in `public`
- **Given** the live database
- **When** the relations in the `public` schema are listed
- **Then** exactly four are returned — `easy_questions`, `easy_answers`, `hard_questions`, `hard_answers` — and the `neon_auth` schema is untouched by the apply

**Verify:** code read of `MODE_CONFIG` (`server.js:28-41`); `information_schema` introspection of all four tables against Neon, plus a `public`-scoped relation listing. Both paths executed — see `openspec/changes/archive/2026-09-26-fresh-db-bootstrap/verify-report.md`.

### Requirement: The game owns the `public` schema only

The `neon_auth` schema in the same database is **not owned by this project and MUST NOT be read, written, altered, or dropped** by any code, migration, script, or manual operation recorded in this repo. It holds nine tables — `account`, `invitation`, `jwks`, `member`, `organization`, `project_config`, `session`, `user`, `verification` — belonging to Neon Auth, a service this game has no integration with.

**`DROP SCHEMA public CASCADE` MUST NOT ever be run against this database.** It is not a reset; it destroys the game tables and simultaneously leaves Neon Auth without the database it was provisioned into. There is no requirement, task, or cleanup step in this repo that calls for it, and none may be added.

Every statement in `db/migrations/` — `0001_bootstrap.sql` and `0002_driving_safety_bank.sql` alike — MUST act only on the four `public` tables. Because `db/apply.js` pins no `search_path` and sends each file through a single `pool.query(sql)`, isolation currently depends on the contents of the SQL rather than on an enforced schema boundary — a migration that targets `neon_auth` by mistake would succeed. Reviewing each migration's identifiers is therefore the control, and it is why this requirement exists as a prohibition rather than as a technical description.

If the game ever needs objects outside `public` — a view, a second schema — they MUST be created with an explicit schema qualifier and added to the table above. Silently relying on `search_path` resolution is what makes this boundary fragile.

#### Scenario: A data-layer change leaves `neon_auth` alone
- **Given** the live database, with nine tables in `neon_auth`
- **When** a migration under `db/migrations/` is applied
- **Then** no statement targets `neon_auth`, the nine tables and their row counts are unchanged, and no schema is dropped

#### Scenario: `0002` leaves `neon_auth` untouched

- **Given** the live database with 9 tables in `neon_auth`
- **When** `0002_driving_safety_bank.sql` runs
- **Then** no statement in the file targets `neon_auth` and its 9 tables and row counts are identical before and after

#### Scenario: No migration drops a schema
- **Given** every file under `db/migrations/`
- **When** they are grepped for `DROP SCHEMA` and `DROP DATABASE`
- **Then** there are zero matches

**Verify:** grep audit — `DROP SCHEMA|DROP DATABASE` over `db/migrations/` returns zero matches; read-only `information_schema` / `pg_catalog` introspection of `neon_auth` before and after an apply, asserting the nine tables and their counts are unchanged. The `DROP` audit is greppable without a database; the isolation claim is NOT — it is an inspection of each migration's identifiers and must be re-checked whenever a migration is added.

> **State of that verification, 2026-09-28.** The `DROP` grep **passed** — zero matches across
> `db/migrations/`, and `0002_driving_safety_bank.sql` names no `neon_auth` object in any statement,
> so it *cannot* have written to those nine tables. The **strong** half — row counts identical
> before and after — is **not established**: no pre-apply snapshot of `neon_auth` was taken, so there
> is no baseline to compare against. Take those nine row counts before the next data-layer change and
> treat this boundary as *probably* intact rather than *proven* intact until then.

### Requirement: Seeded option order is deterministic and matches the offline fallback

Every seeded row SHALL continue to carry an explicit ordinal, and every seed `INSERT` SHALL end
with `ORDER BY v.ord`. The `fresh-db-bootstrap` mechanism is unchanged and `0001_bootstrap.sql` is
**not** edited by this change.

**What changes is the scope of the claim.** The requirement's *Then its `options` array and
`answer` index match `db_easy`* scenario is verified today **only against a freshly seeded
namespace** — the throwaway-schema probe creates a schema and runs the migration into it, so by
construction it exercises the empty-database path. It has never held against the live Neon
instance, because that instance was seeded by the pre-fix version of `0001_bootstrap.sql` and the
corrected file can never re-apply to it: its seed inserts are guarded by
`WHERE NOT EXISTS (... e.question = v.question)`, a guard on question **text**, so a re-run inserts
nothing and the planner-dependent primary keys stay planner-dependent.

**Verified live, 2026-09-28.** For the same question the correct option is at **index 1 online and
index 0 in the `db_easy` fallback**; in the hard bank, **index 3 online against index 1 in
`db_hard`**. The correct answer moves between sources.

A fresh database and the live database MUST converge on the same content, by the same route, after
this change. The live id order MUST match the seed's `ord` order, and a served question's option
order MUST match its offline twin in `src/data/`.

#### Scenario: The offline fallback mirrors the served question

- **Given** the live database, seeded by `0002_driving_safety_bank.sql`
- **When** a question is served by `GET /api/questions/:mode` and compared against the same question in `src/data/questions.easy.ts` / `questions.hard.ts`
- **Then** its `options` array and `answer` index are identical, because both sides derive from the same `ord`-pinned seed

**Verify:** SQL read of `0002` for the `ORDER BY v.ord` terminator on every seed insert, plus
contiguous-ordinal arithmetic; live query of `easy_questions` id order against the seed's `ord`
column; a served-vs-fallback comparison per question, run for at least one question per mode. The
served-vs-fallback comparison is a two-source diff, not a greppable assertion — it must be run
against the live database, not reasoned about.

### Requirement: The question bank is road-safety content in Spanish

The seeded bank and the offline fallback SHALL contain driving-safety and road-safety questions in
Spanish. **30 easy** questions and **80 hard** questions, replacing the 5 + 5
placeholders. No question, option, or distractor SHALL reference competitive motor racing.

Every question MUST carry exactly four options and exactly one `iscorrect = TRUE` answer row. This
is the invariant the seeded data already satisfies and the one any future migration MUST preserve:
`groupQuestions()` derives `answer` positionally, so a question with two correct answers or a
question with none produces a wrong or `-1` index rather than an error.

Both question and answer text MUST fit the `VARCHAR(255)` column. An over-length string fails at
insert time against live Neon, not at review time.

**Source of record for legal facts.** Speed-limit figures are cited to **Ley 24.449 art. 51**.
Rationale in `design.md`.

**Content MUST land in both places in the same pass** — `db/migrations/0002` and
`src/data/questions.easy.ts` / `src/data/questions.hard.ts`. `0001_bootstrap.sql` states its seed
is transcribed from the local arrays, and the online/offline divergence that
`fresh-db-bootstrap` fixed for *order* would otherwise be reintroduced for *content*.

#### Scenario: The bank describes driving, not racing

- **Given** the seeded bank and the offline fallback
- **When** every question and option is read
- **Then** all of it concerns road safety and driving knowledge, in Spanish, and none of it concerns competitive motor racing

#### Scenario: Every question is answerable

- **Given** any question in either mode, from either source
- **When** its answer rows are counted
- **Then** there are exactly four answer rows and exactly one has `iscorrect = TRUE`

**Verify:** grep audit — the framing pattern in `rules.verify.audits` over `src/data/` and
`db/migrations/0002` returns zero hits. The 4-options/1-correct invariant is **not** greppable and
**not** greppable-by-eye across 440 answer rows; it is a SQL `GROUP BY` assertion —
`HAVING count(*) <> 4 OR count(*) FILTER (WHERE iscorrect) <> 1` MUST return zero rows. Content
accuracy is a human review of the 110 questions against the cited source and is **not** automatable
at all; it is flagged as such rather than asserted as passing.

### Requirement: A new migration replaces the bank; `0001` is immutable

Content changes SHALL land in a **new** `db/migrations/NNNN_name.sql`, never by editing an existing
migration. `0001_bootstrap.sql` SHALL NOT be modified by this change.

The reason is specific and mechanical, not stylistic. `0001_bootstrap.sql` guards its seed inserts
with `WHERE NOT EXISTS (SELECT 1 FROM easy_questions e WHERE e.question = v.question)`. Editing
`0001` to carry the new bank therefore **inserts the new questions alongside the old ones** on the
live database, because the new question texts do not exist yet and the guard does not match — and
then stabilises at 10 easy questions, 5 of them still F1-themed. The edit would appear to succeed
and would leave the live bank in a state no one authored. Only an additive `0002` can make a fresh
database and the live database converge on the same content.

`0002` SHALL wrap its body in an explicit `BEGIN` / `COMMIT`. Reason: `db/apply.js` sends each
whole file through a single `pool.query(sql)`, so relying on the driver's implicit simple-query
transaction would make atomicity a property of driver behaviour rather than of the migration.

`0002` SHALL delete answer rows before question rows for each mode. The live foreign keys
`easy_answers_relatedtoquestion_fkey` and `hard_answers_relatedtoquestion_fkey` are `NO ACTION`,
not `CASCADE`, so deleting questions first is rejected by Postgres.

The delete SHALL be blanket — every row in all four tables — rather than a targeted delete of known
rows. It is the only formulation that guarantees the live bank and a fresh bank are byte-identical,
and it retires the two smoke-test rows in the same pass.

#### Scenario: The migration cannot half-apply

- **Given** an error part-way through `0002`
- **When** the transaction aborts
- **Then** all four tables are exactly as they were before the file ran, because the deletes and the inserts are inside one `BEGIN` / `COMMIT`

#### Scenario: Applying `0002` twice is idempotent

- **Given** the live database, where `0002` has already run
- **When** `npm run db:apply` runs again
- **Then** the deletes remove the previously inserted rows and the inserts re-create them, and the resulting row set is identical — no accumulation, no duplicates

**Verify:** SQL read of `0002` for the `BEGIN`/`COMMIT` envelope, the delete ordering, and the
`ORDER BY v.ord` terminator on every seed insert. Atomicity is **not** provable by reading — it
requires deliberately introducing a fault mid-file against a throwaway schema and asserting the
tables are unchanged after the rollback. Idempotency requires a live double-apply plus a before/after
row-count and content-hash comparison. Neither is a `tsc` or grep check, and there is no test runner
in this repo to hold them.

> **Outcome, 2026-09-28: the structural half passed and both dynamic halves were NOT RUN.** The envelope,
> delete ordering and `ORDER BY v.ord` terminators are all present and correct. The fault-injection check
> and the live double-apply did not run — there is no local Postgres, `psql`, or Docker on this machine,
> and the double-apply was never executed. **So `0002` has been run exactly once, against production,
> and its idempotency and atomicity claims remain untested rather than confirmed.** The structural
> verification that did run covers the 550-row round trip, contiguous `ord`, one `TRUE` per question,
> and the SQL-to-TS parity; see `verify-report.md` §4. `tasks.md` 7 and 20 are left unticked for this
> reason. A second apply is now safe to run if you want the check — the destructive scope of the first
> run is behind it.

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

If a mode's fetch rejects, or resolves to an empty or falsy array, the game MUST fall back to that mode's hardcoded bank (`db_easy` / `db_hard`, 30 easy and 80 hard questions) in `src/data/questions.easy.ts` / `src/data/questions.hard.ts` and log the reason. This is a deliberate product decision — the game is used in a high-school setting where an unreachable database must not end the session — and it MUST be documented as such rather than treated as dead code.

**Verify:** code read of `getNewQuestion` (`src/App.tsx:89`) and both fetch effects (`src/App.tsx:48`, `:68`).

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
