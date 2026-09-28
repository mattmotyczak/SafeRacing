# Spec delta — `arcade-scene-backdrop`

**Change:** `arcade-scene-backdrop`
**Domain:** `game`
**Base spec:** `openspec/specs/game/spec.md` (merged — not yet edited; this delta merges at archive)
**Status:** spec revised — `design.md`, `tasks.md` and all implementation remain pending

> **Revised 2026-09-28 against a 12-question design interview.** The first draft of this delta
> predated that interview. Several of its claims were **wrong** and have been rewritten rather
> than patched — see *Decisions reversed below*. Line citations were re-verified against the
> working tree on 2026-09-28; every `file:line` in this file is current at HEAD `e26fcf1`.
>
> **Corrected 2026-09-28 after adversarial re-verification.** The parallax table above the
> interview revision was itself wrong: the sky ran at 76.8 px/s while sitting **behind** hills at
> 32 px/s, so the backdrop moved **2.4× faster than the mid-ground in front of it** — a depth-order
> inversion that would have shipped as a visible bug. The sky is now 120 s / 16 px/s, the hills
> stay 60 s / 32 px/s, and the ladder is a **fifth** rung, not a fourth. Three other defects are
> fixed alongside it: the tree count ignored the tile's period count, the hill off-seam claim
> asserted a constraint it never specified, and the ground-seam severity was understated.
>
> **Source of truth for the layer table.** The table in *Background scroll layers* below is the
> **single source of truth** for this change. `proposal.md` and `exploration.md` each carry an
> **older, different** table (a third set: hills 240 px / 18 s, mid 480 px / 10 s, sky 1920 px /
> 25 s). Those tables are **superseded and MUST NOT be implemented.** An implementer who reads
> either of those files instead of this one will build a different scene.
>
> **Verification model (unchanged).** There is no test runner and no browser tooling in this
> environment. Every requirement below names its check: `tsc`, grep audit, code read, or
> computed geometry. Where no check exists, the requirement says so.

---

## MODIFIED Requirements

### Requirement: Background scroll layers

`ArcadeBackground` SHALL render **seven** scroll layers: the three existing ones — sky, ground,
dashes — plus four new daytime-cartoon scenery layers. All are CSS-only: the
`translateX(0 → -50%)` `scrollBackground` keyframes, no `requestAnimationFrame`, no JS ticker.

| Layer | Class | Container | Tile | Period | Duration | Speed | Plane |
|-------|-------|-----------|------|--------|----------|-------|-------|
| **Sky (backmost)** | `.arcade-scroll-sky` | `w-[3840px]` | 2 × `w-[1920px]` | **128 px** (was 100) | **120 s** (was 25) | **16 px/s** | far |
| Hills | `.arcade-scroll-hills` | `w-[3840px]` | 2 × `w-[1920px]` | 640 px | 60 s | 32 px/s | far |
| Trees | `.arcade-scroll-trees` | `w-[3840px]` | 2 × `w-[1920px]` | 240 px | **25 s** (was 30) | 76.8 px/s | far |
| Ground tint | `.arcade-scroll-ground` | `w-[3840px]` | 2 × `w-[1920px]` | 40 px | 10 s | 192 px/s | surface |
| Road edge lines | `.arcade-scroll-edges` | `w-[3840px]` | 2 × `w-[1920px]` | 60 px | **2 s** (was 1.2) | 960 px/s | road |
| Rumble strip | `.arcade-scroll-rumble` | `w-[3840px]` | 2 × `w-[1920px]` | 192 px | 2 s | 960 px/s | road |
| Road dashes | `.arcade-scroll-dashes` | `w-[3840px]` | 2 × `w-[1920px]` | 192 px | 2 s | 960 px/s | road |

Rows are ordered back to front, so **the table order IS the paint order**: sky, hills, trees,
ground, then road paint over ground. Speeds rise strictly with proximity —
`16 < 32 < 76.8 < 192 < 960`, five distinct values, no two planes moving at the same rate.

**Every layer MUST use the same tile geometry: a `w-[3840px]` flex container holding two
`w-[1920px]` tiles.** Sky and ground are migrated off `w-1/2`. This includes the two
viewport-dependent layers that the previous version of this delta excused — see
*Requirement: Every layer's tile width is congruent to 0 modulo its own period* for why that
excuse was false and what the live bug was.

**The period change and the tile migration are one atomic change, not two.** The new 128 px sky
period is valid **only** on the fixed 1920 px tile: `1920 mod 128 = 0`, but on a `w-1/2` tile at
the project's own `max-w-[1100px]` panel width, `1100 mod 128 = 76` — a 76 px phase error, which
is *worse* than the 100 px period's error and cannot be fixed by geometry alone. Landing the
period without the migration, or the migration without the period, both leave the sky broken.

**Census — `arcade-scroll` matches FOUR classes, not three.** `.arcade-scroll-running`
(`src/index.css:122-124`, applied at `ArcadeBackground.tsx:28`) is a **play-state toggle, not a
parallax layer**: it sets `animation-play-state: running` and carries no `animation` shorthand of
its own. The three shipped layers are `sky`, `ground`, `dashes`; the other four layer classes in
the table above are new. Any verify-phase grep for `arcade-scroll` **MUST expect four hits on the
current tree**, and a count of three is a stale-grep signal, not a pass. `.arcade-scroll-running`
MUST **not** be added to the `prefers-reduced-motion` block — `animation: none !important` leaves
nothing to pause, so suppressing it is unnecessary.

Every layer MUST be `animation-play-state: paused` by default and MUST only run while
`isMoving` is true via the `arcade-scroll-running` class, and MUST carry
`motion-reduce:animate-none` **and** an entry in the `prefers-reduced-motion` block at the
bottom of `src/index.css` — two places, no exceptions.

(Previously: three layers, sky at period 100 px and ground at 40 px on `w-1/2` tiles, trees at
30 s, a first-draft edge-line duration of 1.2 s, and a false justification that `w-1/2` was safe
for infinitely repeating gradient fills.)

#### Scenario: The scenery does not seam across cycles
- **GIVEN** the game panel is 1100 px wide
- **WHEN** the hills layer completes a full 60-second cycle
- **THEN** no discontinuity is visible at the tile boundary and the hill silhouette is continuous

