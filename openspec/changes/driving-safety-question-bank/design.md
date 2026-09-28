# Design — `driving-safety-question-bank`

**Change:** `driving-safety-question-bank`
**Domains:** `data-layer`, `game`
**Status:** design complete; nothing implemented

Nine decisions. Seven of them are non-obvious enough that a reasonable engineer would pick the
other option, so each records the alternatives and why they lost.

---

## 1. A new `0002` migration, not an edit to `0001`

`0001_bootstrap.sql` is **not** edited. The new bank goes in
`db/migrations/0002_driving_safety_question_bank.sql`.

The reason is mechanical, and it is the kind of thing that fails silently.

`0001_bootstrap.sql` guards every seed insert with:

```sql
WHERE NOT EXISTS (
  SELECT 1 FROM easy_questions e WHERE e.question = v.question
)
```

That is a guard on question **text**. Editing `0001` to carry the 30 new driving-safety questions
does not *replace* the seed on the live database — it **appends** to it. The 5 F1-themed questions
are already there, their text still matches the guard, and the 30 new ones match nothing, so all 30
insert cleanly beside them. The file then stabilises at **10 easy questions, 5 of them still
F1-themed**, and the `Question[]` literal in the edited `0001` no longer corresponds to anything in
the database. The run exits 0. Nothing errors. The defect is worse than before, because it is now
hidden inside a file that claims to be the seed of record.

`0002` is the only formulation where a fresh database and the live database converge on the same
content. A fresh database runs `0001` (5 old) then `0002` (delete all, insert 30) and ends with 30.
The live database runs `0001` (inserts nothing, everything already present) then `0002` (delete all,
insert 30) and ends with 30. Identical, and the ordering is deterministic in both because `0002`
carries the `ord` pin.

**Rejected — delete the old seed rows from `0001` and let `0002` be pure insert.** Then a fresh
database runs `0001`, inserts 5 F1 questions, and `0002` appends 30 more, because `0002`'s guard
(if it has one) matches nothing and the F1 rows are still there. The fresh path is *worse* than the
live path. Fixing that needs a `DELETE` in `0001`, which is a live delete in a bootstrap file —
worse.

**Rejected — a migration ledger table.** The base spec is explicit that there is deliberately no
ledger and that idempotency lives in the SQL, which keeps `db/apply.js` dependency-free. Adding one
to solve a problem that a second file already solves is a regression.

## 2. `0002` is one explicit transaction, answers deleted before questions

`0002` opens with `BEGIN` and closes with `COMMIT`. Inside: delete answers, delete questions,
insert questions, insert answers.

**Answers before questions is forced, not chosen.** The live foreign keys are
`easy_answers_relatedtoquestion_fkey` and `hard_answers_relatedtoquestion_fkey`, both `NO ACTION`
— not `CASCADE`. `0001_bootstrap.sql:37` declares them as a bare
`REFERENCES easy_questions(ideasyquestion)` with no `ON DELETE` clause, so Postgres applies the
default. Deleting question rows while answer rows still reference them is rejected by the
referential-integrity check, and the whole file fails.

The alternative of `DELETE ... CASCADE` from `easy_questions` is worse here: it hides the ordering
constraint rather than satisfying it, and a future reader cannot tell from the statement that
answers were involved.

**The explicit `BEGIN` / `COMMIT` is deliberate.** `db/apply.js:38` reads each file and sends the
whole string through a single `await pool.query(sql)`. A multi-statement string sent as one
`query()` goes over the simple-query protocol, where Postgres *does* wrap it in an implicit
transaction — but that is driver and protocol behaviour, not a property of the migration file. If
`apply.js` ever switched to parameterized queries, or to a client that splits on semicolons, or a
driver that stopped implicit-wrapping, the transaction would silently vanish and a mid-file error
would leave the game tables deleted and empty. The `BEGIN` in the file is immune to all of that.

This is the same reasoning as the `fresh-db-bootstrap` decision to make the SQL carry its own
guarantees rather than depend on the runner. The runner is infrastructure; the migration is the
thing that must be correct when read on its own.

**Rejected — wrap the transaction in `apply.js`.** That puts a correctness property in the runner,
where it applies to every migration equally and where a future runner change could remove it
silently. The repo's stated posture is that the SQL is the source of truth.

**Rejected — one statement per file, no transaction.** 440 answer rows do not fit in four
statements, and a partial failure without a transaction leaves the game unplayable.

## 3. The delete is blanket, and the deletion is approved

