# Spec — Game

**Domain:** `game`
**Source of truth:** behavior of `src/App.tsx`, `src/components/CarSprite.tsx`, `src/components/ArcadeBackground.tsx`, `src/index.css` as of commit `e26fcf1` (branch `new_designs`).
**Verification model:** there is no test runner in this repo. Every requirement below names how it is actually checked: `tsc`, grep audit, code read, or geometry math.

## ADDED Requirements

### Requirement: The game is a driving-safety quiz for high-school students

SafeRacing SHALL be a Spanish-language quiz game about **road-safety and driving knowledge**, aimed at high-school students.

**"SafeRacing" is a product name, not a description of the content.** The game teaches driving, not Formula 1. Requirements, design docs, and player-facing copy MUST NOT imply Grand Prix, Formula 1, or professional racing content.

> **Why this requirement exists.** Until 2026-09-28 five files described the project as "a final university project by Team Foxtrot" and a "racing quiz". That was wrong on both counts, and the wrong framing had already hardened into a normative decision — the offline fallback was justified in the data-layer spec as "a deliberate product decision for a university demo". Purpose is now a requirement so it cannot silently rot back.

#### Scenario: Copy describes driving, not racing
- **Given** any player-facing string, spec, or design document
- **When** it characterises the game's subject matter
- **Then** it refers to driving and road safety, never to Formula 1 or Grand Prix racing

**Verify:** two greps, both enumerated under `rules.verify.audits` in `openspec/config.yaml`.

1. **Docs** — grep `universit|universidad|Equipo Foxtrot|Proyecto Final|Team Foxtrot|Formula 1|Grand Prix` across all `*.md / *.tsx / *.ts / *.css / *.js / *.sql / *.yaml` (exclude `node_modules`). Hits allowed only in the correction-note allowlist there. Any hit that *asserts* the old framing fails.
2. **Code** — the same pattern over `src/`, `server.js`, `db/` must return **0**. The Spanish alternatives are not optional: the in-game footer at `src/App.tsx:497,499` currently renders `Equipo Foxtrot` and `Proyecto Final` to players, so this check **fails today**. See open gap 8 in `openspec/status.md`.

Note: neither grep catches the F1-themed seed data (Spanish question text says `F1`) — see open gap 7.

### Requirement: Single-page four-state game machine

The game SHALL be a single page driven by exactly four states — `menu`, `mode_selection`, `playing`, `game_over` — with no router.

Transitions:

| From | Trigger | To |
|------|---------|-----|
| `menu` | "Jugar" | `mode_selection` |
| `mode_selection` | "Fácil" | `playing` (mode = `easy`) |
| `mode_selection` | "Realista" | `playing` (mode = `hard`) |
| `mode_selection` | "Atrás" | `menu` |
| `playing` | wrong answer, lives exhausted | `game_over` |
| `game_over` | "Reintentar" | `playing` (same mode) |
| `game_over` | "Menú" | `menu` |

#### Scenario: Choosing a mode starts a fresh run
- **Given** the mode-selection screen
- **When** the player picks a mode
- **Then** `lives` resets to 1, `score` to 0, `consecutiveCorrect` to 0, and the status becomes `playing`

**Verify:** code read of `startGame` in `src/App.tsx:128`.

### Requirement: Question sourcing is mode-driven with a local fallback

For a given mode the game SHALL draw from the mode's fetched bank, and SHALL fall back to the
hardcoded local array when the fetched bank is empty or the fetch failed.

```
easy → dbEasy.length > 0 ? dbEasy : db_easy
hard → dbHard.length > 0 ? dbHard : db_hard
```

The fallback remains intentional and MUST be preserved: it is the only way the game is playable
with the backend down. See the `data-layer` spec for the fetch contract.

**What changes:** the fallback banks move out of `src/App.tsx` into
`src/data/questions.easy.ts` and `src/data/questions.hard.ts`, and their size changes from 5 + 5
to 30 easy and approximately 80 hard. The selection logic above is unchanged; only the identifier
the fallback is bound to changes.

The rationale for moving them out is a collision, not aesthetics — see `design.md`. Roughly 110
questions inline is about a thousand lines inside a component, and it puts a data migration in the
same file as concurrent visual work.

#### Scenario: Backend down still yields a playable game

- **Given** `GET /api/questions/hard` rejects
- **When** the player starts Realista mode
- **Then** the hardcoded `db_hard` bank is used and the game is playable

