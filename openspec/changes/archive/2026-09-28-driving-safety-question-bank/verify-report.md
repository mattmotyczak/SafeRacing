# Verify report — `driving-safety-question-bank`

**Date:** 2026-09-28
**Branch:** `new_designs`
**Change state:** `apply` and `verify` complete. `review` and `archive` complete. Committed as `a59386c`.
**Verdict:** the data layer is verified against live Neon and the code passes the type gate. Six planned
checks were **not** performed and are listed as outstanding. Three claims in `tasks.md` were wrong and
are corrected below rather than quietly satisfied.

---

## 1. What actually ran

| Check | Command | Result |
|-------|---------|--------|
| Type gate | `npx tsc --noEmit` | **exit 0** |
| Live row counts | `SELECT count(*)` × 4 via `pg` | **30 / 120 / 80 / 320** |
| Live answer integrity | `HAVING count(*) <> 4` and `count(*) FILTER (WHERE iscorrect) <> 1` | **0 offenders** both banks |
| F1 residue | `ILIKE '%piloto%' OR '%pits%' OR '%F1%'` | **0 rows** |
| `photostring` residue | `WHERE photostring IS NOT NULL` | **0 rows** |
| `VARCHAR(255)` headroom | `max(length(question))` | 83 easy / 107 hard |
| Option-order parity | `array_agg(answer ORDER BY ideasyanswer)` for the first 4 easy questions | correct option at index **1, 2, 3, 3** — identical to the TS bank |
| Sequence reset | `easy_questions_ideasyquestion_seq.last_value` | **30** (restarted, not appended) |
| Draw logic | 30,000 simulated draws per bank against the real arrays | see §3 |
| Migration structure | parsed the emitted SQL, compared to the TS bank | 550 rows, all invariants hold |
| F1 audit, code | comment-stripped grep over `db/**` and `src/**` | `0002` and all `src/` files **CLEAN**; `0001` still holds F1 by design (§5) |

The live-database checks were read-only `SELECT`s. `db/apply.js` itself was not modified.

### Live counts, verbatim

```
easy_questions  [{"n":30}]
easy_answers    [{"n":120}]
hard_questions  [{"n":80}]
hard_answers    [{"n":320}]
easy !=4 opts   [{"n":0}]
easy !=1 correct[{"n":0}]
hard !=4 opts   [{"n":0}]
hard !=1 correct[{"n":0}]
F1 rows left    [{"n":0}]
photostring set [{"n":0}]
```

550 rows total, matching `0002` exactly. Gaps 1, 7, 9, 10 and the ordering half of gap 2 are closed in
fact, not on paper.

---

## 2. The "only 50 rows" report was a false alarm

A report claimed `npm run db:apply` inserted "a max of 50 queries per table". **It did not.** Worth
recording because the reasoning generalises:

- `db/apply.js:38` sends each file in a single `pool.query`. No chunking, no `LIMIT`, no pagination, and
  no `50` constant anywhere in the runner or in `server.js`. The runner cannot produce a 50-row ceiling.
- **The explicit `BEGIN`/`COMMIT` in `0002` makes the reported state impossible.** A failed or
  interrupted run can only leave **0 rows or all 550**. A 50/50/50/30 state cannot come from a broken
  transaction. This argument needed no database access at all.
- The observed shape is the signature of a **page-size artifact**: `easy_questions` showed all 30
  because 30 < 50, while the other three stopped at exactly 50 because a page boundary was hit. A page
  limit always produces that pattern.
- **Neon's free tier is not a cause.** Its limits are 0.5 GB storage and a shared compute that
  auto-suspends when idle. Neither caps rows, and a full database raises an explicit error rather than
  silently dropping rows. The whole bank is roughly 200 KB.

**Lesson:** check the count before changing anything, and prefer an argument that needs no tool access.
See also §6 on a verifier that reported false failures.

---

## 3. Draw logic — a real bug, found by simulation

Review did not catch this. Simulation did.

**Bug.** Draw-without-replacement tracked served questions in one array, which is reset when the pool
exhausts. At that seam the first question of the new lap could be the last question of the old lap.
Measured: **2 immediate repeats in 4,000 easy draws.**

**Fix.** A second ref, `lastId`, is excluded from the fresh pool on the exhausted branch, guarded by
`db.length > 1` so a one-question bank cannot build an empty pool. `src/App.tsx:99-113`.

**After the fix**, 30,000 draws per bank:

| Assertion | easy (30 q) | hard (80 q) |
|-----------|-------------|-------------|
| Remapped `answer` always resolves to the correct option text | 0 failures | 0 failures |
| Shuffled options are a permutation of the original | 0 failures | 0 failures |
| Zero immediate repeats | **0** | **0** |
| Full lap served before any repeat | 30 of 30 | 80 of 80 |
| Correct answer lands in all 4 positions | 7554 / 7566 / 7386 / 7494 | 7579 / 7629 / 7320 / 7472 |