**Verify:** computed geometry — `1920 mod 640 = 0`, `1920 mod 128 = 0`, `1920 mod 240 = 0`,
`1920 mod 40 = 0`, `1920 mod 60 = 0`, `1920 mod 192 = 0`. **Not verifiable in-browser:** no
browser tooling and no test runner exist. This is the standing R3-2 follow-up.

### Requirement: Seamless wrapping is a periodicity constraint, not a visual check

For any layer using `translateX(-50%)`, the container is `w-[3840px]`, so the pan distance is
always exactly 1920 px regardless of viewport. The pan distance MUST be congruent to `0` modulo
that layer's period. Since the two tiles are pixel-identical, the tile width MUST also be
congruent to `0` modulo the period. Both conditions hold for every layer in the table above.

A `w-1/2` tile MUST NOT be used by any layer. Its width equals the panel width (1100 px at
`max-w-[1100px]`), which is viewport-dependent and not period-aligned.

(Previously: named only the dash layer, computed `1100 mod 192 = 140`, and stated the rule
without establishing why a gradient fill is not exempt.)

#### Scenario: The dash layer does not seam across cycles
- **GIVEN** the game panel is 1100 px wide
- **WHEN** the dash layer completes five 2-second cycles
- **THEN** no discontinuity is visible at the tile boundary

**Verify:** computed geometry — `1920 mod 192 = 0` (10 periods), `1100 mod 192 = 140` (why the
former `w-1/2` dash tile was already banned). **Not verifiable in-browser.**

### Requirement: Reduced motion is honored on every animated layer

When `prefers-reduced-motion: reduce` is set, the game MUST disable: all seven background
scroll layers, the car bounce, the car aura, the crash rotate/translate, the smoke and exhaust
animations, and the menu icon rotation.

Every animated layer MUST carry `motion-reduce:animate-none` in markup **and** an entry in the
`@media (prefers-reduced-motion: reduce)` block at `src/index.css:127-135`. A layer that is
covered by the media block but missing the class does not satisfy this requirement; both
mechanisms are required.

The `AnimatePresence` entrance transitions (menu, mode select, question panel, game over) MUST
be gated on `prefersReducedMotion` from `motion`.

(Previously: three layers; the "both places" rule was recorded as an unsatisfiable known
deviation for `.car-aura`; and the ungated `AnimatePresence` entrances were an open known gap.)

#### Scenario: Reduced motion stops the world
- **GIVEN** the OS reduced-motion setting is on
- **WHEN** a game is running
- **THEN** the background is static at `translateX(0)`, the car does not bounce, and crash feedback is opacity-only

#### Scenario: Reduced motion removes entrance animation
- **GIVEN** the OS reduced-motion setting is on
- **WHEN** the player advances from menu to mode selection, or a question appears
- **THEN** the transition is opacity-only, with no `y`, `scale`, or `x` movement

**Verify:** grep — `motion-reduce:animate-none` on each `ArcadeBackground` layer and on
`.car-bounce`; the media block at `src/index.css:127-135` lists all seven layer classes;
`prefersReducedMotion` guards each of the four `AnimatePresence` blocks at `App.tsx:300-302`,
`:329-332`, `:366-369`, `:406-408`. **Known deviation closed:** `.car-aura`
(`CarSprite.tsx:119`) lacked the class; it now carries it.

### Requirement: Visual token discipline

All colors in `src/**/*.tsx` MUST come from a Tailwind v4 `@theme` token or a `var(--color-*)`
reference.

**Sole permitted exception — the traffic-light ramp, widened.** Any red, yellow, or green
Tailwind colour step is permitted, in any utility: `bg-`, `text-`, `border-`, and their
`hover:` and `/opacity` variants — e.g. `bg-red-500`, `bg-red-950/40`, `text-red-500`,
`text-green-400`, `hover:border-red-500/50`, `border-red-500/20`. These are semantically
distinct from the arcade accent palette. This widening sanctions the 8 uses that were previously
out of scope: `bg-red-950/40` ×3, `text-red-500` ×2, `text-green-400`, `hover:border-red-500/50`,
`border-red-500/20`.

**The soft-shadow carve-out is withdrawn.** The three stoplight glows
`shadow-[0_0_15px_rgba(...)]` at `App.tsx:226-228` are removed by *The only sanctioned shadow
is a hard offset*. The accepted-exception count for soft shadows goes from three to **zero**.
The hard offset at `App.tsx:319` (`shadow-[4px_4px_0_var(--color-hard-shadow)]`) is not an
exception; it is the sanctioned form.

**These unsanctioned sites MUST be tokenised:**

| Site | Count | Replaced with |
|------|-------|---------------|
| `text-white` / `hover:text-white` in `App.tsx` | 9 — lines 314, 335, 344, 351, 356, 384, 414, 428, 444 | `--color-on-dark` `#fff1e8` |
| `bg-slate-900/20` at `ArcadeBackground.tsx:57` | 1 | a `@theme` token |
| `border-white/5` at `ArcadeBackground.tsx:34, 60, 69` | 3 | a `@theme` token |
| 5 hard-coded `rgba()` values in `.scanline` at `index.css:73-74` | 5 | `@theme` tokens |

`--color-on-dark` is currently dead; this change is its first consumer.

**`--color-scene-*` MUST exist.** `AGENTS.md` hard rule 1 and the previous version of this delta
both refer to a `--color-scene-*` namespace in `src/index.css`. **It does not exist today.** The
namespace MUST be created, holding the scene palette in *The scene palette is a fixed token set*.

**Dead tokens MUST be removed.** 13 `--color-*` tokens have zero consumers: `--color-on-dark`
is retained (it becomes live above), and the following 12 MUST be deleted: `--color-accent-blue`,
`--color-accent-yellow` (becomes live as the sun), `--color-accent-green`, `--color-accent-pink`,
`--color-surface-bright`, `--color-surface-container-lowest`, `--color-surface-container-low`,
`--color-surface-container`, `--color-surface-container-high`, `--color-surface-container-highest`,
`--color-secondary`, `--color-danger-text`.

