# Design — Fresh-database bootstrap and deterministic seed order

## Creating the easy tables

The obvious alternative was to add a new `0002_` migration. Rejected: the file that seeds `easy_*` is the file that should have created them, and on a fresh database `0002` would run against a schema `0001` never built. Splitting it would mean the bootstrap only works if you apply migrations out of order, which is worse than one honest file.

The new `CREATE TABLE IF NOT EXISTS` statements are a no-op wherever the table already exists, so this is strictly additive to the live instance. `easy_questions` / `easy_answers` mirror `hard_questions` / `hard_answers`, which the original header already described as "the same shape as the live easy tables".

## The DDL was read, not guessed

The baseline spec carried a hazard note: `neondb_guide.txt` shows quoted CamelCase (`q."idEasyQuestion"`, `a."idAnswer"`) and an `idAnswer` column that does not exist, so the live `easy_*` columns might be genuinely mixed-case, in which case any lowercase DDL would create a *second*, incompatible table.

A read-only `information_schema` query settled it. Every live column is lowercase — `ideasyquestion`, `ideasyanswer`, `question`, `photostring`, `answer`, `iscorrect`, `relatedtoquestion` — with `integer` + `nextval` for the PKs, `character varying`, `boolean`, and `text` for the rest. The guide's snippet was never executed against this database. Writing lowercase DDL is therefore correct, and the hazard note is now a documented dead end rather than an open risk.

Worth stating plainly: had the columns been mixed-case, `CREATE TABLE IF NOT EXISTS` would have silently done nothing and the fresh-bootstrap bug would have survived this change while appearing to be fixed.

## Pinning seed order

Three options were considered.

**Insert answers one statement at a time** — 20 statements per mode, fully deterministic. Rejected: it quadruples the file, and the repetition is exactly the kind of thing that drifts.

 **`generate_series`** — compact, but it hides which row is which answer, making the seed unreadable and un-auditable against `db_easy`. Rejected.

**Explicit ordinal column plus `ORDER BY v.ord`** — one extra integer per VALUES row and a trailing `ORDER BY`. This is the documented Postgres idiom: the `Sort` node sits below `ModifyTable`, so `nextval()` is consumed in sorted order. The ordinal is also self-documenting — a reader can see that row order is meaningful.

Chosen. Applied to the answer seeds (where order is semantically load-bearing) and to the question seeds too, so PK assignment is deterministic across the whole file and ids stay stable between rebuilds.

## Verification strategy

The live instance cannot demonstrate a fresh bootstrap — its tables already exist, so `CREATE TABLE IF NOT EXISTS` short-circuits and the easy seed is a no-op. Checking the fix there would prove nothing.

Instead: `BEGIN` → `CREATE SCHEMA bootstrap_probe` → `SET search_path` → execute the migration file verbatim → assert → `ROLLBACK`. Unqualified table names resolve to the throwaway schema, so the full empty-database path runs for real. Nothing persists, and an aborted session rolls back regardless, so residue is impossible. Confirmed afterwards: no `bootstrap_probe` schema, row counts and sequence values unchanged.

This also gave the ordering defect a home. A throwaway-schema probe is reusable, so it became the natural place to assert the API contract end to end — the exact `server.js` query plus `groupQuestions` semantics — instead of a hand-written list of expectations nobody would re-run.

Deliberately **not** committed as a permanent script. It hardcodes expected counts, so it would rot the moment a question is added, and the repo's posture is zero-dependency with no test runner. The technique and the full assertion list are recorded in `verify-report.md` so the check is reproducible on demand. Making it a durable, count-free invariant check is a separate proposal.
