# Verify report — fresh-db-bootstrap

**Date:** 2026-09-26
**Branch:** `new_designs`
**Result:** 22/22 probe assertions pass, deterministically across three runs. Live endpoint verified for both modes and one invalid mode.

## What was verified, and how

There is no test runner in this repo, so verification is by direct execution. Two techniques were used.

### 1. Read-only live introspection

`information_schema.columns`, `information_schema.table_constraints`, and row counts, read straight off Neon through the existing `pg` and `dotenv` dependencies. No writes. This settled the open question of whether the live `easy_*` columns are lowercase or the quoted CamelCase form from `neondb_guide.txt`.

They are lowercase, and `neondb_guide.txt`'s form was never executed. The baseline spec's hazard note is falsified.

### 2. Transactional throwaway-schema probe

The live instance cannot demonstrate a fresh bootstrap — its tables already exist, so `CREATE TABLE IF NOT EXISTS` short-circuits. The empty-database path is unreachable there. So the whole migration was executed against a scratch namespace and rolled back:

```sql
BEGIN;
CREATE SCHEMA bootstrap_probe;
SET search_path TO bootstrap_probe;
\i db/migrations/0001_bootstrap.sql   -- executed verbatim from the file
-- assertions run here
ROLLBACK;
```

Unqualified table names resolve to the throwaway schema, so the migration builds and seeds a genuinely empty database. Nothing persists: the transaction is never committed, and an aborted session rolls back regardless.

## Assertions

| # | Assertion | Result |
|---|-----------|--------|
| 1–4 | All four tables created on an empty schema | pass |
| 5–8 | Seeded 5 questions + 20 answers per mode | pass |
| 9–12 | Replaying the migration changes no row count | pass |
| 13–14 | Every question has exactly 4 answers and exactly 1 correct, both modes | pass |
| 15–20 | `server.js` query + `groupQuestions` semantics: 5 questions per mode, every `answer` resolves to 0–3, every question has 4 options | pass |
| 21–22 | Freshly seeded red-flag question resolves to the authored option order (`answer` index 0, `Peligro, detener carrera` first) | pass |

Assertions 21–22 are the ones that caught the defect. Before the ordinal fix they returned index 1 and failed; that failure is what identified planner-dependent `SERIAL` assignment as the cause.

Run three consecutive times: 22 passed, 0 failed each time. Deterministic, not incidentally correct.

## Content integrity

Retyping the seed risked corrupting the Spanish text, so it was checked mechanically rather than by eye: every single-quoted content literal in the new file was compared against `git show HEAD:db/migrations/0001_bootstrap.sql`.

- HEAD literals: 90
- NOW literals: 90
- Present in HEAD but missing or reduced: **0**
- New in NOW: **0**

This caught two real corruptions introduced during editing (`cambiar Macs`, `Qué neighbourhoods`), both fixed before the final run. Structure assertions: 50 ordinal-prefixed rows (5+20+5+20), 4 `ORDER BY v.ord` clauses, 4 line-anchored `CREATE TABLE` statements.

## Live endpoint

Server started, queried, stopped.

| Request | Result |
|---------|--------|
| `GET /api/questions/easy` | 200, 6 questions |
| `GET /api/questions/hard` | 200, 5 questions |
| `GET /api/questions/medium` | 400, `{"error":"Invalid mode 'medium'. Allowed modes: easy, hard"}` |

Both modes return the same `{ question, options, answer, photoString }` shape. Every `answer` index was hand-checked against its options array and resolves to the correct text — including hard mode, whose scrambled live primary keys put the correct answer at indices 1, 2 and 3 rather than 0.

`Second Test` has zero answer rows and is correctly absent from the response; the `INNER JOIN` filters it. The spec's `answer: -1` sentinel is therefore only reachable for a question that has answers but none correct.

### Encoding

The PowerShell console rendered accents as mojibake, which was a display artifact rather than a data fault, and was checked instead of assumed. Scanning the raw response bytes found 5 occurrences of `0xC2 0xBF` — exactly the leading `¿` of the five real easy questions — and the server sends `Content-Type: application/json; charset=utf-8`. The JSON carries correct UTF-8.

## Defects found but not fixed here

**Live `easy_*` tables contain junk rows.** `Test` (4 answers: "prueba exitosa" / "prueba fallida 1–3", plus a 42,420-byte base64 photo) and `Second Test` (0 answers) are smoke-test residue. `Test` **is** served to players — a 1-in-6 chance of a nonsense question with a random image in easy mode. Removal is production data deletion and is left for explicit approval (GAP-6).

**Live option order differs from the offline fallback.** Because the live answer primary keys are interleaved across questions, the live easy option order differs from `db_easy` for every question. Each response is internally consistent and the correct answer is always identified, so the game is never wrong — but the online and offline experiences of the same question differ. The ordinal fix makes *freshly seeded* databases match `db_easy`; it does not and cannot reorder existing rows without a destructive migration.

## Residue check

| Check | Result |
|-------|--------|
| `bootstrap_probe` schema present | 0 — clean |
| `easy_questions` / `easy_answers` | 7 / 24 — unchanged |
| `hard_questions` / `hard_answers` | 5 / 20 — unchanged |
| `hard_questions_idhardquestion_seq` last_value | 5 — unchanged |

## Not verified

- `npm run db:apply` end-to-end against a truly separate empty database. The probe exercises the same SQL through the same driver, but not through `db/apply.js`'s own file-reading loop. Requires provisioning a scratch Neon branch.
- Browser rendering of the 42 KB base64 photo. No browser tooling.