**The remap is the load-bearing part.** After shuffling, `answer` is recomputed as
`options.indexOf(picked.options[picked.answer])`, capturing the correct option's *text* before the swap.
Shuffling without remapping would mark **every** correct answer wrong, and `tsc` cannot see that. It is
a runtime-logic invariant, not a type invariant.

`db.indexOf(picked)` is used rather than a pool-relative index: the pool is produced by `.filter()`, so
pool-relative indices shift as the pool shrinks and the exclusion would silently stop working.

---

## 4. Migration construction

`0002` was **generated programmatically** from the TS bank, not hand-written. 440 hand-typed answer rows
would have carried transcription risk with no compensating benefit.

| Table | Data rows | INSERT lines | Overhead |
|-------|-----------|--------------|----------|
| `easy_questions` | 30 | 35 | 5 |
| `easy_answers` | 120 | 126 | 6 |
| `hard_questions` | 80 | 85 | 5 |
| `hard_answers` | 320 | 326 | 6 |
| **Total** | **550** | **572** | **22** |

Round-trip verification parsed the emitted SQL back and compared it to the TS source: question sets
equal, all 440 `(question, option, isCorrect)` triples equal, `ord` contiguous `1..N` per table, exactly
one `TRUE` per question, zero orphan questions, `iscorrect` position equal to the TS `answer` index for
all 110 questions. Delete order is answers-then-questions (FK is `NO ACTION`) and `COMMIT` is the final
statement.

**This is structural verification only. See §6.**

---

## 5. Deliberate retentions

- **`db/migrations/0001_bootstrap.sql` still contains F1 content.** It is immutable history and the file
  whose text-guarded `WHERE NOT EXISTS` made a new `0002` mandatory. Editing it would insert the new bank
  *alongside* the old and settle at 10 easy questions, 5 of them still F1. Any audit that treats `0001`
  as a live-content failure is misreading it.
- **Gap 8, the footer credit, is untouched and still open.** It is in JSX, outside the fence, and is an
  authorship decision rather than a content one.

---

## 6. Not verified — and why

| # | Planned check | Why it did not run |
|---|---------------|--------------------|
| 1 | Pre-apply snapshot of the four tables, incl. `photostring` (`tasks.md` 1-2) | **Not taken.** See below. |
| 2 | Throwaway-schema probe of `0001` + `0002` (`tasks.md` 6) | No local Postgres, no `psql`, no Docker on this machine. |
| 3 | Fault injection to prove the transaction envelope (`tasks.md` 7) | Same. Needs a runnable database. |
| 4 | `neon_auth` before/after snapshot (`tasks.md` 16, 19) | Not captured before the apply. See below. |
| 5 | Live double-apply idempotency (`tasks.md` 20) | Not run. The claim is unverified, not disproved. |
| 6 | Endpoint contract via `GET /api/questions/:mode` (`tasks.md` 22) | The API server was never started. |

**The 42,420-byte photo on the `Test` row is gone and was not snapshotted.** `tasks.md` step 1 called this
"the only asymmetric risk in the change" and it was correct. The deletion was approved with an exact
enumerated scope, and the counts that approval rests on (7 + 5 questions, 24 + 20 answers) came from
**prior-session** observations, not from a snapshot taken in this session. That distinction matters and is
the weakest point of this apply: the approval was informed, but not by a fresh pre-state record. The
photo is not recoverable from git. Nothing else in the change is irreversible — the F1 question text is.

**`neon_auth` isolation is asserted, not proven.** `0002` names no `neon_auth` object and contains no
`DROP` of any kind, and both this and the previous check are greps. A before/after snapshot of those
9 tables' row counts was never taken, so the strong form of the claim is unavailable. The weak form —
`0002` cannot touch `neon_auth` because it never names it — is what actually holds.

**Migration 2 is unproven locally.** Every SQL assertion in §4 is a structural check on a file. It has
never been executed against a scratch database, and it has been executed exactly once against production.
A syntax error would have failed the whole `pool.query` and left 0 rows, which the counts rule out, but
"ran once successfully" is weaker than "was verified before production".

---

## 7. Corrections to `tasks.md`

Three instructions were wrong. Recording them so nobody "fixes" working code to match them.

1. **`@/data/` does not exist.** Steps 12 and 15 assume a `@/*` path alias. There is no alias in
   `tsconfig.json` or `vite.config.ts` (and no `tsconfig.app.json` at all). The imports are relative —
   `./data/questions.easy`. Step 15's "confirm the modules resolve through the `@/*` alias" is
   unsatisfiable as written.
2. **The migration is `0002_driving_safety_bank.sql`,** not `0002_driving_safety_question_bank.sql` as
   this change's artifacts originally named it. The shorter name matches the change folder's register
   and is the more accurate, since `0002` repairs the answer *ordering* as well as the content. The
   task text was corrected in place; the already-applied file was not renamed.
