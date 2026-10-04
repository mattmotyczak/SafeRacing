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
> **Amended 2026-09-28 after design-phase reconciliation (R-1…R-10).** The design phase validated
> this delta against source and raised 10 self-contradictions in its
> [Reconciliation ledger](design.md#reconciliation-ledger). The orchestrator ruled on all ten and
> each ruling is applied here. R-1 (delete 11, not 12), R-2 (score-HUD `pixel-panel` chip + a
> per-site mapping replacing the 9-site blanket claim), R-3 (census widened to 17 white/black
> utilities), R-4 (`--color-scene-car-body` **replaces** `--color-car-tier5`), R-5 (escape hatch
> keeps `translateX(-50%)`), R-6 (the two live bugs are **not** the same bug, and they ship in
> different PRs), R-7 (the `(was 30 s)` and `(was 1.2 s)` annotations are deleted as fiction),
> and R-8 (the ground tint and road dashes draw from the scene palette). R-9 was resolved by
> instruction and R-10 is recorded as a pre-existing verify blocker in `state.yaml`.
>
> **Amended 2026-10-03 — art direction replaced: flat bands → shaded, dithered pixel art.** The
> implemented scenery was rejected as "simple blocks of color without any detail". Of the three
> references the user named, **Enter the Gungeon** and **middle-generation (Gen-3) Pokémon** are
> both true pixel art sharing one technique set; **Celeste** is the outlier — hand-drawn vector
> bezier art on no pixel grid — and was **ruled out as unreachable**. The user then chose the
> Gungeon / Gen-3 pixel-art direction. Consequences in this delta: *The scene palette is a fixed
> token set* is rewritten from a flat 11-token count to **per-material tone ramps** (a deliberate
> deviation, recorded in place), and **four requirements are added** — crisp edges, outline
> presence, dithering at band transitions, and atmospheric desaturation by depth layer. This raises
> the delta's totals to **24 added requirements** and **43 scenarios**. NO-RASTER is untouched: art
> hand-authored inline SVG, no image files, no new dependency. Sprite resolutions are fixed and
> user-approved — car 32×16, tree 32×48, cloud 48×24, sun 32×32 stepped octagon (today a
> `<circle>`), hills a 3-tone mass, grass 3-tone with tufts. See
> `openspec/design/arcade-retrofit.md` → *Amendment 2026-10-03* for the rationale, including the
> `preserveAspectRatio="none"` finding that forced band stacks instead of diagonals.
> **A discrepancy found while writing this amendment, not worked around:** the previous version of
> this requirement enumerated **11** scene tokens, but the working tree carries **12** —
> `--color-scene-grass` `#46964f` paints the verge and is in no list. The ramp table below names it.
>
> **Two line-number bases are in use in this file, deliberately.** Citations in the pre-existing
> text are **HEAD `e26fcf1`**. `src/App.tsx` carries uncommitted working-tree changes (the
> question-bank extraction into `src/data/questions.*` plus draw-without-replacement) that shift
> every line below ~30 by **+25**. Citations introduced by this amendment are marked
> **working tree** and carry the shifted numbers. A `file:line` is only meaningful against the
> basis named beside it.
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
| Trees | `.arcade-scroll-trees` | `w-[3840px]` | 2 × `w-[1920px]` | 240 px | 25 s | 76.8 px/s | far |
| Ground tint | `.arcade-scroll-ground` | `w-[3840px]` | 2 × `w-[1920px]` | 40 px | 10 s | 192 px/s | surface |
| Road edge lines | `.arcade-scroll-edges` | `w-[3840px]` | 2 × `w-[1920px]` | 60 px | 2 s | 960 px/s | road |
| Rumble strip | `.arcade-scroll-rumble` | `w-[3840px]` | 2 × `w-[1920px]` | 192 px | 2 s | 960 px/s | road |
| Road dashes | `.arcade-scroll-dashes` | `w-[3840px]` | 2 × `w-[1920px]` | 192 px | 2 s | 960 px/s | road |

Rows are ordered back to front, so **the table order IS the paint order**: sky, hills, trees,
ground, then road paint over ground. Speeds rise strictly with proximity —
`16 < 32 < 76.8 < 192 < 960`, five distinct values, no two planes moving at the same rate.

**Every layer MUST use the same tile geometry: a `w-[3840px]` flex container holding two
`w-[1920px]` tiles.** Sky and ground are migrated off `w-1/2`. This includes the two
viewport-dependent layers that the previous version of this delta excused — see
*Requirement: Every layer's tile width is congruent to 0 modulo its own period* for why that
excuse was false, and note that the two layers' failures are **different bugs**, not one bug
observed twice.

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

(Previously: three layers — sky at period 100 px and ground at 40 px on `w-1/2` tiles in a
`w-[200%]` container, dashes already on two fixed `w-[1920px]` tiles. There were no hills, trees,
edge-line or rumble layers, and the base spec's rationale for the `w-1/2` sky and ground was an
unverified `W mod period` congruence.)

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

**These unsanctioned white/black colour utilities MUST be tokenised — all 17, or none.**
`App.tsx` line numbers below are **working tree**.

| Utility | Count | Sites (working tree) | Replaced with |
|---------|-------|----------------------|---------------|
| `text-white` | 8 | `App.tsx` 339, 360, 369, 376, 409, 439, 453, 469 | `--color-on-dark` — see the per-site mapping below |
| `hover:text-white` | 1 | `App.tsx:381` (back link) | `--color-on-dark` |
| `border-white/5` | 3 | `ArcadeBackground.tsx` 34, 60, 69 | a `@theme` token |
| `bg-white/10` | 2 | `App.tsx` 312 (life pips), 471 (HUD divider) | a `@theme` token |
| `border-white/10` | 1 | `App.tsx:405` (question photo) | a `@theme` token |
| `bg-black/20` | 1 | `App.tsx:405` (question photo) | a `@theme` token |
| `hover:bg-white/5` | 1 | `App.tsx:453` (the "Jugar" button) | a `@theme` token |
| **Subtotal — white/black utilities in `src/**/*.tsx`** | **17** | | |

**The sanctioning rationale, stated once for the whole group.** Each of these is a raw Tailwind
palette step or step-opacity standing in for a colour the theme already owns a name for. The
project's rule is that a colour is a token, and an `/opacity` variant of a built-in step is the
same un-tokenised colour with a number bolted on. Tokenising some and leaving others is not a
middle position — it produces a theme where the same value is named in one place and spelled
inline in another, which is strictly worse than either uniform choice. So the group is
**all-or-nothing**: all 17 are tokenised, and no new alpha-white or alpha-black token is minted
for them, because every one of them is an overlay or divider on a surface that already has a
token, and the opacity is part of the role, not a separate colour.

**Two further groups, listed separately because they are neither white/black nor `.tsx` sites:**

| Site | Count | Replaced with |
|------|-------|---------------|
| `bg-slate-900/20` at `ArcadeBackground.tsx:57` | 1 | a `@theme` token |
| hard-coded `rgba()` values in `.scanline` at `index.css:73-74` — `rgba(18,16,16,0)`, `rgba(0,0,0,0.25)`, `rgba(255,0,0,0.06)`, `rgba(0,255,0,0.02)`, `rgba(0,0,255,0.06)` | 5 | `@theme` tokens |

**23 unsanctioned sites in total: 17 white/black utilities in `src/**/*.tsx`, plus 1
`bg-slate-900/20`, plus 5 `.scanline` `rgba()` values in `src/index.css`.** The three counts are
stated separately on purpose — a single blended total is the arithmetic error this table exists
to remove.

**The 9 `text-white` sites MUST map per-site, not by blanket rule.** Eight of them take
`--color-on-dark`; **one is the exception** and is named as such, because its backing surface
changes in this change:

| Site | Working tree | Backing surface after this change | Contrast |
|------|--------------|-----------------------------------|----------|
| menu `<h1>` | `App.tsx:339` | `.pixel-panel` over `--color-surface` | 15.43:1 ✅ |
| mode `<h2>` | `App.tsx:360` | same | 15.43:1 ✅ |
| difficulty "Fácil" | `App.tsx:369` | same | 15.43:1 ✅ |
| difficulty "Realista" | `App.tsx:376` | same | 15.43:1 ✅ |
| back link | `App.tsx:381` | same | 15.43:1 ✅ |
| question `<h3>` | `App.tsx:409` | same | 15.43:1 ✅ |
| game-over `<h2>` | `App.tsx:439` | same | 15.43:1 ✅ |
| "Jugar" button | `App.tsx:453` | `.pixel-panel` with solid `bg-surface` | 15.43:1 ✅ |
| **score value — THE EXCEPTION** | `App.tsx:469` | **the new `.pixel-panel` HUD chip this change adds** | 15.43:1 **only because of the chip** |

The score value is the exception because it is the **only** one of the nine whose surface is
`status === 'playing'`, which means its background is the new bright scene. Against sky-top
`#5ec5f5` the mapped token measures **1.76:1** and `#ffffff` measures **1.95:1** — both fail. It
is legible **only** because *The score HUD carries a pixel-panel chip* puts a `.pixel-panel`
behind it. The claim "all 9 sites take `--color-on-dark`" was withdrawn because it is true only
as a class-name swap and false as a legibility claim, and the two must not be conflated.

`--color-on-dark` is currently dead; the eight non-exception sites are its first consumers.

**`--color-scene-*` MUST exist.** `AGENTS.md` hard rule 1 and the previous version of this delta
both refer to a `--color-scene-*` namespace in `src/index.css`. **It does not exist today.** The
namespace MUST be created, holding the scene palette in *The scene palette is a fixed token set*.

**Dead tokens MUST be removed. The count is 11, and the subtraction is shown so it is checkable.**

```
13  --color-* tokens have zero consumers today
 -1  --color-on-dark          RETAINED — it becomes live at the 8 sites above
 -1  --color-accent-yellow    RETAINED — it becomes live as the sun
 = 11 deletions
```

The 11, and only these 11, MUST be deleted: `--color-accent-blue`, `--color-accent-green`,
`--color-accent-pink`, `--color-surface-bright`, `--color-surface-container-lowest`,
`--color-surface-container-low`, `--color-surface-container`, `--color-surface-container-high`,
`--color-surface-container-highest`, `--color-secondary`, `--color-danger-text`.

**Two further tokens are LIVE today and are retired by this change, and they are not part of the
11.** They are listed separately so the two groups are never added together by accident:

| Token | Current value | Retired because | Successor |
|-------|---------------|-----------------|-----------|
| `--color-track-line` | `rgba(41, 173, 255, 0.04)` | its only consumer is the ground-tint layer fill, which this change repoints — see *Ground tint and road dashes draw from the scene palette* | `--color-scene-road` |
| `--color-dash` | `rgba(255, 255, 255, 0.15)` | its only consumer is the dash-layer fill, likewise repointed | `--color-scene-road-dashes` |

**13 declarations are removed from `@theme` in total — 11 dead + 2 retired** — plus
`--color-car-tier5`, which is retired by replacement rather than by repointing; see *Car sprite
states and lives-based recoloring*.

**The comment at `index.css:19` MUST be deleted.** It reads `/* Legacy tokens kept for backward
compatibility */` and sits above 11 declarations. The claim is **false in both directions**:
7 of those 11 have zero consumers and the other 4 (`--color-on-surface-variant`,
`--color-primary`, `--color-on-primary`, `--color-tertiary`) are live today, so they are not
"legacy" at all. Correcting a false comment is required; leaving it makes the next reader
believe a falsehood about the theme.

**Verify:** `Select-String -Pattern '#[0-9a-fA-F]{3,8}\b|rgba?\(' src\*.tsx src\**\*.tsx` MUST
return **zero** matches, down from exactly three. Then a second audit over `src/index.css`: zero
hard-coded `rgba()` outside a token declaration, `--color-scene-*` present, each of the **11**
dead tokens absent, and each of the **3** retired or replaced tokens absent. Both are greps. The
contrast figures in the per-site mapping are a **computed contrast ratio**, not an in-browser
observation.

#### Scenario: The `text-white` replacement is mapped per site, not uniformly
- **GIVEN** the nine former `text-white` / `hover:text-white` sites in `App.tsx`
- **WHEN** each site's backing surface and mapped token are read
- **THEN** eight map to `--color-on-dark` over a `.pixel-panel` surface, and the score value at `App.tsx:469` is the single named exception, legible only because the HUD chip requirement places a `.pixel-panel` behind it

**Verify:** code read of each of the nine sites against the per-site mapping table, plus a
**computed contrast ratio** — 15.43:1 for `--color-on-dark` on `--color-surface` `#1a1a2e`, and
1.76:1 for the same token against sky-top `#5ec5f5` (1.95:1 for `#ffffff`). No script can
confirm the chip is present; that is a class read.

### Requirement: Car sprite states and lives-based recoloring

`CarSprite` SHALL render three visual states from props `isMoving`, `isCrashed`, `lives`:

- **Idle** — static body, no bounce class.
- **Moving** — body wrapped in `.car-bounce` (`steps(1)`, 300 ms infinite).
- **Crashed** — body offset by 2 units with damage marks, no bounce.

**Body color MUST come from the lives tier tokens, and the 5+ rung MUST be
`--color-scene-car-body` `#ffc23a`.** `--color-scene-car-body` **REPLACES** `--color-car-tier5`:
it is that rung under a scene name, not a base skin layered under a recolouring mechanism. The
two hexes are 1.05:1 apart — the same colour to the eye — and keeping both would leave
`--color-scene-car-body` **born dead**: `carColor(lives)` has no path that returns `#ffc23a`, so a
separate "base skin" token would be defined and never read, which is the exact defect this
change is auditing out of the theme. **`--color-car-tier5` MUST be deleted** from `@theme` as
part of this replacement.

| lives | token | value |
|-------|-------|-------|
| 1 | `--color-car-tier1` | `#64748b` |
| 2 | `--color-car-tier2` | `#7ba7c9` |
| 3 | `--color-car-tier3` | `#8ed5ff` |
| 4 | `--color-car-tier4` | `#7dd3fc` |
| 5+ | `--color-scene-car-body` | `#ffc23a` |

At `lives >= 5` a `.car-aura` overlay MUST render.

**The remaining legibility obligation: the four tier colours MUST stay distinguishable from
`#ffc23a` at 2× scale.** The hero sprite renders the 64-unit viewBox at 128 px
(`App.tsx:247`), so every unit is 2 screen pixels and adjacent-tier separation is judged at
2×. Adjacent-pair contrast against `#ffc23a` is tier1↔tier2 **1.86**, tier2↔tier3 **1.59**,
tier3↔tier4 **1.04** — the top of the ladder is a few degrees of hue apart. Body hue therefore
MUST NOT be treated as the lives channel: the five life pips and the `aria-label` carry lives,
and the body colour is flavour. The obligation is to keep tiers 1–4 legible, not to make hue
carry the signal.

(Previously: body colour came *only* from the five `--color-car-tier*` tokens, with
`--color-car-tier5` `#facc15` as the 5+ rung, and there was no scene body colour. The tier
table is otherwise unchanged and `--color-car-tier5` is deleted, not kept as a duplicate.)

#### Scenario: The sprite announces remaining lives to assistive tech
- **GIVEN** any game state
- **WHEN** the sprite is rendered with 3 lives
- **THEN** the `<svg>` carries `role="img"` and `aria-label="Car sprite — 3 lives remaining"`

#### Scenario: Five or more lives fills the body with the scene token
- **GIVEN** the sprite is rendered with 5 lives
- **WHEN** the body fill is resolved
- **THEN** it is `var(--color-scene-car-body)` and no path returns `var(--color-car-tier5)`

**Verify:** code read of `CarSprite.tsx:24-32,100,117-123` (working tree) — the 5-arm
`carColor(lives)` switch and its `default` arm MUST return the scene token, and
`--color-car-tier5` MUST be absent from `src/index.css` and from `src/`. **Not verifiable by
any script:** whether tiers 1–4 are distinguishable from `#ffc23a` at 2× is a **human sign-off
item** — a person with the app open and the sprite at 2×. The adjacent-pair ratios above are
computed and are the evidence that it is a risk, not the confirmation that it is acceptable.

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

**Two live defects exist today. They are the same invariant failing at two sites with OPPOSITE
symptoms, and they MUST NOT be described, scoped, or fixed as one bug.** Both are fixed by the
end of the change, but they ship in different PRs — ground in **PR1**, sky in **PR2** — because
the sky's period change is inseparable from its tile migration and its complete redraw, and
PR1's defining property is that it changes no composition. The distinguishing arithmetic:

| | **Ground** | **Sky** |
|---|---|---|
| Period today | 40 px | 100 px |
| Tile today | `w-1/2` in `w-[200%]` | `w-1/2` in `w-[200%]` |
| `1100 mod period` | **20** → **seams** at the project's own `max-w-[1100px]` | **0** → **clean at 1100 px** |
| `720 mod period` | **0** → **clean** at 720 px | 20 → seams |
| Also seams at | 1080, 1180, 1440, 1920 — any `W` not a multiple of 40 | 1024, 976, 852, 768, 720, 540, 414 |
| Character | **Flagship-layout design-consistency failure** — broken at the one width the design was tuned for | **Responsive failure** — clean on desktop, broken on every tablet and phone |
| Fix | **Tile migration only.** `1920 mod 40 = 0`. | **Tile migration AND period change.** `1920 mod 100 = 20`, so geometry alone is impossible. |
| Ships in | **PR1** — a pure class swap on an existing layer | **PR2** — atomic with the period, the duration, and the redraw |

**One unverified `W mod period` invariant, failed differently in two places.** This asymmetry is
load-bearing and was mis-stated in the previous revision of this requirement, which called both
"a live bug" as if one defect had been seen twice. It has not: the sky is **clean at 1100 px by
arithmetic luck** and was never checked anywhere else, while the ground is **broken at 1100 px**
and happens to be clean at 720 px. A single false premise — that `W mod period == 0` holds — was
asserted for both layers and was wrong for each in a different direction. That is the whole
argument for defining the seam condition against the pan distance rather than the viewport.

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
2. **The sky layer is clean today at 1100 px and cannot be fixed by geometry alone.** Its period
   is 100 px, and `1100 mod 100 = 0` — no seam on desktop, which is why nobody has seen it. But
   `1920 mod 100 = 20`, so the fixed tile does not repair it either, and at `720 mod 100 = 20`
   plus 1024, 976, 852, 768, 540 and 414 the current `w-1/2` tile is already broken.
   **The period itself MUST change from 100 px to 128 px**, where `1920 mod 128 = 0`. State this
   explicitly so nobody attempts a tile-geometry-only fix and concludes the sky cannot be
   repaired. The period change and the tile migration are **one atomic change** — see *Background
   scroll layers* — so the sky fix cannot ship in PR1 without also shipping a 76.8 → 16 px/s
   speed change, which is a composition change.

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

### Requirement: The score HUD carries a pixel-panel chip

The score HUD at `App.tsx:465-477` (working tree) sits at `absolute top-6 left-6` **over the new
bright scene**, inside the sky band, with no dark backing of its own. It is the only one of the
nine former `text-white` sites whose backing surface this change alters.

**The score HUD MUST be wrapped in the same `pixel-panel` chip the GUI stoplight already uses**
(`App.tsx:250` is already a `pixel-panel` at `absolute top-6 right-6`, working tree). The chip
MUST carry a solid `--color-surface` background, not a transparent one, because the scene is
bright enough to show through.

This requires **no new token** and is symmetric with existing precedent in the same file: the two
fixed HUD corners of the panel are then the same object.

| Surface behind the HUD | `--color-on-dark` | `#ffffff` |
|---|---|---|
| the scene's sky-top `#5ec5f5`, no chip | **1.76:1** ❌ | **1.95:1** ❌ |
| `--color-surface` `#1a1a2e` on a `.pixel-panel` chip | **15.43:1** ✅ | — |

Both fails are why this is a **layout** requirement and not a token choice: no white available in
the theme is legible over the bare sky, so the fix has to add a surface, not recolour the text.

#### Scenario: The score is legible over the bright scene
- **GIVEN** `status === 'playing'` and the scene is rendering
- **WHEN** the score and combo values are read
- **THEN** the HUD sits on a `.pixel-panel` chip with a solid `--color-surface` background, and the score value's `--color-on-dark` measures 15.43:1 against that background

#### Scenario: The two HUD corners are the same object
- **GIVEN** the game panel is in play
- **WHEN** the top-left HUD and the top-right stoplight render
- **THEN** both are `.pixel-panel` chips over `--color-surface`

**Verify:** code read of `App.tsx:465-477` (working tree) confirming the `pixel-panel` class and
a solid `bg-surface`; grep confirming `App.tsx:250` already carries `pixel-panel`. The 15.43:1
and 1.76:1 figures are a **computed contrast ratio**; no script can judge whether the chip is
large enough in practice. **Not verifiable in-browser** — a human confirms the score does not
clip the chip's padding.

### Requirement: Ground tint and road dashes draw from the scene palette

The ground-tint layer and the road-dashes layer are two of the seven canonical scroll layers, so
their fills are part of the scene's depth read — not decoration. **Both MUST draw from the
scene palette**, not from the dark-scene tokens they use today:

| Layer | Current fill | Current value | MUST become |
|-------|--------------|---------------|-------------|
| Ground tint (`.arcade-scroll-ground`, `ArcadeBackground.tsx:22`) | `--color-track-line` | `rgba(41, 173, 255, 0.04)` | `--color-scene-road` `#3a3a48` |
| Road dashes (`.arcade-scroll-dashes`, `ArcadeBackground.tsx:25`) | `--color-dash` | `rgba(255, 255, 255, 0.15)` | `--color-scene-road-dashes` `#e8e8f0` |

**Why, in one number each.** The legacy fills are tuned for a near-black panel: composited over
the new bright scene they measure **1.02:1** (`--color-track-line`) and **1.06:1**
(`--color-dash`). An animated layer at ~1.04:1 against its own background is **perceptually
static** — it reads as a frozen stripe rather than as motion, which silently destroys the depth
illusion this whole change exists to create, and it does so in a way no seam or divisibility
check would ever catch. The scene-palette replacements measure **9.17:1**
(`#e8e8f0` over `#3a3a48`), which is legible as travel.

`--color-track-line` and `--color-dash` MUST then be removed from `@theme`; they are the two
"retired live" tokens in *Visual token discipline*, and they MUST NOT appear anywhere else in
this change.

#### Scenario: The ground tint is visible motion, not a frozen stripe
- **GIVEN** the game panel in play over the bright scene
- **WHEN** the ground-tint layer's fill is resolved
- **THEN** it is `var(--color-scene-road)` and it is not a ~1:1 overlay on the scene

#### Scenario: The dashes read as travel
- **GIVEN** the game panel in play over the bright scene
- **WHEN** the dash layer's fill is resolved
- **THEN** it is `var(--color-scene-road-dashes)`, which measures 9.17:1 against `--color-scene-road`

**Verify:** code read of `ArcadeBackground.tsx:22` and `:25` (working tree) — both gradient
strings MUST name scene tokens; plus `Select-String -Path src\index.css -Pattern 'track-line|--color-dash'`
MUST return 0 after the change, and the **computed contrast ratios** 1.02:1 / 1.06:1 / 9.17:1
are the recorded evidence. **Not verifiable in-browser** — whether 9.17:1 reads as the intended
weight of road paint is a human judgement with the app open.

### Requirement: Layer coverage is bounded and the bound is recorded

At `t = 1` a two-tile container occupies `[-1920, 1920]`. **Any panel wider than 1920 px shows a
hole.** The panel is capped at `max-w-[1100px]`, so the hole is unreachable today — but the cap
is a separate decision from the layer geometry, and MUST NOT be silently lifted past 1920 px.

If the cap ever lifts, the fix is to **widen the container to four `w-[1920px]` tiles in a
`w-[7680px]` flex row, keeping the existing `translateX(-50%)` keyframe unchanged.** The pan
becomes `3840 px`, which is **exactly 2 tiles**, and `3840` is divisible by every period in the
table:

```
3840 / 128 = 30    3840 / 640 = 6      3840 / 240 = 16
3840 /  40 = 96    3840 /  60 = 64     3840 / 192 = 20     — all six, remainder 0
coverage: at t=1 a 4-tile container spans [-3840, +3840], so a panel up to 3840 px wide is covered
```

**The escape hatch therefore needs NO keyframe change at all** — only a wider container and two
more tiles. `translateX(-50%)` is already the keyframe on every layer; doubling the container
doubles the pan, and the doubled pan is still period-aligned. A previous revision of this
requirement said to "pan `-25%`", which is self-inconsistent: `-25%` of a 7680 px container is
1920 px = **one** tile, and a one-tile pan would not need four tiles at all. That claim is
withdrawn.

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

**The set is a set of per-material tone ramps, not a flat list of single colours.** Each
scene material MUST resolve to a **ramp of four tones — base, shadow, light, highlight** — plus a
shared outline entry. A flat single-colour fill is no longer a conforming value for any scene
material: it is the defect this requirement exists to prevent.

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
| **sun** | **`--color-accent-yellow`** | **`#ffec27` — currently dead, so RETAINED and not deleted; the sun is its first consumer** |

The sun row is the **only** place `--color-accent-yellow` is named. It is deliberately absent
from the delete list in *Visual token discipline*, which is where the earlier revision put it and
where the parenthetical "becomes live as the sun" sat *inside the list that deleted it* — a
token cannot be both deleted and be the sun.

**`--color-scene-*` ramp groups in `@theme`:**

Each group names the **base tone** — the value the previous flat list specified. The remaining
three tones of every group are additions required by this amendment. The naming convention is
`--color-scene-<material>-<tone>`, with `base` as the unsuffixed base tone where the token already
carries a role name (`--color-scene-car-body`, `--color-scene-sky-top`).

| Ramp group | Token | Base value | Tones required |
|---|---|---|---|
| sky | `--color-scene-sky-horizon` | `#bfe9ff` | horizon + top only — the sky is a **two-stop gradient**, not a shaded form, and is not ramped |
| sky (cont.) | `--color-scene-sky-top` | `#5ec5f5` | as above |
| clouds | `--color-scene-clouds` | `#ffffff` | base, shadow, light, highlight |
| hills | `--color-scene-far-hills` | `#4a9e5c` | base, shadow, light — **3 tones**; the mass is 3-tone per the dithering requirement below |
| trees | `--color-scene-trees-light` / `--color-scene-trees-dark` | `#2f7a46` / `#245f38` | the two tokens are the **light and shadow** tones of **one** ramp; base and highlight are added |
| grass | `--color-scene-grass` | `#46964f` | base, shadow, light — **3 tones**; the verge is 3-tone with tufts breaking its top edge |
| road | `--color-scene-road` | `#3a3a48` | base, shadow, light, highlight |
| rumble red | `--color-scene-rumble-red` | `#e03a3a` | base, shadow, light, highlight |
| rumble white | `--color-scene-rumble-white` | `#f0f0f5` | base, shadow, light, highlight |
| road dashes | `--color-scene-road-dashes` | `#e8e8f0` | base, shadow, light, highlight |
| car body | `--color-scene-car-body` | `#ffc23a` | base, shadow, light, highlight |
| sun | `--color-accent-yellow` | `#ffec27` | base, shadow, light, highlight — **reused, not a `--color-scene-*` token** |
| **outline** | `--color-scene-outline` | a dark tone of the material hue | **one shared entry**; see *Every sprite form carries a hard dark outline* |

Two rows of this table carry live traffic that the earlier revision left pointing at dark-scene
tokens: `road` and `road dashes` are the fills of the ground-tint and dash layers respectively. See
*Ground tint and road dashes draw from the scene palette*.

**The grass row is a correction, not an addition.** The previous version of this table listed 11
tokens and did not include a grass colour at all; `--color-scene-grass` exists in the working tree
and paints the verge. Since this amendment rebuilds the grass as a **3-tone** band, the material
needs a ramp, so it is named here rather than left as an unnamed eleventh colour.

**The count is no longer a flat 11 — it is the sum of the ramps above, and it MUST NOT be pinned
to a number.** Pinning it is what made the previous revision incompatible with shading: a count is
the wrong shape of constraint for a set whose size is determined by how many materials the scene
has. The binding constraints are the **per-material tone minimum** (four for a shaded form, three
for the two 3-tone masses) and the **token discipline** below.

**Deviation from the previous version of this requirement, recorded deliberately.** The previous
version fixed the palette at **11 flat `--color-scene-*` tokens** and stated that no other colours
are permitted. This requirement widens that set to roughly **20 ramp entries**. **The rationale is
that the project rule forces it, not that the rule was bent:** `AGENTS.md` hard rule 1 requires
every colour in `src/**/*.tsx` to resolve to an `@theme` token or a `var(--color-*)`, and a
four-tone ramp **cannot be expressed without a token per tone** — there is no shorthand in the rule
for "this colour, four steps". So the ramp widens the *number* of tokens the rule already demands
while changing **no** part of the rule itself. **NO-RASTER is unaffected:** the widened palette
buys more named colours, not more files, and art stays hand-authored inline SVG.

**The `--color-scene-outline` entry is a scene token, not a raw colour**, for the same reason the
rest of the scene palette is. It MUST NOT be spelled as a hex or an `rgba()` in `src/**/*.tsx`.

#### Scenario: The scene introduces no colour outside the fixed set
- **GIVEN** any colour in the new scene layers
- **WHEN** it is resolved
- **THEN** it is one of the 8 reused tokens, one of the `--color-scene-*` ramp entries, or `--color-scene-outline`, and no literal hex or `rgba()` appears in `src/**/*.tsx`

#### Scenario: No scene material is flat-filled
- **GIVEN** any shaded material in the new scene layers — a tree, a hill, a cloud, the sun, a rumble segment, or the road
- **WHEN** its fills are read
- **THEN** it resolves at least three distinct tones of its own ramp — four for a shaded form — and no single colour fills the whole form

**Verify:** grep for hex/`rgba()` (target 0) plus a code read that each scene colour maps to a
named token — including the gradient string literals, which MUST name scene tokens and not retired
ones. For the ramp requirement, a code read that each material names at least three tones from its
own group; **a token count is not a valid check** and the previous `11` is withdrawn. **Not
verifiable in-browser:** whether the panel reads as "bright daytime", and whether the ramps read as
shading rather than as stripes, are human judgements.

(Previously: the palette was fixed at **11 flat `--color-scene-*` tokens** and the scenario's
count was the check. Both the flat-fill allowance and the count are superseded; the two 3-tone
masses — hills and grass — are named as such because a 3-tone ramp is the user's stated intent for
those two, not a shortened version of the 4-tone rule.)

### Requirement: Every scene sprite renders at its own resolution, unscaled and crisp

Every scene sprite MUST declare **its own `viewBox` whose aspect matches the box it is rendered
into**, so that no sprite is ever stretched by its container, and MUST render with crisp edges:
`shape-rendering="crispEdges"` on the `<svg>`, in a context carrying `image-rendering: pixelated`.

The resolutions below are fixed and user-approved — "Gungeon-faithful, one pass". **These are the
sprite's own pixel dimensions**, not the panel size it is laid out at.

| Sprite | Resolution | Construction |
|---|---|---|
| **Car** | 32 × 16 px | hero sprite, unchanged count of states |
| **Tree** | 32 × 48 px | |
| **Cloud** | 48 × 24 px | |
| **Sun** | 32 × 32 px | **stepped octagon with 4 blocky rays.** It is a `<circle>` today and MUST be replaced — a smooth circle has no pixel steps and cannot be crisp at any scale |
| **Hills** | — | a 3-tone mass, not a per-sprite viewBox; band transitions dithered per the requirement below |
| **Grass** | — | a 3-tone band with **tufts breaking the top edge** |

**`preserveAspectRatio="none"` MUST be removed from the hills and trees SVGs, and MUST NOT be
replaced with any other stretch.** The two `preserveAspectRatio="none"` declarations are
`ArcadeBackground.tsx:143` (hills) and `:202` (trees), and they are the documented reason every
feature is drawn as a stack of vertical-edged column and band rects and never as a polygon: the
tile is a fixed `w-[1920px]`, so `none` keeps the horizontal scale at exactly 1:1 (and `meet` would
shrink it too and silently break the 1920 px tiling), but the **viewBox is stretched on the
vertical axis**, which softens every diagonal and shears every non-integer vertical scale. Pixel
art requires diagonals — canopies, hill slopes, cloud edges, sun rays — so the stretch must go,
and the band-stack constraint goes with it.

**The per-sprite viewBox is the replacement, and it is a per-sprite decision precisely because
each sprite has its own aspect.** Laying a sprite out means choosing a rendered box whose aspect
equals its `viewBox` aspect; a container that stretches its child to fill is non-conforming.

#### Scenario: No scene sprite is stretched by its container
- **GIVEN** any scene sprite and the box it is laid out in
- **WHEN** the two aspects are compared
- **THEN** they are equal, and the `<svg>` carries no `preserveAspectRatio` value that stretches

#### Scenario: The sun has pixel steps
- **GIVEN** the sun sprite
- **WHEN** its geometry is read
- **THEN** it is a stepped octagon with 4 blocky rays on a 32 × 32 viewBox, and no `<circle>` element

#### Scenario: Scene edges are crisp
- **GIVEN** any scene sprite
- **WHEN** its rendering attributes are read
- **THEN** the `<svg>` carries `shape-rendering="crispEdges"` and the sprite renders with `image-rendering: pixelated`

**Verify:** code read of the six sprites — each `viewBox` matches its declared resolution; grep —
`preserveAspectRatio` in `src/components/ArcadeBackground.tsx` returns **0**; grep — `<circle` in
`src/` returns **0** for the scene; grep — `crispEdges` returns a hit for every scene `<svg>`.
`image-rendering: pixelated` **exists today only as an inline style on the car `<svg>`**
(`CarSprite.tsx:87`) and must be extended to the scene sprites. **Not verifiable in-browser:** a
human confirms with the app open that no sprite shows a resampling-softened edge.

### Requirement: Every sprite form carries a hard dark outline

Every sprite form MUST carry a **hard 1 px dark outline** in `var(--color-scene-outline)`, drawn
around the form's silhouette. The outline is what separates a sprite from the surface behind it,
and what keeps a silhouette legible when two interior tones of the same ramp sit close together.

The outline MUST be **hard-edged** — a 1 px step, never a soft or blended edge. It is not a
shadow: the project's only sanctioned shadow remains the `4px 4px 0` hard offset, and an outline
MUST NOT be implemented as one.

Every scene material MUST therefore resolve the outline entry, so `--color-scene-outline` MUST
exist as a `--color-scene-*` token (see *The scene palette is a fixed token set*) and MUST NOT be
spelled as a hex or an `rgba()`.

#### Scenario: Every form separates from its background
- **GIVEN** any sprite form in the scene
- **WHEN** its edge is read
- **THEN** a 1 px dark outline in `var(--color-scene-outline)` runs around the silhouette, and the edge is a hard pixel step rather than a blend

#### Scenario: The outline is a colour, not a literal
- **GIVEN** the outline is drawn on any sprite
- **WHEN** its colour is resolved
- **THEN** it is `var(--color-scene-outline)` and not a hex or an `rgba()`

**Verify:** grep — every scene fill/stroke resolves to a `--color-scene-*` or `--color-*` token;
`--color-scene-outline` is declared in `@theme`; **no outline is implemented as `filter: drop-shadow`,
which would blur.** **Not verifiable in-browser:** whether the 1 px outline reads at the panel's
rendered scale, which is a human judgement.

### Requirement: Every ramp and band transition is Bayer-dithered

Wherever a shading ramp changes tone — inside a sprite, and at the boundary between the **bands**
that build the hills mass and the grass verge — the transition MUST be rendered as **Bayer 4×4
ordered dithering**, not as a hard step.

This applies at **three kinds of transition**, and all three MUST be dithered:

1. **Within a sprite** — between adjacent tones of the same ramp (e.g. the tree canopy's base and
   shadow).
2. **Between the bands of a mass** — the hills mass is **3-tone** and the grass verge is
   **3-tone**, and their internal band transitions MUST be dithered. A hard band edge is the flat
   -art defect this amendment removes.
3. **At a band's outer edge against the sky** — the hill silhouette and the grass top edge.

The grass verge additionally MUST carry **tufts breaking its top edge**, so the boundary is not a
single continuous line.

Dithering MUST be expressed with the **Bayer 4×4 ordered matrix**, and MUST be periodic on the
sprite's own pixel grid. A dither pattern whose period does not divide cleanly into the sprite's
grid reintroduces the seam class of defect *Every layer's tile width is congruent to 0 modulo its
own period* governs — the same invariant, one scale down.

#### Scenario: A ramp step reads as a transition, not a seam
- **GIVEN** any two adjacent tones of the same material ramp
- **WHEN** the boundary between them is rendered
- **THEN** it is a Bayer 4×4 ordered dither, and not a single hard edge

#### Scenario: The hills mass is not a set of flat bands
- **GIVEN** the hills mass
- **WHEN** its band transitions are read
- **THEN** each transition is Bayer-dithered, and the mass resolves 3 tones rather than one flat fill per band

#### Scenario: The grass top edge is broken
- **GIVEN** the grass verge
- **WHEN** its top edge is read
- **THEN** tufts interrupt the edge, and the 3-tone band transitions beneath it are Bayer-dithered

**Verify:** code read of each sprite's fill set — a dithered transition is recognisable by more
than one tone being present in the transition region, and **a dither MUST NOT be greppable as a
hex `rgba()`**: a tonal value reached by `/opacity` on a token is not a dither and fails this
requirement. Confirm the Bayer matrix is present in the markup for each transition. **Not
verifiable in-browser:** whether the dither reads as pixel art rather than as noise is a human
judgement with the app open.

### Requirement: Distant layers are desaturated toward the sky token

**Atmospheric desaturation is the primary depth cue of this scene.** Every far-plane layer MUST be
**blended toward the sky token and desaturated**, and every near layer MUST be fully saturated. The
effect MUST increase monotonically with distance:

```
hills (furthest)  →  trees  →  ground/grass verge  →  road paint (nearest)
most desaturated                                    fully saturated
```

Desaturation MUST be expressed as a **token-resolved colour** — the blend target is the sky token,
never a literal `rgba()` over the layer. The hard rule that governs this is the same one that
governs the palette: every colour resolves to an `@theme` token or a `var(--color-*)`.

**This is complementary to the parallax ladder, not a replacement for it.** Both rungs of depth
remain required and neither substitutes for the other: the speed ladder in *The parallax ladder
gains two rungs, and the sky is its slowest rung* carries motion depth, and this requirement
carries tonal depth. A change to one does not discharge the other, and a scene that keeps the
ladder while dropping desaturation still reads flat.

#### Scenario: Depth reads tonally, not only by speed
- **GIVEN** the hills layer and the road-dashes layer
- **WHEN** their colour values are compared
- **THEN** the hills are measurably closer to the sky token in hue and saturation than the dashes, and both are drawn from the scene palette

#### Scenario: Desaturation does not replace the speed ladder
- **GIVEN** any two layers on different planes
- **WHEN** the layer table is checked
- **THEN** the near plane still has the shorter duration, and the far plane is also desaturated — both cues are present

**Verify:** code read that each far-plane sprite's fills name the desaturated ramp entries, and
that no layer is desaturated by an inline `rgba()` overlay. The speed-ladder half of the second
scenario is the existing computed arithmetic — `120 > 60 > 25 > 10 > 2` s. **Not verifiable
in-browser:** whether the tonal step between planes reads as distance is a human judgement with the
app open.


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
  claim: the hard-shadow contract, the **ground seam fix only**, the token cleanup, the tracking
  fix, the car `rx` correction, the dead-token removal, and the deletion of the blur toggle.
- **PR2 — visual work.** The new scenery layers, the **sky period change together with its tile
  migration**, the scene palette, the layer order, the question typography, the stoplight lamp,
  and the answer feedback visuals.

**The two live defects split across the PR boundary, and the split is load-bearing.** The
**ground** seam is a pure class swap on an existing layer — `w-1/2` → `w-[1920px]`,
`w-[200%]` → `w-[3840px]`, with no period, no duration, and no speed change — so it is
reviewable in isolation and **ships in PR1**. The **sky** fix cannot be separated from the sky's
period change (100 → 128 px) and its duration change (25 → 120 s), because `1920 mod 100 = 20`
makes geometry alone impossible and `w-1/2` at 1100 px gives `1100 mod 128 = 76` if the period
lands first. Putting the sky in PR1 would mean PR1 moves a layer from 76.8 px/s to 16 px/s, and
**PR1's defining property is that it changes no composition.** So the sky ships in **PR2**.

The asymmetry in the other direction is why the split exists: reverting PR1 alone is clean and
has no layer-geometry consequence, while reverting PR2 after PR1 has landed leaves the ground
fixed and the sky broken — the invariant half-enforced, and the file reading as though someone
tried and gave up. Both defects are fixed by the end of the change either way; only the
sequencing differs.

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
| **Edge-line duration** | 1.2 s — a figure that has **never shipped**; `src/index.css` carries only 25 s, 10 s and 2 s, so the annotation cited a superseded draft of this delta, not code on disk | **2 s**, giving 960 px/s, the same speed as the rumble strip and the dashes. The `1.2 s` figure is withdrawn outright rather than corrected, because there is no prior value to correct it to. |
| **Sky duration** | 25 s, on the reading that the sky was scenery that happened to scroll | **120 s.** At 25 s the sky ran at `1920 / 25 = 76.8 px/s` while sitting **behind** hills at `1920 / 60 = 32 px/s` — the backdrop moved `76.8 / 32 = 2.4×` faster than the mid-ground in front of it. A depth-order inversion, and it would have shipped as a visible bug. 120 s puts the sky at 16 px/s, exactly half the hills. |
| **Tree duration** | 30 s — a figure that has **never shipped**, and which sat in a table annotation citing a superseded draft of this delta rather than code on disk; then 25 s, justified as "matching the sky rung" | **25 s**, on the correct rationale: trees sit strictly between the hills (32 px/s) and the ground tint (192 px/s), so every plane has distinct relative motion. The "matching the sky rung" reasoning was the defect — while the sky ran at 25 s it shared the trees' speed, and pairing two far-plane layers at identical speed is what fused the plane. The `30 s` annotation is deleted, not corrected: nothing ever ran at 30 s. |
| **Sky period** | 100 px, with `w-1/2` tiles excused on the claim that the sky was "visually continuous at the designed panel width" | **128 px.** `1920 mod 100 = 20` means the fixed tile cannot host a 100 px period, and `1100 mod 128 = 76` means the period cannot land before the migration. Coupled atomically to the tile migration. **Corrected framing:** the sky is **not** a live bug at 1100 px — `1100 mod 100 = 0`, so desktop is clean today and the failure appears at 1024, 976, 852, 768, 720, 540 and 414. The ground *is* a live bug at 1100 px. They are one invariant failing in two places with opposite symptoms, not one bug seen twice. |
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

> **Pre-existing verify blocker this change does NOT clear.** `openspec/config.yaml` →
> `rules.verify.audits` carries a FRAMING AUDIT whose **code check returns non-zero today** at
> `App.tsx:497` (`Desarrollado por el Equipo Foxtrot`) and `App.tsx:499` (`Proyecto Final`) —
> both rendered in the in-game footer to every player (open gap 8). **It fails identically before
> and after this change.** `sdd-verify` for this change will therefore FAIL that audit, and that
> is **expected and pre-existing, not a regression from this work**. Rewriting a credit line is
> an authorship decision for the team, not an agent's judgement: deleting "Equipo Foxtrot" strips
> a name from work the team did. Recorded in `state.yaml` → `pre_existing_blockers` so the verify
> phase does not misread the failure.
