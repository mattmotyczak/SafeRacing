# Design — Arcade Retrofit: Pixelated Retro (8-bit Arcade) Delta

> **Record.** Rationale for the shipped Arc A. Migrated from `DESIGN.md` Part 1 on 2026-09-28.
> **Status:** shipped, verified, reviewed, archived (`openspec/changes/archive/2026-09-01-arcade-retrofit/`).
> **Requirements:** `openspec/specs/game/spec.md`.

## Technical Approach

Replace SafeRacing's flat Lucide-icon UI with a pixel-art arcade aesthetic using pure DOM/CSS — no canvas, no new runtime dependencies. Four parallel streams:

1. **Pixel Arcade Palette** — Tailwind v4 `@theme` tokens replacing ~8 hardcoded hex sites in App.tsx with NES-inspired 16-color retro arcade colors.
2. **Pixel-Grid Car Sprite** — Inline SVG built from `<rect>` primitives on a coarse grid (`viewBox 0 0 64 32`), with `image-rendering: pixelated` for authentic 8-bit look. Zero licensing risk.
3. **Seamless Background** — CSS `translateX(0 → -50%)` tile-duplicate loop (existing `@keyframes scrollBackground` pattern), with pixel-art tile artwork and `prefers-reduced-motion` support.
4. **Pixel Font Typography** — "Press Start 2P" (OFL, Google Fonts) for titles/HUD; Manrope retained for body text.

## Pixelated Retro Delta (Design Update — supersedes the neon-synthwave default)

**Direction**: the final look is **8-bit arcade** — pixel art, chunky pixels, hard corners, Press Start 2P display type. The neon-synthwave defaults formerly held in `ORCHESTRATOR.md` (frosted-glass blur panels, smooth radial glows, blurred orbs) are superseded. This change is already partially implemented (`ArcadeBackground.tsx`, `CarSprite.tsx`, `App.tsx` consumption all exist); this delta is **surgical** — close the listed gaps, don't re-architect.

**Stays** (already correct): CSS `translateX(0 → -50%)` tile loop; inline-SVG `<rect>` sprite; `image-rendering: pixelated`; `prefers-reduced-motion` + pause-until-`isMoving` behavior; token palette in `@theme`; traffic-light **fill utilities** (`bg-red-500` / `bg-yellow-500` / `bg-green-500` and their `/opacity` siblings); Manrope body font.

> **Correction — the traffic-light exception is a fill-only claim, and never covered the glows.** The single "traffic-light color exception" row above originally read as one sanction covering both the `bg-*-500` utilities *and* the three 15 px `shadow-[0_0_15px_rgba(...)]` stoplight glows at `App.tsx:226-228`. Those are two different things with two different authorities. The utilities are sanctioned by `AGENTS.md` hard rule 1, because they are semantically distinct from the arcade accent palette. The glow shadows were **never in scope** for this delta, and the *Changes* list directly below says "Glow box-shadows become hard offset shadows" — the same document contradicted itself. The glows are removed by the current `openspec/specs/game/spec.md` (soft-shadow accepted-exception count zero) and are **not** a "stays" item.

