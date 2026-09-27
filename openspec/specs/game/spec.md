# Spec — Game

**Domain:** `game`
**Source of truth:** behavior of `src/App.tsx`, `src/components/CarSprite.tsx`, `src/components/ArcadeBackground.tsx`, `src/index.css` as of commit `1e616d0` (branch `new_designs`).
**Verification model:** there is no test runner in this repo. Every requirement below names how it is actually checked: `tsc`, grep audit, code read, or geometry math.

## ADDED Requirements

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

**Verify:** code read of `startGame` in `src/App.tsx:105-123`.

### Requirement: Question sourcing is mode-driven with a local fallback

For a given mode the game SHALL draw from the mode's fetched bank, and SHALL fall back to the hardcoded local array when the fetched bank is empty or the fetch failed.

```
easy → dbEasy.length > 0 ? dbEasy : db_easy
hard → dbHard.length > 0 ? dbHard : db_hard
```

The fallback is intentional and MUST be preserved: it is the only way the game is playable with the backend down. See the `data-layer` spec for the fetch contract.

#### Scenario: Backend down still yields a playable game
- **Given** `GET /api/questions/hard` rejects
- **When** the player starts Realista mode
- **Then** the 5 hardcoded `db_hard` questions are used and the game is playable

**Verify:** code read of `getNewQuestion` (`src/App.tsx:94-103`) and both fetch effects (`src/App.tsx:53-91`).

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

**Sole permitted exception:** the traffic-light utilities — `bg-red-500`, `bg-yellow-500`, `bg-green-500` and their `/opacity` variants — plus the three stoplight glow shadows `shadow-[0_0_15px_rgba(...)]` at `src/App.tsx:226-228`. These are semantically distinct from the arcade accent palette and were reviewed and accepted (traffic-light exception, `DESIGN.md`).

**Verify:** `Select-String -Pattern '#[0-9a-fA-F]{3,8}\b|rgba?\(' src\*.tsx src\**\*.tsx` — currently returns exactly the three stoplight shadow lines.

## REMOVED Requirements

### Requirement: Blur and glow as a visual primitive

The `blur-[150px]` ambient orbs, the `blur(12px)` car aura, `.glass-panel` with `backdrop-blur`, and the `filter: blur` crash effect are REMOVED. `(Reason: the 8-bit pixel contract — no soft edges. Migration: already complete in commits 89d4174..b2e635e.)`

**Verify:** grep for `backdrop-blur|blur\(|blur-` across `src/` returns 0.

### Requirement: Rounded corners

All `--radius-*` tokens are zeroed, so every `rounded-*` utility resolves to 0. The former `rounded-full` sites (stoplight lights, lives pips, trophy ring) are explicitly `rounded-none`.

**Known deviation:** `CarSprite` SVG `<rect>` primitives still carry `rx` attributes (`CarSprite.tsx:51,53,55,57,59,61,63,65`), which round the sprite's own body corners. This contradicts the hard-corner contract and is the standing R2-2 follow-up.
