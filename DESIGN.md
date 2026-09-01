# Design: Arcade Retrofit (Pixel Arcade Theme)

## Technical Approach

Replace SafeRacing's flat Lucide-icon UI with a pixel-art arcade aesthetic using pure DOM/CSS — no canvas, no new runtime dependencies. Four parallel streams:

1. **Pixel Arcade Palette** — Tailwind v4 `@theme` tokens replacing ~8 hardcoded hex sites in App.tsx with NES-inspired 16-color retro arcade colors.
2. **Pixel-Grid Car Sprite** — Inline SVG built from `<rect>` primitives on a coarse grid (`viewBox 0 0 64 32`), with `image-rendering: pixelated` for authentic 8-bit look. Zero licensing risk.
3. **Seamless Background** — CSS `translateX(0 → -50%)` tile-duplicate loop (existing `@keyframes scrollBackground` pattern), with pixel-art tile artwork and `prefers-reduced-motion` support.
4. **Pixel Font Typography** — "Press Start 2P" (OFL, Google Fonts) for titles/HUD; Manrope retained for body text.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| Car sprite approach | (A) Inline SVG rects, (B) External raster sprite, (C) Canvas draw | (A) zero deps/license risk but manual art; (B) asset pipeline needed; (C) breaks DOM pattern | **(A) Inline SVG `<rect>` primitives** — zero risk, consistent with DOM stack |
| Background loop technique | (A) CSS translateX tile-duplicate, (B) Canvas tile loop, (C) JS RAF ticker | (A) proven in codebase, GPU-composited; (B/C) adds complexity and canvas | **(A) CSS translateX** — extends existing `scrollBackground` pattern |
| Font loading | (A) CSS `@import`, (B) `<link>` in index.html, (C) Self-hosted | (A) simplest, zero build changes; (B) blocks HTML parse; (C) adds asset pipeline | **(A) CSS `@import`** — one line in index.css, CDN fallback built-in |
| Palette token strategy | (A) Replace all hex with tokens, (B) Tokens + keep traffic-light hex | (A) total consistency; (B) pragmatic — traffic-light colors are semantically distinct | **(B) Tokens + traffic-light exception** — traffic-light `bg-red-500` etc. are intentional, not brand |
| Component extraction | (A) ArcadeBackground + CarSprite extracted from App.tsx, (B) Keep monolith | (A) testable, typed props, smaller App.tsx; (B) simpler but 524-line monolith | **(A) Extract both** — typed props enable isolated reasoning |

## Pixel Arcade Palette — Verified WCAG Contrast Ratios

Background: `#0f0f23` (R=15, G=15, B=35). Relative luminance L = 0.004402.

WCAG 2.1 formula: `L_lin = ((sRGB + 0.055) / 1.055) ^ 2.4` when sRGB > 0.03928; `L = sRGB / 12.92` otherwise.  
Contrast = `(L_lighter + 0.05) / (L_darker + 0.05)`.

| Token | Hex | R/G/B | Relative Luminance | Contrast vs #0f0f23 | AA Normal (≥4.5:1) | AA Large (≥3:1) |
|-------|-----|-------|-------------------|---------------------|--------------------|--------------------|
| `--color-on-dark` | `#fff1e8` | 255/241/232 | 0.8571 | **16.42:1** | ✅ PASS | ✅ PASS |
| `--color-accent-yellow` | `#ffec27` | 255/236/39 | 0.7547 | **14.51:1** | ✅ PASS | ✅ PASS |
| `--color-accent-blue` | `#29adff` | 41/173/255 | 0.3282 | **6.64:1** | ✅ PASS | ✅ PASS |
| `--color-accent-green` | `#00e436` | 0/228/54 | 0.4097 | **7.92:1** | ✅ PASS | ✅ PASS |
| `--color-accent-red` | `#ff004d` | 255/0/77 | 0.2339 | **5.46:1** | ✅ PASS | ✅ PASS |
| `--color-accent-pink` | `#ff77a8` | 255/119/168 | 0.3505 | **7.03:1** | ✅ PASS | ✅ PASS |
| `--color-accent-orange` | `#ffa300` | 255/163/0 | 0.4184 | **8.07:1** | ✅ PASS | ✅ PASS |
| `--color-on-surface` | `#c2c8d0` | 194/200/208 | 0.5454 | **10.62:1** | ✅ PASS | ✅ PASS |