**Changes**:
- **Glass → pixel panels**: no `backdrop-blur` anywhere. Panels become solid `--color-surface` + 2px chunky border (`--color-frame-strong`) + hard offset shadow (`--color-hard-shadow`), `border-radius: 0`.
- **Glow/blur → hard edges**: remove the two `blur-[150px]` orbs and the `blur(12px)` car aura; replace with stepped, hard-edged shapes. Glow box-shadows become hard offset shadows. Crash `filter: blur` → stepped opacity/transform only.
- **Curves → corners**: zero the `--radius-*` tokens (kills all `rounded-*`); explicit `rounded-full` sites (stoplight, lives pips, trophy ring) get `rounded-none`.
- **Type**: Press Start 2P minimum 12px (HUD/buttons) / 16px (headings); see Typography.
- **Tokenize leftovers**: 10 CarSprite hexes, ArcadeBackground `rgba(41,173,255,0.04)`, and — corrected from the original "6 App.tsx rgba shadow/vignette sites" — **3** `rgba()` sites in `src/**/*.tsx`, all of them at `App.tsx:226-228`, and all three are the stoplight glows. The original count of 6 was never verified; an `rgba(`/`#` audit over the `.tsx` files returns exactly those 3 lines, and there is no fourth or fifth. **Consequence:** the "tokenize them" instruction had nothing left to tokenize — those three lines are deleted outright by the current game spec, not converted to a token.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| Car sprite approach | (A) Inline SVG rects, (B) External raster sprite, (C) Canvas draw | (A) zero deps/license risk but manual art; (B) asset pipeline needed; (C) breaks DOM pattern | **(A) Inline SVG `<rect>` primitives** — zero risk, consistent with DOM stack. Medium **unchanged**; flat-fill discipline **amended 2026-10-03**, see [Amendment 2026-10-03](#amendment-2026-10-03--scenery-art-flat-fills-superseded-by-shaded-dithered-pixel-art) |
| Background loop technique | (A) CSS translateX tile-duplicate, (B) Canvas tile loop, (C) JS RAF ticker | (A) proven in codebase, GPU-composited; (B/C) adds complexity and canvas | **(A) CSS translateX** — extends existing `scrollBackground` pattern |
| Font loading | (A) CSS `@import`, (B) `<link>` in index.html, (C) Self-hosted | (A) simplest, zero build changes; (B) blocks HTML parse; (C) adds asset pipeline | **(A) CSS `@import`** — one line in index.css, CDN fallback built-in |
| Palette token strategy | (A) Replace all hex with tokens, (B) Tokens + keep traffic-light hex | (A) total consistency; (B) pragmatic — traffic-light colors are semantically distinct | **(B) Tokens + traffic-light exception** — traffic-light `bg-red-500` etc. are intentional, not brand |
| Component extraction | (A) ArcadeBackground + CarSprite extracted from App.tsx, (B) Keep monolith | (A) testable, typed props, smaller App.tsx; (B) simpler but 524-line monolith | **(A) Extract both** — typed props enable isolated reasoning |

### Amendment 2026-10-03 — scenery art: flat fills superseded by shaded, dithered pixel art

The **Car sprite approach** decision above is **amended in its fill discipline only**. What was
rejected is the *art*, not the technique: scenery drawn as flat colour bands — single-fill rects
with no interior detail — reads as simple blocks of colour, and that is no longer the visual
contract for the scene.

| Part of the decision | Status |
|---|---|
| **NO-RASTER** — art is hand-authored inline SVG; no image files, no sprite sheet, no new runtime dependency | **UNCHANGED.** Pixel art does not imply raster assets. The medium stays inline SVG in the DOM, and `AGENTS.md` hard rule 5 still holds. |
| Scenery is built from flat, single-colour `<rect>` fills | **SUPERSEDED.** Every sprite form now carries a shading ramp, a hard outline, dithered band transitions, and depth desaturation. |

**The technique set that replaces flat fills.** One set, shared by every sprite:

1. **Outline** — a hard 1 px dark outline on every sprite form. It is what separates a sprite from
   the surface behind it, and what keeps a silhouette legible when the interior tones sit close
   together.
2. **Shading ramp** — four tones per material: base, shadow, light, highlight. **No flat
   single-colour fill anywhere in the scenery.**
3. **Ordered dithering** — Bayer 4×4 at every ramp and band transition. It is what makes the step
   between two tones read as a pixel-art transition rather than as a seam.
4. **Atmospheric desaturation** — distant layers blended toward the sky token and desaturated, near
   layers fully saturated. This is the **primary depth cue**, and it is complementary to the
   parallax speed ladder rather than a substitute for it.

**Confirmed sprite resolutions** (user-approved, one pass):

| Sprite | Resolution | Note |
|---|---|---|
| Car | 32 × 16 px | |
| Tree | 32 × 48 px | |
| Cloud | 48 × 24 px | |
| Sun | 32 × 32 px | stepped octagon with 4 blocky rays — **today a `<circle>`** |
| Hills | 3-tone mass | dithered band transitions |
| Grass | 3-tone | tufts breaking the top edge |

**Palette consequence.** The scene palette grows from **11 flat** `--color-scene-*` tokens to
roughly **20 ramp entries** — four tones per material plus outlines. `AGENTS.md` hard rule 1
requires every colour in `src/**/*.tsx` to be a token or a `var(--color-*)`, and a four-tone ramp
cannot be expressed without a token per tone, so the expansion is **forced by the rule** rather
than chosen against it. This amendment changes no token discipline; it widens the number of tokens
the same rule already demands.

**Crisp edges.** Every scene sprite sets `shape-rendering="crispEdges"` and renders in a context
carrying `image-rendering: pixelated`. **Verified 2026-10-03 against the working tree:**
`image-rendering: pixelated` exists **only as an inline style on the car `<svg>`**
(`CarSprite.tsx:87`) — no CSS rule in `src/` sets it, and no scene sprite carries it.
`shape-rendering` appears **nowhere** in `src/`. Both are therefore work to be done, not existing
behaviour, and the *Stays* list above should be read as "the technique is retained", not "the
declaration is already in place on every sprite".

**The `preserveAspectRatio="none"` finding — and why band stacks were chosen instead of polygons.**
The hills and trees SVGs both set `preserveAspectRatio="none"` (`ArcadeBackground.tsx:143` and
`:202`). That is deliberate: the tile is a fixed `w-[1920px]`, so the horizontal scale is always
exactly 1:1 and the tile can never open a gap, whereas `meet` would shrink the horizontal scale too
and silently break the 1920 px tiling. The cost is that **the viewBox is stretched on the vertical
axis only**, so any diagonal softens and any non-integer vertical scale shears. That is why every
feature was drawn as a stack of vertical-edged column and band rects and never as a polygon.

**That constraint is incompatible with pixel art**, which requires diagonals — tree canopies, hill
slopes, cloud edges, the sun's rays. The fix is **per-sprite viewBoxes whose aspect matches their
own rendering**, so a sprite is never stretched by its container. That removes the band-stack
constraint, and with it the reason band stacks were chosen in the first place.

## Pixel Arcade Palette — Verified WCAG Contrast Ratios (recomputed)

Background: `#0f0f23` (R=15, G=15, B=35). Relative luminance **L = 0.00565** (recomputed; the previously published 0.00440 was an approximation — all verdicts unchanged).
Surface: `#1a1a2e` (R=26, G=26, B=46). Relative luminance **L = 0.01156**.

WCAG 2.1 formula: `L_lin = ((sRGB + 0.055) / 1.055) ^ 2.4` when sRGB > 0.03928; `L = sRGB / 12.92` otherwise.
Contrast = `(L_lighter + 0.05) / (L_darker + 0.05)`. All ratios below are computed, not estimated.

### Text pairs — every pair that actually renders

| Token (use) | Hex | On bg `#0f0f23` | On surface `#1a1a2e` | AA normal ≥4.5 | AA large/UI ≥3 |
|---|---|---|---|---|---|
| `--color-on-dark` (primary body text) | `#fff1e8` | 17.07 | 15.43 | ✅ | ✅ |
| `--color-on-surface` (muted text) | `#c2c8d0` | 11.20 | 10.13 | ✅ | ✅ |
| `--color-on-surface-variant` (links, footer) | `#bdc8d1` | 11.09 | 10.03 | ✅ | ✅ |
| white (`text-white` headings/labels) | `#ffffff` | 18.87 | 17.06 | ✅ | ✅ |
| `--color-primary` (accents, active state) | `#8ed5ff` | 11.78 | 10.65 | ✅ | ✅ |
| `--color-on-primary` (button text on primary fill) | `#00354a` | — | — | ✅ 8.15 vs `#8ed5ff` | ✅ |
| `--color-secondary` | `#b9c8de` | 11.12 | 10.06 | ✅ | ✅ |
| `--color-accent-yellow` (score, emphasis) | `#ffec27` | 15.53 | 14.04 | ✅ | ✅ |
| `--color-accent-blue` (links) | `#29adff` | 7.65 | 6.92 | ✅ | ✅ |
| `--color-accent-green` (success) | `#00e436` | 10.92 | 9.87 | ✅ | ✅ |
| `--color-accent-orange` (warning) | `#ffa300` | 9.43 | 8.52 | ✅ | ✅ |
| `--color-accent-pink` | `#ff77a8` | 7.60 | 6.87 | ✅ | ✅ |
| `--color-accent-red` (danger) | `#ff004d` | 4.82 | **4.35** | ⚠️ bg only — flag below | ✅ |
| `--color-danger-text` | `#ff2d63` | 5.22 | 4.72 | ✅ | ✅ |
| primary @ 60% (HUD labels) | `#5b86a7` blend | 4.86 | — | ✅ (use ≥12px) | ✅ |
| on-surface-variant @ 70% (footer) | `#89909d` blend | 5.88 | 5.44 | ✅ (size still flagged) | ✅ |

**Flag — `--color-accent-red` on surface = 4.35:1** (< 4.5). Rule: `#ff004d` only for icons, large text, borders, and the documented traffic-light exception (all ≥3:1). Any small danger-red **text on a panel** uses `--color-danger-text: #ff2d63` (4.72 on surface).

### Non-text / UI pairs (≥3:1)

| Token | Hex | vs bg | vs surface | Verdict |
|---|---|---|---|---|
| `--color-frame-strong` (chunky 2px border) | `#6a6a9a` | 3.72 | 3.36 | ✅ |
| `--color-primary` (button/CTA fill vs page) | `#8ed5ff` | 11.78 | 10.65 | ✅ |
| Stoplight red (exception) | `#ef4444` | 5.01 | 4.53 | ✅ ≥3 (also ≥4.5) |
| Stoplight yellow (exception) | `#eab308` | — | 8.89 | ✅ |
| Stoplight green (exception) | `#22c55e` | — | 7.49 | ✅ |
| Lives pip red (exception) | `#ef4444` | 5.01 | — | ✅ |

**Note**: max theoretical contrast vs `#0f0f23` is 18.87:1 (pure white). All token pairs pass AA except the single flagged case above, which has a documented fix token.

## Token Table — Tailwind v4 `@theme` Mapping

| Token | Hex | Tailwind Utility | Usage |
|-------|-----|-----------------|-------|
| `--color-background` | `#0f0f23` | `bg-background` | Page/game background |
| `--color-surface` | `#1a1a2e` | `bg-surface` | Card/panel surfaces |
| `--color-accent-red` | `#ff004d` | `text-accent-red` | Primary accent, errors |
| `--color-accent-blue` | `#29adff` | `text-accent-blue` | Secondary accent, links |
| `--color-accent-yellow` | `#ffec27` | `text-accent-yellow` | Score, highlights |
| `--color-accent-green` | `#00e436` | `text-accent-green` | Success, positive |
| `--color-accent-orange` | `#ffa300` | `text-accent-orange` | Warm accent |
| `--color-accent-pink` | `#ff77a8` | `text-accent-pink` | Soft accent |
| `--color-on-dark` | `#fff1e8` | `text-on-dark` | Primary body text on dark |
| `--color-on-surface` | `#c2c8d0` | `text-on-surface` | Secondary text |
| `--font-pixel` | `"Press Start 2P"` | `font-pixel` | Pixel font family |

### Tokens added by this delta

| Token | Value | Tailwind Utility | Usage |
|-------|-------|------------------|-------|
| `--color-frame-strong` | `#6a6a9a` | `border-frame-strong` | Chunky 2px pixel-panel borders (3.72:1 vs bg — passes non-text AA) |
| `--color-hard-shadow` | `#05050c` | none | Hard offset shadows, no blur (`4px 4px 0`) |
| `--color-danger-text` | `#ff2d63` | `text-danger-text` | Small danger text ON panels (accent-red fails 4.5:1 there) |
| `--color-track-line` | `rgba(41,173,255,0.04)` | n/a | ArcadeBackground ground stripe (was hardcoded rgba) |
| `--color-dash` | `rgba(255,255,255,0.15)` | n/a | Road dash layer (was `bg-white/5`) |
| `--color-vignette` | `rgba(5,5,15,0.55)` | n/a | Inner pixel vignette (was `rgba(0,0,0,0.4)`) |
| `--color-atmosphere` | `rgba(10,10,20,0.6)` | n/a | Global atmosphere overlay (unchanged value, tokenized) |
| `--color-smoke` | `#8a9bb5` | `bg-smoke` | Crash smoke blocks (was `bg-slate-400` + blur) |
| `--color-car-tier1..5` | `#64748b` / `#7ba7c9` / `#8ed5ff` / `#7dd3fc` / `#facc15` | n/a | CarSprite lives tiers (was 5 hardcoded hex) |
| `--color-car-window` | `#bfdbfe` | n/a | CarSprite window + rims |
| `--color-car-dark` | `#1e293b` | n/a | CarSprite chassis/wheels/bumper |
| `--color-car-damage` | `#ef4444` | n/a | CarSprite crack + sparks |
| `--color-car-spark` | `#f97316` | n/a | CarSprite spark |
| `--color-car-headlight` | `#facc15` | n/a | CarSprite headlights |

**No `shadow-hard` utility exists.** The hard offset shadow is currently written out in three separate places: `src/index.css:69` (raw `box-shadow` on `.pixel-panel`), `src/index.css:79` (raw `box-shadow` on `.game-sector-glow`), and `src/App.tsx:319` (arbitrary value `shadow-[4px_4px_0_var(--color-hard-shadow)]`). A single `shadow-hard` utility plus a `--shadow-hard` theme token are planned but not yet created.

**Radius zeroing**: all `--radius-*` tokens set to `0` — kills every `rounded-*` at once. `rounded-full` is NOT token-driven; square explicitly: stoplight lights, lives pips, trophy ring (all → `rounded-none`).

**Traffic-light exception**: `bg-red-500`, `bg-yellow-500`, `bg-green-500` remain as raw Tailwind utilities — semantically distinct from the arcade accent palette. Verified 4.53–8.89:1 on surface (≥3:1 large/UI).

## Pixel-Grid Car Sprite

**Structure**: Inline SVG with `viewBox="0 0 64 32"`. Each "pixel" = a `<rect>` element on a 4-unit grid (16×8 effective pixels). CSS `image-rendering: pixelated` on the container preserves crisp edges.

**Frames** (3–5 SVG states):
- **Idle**: Static car body — `<rect>` groups (body, roof, window, spoiler, bumper, wheels, headlights)
- **Moving**: Body group bounced via CSS `steps()` (`carBounce` keyframes, 300ms `steps(1)` infinite — stepped, not smooth, for the 8-bit hop)
- **Crashed**: Distinct frame with damage marks (cracked window rect, spark rects, Y-offset tilt)

**Props interface**:
```tsx
interface CarSpriteProps {
  isMoving: boolean;    // animate between moving frames
  isCrashed: boolean;   // show crashed frame
  lives: number;        // 0–5, drives recoloring via CSS custom properties
  className?: string;   // positioning override
}
```

**Lives-based recoloring**: `--car-color` CSS variable bound to `lives` count via `@theme` tokens `--color-car-tier1..5` (1 = `#64748b` dim slate, 2 = `#7ba7c9` medium blue, 3 = `#8ed5ff` = primary, 4 = `#7dd3fc` sky blue, 5+ = `#facc15` yellow). Window `#bfdbfe`, chassis `#1e293b`, headlights `#facc15`, damage `#ef4444`/`#f97316` are also tokenized (`--color-car-window/dark/damage/spark/headlight`) — zero hardcoded hex remains. Reduced motion disables `car-bounce` and `car-aura` via `@media (prefers-reduced-motion: reduce)` in `index.css`.

> **Open follow-up (R2-1).** `--car-color` is set in `CarSprite.tsx:92` and never consumed — the recoloring currently happens through the tier classes. Either bind the body fill to it or drop it.

**Scale (delta)**: render at integer scale — `w-28 h-16` (112×64px = 1.75×) becomes `w-32 h-16` (128×64px = exactly 2×), so each 4-unit rect maps to 8 whole pixels. Art stays 16×8 effective pixels on the 64×32 viewBox. A 128×64 viewBox art refinement (32×16 effective) is deferred — not needed for the requested look and adds rect-churn risk.

## Background Loop

Extends existing `@keyframes scrollBackground` (`translateX(0) → translateX(-50%)`). `ArcadeBackground.tsx` renders a 200%-width container with two pixel-identical tile children per layer (sky checkerboard, ground stripes, road dashes). Animation uses `arcade-scroll-*` CSS classes paused by default; `isMoving` adds `arcade-scroll-running` to resume. `@media (prefers-reduced-motion: reduce)` sets `animation: none !important`, showing the static frame at `translateX(0)`.

**Seam fix (delta)**: the dash layer is NOT mathematically periodic with panel-relative tile widths — 20×`w-32` (128px) dashes + 19×`gap-16` (64px) gaps = 3776px; half of that (1888px) ≠ integer × 192px period, so one dash merges at the wrap seam every cycle. Fix: replace the flex-dash row with a `repeating-linear-gradient(90deg, var(--color-dash) 0 128px, transparent 128px 192px)` on a tile with `background-size: 1920px 100%` and `background-repeat: repeat`. 1920px = exactly 10 periods. **Critical periodicity constraint**: seamless wrapping requires the pan distance (one tile width) to be ≡ 0 (mod 192px). The dash layer therefore uses TWO FIXED `1920px` tiles inside a `3840px` container (`ArcadeBackground.tsx`), so `translateX(-50%)` pans exactly one container half (1920px = 10 periods) and the A/B boundary stays on a period boundary at every viewport width. Do NOT use `w-1/2` tiles for this layer: tile width then equals the panel width (1100px at the runner's `max-w-[1100px]`), `1100 mod 192 = 140`, and the 64px gap collapses to ~12px at the tile boundary, producing a visible moving seam each 2s cycle (verified finding R3-1). The ground stripe `rgba(41,173,255,0.04)` hardcode becomes `--color-track-line`; sky/ground layers keep their `background-repeat` tiles and are visually continuous at the designed panel width (sky period 100px, 1100 mod 100 = 0; ground period 40px, half-cell offset is sub-visible at rgba alpha 0.04).

> **Open follow-up (R3-2).** The arithmetic is written down and the fix is proven by hand, but there is no automated regression test — there is no test runner. A change to a layer's period re-opens this silently.

## Typography

- **Pixel font**: "Press Start 2P" (Google Fonts, OFL, CSS `@import` before Tailwind) — applied ONLY to `<h1>`, `<h2>`, HUD score displays, "GAME OVER" title, and arcade button labels, via `--font-pixel` theme token.
  - **Minimum sizes (delta, readability)**: display/headings **≥ 16px**; HUD labels, buttons, small titles **≥ 12px**. Current 10px HUD label must bump to 12px — Press Start 2P is illegible below 12px on dark bg and does not anti-alias. Below 12px, use Manrope.
- **Body font (decision, delta)**: **keep Manrope** — Spanish sentence-case question text is unreadable in a pixel face; VT323 rejected for body (thin strokes, needs ≥18px, slower reading). VT323 optionally allowed for short arcade flavor labels (`INSERT COIN`, `HIGH SCORE`) at ≥18px — not required.
- **Fallback**: `ui-sans-serif, sans-serif` if CDN fails. No layout shift.

> **Open follow-up (R4-1).** The `@import` at `index.css:1` causes a FOUT reflow, which contradicts the "No layout shift" claim above. Either switch to a `<link>` with `preload` or soften the claim.

## File Changes

As shipped — a record, not current state.

| File | Action | Description |
|------|--------|-------------|
| `src/components/CarSprite.tsx` | **Modify** | Tokenize all 10 hardcoded hex → `--color-car-*`; render at integer 2× scale (`w-32 h-16`) |
| `src/components/ArcadeBackground.tsx` | **Modify** | Fix dash wrap seam (periodic 1920px tile); tokenize ground stripe rgba → `--color-track-line` |
| `src/index.css` | **Modify** | Zero `--radius-*`; add frame-strong/hard-shadow/car/track/dash/vignette/atmosphere/smoke/danger-text tokens; replace `.glass-panel` with `.pixel-panel`; hard-edged `.car-aura` (no blur) |
| `src/App.tsx` | **Modify** | Replace the 3 remaining `rgba()` sites — all three the stoplight glows at `:226-228` (the original "6" was never verified) — plus glass classes; square stoplight/pips/trophy ring; remove blur orbs; pixel crash/exhaust FX |

## Data Flow

```
App.tsx (state: isMoving, isCrashed, lives)
  ├── ArcadeBackground(isMoving)
  │     └── CSS translateX tile loop (200% container)
  └── CarSprite(isMoving, isCrashed, lives, className)
        └── Inline SVG <rect> primitives, CSS steps() animation
```

## Interfaces / Contracts

```tsx
// CarSprite.tsx
interface CarSpriteProps {
  isMoving: boolean;
  isCrashed: boolean;
  lives: number;       // 0–5
  className?: string;
}

// ArcadeBackground.tsx
interface ArcadeBackgroundProps {
  isMoving: boolean;
  className?: string;
}
```

## Testing Strategy

There is no test runner. These are the checks that were actually run.

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Type | `tsc --noEmit` clean; zero new `any` | TypeScript strict check — `npm run lint` |
| Visual | Pixel sprite crisp at 2× integer scale; dash seam invisible across ≥5 cycles | Browser inspection, `image-rendering: pixelated`, long scroll observation |
| Pixel chrome | No `backdrop-blur` / `blur(` / soft `rounded-*` left in the view | Grep audit of `blur`, `rounded`, `backdrop` in `src/` — target **zero hits, no tolerance clause** |
| Accessibility | Matrix pairs ≥ 4.5:1; the 4.35:1 danger-on-surface case never renders via `--color-danger-text` | Computed ratios in this file; manual WebAIM verification |
| Motion | `prefers-reduced-motion: reduce` disables all animation | OS/browser setting toggle |
| Performance | Sustained ~60fps, no leaked RAF/listeners; removed blur filters lower jank risk | DevTools Performance tab |
| Palette | No leftover hardcoded hex/rgba (except traffic-light and tokenized rgba values) | Grep audit of `#`, `rgba`, `rgb(` in `src/` |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. All changes are surgical in-place edits (component tokenization, index.css tokens/classes, App.tsx rgba/class swaps). Git revert of the feature branch is the complete rollback plan.

## Open Questions (all resolved by the delta)

- [x] Exact pixel art for car sprite `<rect>` coordinates — **RESOLVED**: current 64×32 art stays; changes are tokenization + 2× integer scale only.
- [x] Scanline overlay beyond `.scanline` — **RESOLVED**: keep the two existing overlays at current opacities; no enhancement.
- [x] Body font vs pixel font — **RESOLVED**: Manrope for body, Press Start 2P ≥ 12px (HUD/buttons) / ≥ 16px (headings).
- [x] Sprite pixel density — **RESOLVED**: 64×32 viewBox at 2× integer scale now; 128×64 art refinement deferred (optional future nicety).