**The comment at `index.css:19` MUST be deleted.** It reads `/* Legacy tokens kept for backward
compatibility */` and sits above 11 declarations. The claim is **false in both directions**:
7 of those 11 have zero consumers and the other 4 (`--color-on-surface-variant`,
`--color-primary`, `--color-on-primary`, `--color-tertiary`) are live today, so they are not
"legacy" at all. Correcting a false comment is required; leaving it makes the next reader
believe a falsehood about the theme.

**Verify:** `Select-String -Pattern '#[0-9a-fA-F]{3,8}\b|rgba?\(' src\*.tsx src\**\*.tsx` MUST
return **zero** matches, down from exactly three. Then a second audit over `src/index.css`: zero
hard-coded `rgba()` outside a token declaration, `--color-scene-*` present, and each of the 12
named tokens absent. Both are greps.

### Requirement: Car sprite states and lives-based recoloring

`CarSprite` SHALL render three visual states from props `isMoving`, `isCrashed`, `lives`:

- **Idle** — static body, no bounce class.
- **Moving** — body wrapped in `.car-bounce` (`steps(1)`, 300 ms infinite).
- **Crashed** — body offset by 2 units with damage marks, no bounce.

The base scene body colour MUST be `--color-scene-car-body` `#ffc23a`. **Lives-based recoloring
is preserved**: the `--color-car-tier*` tokens remain the mechanism by which remaining lives
change the body colour, and at `lives >= 5` a `.car-aura` overlay MUST render.

| lives | token | value |
|-------|-------|-------|
| 1 | `--color-car-tier1` | `#64748b` |
| 2 | `--color-car-tier2` | `#7ba7c9` |
| 3 | `--color-car-tier3` | `#8ed5ff` |
| 4 | `--color-car-tier4` | `#7dd3fc` |
| 5+ | `--color-car-tier5` | `#facc15` |

(Previously: body colour came *only* from the lives tier tokens; there was no scene base body
colour. The tier table is unchanged.)

#### Scenario: The sprite announces remaining lives to assistive tech
- **GIVEN** any game state
- **WHEN** the sprite is rendered with 3 lives
- **THEN** the `<svg>` carries `role="img"` and `aria-label="Car sprite — 3 lives remaining"`

**Verify:** code read of `CarSprite.tsx:24-32,100,117-123`. **Open:** whether the scene base
body colour and the tier recoloring can coexist without the tier table becoming visually
indistinguishable against `#ffc23a` is a `design.md` question, not a requirement.

### Requirement: Rounded corners

All `--radius-*` tokens are zeroed, so every `rounded-*` utility resolves to 0. The former
`rounded-full` sites (stoplight lights, lives pips, trophy ring) are explicitly `rounded-none`.

**Known deviation — RESOLVED by this change.** `CarSprite`'s SVG `<rect>` primitives still carry
`rx` attributes at `CarSprite.tsx:51, 53, 55, 57, 59, 61, 63, 64` — eight of them, on the main
body, roof, window, rear spoiler, front bumper, headlights, and both wheels. `rx` is a separate
SVG attribute and is not reached by the zeroed radius tokens. See
*Car sprite corner radii sit on the 4-unit grid*.

> **Correction to the previous line list.** The base spec recorded
> `51,53,55,57,59,61,63,65`. The eighth is **line 64, not 65** — line 65 is the first wheel rim
> and carries no `rx`. Verified: `Select-String -Path src\components\CarSprite.tsx -Pattern
> 'rx=|ry='` returns `51, 53, 55, 57, 59, 61, 63, 64`.

**Verify:** grep — `rounded-*` other than `rounded-none` returns 0 across `src/**/*.tsx`
(returns 0 today). The `rx` values are grepped by the requirement that closes the deviation.

---

## ADDED Requirements

### Requirement: The only sanctioned shadow is a hard offset

The only sanctioned shadow in the entire product is a **hard offset `4px 4px 0 <color-token>` —
zero blur, zero spread**. No `shadow-lg`, `shadow-xl`, `drop-shadow-2xl`, `shadow-[0_0_Npx_*]`,
or any other soft or spreading shadow is permitted anywhere in `src/`.

**A single `shadow-hard` utility and a single `--shadow-hard` theme token MUST be created.**
Neither exists today. The offset is currently duplicated verbatim in three places and MUST
collapse onto the new pair: `index.css:69` (`.pixel-panel`), `index.css:79`
(`.game-sector-glow`), and `App.tsx:319` (`shadow-[4px_4px_0_var(--color-hard-shadow)]`).

**These violating sites MUST be patched:**

| Site | Violation |
|------|-----------|
| `App.tsx:226-228` | three `shadow-[0_0_15px_rgba(...,0.8)]` stoplight glows — 15 px blur, no offset |
| `App.tsx:314` | `drop-shadow-2xl` on the menu `<h1>` |
| `App.tsx:380` | `shadow-lg` on the question photo — 15 px blur on a raster `<img>` |

#### Scenario: No soft shadow survives anywhere in the product
- **GIVEN** any element in `src/`
- **WHEN** its box-shadow or drop-shadow is resolved
- **THEN** it is either absent, or a `4px 4px 0 <token>` hard offset with zero blur and zero spread

#### Scenario: The hard offset is defined once
- **GIVEN** a new element needs a hard offset shadow
- **WHEN** the author writes it
- **THEN** the style uses `shadow-hard` or `var(--shadow-hard)`, and the literal `4px 4px 0` does not appear a second time

**Verify:** grep — `shadow-\[|shadow-(sm|md|lg|xl|2xl|inner)\b|drop-shadow` over
`src/**/*.tsx,src/**/*.css` returns 0. Then grep `4px 4px 0` and `4px_4px_0` over `src/` and
require that every remaining hit is inside the single `shadow-hard` definition. Both are greps.

### Requirement: Every layer's tile width is congruent to 0 modulo its own period

**Root cause, stated so it is not repeated: no layer animates `background-position`.** Every
layer animates `transform: translateX()` on the container. `background-position` therefore
resolves **per element**, so at the container's `translateX(-50%)` the second tile is drawn at
its own phase 0, no matter what phase the first tile ended at. The tile boundary is a **hard
phase reset**, not a continuation.

A repeating gradient inside one tile says nothing about continuity *across* the boundary
between two tiles. The previous version of this delta justified `w-1/2` tiles by asserting "the
pan distance is irrelevant because the pattern repeats forever". **That claim is false** and is
withdrawn. The mandatory conditions are:

```
tile_width  ≡ 0 (mod period)
pan         ≡ 0 (mod period)      and with the fixed geometry, pan = tile_width = 1920
```

**Two live bugs exist today and MUST be fixed in PR1.** Both are recorded as defects, not as
features:

1. **The ground layer seams today, and it is a static artefact, not a flicker.** Period 40 px,
   `w-1/2` tiles in a `w-[200%]` container. At the project's own `max-w-[1100px]` panel width,
   `1100 mod 40 = 20`, so the 1 px line grid compresses to half-spacing across a visible seam
   line.

   The severity is understated by calling it a once-per-10-seconds sweep. The game loop runs
   `isMoving` for **3 s** — 2000 ms green then 1000 ms yellow (`App.tsx:111-122`) — and then
   stops it. The layer therefore advances only **0.3 of a cycle** per green light. The A/B tile
   boundary starts at container `x = 1100` and travels `0.3 × 1100 = 330 px` during those 3 s,
   landing at **screen `x = 770 px` — then it parks there for the entire question period**, because
   the question panel is gated on `!isMoving` (`App.tsx:364`) and nothing resumes the animation
   until the next green light. So the 20 px half-spacing gap is a **fixed mid-panel artefact
   visible for most of play time**, not a transient that flashes past. Fix: migrate to the fixed
   `w-[1920px]` tile, where `1920 mod 40 = 0`.
2. **The sky layer cannot be fixed by geometry alone.** Its period is 100 px, and
   `1920 mod 100 = 20`. **The period itself MUST change from 100 px to 128 px**, where
   `1920 mod 128 = 0`. State this explicitly so nobody attempts a tile-geometry-only fix and
   concludes the sky cannot be repaired.

**The redundant `backgroundSize` MUST be removed.** `ArcadeBackground.tsx:95` and `:103` set
`backgroundSize: "1920px 100%"` on the dash tile. On a tile that is already exactly 1920 px wide
this is a no-op, and it is actively harmful: it crops the paint, so it will sabotage a future
`w-1/2` regression by hiding the seam rather than exposing it.

#### Scenario: The ground layer's 1 px line grid is continuous at the panel's own width
- **GIVEN** the game panel is 1100 px wide
- **WHEN** the ground layer runs for one 3-second green light and is then paused
- **THEN** the 1 px line grid holds even spacing across the boundary, with no half-spacing compression left parked mid-panel

**Verify:** computed geometry — `1100 mod 40 = 20` (the live bug) versus `1920 mod 40 = 0`
(the fix). The parked position is arithmetic too: under the fix the boundary starts at container
`x = 1920` and advances `0.3 × 1920 = 576 px` in 3 s, landing at screen `x = 1344` — **outside**
the 1100 px panel, so the seam is off-screen for the whole 10 s cycle instead of parked in view.
**Not verifiable in-browser.**

#### Scenario: The sky period is a divisor of the pan distance
- **GIVEN** the sky layer's `background-size` period
- **WHEN** the period is read
- **THEN** it is 128 px, not 100 px, and `1920 mod 128 = 0`

**Verify:** computed geometry — `1920 mod 100 = 20` proves a geometry-only fix is impossible;
`1920 mod 128 = 0` proves the new period works. Code read of the sky tile's `backgroundSize`.

### Requirement: Layer coverage is bounded and the bound is recorded

At `t = 1` a two-tile container occupies `[-1920, 1920]`. **Any panel wider than 1920 px shows a
hole.** The panel is capped at `max-w-[1100px]`, so the hole is unreachable today — but the cap
is a separate decision from the layer geometry, and MUST NOT be silently lifted past 1920 px.

If the cap ever lifts, the fix is to widen the container to four `w-[1920px]` tiles in a
`w-[7680px]` flex row and pan `-25%` (3840 px = exactly 2 tiles). That keeps both congruence
conditions true.

#### Scenario: The two-tile geometry is safe at the current panel cap
- **GIVEN** the panel is capped at `max-w-[1100px]`
- **WHEN** the container reaches `t = 1`
- **THEN** the occupied span `[-1920, 1920]` fully covers the panel and no gap is visible

**Verify:** computed geometry — `1100 < 1920`. Grep for `max-w-[` in `App.tsx` to confirm the cap.

### Requirement: No drawn feature straddles a tile boundary

**No drawn feature may straddle `x = 0` or `x = 1920` in tile-local coordinates**, or it is torn
in half at the boundary. Discrete scenery MUST be placed off-seam:

