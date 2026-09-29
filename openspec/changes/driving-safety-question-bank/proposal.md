# Proposal — Driving-safety question bank, option reshuffle, and the `neon_auth` boundary

**Change:** `driving-safety-question-bank`
**Domains:** `data-layer` (primary) and `game` (draw logic). Per `rules.proposal` in `openspec/config.yaml`, both are named here because the change crosses the seam between the seeded bank and the function that draws from it.
**Status:** implemented and verified 2026-09-28 — `apply` and `verify` are done, `review` and `archive` remain. Read `verify-report.md` before acting on this: six planned checks did not run. **Not yet archived.**
**Source:** `openspec/status.md` gaps 7, 9, 10, 11, plus the live evidence recorded against gap 2
**Closes:** gaps 1, 2, 7, 9, 10. Gap 11 is a **standing boundary**, not a closure — the requirement was
restated and no code changed, and the `neon_auth` isolation is asserted by inspection rather than
proven by a snapshot.

> **Scope fence, 2026-09-28.** A parallel agent is working on frontend visual design in `src/App.tsx`.
> This change touches that file in exactly two places: **lines 23-38** (the question data, which
> moves out to `src/data/`) and **the draw logic around line 101**. It touches no JSX, no styling,
> no component structure, and no file in `src/components/`. The full fence and its rationale are in
> `design.md`. Do not widen it — a merge conflict here costs more than the change is worth.

> **Two approvals already on record.** (1) Rewriting the question bank was recorded as "not an
> agent's call" pending a content decision; that decision has been made — the bank becomes a real
> driving-safety bank. (2) Deleting the live game rows was recorded as needing explicit sign-off
> because it is production data deletion; that sign-off has been given, and the exact scope
> approved is recorded in `design.md`. Both gates are now open. Open gap 1 (the smoke-test rows) is
> **folded into this change** rather than deferred, because the blanket delete retires them in the
> same pass and a separate change for them would mean applying two destructive migrations to the
> same tables.

## Problem

Four findings, one root cause and three consequences.

**1. The shipped question bank is not about driving.** Open gap 7, already documented: the easy seed at `db/migrations/0001_bootstrap.sql:86-99` and the hard seed at `:135-148`, plus the `db_easy` / `db_hard` fallback arrays at `src/App.tsx:23-38`, are F1-themed — flags framed as racing flags, `DRS` / `ERS` / `KERS`, tyre compounds `C1`–`C5`, points for a GP winner. The product brief is a **driving-safety** quiz for high-school students, and that is now a requirement (*The game is a driving-safety quiz for high-school students*, `openspec/specs/game/spec.md`). The shipped data contradicts the one requirement that is least arguable in the whole spec.

**2. Options are never reshuffled, so players memorise a position.** Open gap 9. `getNewQuestion` at `src/App.tsx:100-101` is a uniform draw over the bank with no record of the last question, and it passes `options` and `answer` through unchanged. Every question's correct answer therefore sits at a fixed index, forever. With 5 questions × 4 positions that is 20 stable slots — memorisable in one sitting, and once memorised the game tests recall of its own layout instead of road-safety knowledge.

**3. The order defect is real, and the fix for it never reached the live database.** Open gaps 2 and 10. Verified by direct query: for the same question, the correct option sits at **index 1 online and index 0 in the `db_easy` fallback**; in the hard bank, **index 3 online against index 1 in `db_hard`**. The correct answer *moves* between the two sources. Both responses are internally consistent, so scoring is never wrong — but the offline fallback no longer mirrors the online experience, which is the only thing a fallback is for. The root cause: `fresh-db-bootstrap` pinned seed order with `ORDER BY v.ord` (now at `0001_bootstrap.sql:81,112,130,161`), but the live database was seeded by the pre-fix file and the corrected file can never re-apply, because its seed inserts are guarded by `WHERE NOT EXISTS (... e.question = v.question)` — a guard on question *text*.

**4. The database is shared, and the spec did not say so.** Open gap 11. The same Neon database hosts a second schema, `neon_auth`, with 9 tables — `account`, `invitation`, `jwks`, `member`, `organization`, `project_config`, `session`, `user`, `verification`. That is Neon Auth, unrelated to the game. `public` holds exactly the four game tables. The data-layer spec asserted "four tables" as though it were a property of the database; it is a property of the game. `openspec/specs/data-layer/spec.md` has been corrected to say so, and to state the boundary as a prohibition.

Findings 1 and 3 cannot be fixed independently. Replacing the content without re-seeding the live database leaves the live bank F1-themed and the fallback driving-safety-themed; re-seeding the live database without replacing the content fixes an order defect on content that is itself wrong. This change does both, in one migration and one fallback move.

