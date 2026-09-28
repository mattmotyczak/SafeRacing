# Spec delta — `driving-safety-question-bank`

**Change:** `driving-safety-question-bank`
**Domain:** `data-layer`
**Base spec:** `openspec/specs/data-layer/spec.md`
**Status:** spec written — `design.md` and `tasks.md` written; nothing implemented
**Closes:** open gaps 7, 9, 10, 11, and the smoke-test rows of gap 1

> **This delta changes live data.** Unlike every prior data-layer change, applying it deletes
> production rows. The approved scope is recorded verbatim in `design.md`; the change does not
> proceed to `verify` without a separate, explicit approval to run `0002` against Neon.

---

## MODIFIED Requirements

### Requirement: Four tables, mirror-schema pairs, lowercase identifiers

**Unchanged:** the four tables, their columns, the 1:N relation, and the lowercase-and-unquoted
identifier rule. That rule is the one hard rule this requirement owns (see the pointer table in
`openspec/conventions.md`); nothing here touches it.

**Scoped.** The requirement's scope is the **`public` schema**, and that is now stated in the
requirement rather than left implicit. The four game tables are the only objects this project owns
in `public`. The same database also hosts `neon_auth` — 9 tables belonging to Neon Auth, unrelated
to the game — and the boundary between the two is a separate requirement below.

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

- **Given** the live database, seeded by `0002_driving_safety_question_bank.sql`
- **When** a question is served by `GET /api/questions/:mode` and compared against the same question in `src/data/questions.easy.ts` / `questions.hard.ts`
- **Then** its `options` array and `answer` index are identical, because both sides derive from the same `ord`-pinned seed

**Verify:** SQL read of `0002` for the `ORDER BY v.ord` terminator on every seed insert, plus
contiguous-ordinal arithmetic; live query of `easy_questions` id order against the seed's `ord`
column; a served-vs-fallback comparison per question, run for at least one question per mode. The
served-vs-fallback comparison is a two-source diff, not a greppable assertion — it must be run
against the live database, not reasoned about.

---

## ADDED Requirements

### Requirement: The question bank is road-safety content in Spanish

The seeded bank and the offline fallback SHALL contain driving-safety and road-safety questions in
Spanish. **30 easy** questions and **approximately 80 hard** questions, replacing the 5 + 5
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

### Requirement: The `neon_auth` schema is out of scope and MUST NOT be touched

The `neon_auth` schema in the same Neon database — 9 tables: `account`, `invitation`, `jwks`,
`member`, `organization`, `project_config`, `session`, `user`, `verification` — belongs to Neon
Auth. This project SHALL NOT read it, write it, alter it, or drop it, from any migration, script, or
manual operation recorded in this repo.

**`DROP SCHEMA public CASCADE` MUST NOT be run against this database, ever.** It is not a reset
path. It destroys the four game tables and leaves Neon Auth without the database it was provisioned
into. No requirement, task, or cleanup step in this repo calls for it, and none may be added.

Every statement in `0002` — and in any future migration — SHALL target only the four `public`
tables. `db/apply.js` pins no `search_path` and sends each file through one `pool.query(sql)`, so
isolation depends on the identifiers in the SQL rather than on an enforced boundary.

> **The full requirement lives in the base spec** at *The game owns the `public` schema only*, with
> its scenarios and verification. It is restated here because this delta is the first change to
> write rows into a database that has a second schema, and the person applying `0002` should meet
> the boundary in the artifact they are about to act on.

#### Scenario: `0002` leaves `neon_auth` untouched

- **Given** the live database with 9 tables in `neon_auth`
- **When** `0002_driving_safety_question_bank.sql` runs
- **Then** no statement in the file targets `neon_auth` and its 9 tables and row counts are identical before and after

#### Scenario: No migration drops a schema

- **Given** every file under `db/migrations/`
- **When** they are grepped for `DROP SCHEMA` and `DROP DATABASE`
- **Then** there are zero matches

**Verify:** `grep -E "DROP SCHEMA|DROP DATABASE" db/migrations/*.sql` returns zero — greppable
without a database. The isolation claim is **not** greppable: it requires a read-only
`information_schema` / `pg_catalog` count of the `neon_auth` tables and their rows before and after
the apply, and it must be re-run whenever a migration is added. Stated plainly because the
difference is the whole point of writing the requirement.

---

## REMOVED Requirements

None. The F1-themed seed rows and the inline `db_easy` / `db_hard` arrays are **data**, not
requirements. They are removed by the blanket delete in `0002` and by relocating the fallback into
`src/data/`, not by a `REMOVED` entry. Every requirement in the base spec — including *Offline
fallback is a specified behavior, not a leftover* — remains in force; only the content behind it
changes.

---

## Out of scope

- The in-game footer credit at `src/App.tsx:472,474` — **open gap 8**, an authorship/copy decision
  the team has not made. Recorded as a non-goal in `proposal.md` and deliberately untouched here.
- `arcade-scene-backdrop` in its entirety, including the answer-feedback work that also depends on
  the resolved `answer` index. That change reads this one; this change does not read it.
- Rewriting live answer primary keys in place as a route to closing open gap 2. A re-seed converges
  identically and is one forward migration instead of PK surgery.
- A durable data-layer verification script — **open gap 4**, which needs a count-free invariant
  design before it can be written.
- `server.js`, `MODE_CONFIG`, `groupQuestions()`, and the endpoint contract. The contract is
  unchanged; the client reshuffles on the way in. `data-layer` requirements about the endpoint shape
  are untouched by this delta.