**Verify:** code read of `getNewQuestion` (`src/App.tsx:89`), the easy fetch effect (`src/App.tsx:48`, fetch at `:51`), the hard fetch effect (`src/App.tsx:68`, fetch at `:71`), and the import block binding both banks (`src/App.tsx:14-15`).

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

### Requirement: Scoring, lives, and combo

- A correct answer MUST increment `score` by 1 and `consecutiveCorrect` by 1.
- Every 5 consecutive correct answers MUST grant one extra life, capped at 5.
- A wrong answer MUST reset `consecutiveCorrect` to 0 and decrement `lives` by 1.
- Reaching `lives === 0` MUST transition to `game_over`.

#### Scenario: Combo grants a life at every fifth consecutive correct answer
- **Given** `consecutiveCorrect` is 4 and `lives` is below 5
- **When** the player answers correctly
- **Then** `consecutiveCorrect` becomes 5 and `lives` increases by 1

#### Scenario: Lives cap at five
- **Given** `lives` is already 5
- **When** five more consecutive correct answers are scored
- **Then** `lives` remains 5

**Verify:** code read of `handleAnswer` (`src/App.tsx:125-184`).

### Requirement: Input is locked while the car is moving or crashed

`handleAnswer` MUST return without effect when `currentQuestion` is null, `isMoving` is true, or `isCrashed` is true.

#### Scenario: Clicking during motion does not score
- **Given** a question is on screen and `isMoving` is true
- **When** an option is clicked
- **Then** no score, life, or status change occurs

**Verify:** code read of the guard clause (`src/App.tsx:126`).

### Requirement: Start-light choreography and question pacing

The traffic light and the question MUST follow a fixed timing choreography. The question is drawn only when the car has stopped.

| Beat | Delay | Effect |
|------|-------|--------|
| green | 0 ms | `isMoving = true`, `lightState = 'green'` |
| yellow | 2000 ms | `lightState = 'yellow'` |
| stopped | +1000 ms | `isMoving = false`, new question drawn, `lightState = 'red'` |

On a wrong answer the light goes `red` at the 2000 ms crash beat, and — if lives remain — the whole green/yellow/stopped sequence replays after a 1500 ms pause.

#### Scenario: No question is answerable while the car moves
- **Given** a correct answer was just submitted
- **When** 3000 ms have not yet elapsed
- **Then** no question is displayed and `handleAnswer` is inert

**Verify:** code read of the nested `setTimeout` chains (`src/App.tsx:116-122`, `:144-150`, `:156-181`).

### Requirement: Car sprite states and lives-based recoloring

`CarSprite` SHALL render three visual states from props `isMoving`, `isCrashed`, `lives`:

- **Idle** — static body, no bounce class.
- **Moving** — body wrapped in `.car-bounce` (`steps(1)`, 300 ms infinite).
- **Crashed** — body offset by 2 units with damage marks, no bounce.

Body color MUST come from the lives tier tokens:

| lives | token | value |
|-------|-------|-------|
| 1 | `--color-car-tier1` | `#64748b` |
| 2 | `--color-car-tier2` | `#7ba7c9` |
| 3 | `--color-car-tier3` | `#8ed5ff` |
| 4 | `--color-car-tier4` | `#7dd3fc` |
| 5+ | `--color-car-tier5` | `#facc15` |

At `lives >= 5` a `.car-aura` overlay MUST render.

#### Scenario: The sprite announces remaining lives to assistive tech
- **Given** any game state
- **When** the sprite is rendered with 3 lives
- **Then** the `<svg>` carries `role="img"` and `aria-label="Car sprite — 3 lives remaining"`

**Verify:** code read of `CarSprite.tsx:24-32,100,117-123`.

### Requirement: Background scroll layers

`ArcadeBackground` SHALL render exactly three scroll layers. All are CSS-only: the `translateX(0 → -50%)` `scrollBackground` keyframes, no `requestAnimationFrame` and no JS ticker.

| Layer | Class | Period | Duration | Tile geometry |
|-------|-------|--------|----------|---------------|
| Sky | `.arcade-scroll-sky` | 100 px | 25 s | two `w-1/2` tiles in a `w-[200%]` flex row |
| Ground | `.arcade-scroll-ground` | 40 px | 10 s | two `w-1/2` tiles in a `w-[200%]` flex row |
| Dashes | `.arcade-scroll-dashes` | 192 px | 2 s | two fixed `w-[1920px]` tiles in a `w-[3840px]` flex row |

Every layer MUST be `animation-play-state: paused` by default and MUST only run while `isMoving` is true (the `arcade-scroll-running` class).

