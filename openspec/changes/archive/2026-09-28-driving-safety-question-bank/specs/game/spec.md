# Spec delta — `driving-safety-question-bank`

**Change:** `driving-safety-question-bank`
**Domain:** `game`
**Base spec:** `openspec/specs/game/spec.md`
**Status:** implemented and verified 2026-09-28. This delta now **describes what shipped**, not what was
planned — two requirements were strengthened during apply and their `Verify` sections corrected. See
`verify-report.md` §7. **Not yet archived.**
**Closes:** open gap 9 (the draw and the shuffle)

> **Scope fence.** This delta covers the draw in `getNewQuestion` and the relocation of the
> question data out of `App.tsx`. It does **not** touch JSX, styling, component structure, the
> state machine, the `lightState` timing choreography, or any file in `src/components/`. A parallel
> agent owns the visual work in `src/App.tsx`; the fence is stated in full in `design.md`.

---

## MODIFIED Requirements

### Requirement: Question sourcing is mode-driven with a local fallback

For a given mode the game SHALL draw from the mode's fetched bank, and SHALL fall back to the
hardcoded local array when the fetched bank is empty or the fetch failed.

```
easy → dbEasy.length > 0 ? dbEasy : db_easy
hard → dbHard.length > 0 ? dbHard : db_hard
```

The fallback remains intentional and MUST be preserved: it is the only way the game is playable
with the backend down. See the `data-layer` spec for the fetch contract.

**What changes:** the fallback banks move out of `src/App.tsx:23-38` into
`src/data/questions.easy.ts` and `src/data/questions.hard.ts`, and their size changes from 5 + 5
to 30 easy and 80 hard. The selection logic is unchanged; the module keeps the historical `db_easy` /
`db_hard` names, so only where the bank lives changes.

The rationale for moving them out is a collision, not aesthetics — see `design.md`. Roughly 110
questions inline is about a thousand lines inside a component, and it puts a data migration in the
same file as concurrent visual work.

#### Scenario: Backend down still yields a playable game

- **Given** `GET /api/questions/hard` rejects
- **When** the player starts Realista mode
- **Then** the hardcoded `db_hard` bank is used and the game is playable

**Verify:** code read of `getNewQuestion` and both fetch effects. The `file:line` references in the
base spec (`src/App.tsx:53-91`, `:94-103`) shift when the inline banks are removed; the corrected
line numbers are recorded in `verify-report.md` §7 and are now in the merged base spec.

---

## ADDED Requirements

### Requirement: Option order is reshuffled on every draw, with the answer index remapped

Every draw SHALL present the options of the drawn question in an order that is not the authored
order, and the `answer` index SHALL be remapped so that it continues to point at the same answer
**text**. Reshuffling the array without remapping the index would mark a different option correct
on every draw — the worst possible failure mode for a game that scores on correctness, and one that
is invisible to a player who cannot remember the authored order.

The reshuffle SHALL be deterministic given the permutation it produced, and SHALL be applied
client-side, after the bank has been selected and whether it came from the network or the fallback.
Both sources therefore behave identically.

The permutation MUST be a uniform shuffle of the option indices — every permutation equally likely,
not a partial rotation or a single swap. A rotation leaves the correct answer's *relative* position
correlated with its authored position, which is the pattern the player is trying to unlearn.

**The remap is a lookup, not a search.** Given permutation `p` where `p[i]` is the authored index
now shown at display position `i`, the new answer is `p.indexOf(oldAnswer)`. Any implementation that
searches the option *strings* for the correct text is also correct but is O(n) and, more
importantly, breaks the moment two options share text.

Shuffling MUST NOT be a `sort()` with a comparator returning a random number. `Array.prototype.sort`
gives no ordering guarantee for an inconsistent comparator, and across engines that means a biased
or even a partially-ordered result. A Fisher-Yates pass over a copy is the correct construction.

#### Scenario: The correct answer text is invariant under reshuffling

- **Given** a question whose correct option is at authored index 2
- **When** it is drawn and reshuffled to display order where that option is at index 0
- **Then** `answer` is `0`, and `options[0]` is the same string that `options[2]` held before the draw

#### Scenario: Both sources reshuffle identically

- **Given** a question served online and the same question in the offline fallback
- **When** each is drawn
- **Then** the same remap rule applies to both, and neither preserves the authored order

**Verify:** code read of the remap. **Revised after apply:** the original version of this section
claimed the invariant was not automatable because the repo has no test runner, and prescribed a manual
pass in the browser. That was wrong, and worth correcting rather than deleting — the remap is a pure
function of a question record and a permutation, so a headless harness over the same arrays settles it.
A 30,000-draw simulation per bank confirms the marked option is correct **every** time, that the
shuffled options are a true permutation of the authored set, and that the correct answer lands in all
four positions. The manual browser pass is still wanted — it catches what a data-level check cannot,
namely whether the rendered highlight is the one the remap produced — but it is corroboration now, not
the only evidence.

### Requirement: Questions are drawn without replacement within a lap, and never back to back across the lap seam

> **Strengthened during apply, 2026-09-28.** This requirement originally read "a question is not
> repeated back to back" and asked only for the previous question to be excluded. What shipped is
> stronger, and **the weaker version contains a real defect**: tracking only the last question permits
> an immediate repeat at the moment a lap wraps. Both forms are specified below, because the weaker one
> is the trap and the stronger one is not obvious from it.

Within a lap, `getNewQuestion` SHALL draw **without replacement** from the questions not yet served in
the current lap. When the bank is exhausted, the served set SHALL be reset and a new lap SHALL begin.

**Across the lap seam, the last question of the closing lap SHALL be excluded from the opening draw of
the next.** This is a separate state from the served set, because the served set is reset at exactly
the moment the exclusion is needed. A single `askedIds` array cannot express both: clearing it at lap
exhaustion is what creates the seam. Implementations MUST keep the previous question's identity across
that reset, or the seam will repeat.