- **Hills** — 3 peaks at local `x = 213 / 853 / 1493` (uniform 640 px pitch, and `213 + 1920 =
  2133` is exactly the next tile's first peak, so the pattern wraps), each **no wider than 380 px**
  (half-width 190). The width bound is **part of the requirement, not an aside**: without it
  "off-seam" is an unfalsifiable claim, because an unbounded peak at `x = 213` could easily
  straddle `x = 0`.
- **Trees** — **8 per tile**, at local `x = 120 + 240k` for `k = 0..7`, i.e.
  `120 / 360 / 600 / 840 / 1080 / 1320 / 1560 / 1800`, each **no wider than 96 px**. The count is
  fixed by the period, not chosen: `1920 / 240 = 8` periods fit in the tile, so anything other
  than 8 leaves a non-uniform gap.

Gradient-generated layers — road edge lines (pitch 60) and rumble strip (pitch 192) — satisfy
this by construction, because their pitch divides the 1920 px tile exactly.

Sun and clouds are static within their tile and MUST NOT be animated, so they carry no period
constraint — but they still MUST be off-seam.

#### Scenario: No feature is torn at the boundary
- **GIVEN** any discrete scenery element placed in a 1920 px tile
- **WHEN** its local `x` position and width are read
- **THEN** the element lies wholly inside `(0, 1920)` — `x >= 0` and `x + width <= 1920`

**Verify:** code read of the placement constants, plus arithmetic:

- **Trees** — 8 positions, uniform 240 px pitch, half-width `96 / 2 = 48`. Innermost tree clears
  the left edge by `120 - 48 = 72` px; outermost clears the right by `1920 - (1800 + 48) = 72` px.
  Symmetric, and no tree crosses either edge.
- **Hills** — 3 positions, uniform 640 px pitch, half-width `380 / 2 = 190`. First peak clears the
  left edge by `213 - 190 = 23` px; the wrapped peak at `2133` starts at `2133 - 190 = 1943`, which
  is 23 px past `x = 1920`, so the seam is clear on the right by the same margin.

> **Correction to the previous verify.** The old text verified tree 4 with `840 + 120 = 960 <
> 1920`. That inequality only proves there is dead space on the right — it says nothing about
> whether a tree straddles `x = 0`, which is the property actually required. It is replaced by the
> per-edge clearance arithmetic above.

### Requirement: Layer depth order places far scenery under the ground and road paint over it

The paint order from back to front MUST be:

```
sky  →  hills  →  trees        (far plane, UNDER the ground stripe)
    →  ground tint              (surface plane, base of the road)
    →  road edge lines  →  rumble strip  →  road dashes    (road plane, OVER the ground)
```

The sky is **backmost** and the trees are frontmost within the far plane; the previous version of
this delta listed `hills → sky → trees`, which put the sky behind the hills. That is the correct
z-order — and it is precisely why the sky must be the **slowest** layer: anything at 76.8 px/s
behind a 32 px/s hills layer moves 2.4× faster than its own foreground and the depth read
inverts. See *The parallax ladder gains two rungs, and the sky is its slowest rung*.

Hills and the treeline render **under** the existing ground stripe. Road edge lines and the
rumble strip render **on top of** the ground tint, because they are road-surface paint —
occluding them with the road body would be inverted.

#### Scenario: Road paint is not occluded by the road body
- **GIVEN** the road band and its edge lines and rumble strip
- **WHEN** they are composited
- **THEN** the edge lines and rumble are fully visible above the ground tint, and the hills and trees are fully occluded below it

**Verify:** computed geometry plus a code read of the element order in the JSX. **Not
verifiable in-browser** — there is no browser tooling; a human reviewer confirms the stacking
with the app open.

### Requirement: The parallax ladder gains two rungs, and the sky is its slowest rung

The existing ladder consumes every rung it has: **sky 120 s, ground 10 s, dashes 2 s**. New layers
MUST join that ladder rather than invent a parallel scale, and because all three rungs are taken,
**two new rungs are added — 60 s for the hills and 120 s for the sky.** Layer speeds MUST increase
monotonically with proximity to the viewer — that ordering is what makes the depth read correctly:

| Plane | Layer | Duration | Speed | Ordering |
|-------|-------|----------|-------|----------|
| far (backmost) | sky | 120 s | 16 px/s | slowest |
| far | hills | 60 s | 32 px/s | |
| far | trees | 25 s | 76.8 px/s | |
| surface | ground tint | 10 s | 192 px/s | |
| road | edges, rumble, dashes | 2 s | 960 px/s | fastest |

Speed is `1920 px ÷ duration` for every layer, since every layer pans exactly one tile per cycle.

**Why the sky needs 120 s and not 60 s.** Two reasons, and the second is the binding one:

1. **Fused plane.** At a shared 60 s the sky and the hills both run at `1920 / 60 = 32 px/s`. Two
   layers at identical speed with one behind the other produce **zero relative motion**, and the
   far plane collapses into a single flat sheet. Depth stops reading at the very layer the change
   exists to build.
2. **Grating.** The auditor's finding: the sky's 100 px period is a periodic lattice whose
   50 px-offset duplicate is a **repetitive grating** — the most motion-salient pattern class
   there is, and the textbook trigger for wallpaper-pattern hallucination. "Not faster than the
   hills" is therefore not a sufficient bar. The sky MUST be **clearly** the slowest layer, not
   merely not the fastest of the far pair; 120 s puts it at exactly **half** the hills' speed.

**Two deliberate tradeoffs, and both owe a `design.md` entry.** `AGENTS.md` hard rule 5 requires a
tradeoff to be recorded whenever a deliberate choice pushes against a project posture. Two
choices in this change do:

- **the 60 s hill rung** — a new duration on the existing ladder, and
- **the 120 s sky rung** — a layer slowed by 4.8× from its shipped 25 s.

`design.md` MUST record the option considered and rejected for **each**. **This delta does not
create `design.md`** — the design phase owns it.

#### Scenario: Depth reads by relative speed, not by absolute speed
- **GIVEN** any two layers on different planes
- **WHEN** their durations are compared
- **THEN** the nearer plane has the shorter duration, for every pair

**Verify:** computed arithmetic from the layer table — `120 > 60 > 25 > 10 > 2` s, and
`16 < 32 < 76.8 < 192 < 960` px/s. All five speeds are distinct, so no two planes are tied.
**The `design.md` tradeoff records are verified by that file existing and naming both the 60 s
and the 120 s rungs** — checked at design/verify, not now.

### Requirement: The scene palette is a fixed token set

The scene is a **bright daytime 16:9 panel inside the existing dark shell** — NOT dusk. The
panel is the only bright thing on the page. These tokens are fixed; no other colours are
permitted in the scene.

**Reused as-is (no new token):**

| Role | Token | Value |
|------|-------|-------|
| page shell | `--color-background` | `#0f0f23` |
| panel surface | `--color-surface` | `#1a1a2e` |
| panel border | `--color-frame-strong` | `#6a6a9a` |
| hard shadow | `--color-hard-shadow` | `#05050c` |
| body text | `--color-on-surface` | `#c2c8d0` |
| muted body | `--color-on-surface-variant` | `#bdc8d1` |
| primary | `--color-primary` | `#8ed5ff` |
| sun | `--color-accent-yellow` | `#ffec27` |

**New `--color-scene-*` tokens in `@theme`:**

| Role | Value |
|------|-------|
| sky horizon | `#bfe9ff` |
| sky top | `#5ec5f5` |
| clouds | `#ffffff` |
| far hills | `#4a9e5c` |
| trees (light) | `#2f7a46` |
| trees (dark) | `#245f38` |
| road | `#3a3a48` |
| rumble red | `#e03a3a` |
| rumble white | `#f0f0f5` |
| road dashes | `#e8e8f0` |
| car body | `#ffc23a` |

`--color-accent-yellow` is currently dead; the sun is its first consumer.

#### Scenario: The scene introduces no colour outside the fixed set
- **GIVEN** any colour in the new scene layers
- **WHEN** it is resolved
- **THEN** it is one of the 8 reused tokens or one of the 11 `--color-scene-*` tokens, and no literal hex or `rgba()` appears in `src/**/*.tsx`

**Verify:** grep for hex/`rgba()` (target 0) plus a code read that each scene colour maps to a
named token. **Not verifiable in-browser:** whether the panel reads as "bright daytime" is a
human judgement.

### Requirement: The scene renders only while playing

The background MUST stay gated behind `status === 'playing'`, exactly as it is today. The
out-of-game ambient layer at `App.tsx:188-196` (the four corner accents and the grid) is
**retained unchanged**.

**Accepted trade-off, recorded deliberately:** the menu and mode-selection screens therefore
show **none** of the new scene. The game keeps its existing dark ambience, and the argument that
"the window is the product's identity" is weakened — the identity only appears once the player
is already playing. This trade was accepted knowingly, not overlooked.

#### Scenario: The menu keeps the dark ambience
- **GIVEN** the player is on the menu or mode-selection screen
- **WHEN** the page renders
- **THEN** no scene layer is mounted, and the corner accents and grid at `App.tsx:188-196` render as they do today

**Verify:** code read — `<ArcadeBackground />` stays inside the `status === 'playing'` branch at
`App.tsx:218-221`; grep confirms no second `<ArcadeBackground>` instance.

### Requirement: The blur/glow comparison toggle is not shipped

The blur/glow DEBUG toggle and its `/* DEBUG-DELETABLE */` marker **MUST be deleted.** The
earlier plan to trial two backdrop treatments is withdrawn: blur was trialled during the design
interview and rejected.

**A short removal note MUST be retained** in `src/index.css` recording that blur was trialled,
that it was rejected, and why — soft edges break the 8-bit pixel contract, which is the
`REMOVED: Blur and glow as a visual primitive` requirement in the base spec. The note is the
record; the toggle is not.

#### Scenario: Blur is absent and the reason is written down
- **GIVEN** a future contributor considering a blurred backdrop
- **WHEN** they search `src/index.css` for `blur`
- **THEN** they find zero functional uses and one note recording that blur was trialled and rejected

**Verify:** grep — `backdrop-blur|blur\(|blur-|filter:\s*blur` over `src/` returns 0 (returns 0
today, and must stay 0), and the removal note is present.

### Requirement: Press Start 2P is restricted to display and HUD text

Press Start 2P (`--font-pixel`) MUST be used only on `<h1>`, `<h2>`, HUD elements, and titles,
with a **minimum rendered size of 12 px** and 16 px for display headings. Below 12 px, Manrope
is used. This restriction is the recorded design decision at
`openspec/design/arcade-retrofit.md:159-161`, not a new preference.

**Negative letter-spacing MUST NOT be applied to any pixel-font element.** Press Start 2P is
monospace with no side bearing, so negative tracking pulls glyphs into each other and destroys
the pixel grid. Two sites violate this and MUST be fixed: `App.tsx:314` (`tracking-tighter`,
-0.05em) and `App.tsx:335` (`tracking-tight`). Positive tracking — `tracking-widest`,
`tracking-[0.2em]` — is already in use at those same sites' neighbours and is correct.

The negative tracking at `App.tsx:201`, `:203` and `:472` is on **sans**-font elements and is not
in scope; do not widen the rule to them.

#### Scenario: Pixel-font headings do not collapse their glyphs
- **GIVEN** any element whose `fontFamily` resolves to `var(--font-pixel)`
- **WHEN** its `letter-spacing` is read
- **THEN** the value is zero or positive

**Verify:** grep — `tracking-(tighter|tight)` over `src/**/*.tsx` returns 0 on any line that also
contains `var(--font-pixel)`. Both current sites are named above.

### Requirement: The in-game question is body prose in the sans face

The in-game question MUST render as **body prose in Manrope** (`--font-sans`), not in Press
Start 2P. This is a reversal of the previous version of this delta, which required the pixel
face for consistency with every other headline.

**Rationale, from the project design record** (`openspec/design/arcade-retrofit.md:161`):
"Spanish sentence-case question text is unreadable in a pixel face." The question is the one
screen a player reads under time pressure, so legibility outranks headline consistency.

The question MUST also be:

- **larger** than the current `text-lg sm:text-xl` (`App.tsx:384`) by at least one Tailwind size
  step, i.e. `text-xl sm:text-2xl` or bigger;
- wrapped with `text-wrap: pretty`, so line breaks avoid orphans;
- capped at a line length of **about 70 characters** (`max-w-[70ch]`), the readable measure for
  prose at this size.

#### Scenario: The question is readable prose, not display type
- **GIVEN** a question of 120 Spanish characters
- **WHEN** the player reads it under time pressure
- **THEN** it renders in Manrope at no less than `text-xl`, wraps with `text-wrap: pretty`, and no line exceeds about 70 characters

**Verify:** code read of the question heading at `App.tsx:384-386` — `fontFamily` absent or
`--font-sans`, size step, `text-wrap: pretty`, `max-w-[70ch]`. **Not verifiable in-browser:**
whether 70ch is the right measure for this panel is a human judgement with the app open.

### Requirement: The lit stoplight lamp carries a hard offset; unlit lamps carry none

The three 15 px glows at `App.tsx:226-228` are removed. The **lit** lamp MUST carry a hard offset
`4px 4px 0` in a **darkened shade of its own hue** (red lamp → dark red, yellow → dark amber,
green → dark green). The **unlit** lamps MUST carry **no shadow at all**.

The existing fill difference is **retained as the primary signal** — `bg-red-500` lit versus
`bg-red-950/40` unlit (and its yellow/green siblings). The traffic light therefore keeps **two
independent signals**: fill brightness, and the presence of a hard offset shadow. A player who
cannot distinguish the hues still sees the offset appear on exactly one lamp.

#### Scenario: Exactly one lamp ever carries a shadow
- **GIVEN** `lightState === 'yellow'`
- **WHEN** the three lamps render
- **THEN** only the yellow lamp has a `4px 4px 0` hard offset in a dark amber, and both the red and green lamps have no shadow

**Verify:** grep — `shadow-\[0_0_` returns 0 in `App.tsx`; the three lamps are the only shadow
sites in the stoplight block at `App.tsx:224-230`. **Not verifiable in-browser:** whether a dark
amber offset is legible against each lamp's own fill.

### Requirement: Car sprite corner radii sit on the 4-unit grid

All 8 out-of-grid `rx` values in `CarSprite.tsx` — lines 51, 53, 55, 57, 59, 61, 63, 64 — MUST be
corrected to the **4-unit grid**, which is the sprite's pixel pitch. Today they are `rx="2"` on
the body, roof, and both wheels, and `rx="1"` on the window, spoiler, bumper, and headlights.
None of those values is a multiple of 4.

The corrected radii MUST be `rx="0"` or `rx="4"`. **`rx="2"` is not an acceptable corrected
value**: on the 64×32 viewBox the hero sprite scales 2× (`w-32 h-16` at `App.tsx:247`), so
`rx="2"` renders as a 4-screen-pixel radius — a smooth quarter-circle on a sprite whose every
other edge is a hard pixel step.

**This is a correction, not a deletion.** The previous version of this delta required every `rx`
attribute to be removed outright. Removing them is permitted as the `rx="0"` case, but the
requirement is that the *value* is grid-aligned.

#### Scenario: No sprite edge is off-grid
- **GIVEN** the car sprite at any lives tier
- **WHEN** every `<rect>` `rx` attribute is read
- **THEN** each value is `0` or `4`, and no corner renders as a radius other than a multiple of 4 screen pixels

**Verify:** grep — `rx=` in `CarSprite.tsx` returns 8 matches, every one `rx="0"` or `rx="4"`.
Arithmetic — the viewBox is 64 units wide and the hero renders at 128 px, so 1 unit = 2 screen px
and 4 units = 8 screen px; `rx="2"` = 4 screen px, which is off-grid. `ry=` returns 0.

### Requirement: Answer feedback is snapshotted into retained local state at click time

`handleAnswer` calls `setCurrentQuestion(null)` **synchronously** in both branches
(`App.tsx:140` and `:153`). The panel's render gate at `App.tsx:364` requires `currentQuestion`
to be non-null, so the panel unmounts in the same commit that scores the answer.

**Any feedback bound to the question object can therefore never render.** At click time the
outcome MUST be snapshotted into retained local state as `{ chosen, correct, isCorrect }` —
`chosen` the index clicked, `correct` the resolved answer index, `isCorrect` their comparison —
and the option buttons MUST read that retained state, not `currentQuestion`.

The `correct` index MUST come from the resolved `answer` field, never from authored option order.
Live and offline option order disagree for every question (open gap 2), so keying off order
would mark the wrong option.

#### Scenario: Feedback survives the panel unmounting
- **GIVEN** the player clicks an option and `setCurrentQuestion(null)` runs in the same tick
- **WHEN** React commits
- **THEN** the feedback state still holds `{ chosen, correct, isCorrect }` and the option buttons read from it, not from the now-null question

**Verify:** code read of `handleAnswer` (`App.tsx:125-184`) confirming the snapshot is taken
before the two `setCurrentQuestion(null)` calls, plus a code read of the option rendering showing
it reads the retained state.

### Requirement: Answer feedback is shown without a glyph

**No glyph, icon, symbol, or text badge is introduced.** The three states are distinguished by
geometry and border, not by any character:

| State | Border | Hard offset |
|-------|--------|-------------|
| idle | the standard `pixel-panel` 2 px `border-frame-strong` | none |
| chosen and correct | 2 px border in the outcome colour | `4px 4px 0` in the outcome colour |
| chosen and wrong | 2 px border in the outcome colour | `4px 4px 0` in the outcome colour |
| **correct but not chosen** | 2 px outline, always, even before any answer | none |

The correct option is **always outlined**, whether or not it was chosen. The chosen button swaps
its 2 px border and gains the hard offset in the outcome colour.

Both differentiators are **geometric** — a border colour swap and a 4 px offset shadow — so the
state is not communicated by hue alone.

#### Scenario: A wrong answer shows what the right one was, with no glyph
- **GIVEN** the player picks a wrong option
- **WHEN** the answer resolves
- **THEN** the chosen option is bordered in the outcome colour with a `4px 4px 0` offset, the correct option is outlined, and no glyph or badge appears on either

#### Scenario: The correct answer is marked before the player commits
- **GIVEN** no answer has been chosen yet
- **WHEN** the options render
- **THEN** the correct option carries its outline and none of the options carries a shadow

**Verify:** code read of the option rendering. Grep — the question panel block at
`App.tsx:364-402` contains no `lucide-react` icon component and no `✓`/`✗` character.
**Not verifiable in-browser:** whether border-plus-offset is enough for a colour-blind player is
a human judgement with the app open.

### Requirement: The `--car-color` custom property is consumed or removed `[GAP]`

`CarSprite.tsx:92` sets `--car-color` on the SVG's inline style and nothing ever reads it. The
body colour reaches the rects directly: `carColor(lives)` at line 88 returns a
`var(--color-car-tier*)` string that is passed as a prop and used as `fill` at lines 51 and 53.

The property is therefore dead. It MUST be either:

- **consumed** — `.car-bounce`, `.car-aura`, or the crash treatment reads `var(--car-color)`; or
- **removed** — the inline style key and the declaration are deleted.

Consuming it is preferred: it gives the CSS a single per-instance colour handle, which is what a
restyled car wants. Leaving it set-but-unread is not acceptable — that is the standing **R2-1**
follow-up.

#### Scenario: No dead custom property on the car
- **GIVEN** the car is rendered
- **WHEN** the stylesheet is searched for `var(--car-color)`
- **THEN** it is found in at least one consuming rule, or the property is no longer set

**Verify:** grep — `var(--car-color)` in `src/` returns at least one match, **or**
`--car-color` returns zero matches. Either outcome passes; set-but-unread fails.

### Requirement: Entrance transitions honour reduced motion `[GAP]`

The four `AnimatePresence` entrance blocks — menu (`App.tsx:300-302`), mode select
(`:329-332`), question panel (`:366-369`), game over (`:406-408`) — MUST be gated on
`prefersReducedMotion`, matching the already-correct crash and smoke/exhaust gating at
`App.tsx:236-237, 259, 272`.

All four MUST be gated in the same pass. Fixing only the question panel — the one this change
rewrites — would leave the other three divergent, which is the original defect.

#### Scenario: Reduced motion removes entrance animation
- **GIVEN** the OS reduced-motion setting is on
- **WHEN** the player advances from menu to mode selection, mode selection to play, a question
  appears, or the game ends
- **THEN** each transition is opacity-only, with no `y`, `scale`, or `x` movement

**Verify:** grep — `prefersReducedMotion` guards each of the four `AnimatePresence` blocks.

### Requirement: The change ships as two chained pull requests and is verified by human sign-off

**Delivery is two chained PRs**, each with a clear start, clear finish, autonomous scope,
verification, and rollback:

- **PR1 — contract compliance and provenance.** Everything that fixes a live violation or a false
  claim: the hard-shadow contract, the two live seam bugs, the token cleanup, the tracking fix,
  the car `rx` correction, the dead-token removal, and the deletion of the blur toggle.
- **PR2 — visual work.** The new scenery layers, the scene palette, the layer order, the
  question typography, the stoplight lamp, and the answer feedback visuals.

PR1 is self-contained and reviewable on its own: it changes no layer count and no composition.

**Verification has no automated gate beyond `tsc`.** There is no test runner, no browser
tooling, and no test dependency in this project. `npm run lint` (`tsc --noEmit`) is the only
automated check. The remaining requirements are verified by:

1. **Human visual sign-off** — a person with the app open confirms the seam continuity, the layer
   order, and the legibility judgements this delta explicitly declines to automate.
2. **The seam arithmetic** — computed and written into the artifact, as recorded in
   *Every layer's tile width is congruent to 0 modulo its own period*.

Every requirement above that says "not verifiable in-browser" depends on the first of these.
That is a deliberate consequence of the project's zero-test-runner posture, not an oversight.

#### Scenario: PR1 is reviewable without the visual work
- **GIVEN** PR1 is opened on its own
- **WHEN** a reviewer reads its diff
- **THEN** it contains no new scenery layer, no new scene token in use, and no composition change

**Verify:** `git diff --stat` on the PR1 branch shows changes to `index.css`, `App.tsx`,
`ArcadeBackground.tsx`, and `CarSprite.tsx` only, with no added layer element in the JSX.

---

## REMOVED Requirements

None. The base spec's `REMOVED: Blur and glow as a visual primitive` and `Rounded corners` stay
removed; this delta closes their recorded deviations rather than reversing them. No requirement
in the merged base spec is deleted by this change.

---

## Decisions reversed by the 2026-09-28 interview and the adversarial re-verification

Recorded so the reversal is auditable. Each of these was asserted in the first draft of this
delta, or in the post-interview revision, and is now withdrawn. The **Sky duration** and
**Tree duration** rows come from the adversarial re-verification that followed the interview,
not from the interview itself; they are listed here rather than left undocumented because both
rows previously carried a rationale that was itself the defect.

| Decision | First draft asserted | Now |
|----------|---------------------|-----|
| **Out-of-game backdrop** | A dimmed copy of the scene renders behind the app shell on menu and mode select | **Rejected.** Requirement deleted. The background stays gated behind `status === 'playing'`. Accepted trade-off recorded under *The scene renders only while playing*. |
| **Question typography** | The question heading MUST use Press Start 2P, to match every other headline | **Reversed.** The question is body prose in Manrope. Rationale from `openspec/design/arcade-retrofit.md:161`. |
| **Answer feedback** | The three states MUST be distinguished by a shape **or glyph** as well as colour | **Rejected.** No glyph. The differentiators are the 2 px border and the 4 px hard offset. |
| **Car corner radii** | Every `rx` attribute MUST be removed; no `<rect>` carries `rx` or `ry` | **Corrected, not deleted.** All 8 values MUST be on the 4-unit grid — `rx="0"` or `rx="4"`. |
| **Edge-line duration** | 1.2 s | **2 s**, giving 960 px/s, the same speed as the rumble strip and the dashes. |
| **Sky duration** | 25 s, on the reading that the sky was scenery that happened to scroll | **120 s.** At 25 s the sky ran at `1920 / 25 = 76.8 px/s` while sitting **behind** hills at `1920 / 60 = 32 px/s` — the backdrop moved `76.8 / 32 = 2.4×` faster than the mid-ground in front of it. A depth-order inversion, and it would have shipped as a visible bug. 120 s puts the sky at 16 px/s, exactly half the hills. |
| **Tree duration** | 30 s; then 25 s, justified as "matching the sky rung" | **25 s**, on the correct rationale: trees sit strictly between the hills (32 px/s) and the ground tint (192 px/s), so every plane has distinct relative motion. The "matching the sky rung" reasoning was the defect — while the sky ran at 25 s it shared the trees' speed, and pairing two far-plane layers at identical speed is what fused the plane. |
| **Sky period** | 100 px, with `w-1/2` tiles excused | **128 px.** `1920 mod 100 = 20`, so `w-1/2` is a live bug on sky as well as ground. Coupled atomically to the tile migration: `1100 mod 128 = 76`. |
| **Tree count per tile** | 4 trees at `120 / 360 / 600 / 840`, verified by `840 + 120 = 960 < 1920` | **8 trees** at `120 + 240k`, because `1920 / 240 = 8` periods fit. The old verify proved dead space, not off-seam clearance. |
| **Hills off-seam** | Peaks at `213 / 853 / 1493` are off-seam — no width given | **Same positions, now with a bound:** each peak no wider than 380 px. The off-seam claim was unfalsifiable without a width. |
| **`w-1/2` justification** | "the pan distance is irrelevant because the pattern repeats forever" | **Withdrawn as false.** `background-position` resolves per element and is never animated, so the tile boundary is a hard phase reset. The mandatory condition is `tile_width ≡ 0 (mod period)`. |
| **Colour exception width** | Only `bg-red-500`, `bg-yellow-500`, `bg-green-500` and `/opacity` variants | **Widened** to the full red/yellow/green ramp in any utility, covering 8 previously unsanctioned uses. |

---

## Out of scope

The game state machine, the `lightState` timing choreography in the `setTimeout` chains
(`App.tsx:116-122`, `:144-150`, `:156-181`), the data layer, and the F1-themed question content
(open gap 7) and the footer credit (open gap 8). Those are unchanged — the choreography is
specified in the base spec and this change does not alter a single beat.