`0002` issues `DELETE FROM easy_answers`, `DELETE FROM hard_answers`, `DELETE FROM easy_questions`,
`DELETE FROM hard_questions` — every row, no `WHERE` clause.

**Why blanket.** A targeted delete is only as good as its predicate. A predicate that misses one
F1-themed row leaves a game that still has racing content, with no error to tell you which one. A
blanket delete is the only formulation that guarantees the live bank and a fresh bank are identical
by construction rather than by careful enumeration. The 440 new answer rows are inserted
immediately after in the same transaction, so the intermediate state is never observable by a
player.

It also retires the two smoke-test rows — `Test` (4 answers, one of them `prueba exitosa`, plus a
42,420-byte base64 photo) and `Second Test` (0 answers) — in the same pass. That is open gap 1, and
it is folded in deliberately: a separate change for two rows would mean applying two destructive
migrations to the same four tables, and the first one's rollback would be meaningless once the
second had run.

**The approved scope, verbatim.** The maintainer has explicitly approved deleting live production
data, with the following enumerated pre-state:

| Table | Rows to be deleted |
|-------|-------------------|
| `easy_questions` | **7** — the 5 F1-themed seeds + `Test` + `Second Test` |
| `hard_questions` | **5** — the F1-themed seeds |
| `easy_answers` | **24** — 20 seeded + 4 on `Test`; `Second Test` has none |
| `hard_answers` | **20** — the seeded set |
| `photostring` | the **42,420-byte** base64 JPEG on the `Test` row |

The 24 + 20 is arithmetic, not a separate measurement: 20 seeded easy answers + 4 on `Test` + 0 on
`Second Test` = 24.

**What the approval does not cover.** It is approval to delete the rows, not approval to run
`0002` against live Neon. Those are two separate gates and `tasks.md` puts the snapshot and the
apply-approval as their own steps. The approved deletion is also scoped to the four `public`
tables; it extends to nothing in `neon_auth`, and there is no approval on record for touching that
schema at all (see decision 8).

**Recovery.** The F1 content being removed is in git — `0001_bootstrap.sql` and the pre-change
`App.tsx` both carry it. The `Test` row's photo is **not** in version control in any usable form;
it exists only in that row. That asymmetry is the argument for the pre-apply snapshot in
`tasks.md`, even though the rest of the deletion is recoverable from history.

## 4. Reshuffle client-side, with the index remapped

The shuffle happens in `src/App.tsx`, in `getNewQuestion`, **after** the bank is selected. It is
not in `server.js`.

The reason is the offline fallback. The fallback is a required behaviour, not a convenience — the
game has to be playable with the backend down, in a high-school setting, on whatever network is
there that day. A server-side shuffle would randomise the online path and leave the offline path
serving authored order, so the two paths would disagree **in a way that is worse than the current
defect**: today they differ only in option order, which is the thing being fixed; after a
server-side shuffle they would differ in whether the fix is applied at all.

Client-side, one rule covers both sources identically. That is the whole argument.

**The remap is mandatory and is the load-bearing part.** `answer` is a positional index
(`groupQuestions()` derives it from row arrival order; it is not a stored column). Shuffling
`options` without remapping `answer` marks a *different* option correct on each draw. The
permutation is built as `p[i] = authored index now at display position i`, and the new index is
`p.indexOf(oldAnswer)`.

**Fisher-Yates over a copy, not `sort()` with a random comparator.** `Array.prototype.sort` makes
no ordering guarantee for an inconsistent comparator. Across engines that produces a biased or
partially-ordered shuffle — which is the exact failure the change exists to remove, just
statistically instead of absolutely. Twelve lines, no dependency.

**The permutation must cover all `n!` orderings uniformly.** A partial rotation leaves the correct
answer's position correlated with its authored position, and a player who notices that pattern
learns the pattern instead of the facts.

**Rejected — shuffle in the seed data, once.** The order is fixed at authoring time, so it is
guessable after one play-through, and it makes the offline and online banks differ again for a
third reason.

**Rejected — shuffle in `db/apply.js`, i.e. shuffle the seed at apply time.** Introduces run-to-run
variance into the database, which is the opposite of what `fresh-db-bootstrap` established
determinism for, and leaves the fallback untouched anyway.

**No new dependency.** `rules.apply.guidelines` forbids a runtime dependency without a recorded
tradeoff, and there is no tradeoff to weigh: the standard library covers this in a dozen lines.
Shuffling is the textbook case where pulling in a package costs more than it saves.

## 5. Question data moves to `src/data/questions.easy.ts` and `questions.hard.ts`