#### Requirement: Seamless wrapping is a periodicity constraint, not a visual check

For any layer using `translateX(-50%)`, the pan distance MUST be congruent to `0` modulo that layer's period, **at every viewport width**. For the dash layer the pan distance is fixed at 1920 px = 10 × 192 px, so the boundary always lands on a period boundary. A `w-1/2` dash tile MUST NOT be used: its width equals the panel width (1100 px at `max-w-[1100px]`), and 1100 mod 192 = 140, which collapses the nominal 64 px gap to ~12 px at the boundary and shows a moving seam every cycle.

#### Scenario: The dash layer does not seam across cycles
- **Given** the game panel is 1100 px wide
- **When** the dash layer completes five 2-second cycles
- **Then** no discontinuity is visible at the tile boundary

**Verify:** geometry audit — 1920 mod 192 = 0. Not verifiable in-browser here: there is no browser tooling in this environment, and no test runner exists. This is the standing R3-2 follow-up (automated seam regression test).

### Requirement: Reduced motion is honored on every animated layer

When `prefers-reduced-motion: reduce` is set, the game MUST disable: all three background scroll layers, the car bounce, the car aura, the crash rotate/translate, the smoke and exhaust animations, and the menu icon rotation.

#### Scenario: Reduced motion stops the world
- **Given** the OS reduced-motion setting is on
- **When** a game is running
- **Then** the background is static at `translateX(0)`, the car does not bounce, and crash feedback is opacity-only

**Verify:** grep — `motion-reduce:animate-none` on each `ArcadeBackground` layer and on `.car-bounce`; the `@media (prefers-reduced-motion: reduce)` block in `src/index.css:127-135`; `prefersReducedMotion` from `motion` gating the crash and smoke/exhaust animations in `App.tsx`.

**Known gap:** the `AnimatePresence` entrance transitions (menu, mode select, question panel, game over) are not gated on `prefersReducedMotion`.

### Requirement: Visual token discipline

All colors in `src/**/*.tsx` MUST come from a Tailwind v4 `@theme` token or a `var(--color-*)` reference.

**Sole permitted exception:** the traffic-light utilities — `bg-red-500`, `bg-yellow-500`, `bg-green-500` and their `/opacity` variants — plus the three stoplight glow shadows `shadow-[0_0_15px_rgba(...)]` at `src/App.tsx:226-228`.

**Authority for the utilities.** This is a recorded architecture decision, not a code-review outcome. `openspec/design/arcade-retrofit.md` selected palette strategy **(B) "Tokens + traffic-light exception"** on the stated grounds that the traffic-light colors are semantically distinct from the arcade accent palette and intentional rather than brand, and restates the three utilities as raw Tailwind in its token table. That decision's recorded scope is the three `bg-*-500` utilities and their `/opacity` variants.

**The three glow shadows were never in scope of that decision.** The design record does not mention a 15px glow anywhere, and its glow/blur section states the opposite — *"Glow box-shadows become hard offset shadows"* (`openspec/design/arcade-retrofit.md:24`). The shadows are permitted only because this requirement inherits the exception from the utility decision rather than from any review of the glows themselves; no such review is on record. An earlier revision of this requirement asserted that one had occurred. That claim was false and is withdrawn. The three `App.tsx:226-228` references stand unchanged — what is unverified is their approval, not their existence.

**Verify:** `Select-String -Pattern '#[0-9a-fA-F]{3,8}\b|rgba?\(' src\*.tsx src\**\*.tsx` — currently returns exactly the three stoplight shadow lines.

## REMOVED Requirements

### Requirement: Blur and glow as a visual primitive

The `blur-[150px]` ambient orbs, the `blur(12px)` car aura, `.glass-panel` with `backdrop-blur`, and the `filter: blur` crash effect are REMOVED. `(Reason: the 8-bit pixel contract — no soft edges. Migration: already complete in commits 89d4174..b2e635e.)`

**Verify:** grep for `backdrop-blur|blur\(|blur-` across `src/` returns 0.

### Requirement: Rounded corners

All `--radius-*` tokens are zeroed, so every `rounded-*` utility resolves to 0. The former `rounded-full` sites (stoplight lights, lives pips, trophy ring) are explicitly `rounded-none`.

**Known deviation:** `CarSprite` SVG `<rect>` primitives still carry `rx` attributes (`CarSprite.tsx:51,53,55,57,59,61,63,64`), which round the sprite's own body corners. This contradicts the hard-corner contract and is the standing R2-2 follow-up.
