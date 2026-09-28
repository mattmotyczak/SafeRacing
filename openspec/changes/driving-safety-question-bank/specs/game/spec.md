# Spec delta — `driving-safety-question-bank`

**Change:** `driving-safety-question-bank`
**Domain:** `game`
**Base spec:** `openspec/specs/game/spec.md`
**Status:** spec written — `design.md` and `tasks.md` written; nothing implemented
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
easy → dbEasy.length > 0 ? dbEasy : questionsEasy
hard → dbHard.length > 0 ? dbHard : questionsHard
```

The fallback remains intentional and MUST be preserved: it is the only way the game is playable
with the backend down. See the `data-layer` spec for the fetch contract.

**What changes:** the fallback banks move out of `src/App.tsx:23-38` into
`src/data/questions.easy.ts` and `src/data/questions.hard.ts`, and their size changes from 5 + 5
to 30 easy and approximately 80 hard. The selection logic above is unchanged; only the identifier
the fallback is bound to changes.

The rationale for moving them out is a collision, not aesthetics — see `design.md`. Roughly 110
questions inline is about a thousand lines inside a component, and it puts a data migration in the
same file as concurrent visual work.

#### Scenario: Backend down still yields a playable game

- **Given** `GET /api/questions/hard` rejects
- **When** the player starts Realista mode
- **Then** the hardcoded `questionsHard` bank is used and the game is playable

**Verify:** code read of `getNewQuestion` and both fetch effects. The `file:line` references in the
base spec (`src/App.tsx:53-91`, `:94-103`) shift when the inline banks are removed; the corrected
line numbers land in the base spec when this delta is merged at archive, and are recorded in
`verify-report.md` in the meantime.

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

**Verify:** code read of the remap. **The invariant is not provable by reading and there is no test
runner in this repo** — there is no harness in which to draw a question 1000 times and assert the
correct text is stable. Verification is therefore: (1) code read confirming the permutation and the
`indexOf` remap, and (2) a manual pass in the browser, drawing several questions and confirming the
marked-correct option is the right one **every** time. Flagged as requiring a human with the app
open rather than asserted as passing. If this is wrong the game is unwinnable, so the manual pass is
not optional.

### Requirement: A question is not repeated back to back

`getNewQuestion` SHALL NOT draw the same question as the previous draw when the bank holds more
than one entry. The previous question's identity SHALL be tracked and excluded from the candidate
set.

The exclusion is **soft**: when the bank holds a single entry, or when exclusion leaves no
candidates, the draw falls back to the full bank rather than returning nothing. Returning nothing
would strand the player in `playing` with no question on screen and no way out — a worse failure
than a repeat, and one the 1-question edge case makes reachable.

**Redraw scope.** The tracked question MUST be cleared when a run starts (`startGame`) and when the
player returns to the menu. A question excluded from the *previous run's* last draw is not
"recent" in any sense the player would recognise, and carrying it across a mode change would make
the first question of a new run depend on how the last run ended.

This is a **no-repeat-immediately** rule, not a no-repeat-per-run rule. A full shuffle bag — every
question exactly once before any repeats — is a better fit for a 110-question bank and is
explicitly **not** adopted here: it needs per-mode mutable state that outlives a draw, it interacts
with the fetch effects that replace a bank mid-session, and a game that ends when lives run out
almost never sees a question twice. If the bank grows, revisit it.

#### Scenario: Two consecutive draws are different questions

- **Given** an easy bank of 30 questions
- **When** two draws happen in a row
- **Then** the two questions differ

#### Scenario: A single-question bank still draws

- **Given** a bank containing exactly one question
- **When** a draw happens
- **Then** that question is returned, and the game is not stranded without a question

**Verify:** code read of the exclusion branch and the `startGame` reset. The two-scenario behaviour
is not automatable here — no test runner, and the draw is a pure function of `Math.random()` inside
a React callback. A manual pass over several consecutive draws in the browser is the check; the
1-question edge case is not reachable in the shipped build (30 and ~80 entries) and is a
guard-against-crash assertion rather than a product behaviour.

### Requirement: The question data lives outside the component

Question data SHALL live in `src/data/questions.easy.ts` and `src/data/questions.hard.ts`, each
exporting a typed array using the `Question` interface declared in `src/App.tsx`. It SHALL NOT be
declared inline in the component.

This is a **collation requirement**, not a style preference. A data migration and a visual redesign
are running concurrently against `src/App.tsx`; the migration must own lines 23-38 and the draw
logic and nothing else. Putting the content in its own module is what makes that fence hold — a
110-question diff inside a 484-line component is a diff no reviewer can read alongside a visual diff
of the same file.

Types MUST be explicit. The `Question` interface is the existing contract (`question`, `options`,
`answer`, `photoString`), and a mistyped `answer` index in 110 hand-authored entries is a runtime
wrong-answer, not a compile error, unless the array is typed as `Question[]` and therefore
type-checked at every literal.

#### Scenario: The component holds no question data

- **Given** `src/App.tsx`
- **When** it is searched for inline question arrays
- **Then** no `Question[]` literal remains in the file; both banks are imported from `@/data/`

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
- **The in-game footer credit** at `src/App.tsx:472,474` — open gap 8, an authorship decision, not a
  data one.
- **The `lightState` timing choreography** in the `setTimeout` chains. Not one beat changes. The
  draw still happens at the `stopped` beat, with reshuffle applied at the moment of the draw.
- **Scoring, lives, and the combo.** `handleAnswer` is not modified; the remap is complete before
  the question reaches state, so scoring reads a correct index.