## Scope

### Question content

- **30 easy questions** and **80 hard questions** on Argentine road safety, authored in Spanish, replacing the 5 + 5 placeholders in both the SQL seed and the offline fallback. Both counts are exact and verified, not targets.
- Content is **road safety and driving knowledge**: signals and their meanings, speed limits, right of way, safe following distance, alcohol and fatigue, seat belts and restraints, tyres, braking and following distance, safe motorcycling, and pedestrian and cyclist vulnerability. Speed-limit figures cite **Ley 24.449 art. 51**.
- Every question carries exactly four options and exactly one `iscorrect = TRUE` row — the invariant the live data already satisfies for the seeded questions and the one any future migration must preserve.
- Content lands in **both** places, in the same pass: `db/migrations/0002` and `src/data/questions.easy.ts` / `src/data/questions.hard.ts`. `0001_bootstrap.sql` states the seed is transcribed from the local arrays; a content change that lands in only one of them reintroduces exactly the online/offline divergence that `fresh-db-bootstrap` fixed for order, but for content.

### Draw and shuffle

- Reshuffle `options` on **every** draw and remap `answer` to follow the correct option, so the correct position is not predictable. Client-side, in `getNewQuestion`.
- Track the last drawn question and exclude it from the next draw when the bank holds more than one entry. With a 30-question easy bank this makes a back-to-back repeat impossible.

### Data layer

- A **new `0002` migration** that deletes the game's rows and re-seeds them in the pinned order, so a fresh database and the live database converge on identical content. `0001_bootstrap.sql` is **not** edited — the reason is in `design.md` and it is not a matter of taste.
- The delete is blanket by design. It retires the two smoke-test rows (`Test`, `Second Test`) in the same pass, which closes open gap 1.

### Schema boundary

- No code change. `openspec/specs/data-layer/spec.md` now states that the four game tables live in `public`, that `neon_auth` is not ours, and that **`DROP SCHEMA public CASCADE` must never be run against this database**. That is recorded as a requirement with scenarios, not as a footnote, because the next person to write a "reset the dev database" instruction will not read a footnote.

### Non-goals

| Excluded | Why |
|----------|-----|
| **Open gap 8 — the in-game footer credit** | A **copy decision, not a data one.** The footer at `src/App.tsx:472,474` still credits the team that built it and frames the game as a final project, and it violates the Purpose requirement — but rewriting somebody's credit line is an authorship question the team has not answered. Nothing in this change touches the footer, and the 30 + ~80 questions do not change the fact that the decision is outstanding. It needs a human answer, then a one-line edit. |
| **`arcade-scene-backdrop`** | A separate, in-flight change. It is proposal-only — `design.md` and `tasks.md` are still pending there — and it owns the background, the car sprite, the stoplight, and the question/answer bubble. It also cites open gap 2 as a prerequisite for its answer-feedback work, which this change resolves. Neither change touches the other's files except that both will eventually read `src/App.tsx`. |
| **Answer feedback (chosen / correct / incorrect options)** | Owned by `arcade-scene-backdrop`. It must key off the *resolved* `answer` index, which this change makes correct in both sources; adding it here would collide. |
| **Rewriting answer primary keys in place** | Gap 2 could be closed by renumbering live answer PKs. A re-seed converges the same way, is a single forward migration, and needs no PK surgery. |
| **A durable data-layer verification script** | Open gap 4. Separate change; it needs a count-free invariant design first. |
| **Any new runtime dependency** | Shuffling and no-repeat tracking are a dozen lines of `Array` and `Math`. `rules.apply.guidelines` forbids a dependency here without a recorded tradeoff, and there is no tradeoff to weigh. |

## Approach

One migration, one data move, one function change, one new directory of typed data.

`src/data/questions.easy.ts` and `src/data/questions.hard.ts` export typed `Question[]` arrays, using the `Question` interface already declared at `src/App.tsx:14-19`. `App.tsx` imports them and deletes its inline banks. `getNewQuestion` selects the bank, picks a question that is not the previous one, builds a shuffled index permutation of `options`, and derives the new `answer` from the permutation. The endpoint contract is untouched: `server.js` keeps returning authored order, and the client reshuffles on the way in. That symmetry is deliberate and is argued in `design.md` — a server-side shuffle would leave the offline path with a fixed order, which is the defect being fixed.

`db/migrations/0002_driving_safety_bank.sql` opens a transaction, deletes answers before questions, inserts the new bank under the pinned ordinal order, and commits.

