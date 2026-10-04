# Tasks — fresh-db-bootstrap

- [x] 1. Read the real `easy_*` / `hard_*` DDL off Neon, read-only, and settle the casing question before writing any DDL.
- [x] 2. Add `CREATE TABLE IF NOT EXISTS easy_questions` / `easy_answers` ahead of the easy seed block.
- [x] 3. Add an explicit ordinal to every seeded `VALUES` row and `ORDER BY v.ord` to all four seed inserts.
- [x] 4. Update the migration header to describe the new behaviour, including why the ordinal is load-bearing.
- [x] 5. Diff the seeded string literals against git HEAD to prove the ordinal change altered structure only, never content.
- [x] 6. Verify the empty-database path via a transactional throwaway-schema probe: 4 tables, 5+20 rows per mode, 4 answers and 1 correct per question.
- [x] 7. Verify the API contract through the same probe using the exact `server.js` query and `groupQuestions` semantics.
- [x] 8. Run the probe three times to prove the ordering is deterministic, not incidentally correct.
- [x] 9. Confirm zero residue: no `bootstrap_probe` schema, live row counts and sequence values unchanged.
- [x] 10. Verify the live endpoint for both modes and for an unknown mode; confirm UTF-8 accents survive the JSON response.
- [x] 11. Fold the verified results into `openspec/specs/data-layer/spec.md` and remove the falsified hazard note.

## Deliberately not done

- [ ] 12. Remove the junk `Test` / `Second Test` rows from the live `easy_*` tables. Production data deletion; needs explicit approval. Tracked as GAP-6.
- [ ] 13. Commit a reusable data-layer verification script. Needs a count-free invariant design first; tracked as GAP-7.
