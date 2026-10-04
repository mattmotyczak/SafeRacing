# Exploration & Plan — Cartoon Daytime Road Scene + Dimmed Blurred Backdrop

> **Recovered from Engram** (`sdd/arcade-scene-backdrop/plan`, observation #54) on 2026-09-26. Confirmed with the user in plan mode on 2026-09-01 and never implemented. This is the only record of it.

**Status:** proposed — nothing implemented. No files have been touched.

## Intent

Replace the in-game abstract gradient background with a colorful **daytime** cartoonish pixel landscape — road, hills, trees — and render a dimmed, blurred copy of that same scene as the backdrop of the out-of-game page.

User wording, in order:

1. "pixelated, arcade-y, cartoonish road with some landscapes behind it"
2. "make the out-of-game window have a dimmed down, blurred version of it"
3. "more colorful, DAYTIME landscape, with hills and trees in the bg." — explicitly **not** dusk.

## Scene layers (in-game)

Pure CSS + token-filled inline SVG. No image assets. Every layer's period MUST divide 1920 px, so the wrap stays seamless at any viewport width (the constraint that produced the R3-1 fix).

| Layer | Scroll class | Duration | Period | Content |
|-------|--------------|----------|--------|---------|
| Sky | `.arcade-scroll-sky` (existing) | 25 s | 1920 px | flat block-color daytime blue bands + a blocky pixel sun + 2 blocky clouds per tile |
| Far hills | `.arcade-scroll-hills` (**new**) | 18 s | 240 px (×8 per tile) | stepped silhouette via `clip-path` polygon |
| Mid landscape | `.arcade-scroll-ground` (existing) | 10 s | 480 px (×4 per tile) | cartoon pixel trees / shrubs, `clip-path` blobs or rect-style SVG |
| Road | (new or merged into ground) | 10 s | 60 px (×32 per tile) | warm asphalt band, soft-white edge lines, red/white rumble strip at the bottom edge |
| Lane dashes | `.arcade-scroll-dashes` (existing) | 2 s | 192 px | **unchanged** — keep `dashGradient` and the `w-[3840px]` flex two-tile container |

Constraints carried over from the shipped code:

- The 2 × `1920px`-tile + `translateX(-50%)` mechanism, `isMoving` play-state, `motion-reduce:animate-none` per layer, no JS/RAF, `aria-hidden` — all stay.
- Inline pixel `<svg>` following the `CarSprite` `<rect>` pattern, filled with `var(--color-*)`. **No hardcoded hex in `.tsx`** — the review gate enforces this.
- Each scenery piece MUST be duplicated per tile so the wrap is seamless.
- Place the sun off-seam (e.g. x = 960 within the tile) so it does not straddle the boundary.
- **The R3-1 fix at `ArcadeBackground.tsx:88` MUST stay** — the `flex` class on the dash container.

## Backdrop (out-of-game)

- Render `<ArcadeBackground isMoving={false} />` inside a `fixed inset-0 -z-10 pointer-events-none` wrapper behind the app shell, replacing the corner-square ambient layer currently at `src/App.tsx:188-195`. The faint grid may be kept above it.
- Static (not moving), so `prefers-reduced-motion` is not a concern for this layer.

## Blur treatment — the open choice, and how it gets settled

The user picked a **DEBUG side-button toggle** to compare two treatments live:

| Variant | Technique | Notes |
|---------|-----------|-------|
| **(a) pixel-block** *(default)* | SVG filter: `feMorphology` tile-pixelate + `saturate` / `brightness` | Contract-honest — it is pixelation, not real blur, so the zero-blur pixel contract holds |
| (b) real blur | `filter: blur(8px)` + `saturate(0.6)` + `brightness(0.6)` | Violates the zero-blur contract; only acceptable while marked debug |

**Removal contract — non-negotiable.** Everything related to the toggle (the button, the `backdropMode` state, both filter classes, and the hidden inline SVG `<filter>` defs) MUST be marked `/* DEBUG-DELETABLE */` with a removal guideline comment, so the whole experiment can be cut in one pass. The default stays **pixel-block**, so the shipped state honours the zero-blur contract even with the toggle present.

## Tokens to add

A `--color-scene-*` family in `@theme`: daytime sky bands, sun yellow, cloud white/blue tint, hill-far, hill-near, tree-top, tree-trunk, road asphalt (warm gray), road edge (white/amber), rumble red, rumble white.

## Files that would change

- `src/components/ArcadeBackground.tsx` — new layers and tokens
- `src/App.tsx` — backdrop wrapper, ambient layer removal, debug toggle
- `src/index.css` — `@theme` additions, new scroll classes, reduced-motion list
- `DESIGN.md` — scene section, backdrop section, DEBUG removal guide

## Verification (no test runner; `strict_tdd: false`)

- `npx tsc --noEmit` exit 0.
- Period-divisibility audit: `240 | 1920`, `480 | 1920`, `640 | 1920`, `60 | 1920`, `192 | 1920`; sun placed off-seam.
- Grep: no new hex in `.tsx`.
- Reduced-motion list updated with every new layer class.
- Real `blur(` confined to the `DEBUG-DELETABLE` block.

## Process

A fresh SDD change under the now-`openspec` artifact store: propose → spec → design → tasks → apply → verify → review. `DESIGN.md` gains the scene, backdrop and DEBUG-removal sections.