Roughly 110 questions inline is about a thousand lines inside a component. That is bad on its own
terms. The reason that decided it is collision.

A parallel agent is doing frontend visual design in `src/App.tsx` **right now**. A data migration
and a visual redesign in the same file means a diff that neither author can read — one side is
reviewing a thousand lines of Spanish question text, the other is reviewing a colour token, and
the merge is a merge conflict in a 484-line component.

Relocating the data to `src/data/` does three things at once: it removes the largest hunk from the
contested file, it leaves only a two-line import in the place the banks used to be, and it makes
the fence **checkable** — `git diff --stat src/App.tsx` should show exactly the import block, the
deleted banks, and the draw function. If it shows anything else, something has been clobbered and
the branch is not safe to merge. That check is in the spec and in `tasks.md` for that reason.

Both files export `Question[]`, using the interface already declared at `src/App.tsx:14-19`. Typed,
not inferred: a mistyped `answer` index across 110 hand-authored entries is a wrong answer at
runtime, and `Question[]` makes `tsc` catch it at build time. The `@/*` path alias is the repo
convention (`openspec/conventions.md`).

## 6. Speed-limit figures cite Ley 24.449 art. 51

Where the hard bank states urban speed limits — 40, 60, and 100 km/h — the cited source is
**Ley 24.449, artículo 51** (Ley de Tránsito y Seguridad Vial, Argentina).

The official GCBA manual was the first choice and is not used, for two reasons.

**The manual's speed figures are not extractable.** They live in a graphic. Text extraction does
not emit it, so the number cannot be quoted, grepped, or checked by a reviewer running a command
against the source. A fact that cannot be extracted cannot be audited, and this repo has no test
runner — auditability by reading is the only auditability available.

**The manual is not the binding source anyway.** `Ley 24.449 art. 51` is the statute that sets the
urban speed scale; a city manual restates it and adds signage advice. A high-school driving-safety
game that cites the manual is citing a secondary source for a primary fact, and a player asking
"where does that number come from?" gets a document that is not the answer.

The tradeoff is real and stated: the statute is dry, dense, and harder for a student to read than a
manual. It is the right citation for a question bank whose numbers must be *correct*, and this
change is not a readability pass on the content.

## 7. The collision fence on `src/App.tsx`

**This change touches `src/App.tsx` in exactly two regions:**

| Region | Current | What happens |
|--------|---------|--------------|
| **Lines 23-38** | `const db_easy` and `const db_hard`, 15 inline questions | Deleted. Replaced by two imports from `@/data/`. |
| **Around line 101** | `setCurrentQuestion(db[randomIndex])` inside `getNewQuestion` | Becomes a no-repeat draw plus a Fisher-Yates reshuffle with an `answer` remap. |

**It touches nothing else in that file.** No JSX, no className, no `motion` prop, no component
structure, no import from `src/components/`, no state declaration, no `setTimeout`, no footer. It
touches no file in `src/components/` and no file in `src/index.css`.

**Why the fence is stated this precisely.** The obvious failure is not a deliberate violation — it
is a helpful agent noticing that the option buttons are cramped and fixing them, or a designer
asking for one more token, in the same file, in the same window. That is a two-line change and it
destroys both pieces of work. Every hunk outside the two regions above is a bug, and
`git diff --stat src/App.tsx` is the check that catches it in one command.

**Escalation, not negotiation.** If the reshuffle genuinely cannot be implemented without touching
something outside those two regions, the answer is to stop and raise it, not to widen the fence
silently. The upside of the reshuffle is real but bounded; a botched merge of two in-flight changes
costs both of them.

**The other end of the fence.** `arcade-scene-backdrop` also claims `src/App.tsx` and is
proposal-only. The two changes do not share a region, and the dependency runs one way:
`arcade-scene-backdrop` needs the resolved `answer` index this change makes trustworthy, so it
should land after. It should not wait on this change's *content* — only on its remap.

## 8. The `neon_auth` boundary is recorded, not enforced

The database hosts `neon_auth` — 9 tables belonging to Neon Auth, unrelated to the game. This
change does not modify `db/apply.js` and does not schema-qualify the migration.

**Why not enforce it in the runner.** The honest mechanism would be `SET search_path TO public` in
`apply.js`, or explicit `public.`-qualified identifiers in every statement. Both are real
improvements and both are **out of scope here**, for one reason: this change is already writing a
destructive migration, and the least useful time to refactor the migration runner is immediately
before a live apply. Adding `SET search_path` changes how every existing file resolves, and
`0001_bootstrap.sql` is a file that has been verified by probe three times; changing its resolution
semantics in the same commit as a live delete is how a proven path gets broken quietly.

