# Proposal — Fresh-database bootstrap and deterministic seed order

**Change:** `fresh-db-bootstrap`
**Domain:** `data-layer`
**Status:** implemented and verified

## Problem

Two defects in `db/migrations/0001_bootstrap.sql`, both found by rereading the repo against the live database rather than against the docs.

**1. A fresh database cannot be bootstrapped.** The file creates `hard_questions` / `hard_answers` but only *seeds* `easy_questions` / `easy_answers` — it never creates them. Applying the migrations to an empty database fails at the first easy insert with `relation "easy_questions" does not exist`. The documented setup step `npm run db:apply` is therefore valid only against the pre-existing Neon instance, never against a new database and never in CI.

**2. Seeded answer order is nondeterministic.** Both answer seeds are `INSERT ... SELECT ... FROM (VALUES ...)`. `SERIAL` assigns `nextval()` per row as rows reach the insert, and `INSERT ... SELECT` guarantees no ordering, so the primary keys — and therefore the option order that `server.js` reconstructs via `ORDER BY <answer pk>` — land in whatever order the planner happens to emit the scan. The header's claim that the seed is "verbatim from `db_easy`" was false for option order.

Defect 2 was invisible until measured: it was found by a probe that asserted the freshly seeded red-flag question resolves its correct answer to index 0. It returned 1.

## Scope

- Create the `easy_*` tables in the migration, before the easy seed block.
- Pin seed row order with an explicit ordinal plus `ORDER BY`, for both modes.
- Record the real live DDL in the spec, replacing the guesswork note.

Out of scope: cleaning the live database. The probe surfaced two junk rows in the live `easy_*` tables; removing production data is a separate, explicitly-approved change.

## Approach

Read the real DDL off Neon read-only before writing any DDL, so the new `CREATE TABLE` statements mirror the live tables rather than an assumption. Then verify by executing the whole migration inside a transaction against a throwaway schema and rolling back — which exercises the empty-database path that `db:apply` cannot reach on the live instance.