Every exclusion MUST be guarded on the bank holding more than one entry.

**The exclusion is soft.** When the bank holds a single entry, or when exclusion leaves no candidates,
the draw falls back to the full bank rather than returning nothing. Returning nothing would strand the
player in `playing` with no question on screen and no way out — a worse failure than a repeat, and one
the 1-question edge case makes reachable.

**Exclusion MUST key on the bank's own index, not an index relative to the candidate pool.** The pool
is produced by filtering the bank, so pool-relative indices shift as the pool shrinks; a pool-relative
key silently stops excluding anything as the lap progresses.

**Redraw scope.** Both the served set and the carried previous-question identity MUST be cleared when
a run starts (`startGame`) and when the player returns to the menu. A question excluded from the
*previous run's* last draw is not "recent" in any sense the player would recognise, and carrying it
across a mode change would make the first question of a new run depend on how the last run ended.

This remains **not** a full shuffle bag in the sense of never repeating within a run — a run that ends
when lives run out may cross the lap boundary more than once. A shuffle bag is a better fit if the bank
grows substantially; it is explicitly still not adopted, for the reasons in `design.md` §9. The
guarantee here is: **no question repeats within a lap, and none repeats immediately across a seam.**

#### Scenario: Two consecutive draws are different questions

- **Given** an easy bank of 30 questions
- **When** two draws happen in a row
- **Then** the two questions differ

#### Scenario: A lap serves the whole bank before repeating

- **Given** an easy bank of 30 questions
- **When** 30 draws happen
- **Then** all 30 distinct questions have been served

#### Scenario: The seam does not repeat

- **Given** an easy bank of 30 questions
- **When** 31 consecutive draws happen
- **Then** question 31 differs from question 30

#### Scenario: A single-question bank still draws

- **Given** a bank containing exactly one question
- **When** a draw happens
- **Then** that question is returned, and the game is not stranded without a question

**Verify:** simulation, 30,000 draws per bank, asserting all four scenarios. **This section originally
prescribed a manual browser pass and claimed the behaviour was not automatable** — it is, being a pure
function of the bank arrays and a `Math.random()` sequence, and it is the check that matters: the first
implementation passed code review and still produced 2 immediate repeats in 4,000 easy draws, which a
manual pass over "several consecutive draws" would most likely have missed. The 1-question edge case is
a guard-against-crash assertion and is not reachable in the shipped build (30 and 80 entries), so it is
covered by the `db.length > 1` guard rather than by a live bank.

### Requirement: The question data lives outside the component

Question data SHALL live in `src/data/questions.easy.ts` and `src/data/questions.hard.ts`, each
exporting a typed array using the `Question` interface declared in `src/App.tsx`. It SHALL NOT be
declared inline in the component.

This is a **collation requirement**, not a style preference. A data migration and a visual redesign
are running concurrently against `src/App.tsx`; the migration must own the import block, the deleted
banks, the draw function, and the `startGame` reset, and nothing else. Putting the content in its own
module is what makes that fence hold — a 110-question diff inside a 500-line component is a diff no
reviewer can read alongside a visual diff of the same file.

Types MUST be explicit. The `Question` interface is the existing contract (`question`, `options`,
`answer`, `photoString`), and a mistyped `answer` index in 110 hand-authored entries is a runtime
wrong-answer, not a compile error, unless the array is typed as `Question[]` and therefore
type-checked at every literal.

#### Scenario: The component holds no question data

- **Given** `src/App.tsx`
- **When** it is searched for inline question arrays
- **Then** no `Question[]` literal remains in the file; both banks are imported from `./data/`

**Corrected after apply:** this scenario originally said the banks are imported from `@/data/`. **There is
no `@/*` path alias in this repo** — no alias in `tsconfig.json` or `vite.config.ts`, and no
`tsconfig.app.json` exists at all. The imports are relative, at `src/App.tsx:14-15`. The scenario is
restated rather than deleted because the wrong path is the sort of thing a reader trusts.

**Verify:** `npx tsc --noEmit` for the type check; grep for `const db_easy` / `const db_hard` in
`src/App.tsx` returning zero matches; `git diff --stat src/App.tsx` showing only the import block,
the deleted banks, and the draw function. **The last one is the fence check and it is the most
important verification in this change** — if `App.tsx` has any hunk outside those regions, a
concurrent visual change has been clobbered and the branch is not safe to merge.

---

## REMOVED Requirements

None. No requirement in `openspec/specs/game/spec.md` is retracted by this change. The *Visual token
discipline*, *Reduced motion*, *Background scroll layers*, and *Seamless wrapping* requirements are
all untouched — this change adds no colour, no animation, no layer, and no JSX.

---

## Out of scope

- **Everything visual.** The background, the car sprite, the stoplight, and the question/answer
  bubble belong to `arcade-scene-backdrop`. This change adds no JSX and no class, so every visual
  count in the base spec — hex and `rgba()` occurrences, `blur` hits, `rounded-*` hits — is
  unchanged by it.
- **Answer feedback.** Owned by `arcade-scene-backdrop`. It must key off the *resolved* `answer`
  index, which this change makes trustworthy in both sources; adding it here would collide.
- **The in-game footer credit** at `src/App.tsx:497,499` — open gap 8, an authorship decision, not a
  data one.
- **The `lightState` timing choreography** in the `setTimeout` chains. Not one beat changes. The
  draw still happens at the `stopped` beat, with reshuffle applied at the moment of the draw.
- **Scoring, lives, and the combo.** `handleAnswer` is not modified; the remap is complete before
  the question reaches state, so scoring reads a correct index.
