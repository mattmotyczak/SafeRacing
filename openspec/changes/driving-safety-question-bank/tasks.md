# Tasks — `driving-safety-question-bank`

**Phases already complete:** `propose`, `spec` (both domains), `design`. `proposal.md`,
`specs/data-layer/spec.md`, `specs/game/spec.md`, and `design.md` are written.

**Phases remaining:** `apply`, `verify`, `review`, `archive`. Tasks are grouped by phase, then by
deliverable within the phase, and each is completable in one sitting.

**Nothing in `apply` may start until the fence in `design.md` §7 is read.** A parallel agent owns
the visual work in `src/App.tsx`.

---

## Phase: apply — data layer

- [ ] 1. Take a pre-apply snapshot of the four `public` tables: `easy_questions`, `easy_answers`,
  `hard_questions`, `hard_answers`, including the `photostring` column. **Reason:** the F1 content
  being removed is recoverable from git, but the 42,420-byte JPEG on the `Test` row is not in
  version control in any usable form. This is the only asymmetric risk in the change.
- [ ] 2. Record the pre-state row counts and confirm they match the approved scope exactly —
  7 easy questions, 5 hard, 24 easy answers, 20 hard answers. A mismatch means the live database
  is not the one the approval was written against; stop.
- [ ] 3. Create `db/migrations/0002_driving_safety_question_bank.sql` with the `BEGIN` / `COMMIT`
  envelope, the four deletes in answers-then-questions order, and the four inserts with contiguous
  `ord` from 1 and an `ORDER BY v.ord` terminator on every one.
- [ ] 4. Write the migration header: state that it replaces the bank, that `0001` is deliberately
  unedited and why (the `WHERE NOT EXISTS` text guard appends rather than replaces), that the
  delete is blanket by design, and that the approved deletion scope is 7 + 5 questions and 24 + 20
  answers. A migration that deletes production rows must carry its own justification in the file.
- [ ] 5. Confirm the migration contains no `DROP SCHEMA`, no `DROP DATABASE`, and no statement
  naming an object in `neon_auth`. One grep, three patterns.
- [ ] 6. Run `0002` against a **throwaway schema** first: `BEGIN` → `CREATE SCHEMA probe` →
  `SET search_path` → `0001` → `0002` → assert → `ROLLBACK`. Assert 30 easy questions, the hard
  bank, 4 answers each with exactly one `iscorrect`, contiguous ordinals, and no residue. The live
  apply is step 12 and does not happen without its own approval.
- [ ] 7. Prove the transaction envelope actually holds: inject a deliberate fault into a **copy** of
  `0002` mid-file, run it against the throwaway schema, and assert the tables are unchanged after
  the rollback. This is the only way to verify atomicity, and reading the file cannot verify it.

## Phase: apply — question data

- [ ] 8. Create `src/data/questions.easy.ts` — 30 driving-safety questions in Spanish, 4 options
  each, typed `Question[]`. Road safety, signals, right of way, following distance, seat belts,
  pedestrians. No competitive-motorsport content anywhere, in a question, an option, or a distractor.
- [ ] 9. Create `src/data/questions.hard.ts` — approximately 80 questions, same rules, harder
  material: statutory detail, signage, safe motorcycling, tyre and braking behaviour. Speed-limit
  figures cited to **Ley 24.449 art. 51**; the other questions carry their source in a comment.
- [ ] 10. Check both files for length: every `question` and every option string must fit
  `VARCHAR(255)`. An over-length string fails at insert time against live Neon, not at review time.
- [ ] 11. Confirm the two files and the `0002` seed contain the **same** questions in the **same**
  order, with the same correct answers. This is the invariant that keeps online and offline from
  diverging for content the way they diverged for order. A diff of the question texts is the check.

## Phase: apply — frontend (fenced)

- [ ] 12. In `src/App.tsx`, delete `const db_easy` (lines 23-29) and `const db_hard` (lines 31-37)
  and replace them with the two imports from `@/data/`. **These lines and the draw function are the
  entire permitted footprint.** Nothing else in this file is touched.
- [ ] 13. Rewrite `getNewQuestion` (around line 100-101): exclude the previously drawn question
  when the bank holds more than one entry, fall back to the full bank when exclusion leaves
  nothing, Fisher-Yates the option indices, and set `answer` to `permutation.indexOf(oldAnswer)`.
  Clear the tracked question in `startGame` and on return to the menu.
- [ ] 14. **Run the fence check immediately:** `git diff --stat src/App.tsx` MUST show only the
  import block, the two deleted banks, and the draw function. Any other hunk means a concurrent
    visual change has been clobbered — stop, do not merge, escalate. This is the single most
  important check in the change.
- [ ] 15. Run `npx tsc --noEmit` and confirm exit 0 with the new modules resolved through the
  `@/*` alias.

## Phase: verify

- [ ] 16. Snapshot the `neon_auth` schema — all 9 tables and their row counts — **before** the live
  apply. This is the only way to prove the isolation claim afterwards; it cannot be reconstructed.