No CSS, no JSX, no new token, no new dependency, no new animation, no blur, no colour outside the existing token set. The visual contract is untouched because nothing visual changes.

## Success criteria

- `npx tsc --noEmit` exits 0.
- `npx tsc --noEmit` passes with `src/data/questions.easy.ts` and `src/data/questions.hard.ts` holding 30 and 80 entries respectively, each with exactly 4 options and one `iscorrect`-bearing correct answer.
- The **framing code check** — the two-part audit enumerated in `rules.verify.audits` in `openspec/config.yaml`, part (b), over `src/`, `server.js`, `db/` — returns **zero** hits. It fails today; the F1-themed seed in `0001_bootstrap.sql` and the inline banks in `App.tsx` are two of the sources this change removes. (The in-game footer at `App.tsx:472,474` is a *second, separate* failure and is explicitly out of scope — see Non-goals. The check therefore does not go green until gap 8 is also closed, and that is stated rather than glossed.)
- `db/migrations/0002` opens with `BEGIN` and closes with `COMMIT`; inside the transaction `DELETE FROM easy_answers` and `DELETE FROM hard_answers` appear **before** the corresponding `DELETE FROM *_questions`.
- Every seed insert in `0002` ends with `ORDER BY v.ord`, and the ordinals are contiguous from 1 per statement — the same invariant `fresh-db-bootstrap` established in `0001`.
- After `npm run db:apply` against Neon: `easy_questions` holds 30 rows, `hard_questions` holds the hard bank, the two smoke-test rows are gone, the 42,420-byte `photostring` on `Test` is gone, and every question has ≥2 answers with exactly one `iscorrect = TRUE`.
- The `neon_auth` schema still holds its 9 tables with unchanged row counts, and `public` still holds exactly the 4 game tables.
- `grep -E "DROP SCHEMA|DROP DATABASE" db/migrations/*.sql` returns **zero** matches.
- `GET /api/questions/easy` and `/hard` both return 200 with `{ question, options, answer, photoString }`, and every returned `answer` resolves to the single `iscorrect` answer.
- With the backend down, the game is still playable and the fallback banks are the new driving-safety content.
- `git diff` on `src/App.tsx` touches **only** lines 23-38 and the draw logic around line 101. Any other hunk in that file means the fence was crossed.
- No `backdrop-blur`, no `blur(`, no `rounded-*` other than `rounded-none`, no hex or `rgba()` outside the traffic-light exception — the counts are unchanged from today, because nothing visual moved.

## Rollback

**The data half is destructive and its rollback is a restore, not a revert.**

| Part | Rollback |
|------|----------|
| `src/data/questions.*.ts` + the `App.tsx` import and draw change | `git revert` of the commit. Pure presentation-side revert; no state, no schema, no API. Fully recoverable. |
| `db/migrations/0002` | `git revert` removes the file from the repo but does **not** un-run it. The live rows are gone once applied. |

Because the delete is blanket, the pre-state is exactly the row set described in `design.md`: 7 easy questions, 5 hard questions, 24 easy answers, 20 hard answers, and one 42,420-byte `photostring` on the `Test` row. The F1 content being removed is recoverable from git history — it lives in `0001_bootstrap.sql` and in the pre-change `App.tsx`. A pre-apply snapshot of the four tables is therefore a precaution worth taking even though the removed content is in version control, because the `Test` row's photo is not.

`0002` is written to fail loudly and roll itself back: the explicit `BEGIN`/`COMMIT` means a mid-file error leaves the tables exactly as they were rather than half-deleted. Taking a snapshot before the first apply is still the recommended belt-and-braces step, and it is task 1 in `tasks.md`.

## Next phase

`proposal.md`, both spec deltas, `design.md`, and `tasks.md` are written. **Nothing here is implemented.**

`verify-report.md` is the next artifact, and it needs three things the current verification model cannot give for free:

1. **A count-free invariant check, not a hardcoded count list.** The probe technique from the archived `fresh-db-bootstrap` verify-report is reusable, but that probe hardcodes expected row counts and would have rotted the moment a bank was replaced. It must be re-expressed as invariants — every question has ≥2 answers and exactly one correct; ordinals contiguous; endpoint contract holds for both modes.
2. **Explicit approval to apply `0002` to live Neon**, separately recorded from the approval to write the migration, because the second step is the destructive one.
3. **A re-read of the `neon_auth` isolation claim.** The `DROP` audit is greppable; "no statement touched `neon_auth`" is an inspection of nine foreign tables before and after, and must be run rather than asserted.