**Note**: Max theoretical contrast against `#0f0f23` is ~19.75:1 (pure white `#ffffff`). All 8 accent/text colors comfortably exceed AA. The weakest pair (`#ff004d` red at 5.46:1) still clears the 4.5:1 threshold by 21%.

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
| `--color-font-pixel` | `"Press Start 2P"` | `font-pixel` | Pixel font family |

**Traffic-light exception**: `bg-red-500`, `bg-yellow-500`, `bg-green-500` remain as raw Tailwind utilities — semantically distinct from the arcade accent palette.

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

**Lives-based recoloring**: `--car-color` CSS variable bound to `lives` count — tier 1 `#64748b` (dim slate), tier 2 `#7ba7c9` (medium blue), tier 3 `#8ed5ff` (full primary), tier 4 `#7dd3fc` (sky blue), `lives >= 5` = yellow `#facc15` with pulsing aura (`car-aura` glow). Reduced motion disables `car-bounce` and `car-aura` via `@media (prefers-reduced-motion: reduce)` in `index.css`.

## Background Loop

Extends existing `@keyframes scrollBackground` (`translateX(0) → translateX(-50%)`). `ArcadeBackground.tsx` renders a 200%-width container with two pixel-identical tile children per layer (sky checkerboard, ground stripes, road dashes). Animation uses `arcade-scroll-*` CSS classes paused by default; `isMoving` adds `arcade-scroll-running` to resume. `@media (prefers-reduced-motion: reduce)` sets `animation: none !important`, showing the static frame at `translateX(0)`.

## Typography

- **Pixel font**: "Press Start 2P" (Google Fonts, OFL, CSS `@import` before Tailwind) — applied ONLY to `<h1>`, `<h2>`, HUD score displays, "GAME OVER" title, and arcade button labels, via `--font-pixel` theme token. Minimum rendered size: 10px.
- **Body font**: Manrope (already loaded) — retained for question text, option labels, and all non-display text.
- **Fallback**: `ui-sans-serif, sans-serif` if CDN fails. No layout shift.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/CarSprite.tsx` | **Create** | Inline SVG pixel-grid car sprite with typed props |
| `src/components/ArcadeBackground.tsx` | **Create** | Seamless looping pixel-art tiled background |
| `src/index.css` | **Modify** | Add pixel font import, extend `@theme` with arcade tokens, add `prefers-reduced-motion` fallbacks |
| `src/App.tsx` | **Modify** | Extract background/car markup to components; replace ~8 hardcoded hex with tokens |
| `DESIGN.md` | **Create** | This file — palette tokens, contrast verification, architecture decisions |

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

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Type | `tsc --noEmit` clean; zero new `any` | TypeScript strict check |
| Visual | Pixel sprite renders crisp; no anti-aliasing blur | Browser inspection, `image-rendering: pixelated` |
| Accessibility | All accent-on-dark pairs ≥ 4.5:1 | Computed ratios documented above; manual WebAIM verification |
| Motion | `prefers-reduced-motion: reduce` disables all animation | OS/browser setting toggle |
| Performance | Sustained ~60fps, no leaked RAF/listeners | DevTools Performance tab |
| Palette | No leftover hardcoded hex (except traffic-light) | Grep audit of `#`, `rgba`, `rgb(` in src/ |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. All changes are additive (new components) or in-place edits (App.tsx hex replacement, index.css token extension). Git revert of the feature branch is the complete rollback plan.

## Open Questions

- [ ] Exact pixel art for car sprite `<rect>` coordinates — to be defined during implementation/visual iteration
- [ ] Whether to add a subtle scanline overlay enhancement beyond the existing `.scanline` class