**So the control is review, and the requirement says so.** The data-layer spec now states the
boundary as a prohibition with a greppable check (`DROP SCHEMA|DROP DATABASE` over
`db/migrations/` returns zero) and one that is explicitly *not* greppable — "no statement in `0002`
touched `neon_auth`" requires reading the nine foreign tables before and after, and that is in
`verify-report.md` rather than in a task that looks automatable.

`DROP SCHEMA public CASCADE` is the specific hazard, and it is called out by name because it is
the command that appears in a casual "reset the dev database" instruction. It is not a reset path
here. It would take the game tables with it and leave Neon Auth without the database it was
provisioned into. No requirement in this repo calls for it and none may be added.

**Follow-up worth filing:** a `search_path` pin in `db/apply.js`, as its own change, with its own
verification. It is a real hardening step that this change chose not to take for a specific reason
rather than because it was overlooked.

## 9. No-repeat tracking is a soft exclusion, not a shuffle bag

`getNewQuestion` excludes the previously drawn question when the bank holds more than one entry,
and falls back to the full bank when exclusion leaves nothing.

**Soft, because the alternative strands the player.** Returning no question leaves the state
machine in `playing` with nothing on screen and `handleAnswer` inert — the only exit is the
timing choreography, and the game has to be crashed out of. That is a worse outcome than a repeat,
and the 1-question edge case makes it reachable.

**A shuffle bag was considered and rejected** for this change: every question exactly once before
any repeat. It is the better fit for a 110-question bank, and it is still the right answer if the
bank grows further. It was rejected because it needs per-mode mutable state that outlives a draw,
that interacts with the fetch effects replacing a bank mid-session, and that must be reset in
`startGame` alongside the exclusion. A game that ends when lives run out almost never sees the same
question twice, so the bag's main benefit — never repeating within a run — buys almost nothing for
its cost. The tracked question **is** reset in `startGame` and on return to the menu: a question
excluded by the last draw of a previous run is not "recent" in any sense a player would recognise,
and carrying it across a mode change would make the first question of a new run depend on how the
last run ended.

**Only the immediately-previous question is excluded.** Excluding the last two would need a
two-slot history for a marginal gain, and on a 30-question easy bank the marginal gain is not
measurable.

---

## Verification strategy

There is no test runner in this repo and this change does not add one — `openspec/conventions.md`
is explicit that one must not be added uninvited. So each requirement names how it is actually
checked, and the split between "greppable" and "needs a human with the app open" is drawn
honestly rather than flattened.

| Claim | How it is checked | Automatable here? |
|-------|-------------------|-------------------|
| Types are sound | `npx tsc --noEmit` | yes |
| No question data left in `App.tsx` | grep for `const db_easy` / `const db_hard` | yes |
| **The fence held** | `git diff --stat src/App.tsx` — import block, deleted banks, draw function, nothing else | yes |
| No racing content in the new bank | framing audit over `src/data/` and `db/migrations/0002` | yes |
| No `DROP SCHEMA` / `DROP DATABASE` | grep over `db/migrations/` | yes |
| 4 options, exactly 1 correct per question | SQL `GROUP BY` with `HAVING count(*) <> 4 OR count(*) FILTER (WHERE iscorrect) <> 1` returning zero rows | yes, against Neon |
| Live and fresh converge | live id order vs the seed's `ord`; served-vs-fallback comparison per question | yes, against Neon |
| `neon_auth` untouched | row counts of its 9 tables before and after | yes, read-only |
| Migration cannot half-apply | inject a fault mid-file against a throwaway schema; assert the tables are unchanged after rollback | yes, and it must be run |
| Applying `0002` twice is idempotent | live double-apply plus a before/after content hash | yes, against Neon |
| **The remap never mislabels a correct answer** | draw repeatedly and confirm the marked option is right **every** time | **no** — needs a browser |
| **The no-repeat rule holds across draws** | manual pass over several consecutive draws | **no** — needs a browser |
| **Question content is accurate** | a human reading 110 questions against the cited source | **no** |

The three "no" rows are the ones that matter most. A wrong remap makes the game unwinnable and
looks like bad luck to a player; an inaccurate speed limit teaches a high-school student the wrong
number. Neither is provable in this environment, and both are written into `verify-report.md` as
outstanding human actions rather than as passing checks.