3. **Step 13 under-specifies the no-repeat rule.** It asks to "exclude the previously drawn question".
   What shipped is stronger: full draw-without-replacement until the bank is exhausted, plus a `lastId`
   seam guard. The weaker rule is the one that produced the repeat bug in §3. The design and the delta
   spec should carry the stronger form.

**Fence check passed twice.** `git diff --stat` against HEAD touches only `src/App.tsx`; the hunks are
lines 11, 23, 38, 90-125 and 137 — the import block, the two deleted banks, the two refs, the draw
function, and the `startGame` reset. `src/components/` and `src/index.css` are **untouched**. No JSX,
styling, or component structure was modified. The two modified `.atl/` files belong to a parallel agent's
skill-registry work, not to this change.

Returning to the menu (`src/App.tsx:380,452`) reaches a new game only through `startGame`
(`:365,372,445`), which clears both refs, so step 13's "and on return to the menu" is satisfied
transitively rather than by a second call site.

### Corrected `src/App.tsx` anchors

The base game spec cited `src/App.tsx:53-91` for the two fetch effects and `:94-103` for the draw
function. Removing the inline banks shifted both, and the delta deferred recording the corrected
numbers rather than guessing them. They are here, read off the source after the removal:

| What | Correct anchor at `a59386c` |
|------|------------------------------|
| Easy-fetcher `useEffect` | `src/App.tsx:48` (the `fetch` is at `:51`) |
| Hard-fetcher `useEffect` | `src/App.tsx:68` (the `fetch` is at `:71`) |
| `getNewQuestion` | `src/App.tsx:89` |
| `startGame` (resets both refs) | `src/App.tsx:128` |
| In-game footer credit — **gap 8** | `src/App.tsx:497,499` |

The footer figure is the one that mattered most: the line pair cited across this change's artifacts
before this report was written was correct for `e26fcf1` and `453b542` and is stale for anything
later, and every one of those citations has been corrected in place. **A `file:line` in a spec is
only correct for the commit it was written against** — re-read the anchor before reusing it.

---

## 8. Outstanding — needs a human

1. **Open the app and answer questions.** Confirm the marked-correct option is right *every* time across
   several draws, in both modes, online and offline. This is the one assertion that a wrong `answer`
   remap makes the game unwinnable, and no static check can reach it.
2. **Read all 110 questions against the cited source.** Hard questions cite a printed manual page
   `(p<n>)`; speed-limit questions cite Ley 24.449 art. 51 because the manual's speed table is a graphic
   the text layer does not expose. The sourcing was done against a real extraction, but proofreading
   110 questions is a reading task, not an audit.
3. **Decide gap 8**, the footer credit. `Equipo Foxtrot` and `Proyecto Final` remain in JSX.
4. **Decide whether `0002` should be re-run** to confirm idempotency, now that the destructive scope is
   empty of anything unique.

## 9. Open questions carried forward

- **`rules.verify.audits` is file-level and does not cover `openspec/changes/**`.** A change folder
  therefore cannot quote the very strings it exists to correct — this report refers to gap 8 and to the
  offending literals by description, not by value. Either the allowlist gains `openspec/changes/**` with a
  correction-note reading rule, or gap-closing changes refer to gaps by number only. Undecided.
- **Gaps 1 and 7 in `openspec/status.md` read as open but are now resolved** in code and data. They are
  annotated in place rather than deleted, so the reason each was a gap survives.

## 10. The source PDF is deliberately not in the repo

`state.yaml` originally recorded the manual's location as an absolute local path
(`C:\Users\mattm\Downloads\...`), which is dead on any other machine. It was replaced with the document's
identity — title, publisher, edition, page count, size — plus `references/`, a folder whose `*.pdf` is
gitignored and whose `README.md` is tracked and documents retrieval.

**The PDF itself is not committed, and that was a decision rather than an oversight.** The facts that
produced it:

| Fact | Consequence |
|------|-------------|
| 68.3 MB, no Git LFS configured | Raw blob; ~85x growth on a 0.8 MB `.git` |
| Repository is **public** | Committing a copyrighted GCBA publication makes it permanently and publicly redistributable |
| A pushed blob is unreclaimable | `git rm` frees nothing; real removal needs a history rewrite that changes every commit hash on `new_designs` and forces a full re-clone |
| The manual is a free public download | Storing it in git buys a download that costs nothing |

**Nothing is lost by not committing it.** Every hard question already carries its printed-page
citation, so the question content and its source reference are in the repo. Only the ability to
re-verify a fact against the original needs the document, and that is one download on the new machine.

The rule is recorded in `state.yaml` under `not_committed.manual`, with an explicit `do_not` against
removing the gitignore rule, so a later agent does not "helpfully" fix the dangling reference by adding
the blob. If the document ever genuinely belongs in-repo, the answer is Git LFS plus a maintainer
decision — not a gitignore edit.
