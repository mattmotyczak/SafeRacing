# Proposal — Cartoon daytime road scene, dimmed page backdrop, and UI/UX revision

**Change:** `arcade-scene-backdrop`
**Domain:** `game`
**Status:** specced — `design.md` and `tasks.md` still pending, nothing implemented
**Source:** `exploration.md` in this folder (recovered from Engram obs #54, confirmed with the user in plan mode on 2026-09-01, never started)

> **Reconstructed 2026-09-28.** `state.yaml` declared `artifacts: proposal: proposal.md` but the file did not exist — the change had an exploration and a state file and nothing else. This proposal is derived entirely from `exploration.md`; no new decisions are introduced.

> **Scope extended 2026-09-28.** The user extended this change from the background alone to
> the background **plus the car, the stoplight, and the question/answer bubble**, as a single
> general UI/UX revision pass. The original text explicitly excluded the car; that exclusion
> is now inverted and the car is in scope. Writing the spec surfaced three live contract
> violations that no existing check covers — they are marked `[GAP]` in the spec delta and
> folded into scope rather than filed as separate changes, because all three are inside the
> surfaces this pass already rewrites.

## Problem

The shipped Arc A background is an abstract in-game gradient: a sky checkerboard, faint ground stripes, and road dashes. It reads as "arcade" but not as a place. The user's brief is a **colorful daytime cartoonish pixel landscape — road, hills, trees** — and a dimmed copy of that same scene as the backdrop of the out-of-game page, replacing the corner-square ambient layer at `src/App.tsx:188-195`.

Two constraints make this non-trivial rather than cosmetic.

**1. The periodicity rule.** Every new layer's period must divide 1920 px, or the wrap seams. This is the constraint that produced the R3-1 fix and it is enforced by hand, not by a test — there is no test runner, so the arithmetic is the only proof.

**2. The zero-blur contract.** The brief asks for a *blurred* backdrop, and the arcade contract forbids `backdrop-blur`, `blur()`, `blur-*`, and soft shadows outright. The resolution is a **DEBUG side-button toggle** comparing two treatments, defaulting to a pixel-block SVG filter so the shipped state honours the contract.

## Scope

### Background

- New in-game layers: far hills, a mid-ground of trees and shrubs, and a road band with edge lines and a red/white rumble strip, layered under the existing sky and replacing/merging the current ground layer.
- Blocky pixel sun and clouds, placed **off-seam** (e.g. x = 960 within the tile) so nothing straddles the wrap boundary.
- `<ArcadeBackground isMoving={false} />` in a `fixed inset-0 -z-10 pointer-events-none` wrapper behind the app shell, replacing `src/App.tsx:188-195`.
- A `--color-scene-*` token family in `@theme`.
- The DEBUG blur-comparison toggle, with its full removal contract.

### Car

- Remove the `rx` attributes from every `<rect>` in `CarSprite.tsx` — closes **R2-2**, a deviation the base spec already records against the REMOVED `Rounded corners` requirement. The zeroed radius tokens do not reach SVG `rx`; it is a separate attribute.
- Resolve the dead `--car-color` custom property set at `CarSprite.tsx:92` and read by nothing — closes **R2-1**. Prefer consuming it as the single per-instance colour handle, since a restyled car needs exactly one.
- A restyled sprite consistent with the daytime-cartoon scene. The sprite grid, the 4-unit rect on a 64×32 viewBox, the `image-rendering: pixelated` treatment, and the three states — idle, moving, crashed — all stay.

### Stoplight

- Replace the three `shadow-[0_0_15px_rgba(...)]` soft glows at `App.tsx:226-228` with a hard offset shadow in a token-resolved colour. These violate the zero-soft-shadow rule and are invisible to the current verification: the `Blur and glow` removal enumerates *blur*-based glows, and the token-discipline grep finds the `rgba()` but the traffic-light carve-out then permits it. Removing them drops the accepted-exception count from three to **zero**.
- The `bg-red-500` / `bg-yellow-500` / `bg-green-500` utilities and the `setTimeout` choreography are untouched.

### Question and answer bubble

- Remove the `shadow-lg` soft shadow on the question photo at `App.tsx:380`.
- Set the question heading in the pixel display face to match every other headline in the app — it is currently the only one left in body sans, and it is the one screen a player reads under time pressure.
- Raise the answer options from `text-xs font-medium` to a legible size and weight.
- Add answer feedback: which option was chosen, whether it was right, and which was right when it was not — distinguished by shape or glyph as well as colour, since colour-only state fails for colour-blind players on a time-pressured screen.

### Also in scope, because this pass already touches the surface

- Gate the four `AnimatePresence` entrance transitions on `prefersReducedMotion` — closes the base spec's recorded known gap. The crash and smoke animations are already correctly gated; the entrance blocks are not, and fixing only the question panel would leave the other three divergent.

Out of scope: the game state machine, the `lightState` timing choreography in the `setTimeout` chains, the data layer, and the `w-[3840px]` dash-layer geometry.

## Approach

Pure CSS plus token-filled inline SVG following the `CarSprite` `<rect>` pattern. No image assets, no canvas, no new dependency.

Every scenery piece is duplicated per tile so the wrap is seamless, and each new layer carries `motion-reduce:animate-none` **and** an entry in the `prefers-reduced-motion` block at the bottom of `src/index.css` — two places, no exceptions.

## Success criteria

- `npx tsc --noEmit` exits 0.
- Period-divisibility audit passes for every layer: `640 | 1920` (hills), `240 | 1920` (trees), `60 | 1920` (edge lines), `192 | 1920` (rumble). The sun and clouds are off-seam.
- Every new scenery layer uses the fixed `w-[1920px]` × 2 in `w-[3840px]` tile geometry, **not** `w-1/2`. The existing sky and ground layers may keep `w-1/2` only because their fills are infinitely-repeating gradients; the new layers are discrete scenery and a viewport-dependent tile would seam.
- No hex and no `rgba()` anywhere in `src/**/*.tsx` — the count drops from three accepted stoplight lines to **zero**.
- `prefers-reduced-motion` list updated with every new layer class, and all four `AnimatePresence` entrance blocks gated.
- Any real `blur(` is confined to the `/* DEBUG-DELETABLE */` block and nowhere else.
- Zero `rx=` / `ry=` in `CarSprite.tsx`.
- `var(--car-color)` has at least one consumer, or the property is gone. Never set-and-unread.
- No `shadow-lg` and no `0_0_`-spread shadow in `App.tsx`.
- The R3-1 fix at `ArcadeBackground.tsx:88` — the `flex` class on the dash container — is untouched.

## Rollback

All changes are additive presentation-layer edits to `ArcadeBackground.tsx`, `App.tsx`, `index.css`, and the `--color-scene-*` tokens. No data, no schema, no API, no state machine.

`git revert` of the branch is the complete rollback. The DEBUG toggle is independently removable in one pass via its `/* DEBUG-DELETABLE */` markers, without reverting the scene.

## Next phase

`exploration.md` and the spec delta at `specs/game/spec.md` are done. The delta carries
new rows for *Background scroll layers*, the out-of-game backdrop, the stoplight glow, the
car corners and `--car-color`, the question bubble contract, answer feedback, and
reduced-motion gating on the entrance transitions.

**`design.md` is next**, and it has three decisions that cannot be defaulted:

1. **The stoplight glow.** The spec delta recommends converting the 15 px soft glows to a
   hard offset shadow, which empties the traffic-light exception. If the team wants to keep
   the bloom, that is a named, deliberate divergence from the hard-shadow contract and
   belongs in `openspec/design/` as such. Do not let it survive as an unexamined artifact
   of a colour-only carve-out.
2. **The car skin.** A restyle must land on one colour handle. Today `carColor(lives)`
   threads a token through props *and* a dead `--car-color` sits beside it; pick one.
3. **Answer feedback without colour-only state.** The three states need a non-colour
   differentiator, and the correct index must key off the resolved `answer` — which open
   gap 2 makes non-obvious, since live and offline option order disagree for every
   question.

Then `tasks.md`, grouped by deliverable, each completable in one session.

**Nothing here is implemented.** The car, stoplight, and bubble work is scoped and specced
only.
