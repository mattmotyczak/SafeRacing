# Spec delta — data-layer

## MODIFIED Requirements

### Requirement: Four tables, mirror-schema pairs, lowercase identifiers

The database SHALL hold one questions/answers table pair per mode, with a 1:N relation from answers to questions. All four tables SHALL be created by `db/migrations/`, so a fresh database is bootstrappable from the repo alone.

| Table | Columns |
|-------|---------|
| `easy_questions` | `ideasyquestion` (PK, `SERIAL`), `question VARCHAR(255) NOT NULL`, `photostring TEXT` |
| `easy_answers` | `ideasyanswer` (PK, `SERIAL`), `answer VARCHAR(255) NOT NULL`, `iscorrect BOOLEAN NOT NULL`, `relatedtoquestion INTEGER NOT NULL` → `easy_questions(ideasyquestion)` |
| `hard_questions` | `idhardquestion` (PK, `SERIAL`), `question VARCHAR(255) NOT NULL`, `photostring TEXT` |
| `hard_answers` | `idhardanswer` (PK, `SERIAL`), `answer VARCHAR(255) NOT NULL`, `iscorrect BOOLEAN NOT NULL`, `relatedtoquestion INTEGER NOT NULL` → `hard_questions(idhardquestion)` |

Identifiers MUST be written lowercase and unquoted. **Postgres folds unquoted identifiers to lowercase**, so `q.idHardQuestion` and `q.idhardquestion` resolve to the same column; writing them lowercase everywhere is what keeps the SQL, the JS, and the historical guide from disagreeing.

`photostring` holds a base64-encoded JPEG, rendered client-side as `data:image/jpeg;base64,<photostring>`.

**Verified against the live database.** All sixteen columns across the four tables are lowercase, with the types above and `nextval` defaults on both PKs. The quoted CamelCase form in `neondb_guide.txt` — including its nonexistent `idAnswer` column — was never executed against this database. That guide is a historical artifact, not schema documentation.

#### Scenario: A fresh database bootstraps from the repo alone
- **Given** a database with no `easy_*` or `hard_*` tables
- **When** `npm run db:apply` runs
- **Then** all four tables are created, 5 questions and 20 answers are seeded per mode, and the run exits 0

#### Scenario: Applying against the existing instance changes nothing
- **Given** the live database, where all four tables already exist
- **When** `npm run db:apply` runs
- **Then** the `CREATE TABLE IF NOT EXISTS` statements are no-ops and the guarded seeds insert no rows

### Requirement: Seeded option order is deterministic and matches the offline fallback

Every seeded row SHALL carry an explicit ordinal, and every seed `INSERT` SHALL end with `ORDER BY` on that ordinal. `SERIAL` assigns `nextval()` as rows reach the insert and `INSERT ... SELECT` guarantees no ordering, so without the ordinal the primary keys — and therefore the option order `server.js` reconstructs via `ORDER BY <answer pk>` — are assigned in planner-dependent order.

The effect that matters: a freshly seeded database MUST present the same option order as the corresponding hardcoded bank in `src/App.tsx`, so the online and offline experiences of one question agree.

#### Scenario: A freshly seeded question resolves to the same option order as its offline twin
- **Given** a database bootstrapped from the repo alone
- **When** a seeded easy question is served
- **Then** its `options` array and `answer` index match `db_easy` in `src/App.tsx` for the same question

**Verify:** transactional throwaway-schema probe — see `verify-report.md`.