- [ ] 17. Obtain explicit approval to run `0002` against live Neon, recorded separately from the
  approval to write the migration. Then run `npm run db:apply`.
- [ ] 18. Assert the post-apply invariants with SQL, not with counts: every question has ≥2
  answers and exactly one `iscorrect = TRUE`; `easy_questions` holds 30; ordinals are contiguous;
  no question text from the old bank survives. Use `HAVING count(*) <> 4 OR count(*) FILTER
  (WHERE iscorrect) <> 1` returning zero rows — the 4-and-1 shape, not a hardcoded count.
- [ ] 19. Re-check the `neon_auth` snapshot from step 16. Identical tables, identical counts.
  Confirm `public` still holds exactly the four game tables.
- [ ] 20. Run the live double-apply and compare a content hash before and after. Idempotency is
  the claim; one run does not test it.
- [ ] 21. Verify convergence: the live `easy_questions` id order matches the seed's `ord` order,
  and a served question's `options` / `answer` match its offline twin in `src/data/`. Do this for
  at least one question per mode, as a two-source diff.
- [ ] 22. Verify the endpoint contract: `GET /api/questions/easy` and `/hard` return 200 with
  `{ question, options, answer, photoString }`, and every returned `answer` resolves to the single
  `iscorrect` answer.
- [ ] 23. Run the audits in `rules.verify.audits`: `npx tsc --noEmit` exits 0; the framing code
  check over `src/data/` and `db/migrations/0002` returns zero; `DROP SCHEMA|DROP DATABASE` over
  `db/migrations/` returns zero. **Record honestly that the full framing check still fails at
  `src/App.tsx:472,474`** — that is open gap 8, an explicit non-goal, not a pass.
- [ ] 24. Confirm the visual counts are unchanged: no hex or `rgba()` outside the traffic-light
  exception, no `blur`, no `rounded-*` other than `rounded-none`. This change adds no colour, no
  animation, and no JSX, so every count must match today exactly.
- [ ] 25. **Hand to a human, in writing, in `verify-report.md` as outstanding** — these cannot be
  closed in this environment: (a) draw repeatedly in the browser and confirm the marked-correct
  option is right **every** time; (b) manual pass over several consecutive draws for the no-repeat
  rule; (c) read all 110 questions against the cited source for accuracy.
- [ ] 26. Write `verify-report.md` with the real command output, including the step-16 and
  step-19 `neon_auth` counts side by side and the three outstanding human actions from step 25.

## Phase: review

- [ ] 27. Review the diff against `openspec/specs/` and the two deltas in `specs/`. Confirm every
  scenario has a verification method named and that no scenario claims an automated check it does
  not have.
- [ ] 28. Confirm the fence held a second time, at review, after any merge or rebase:
  `git diff --stat` against the branch point for `src/App.tsx` and `src/components/`.
- [ ] 29. Confirm nothing under `openspec/changes/archive/` was edited or deleted, and that the
  root pointer files (`AGENTS.md`, `DESIGN.md`, `ORCHESTRATOR.md`, `README.md`, `neondb_guide.txt`)
  are all still present.

## Phase: archive

- [ ] 30. Merge the `data-layer` delta into `openspec/specs/data-layer/spec.md` and the `game` delta
  into `openspec/specs/game/spec.md`, including the `file:line` corrections noted in the game delta.
- [ ] 31. Update `openspec/status.md`: gaps 1, 7, 9, 10 close. **Gaps 2, 8, and 11 do not close on
  their own terms** — 2 is resolved by the convergence check in step 21 rather than by code, 8 is
  the explicit non-goal, and 11 is a standing boundary that is now recorded, not fixed. Write that
  distinction into the gap entries rather than closing them on a technicality.
- [ ] 32. Update `openspec/conventions.md` if the new `src/data/` location or the `neon_auth`
  boundary needs a gotcha entry, and confirm the hard-rule pointer table still resolves.
- [ ] 33. Move the folder to `openspec/changes/archive/YYYY-MM-DD-driving-safety-question-bank/`.
  Warn before merging the destructive delta, per `rules.archive`.

---

## Deliberately not done

- [ ] 34. The in-game footer credit at `src/App.tsx:472,474` — **open gap 8**. A copy and
  authorship decision, not a data one. It needs an answer from the team, not a task here.
- [ ] 35. Any visual change — background, car sprite, stoplight, question bubble. Owned by
  `arcade-scene-backdrop`, which must not be started until the fence check in step 14 is clean.
- [ ] 36. Answer feedback. Owned by `arcade-scene-backdrop`; it keys off the resolved `answer` index
  this change makes trustworthy, so it lands after, not with.
- [ ] 37. A durable data-layer verification script — **open gap 4**. It needs a count-free invariant
  design first. Step 18 is deliberately written as invariants rather than as the seed for that
  script, so it does not rot the moment a question is added.
- [ ] 38. A `search_path` pin in `db/apply.js`. Real hardening, deliberately deferred — see
  `design.md` §8 for the reason, which is "not one commit before a live apply", not "not thought
  about". It should be filed as its own change.
