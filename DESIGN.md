# Design — SafeRacing

Two arcs are documented here:

- **Part 1 — Arcade Retrofit: Pixelated Retro (8-bit Arcade) Delta** (shipped, verified, archived). Presentation layer: palette, sprite, background loop, typography.
- **Part 2 — Backend & Data-Layer Rigor** (shipped, **not verified**). Data layer: schema, endpoint contract, migrations, offline fallback. See [Part 2](#part-2--backend--data-layer-rigor).

Each part is self-contained. The requirement-level source of truth lives in `openspec/specs/game/spec.md` and `openspec/specs/data-layer/spec.md`; this file holds the rationale behind those requirements.

---

# Part 1 — Arcade Retrofit: Pixelated Retro (8-bit Arcade) Delta

## Technical Approach

Replace SafeRacing's flat Lucide-icon UI with a pixel-art arcade aesthetic using pure DOM/CSS — no canvas, no new runtime dependencies. Four parallel streams:

1. **Pixel Arcade Palette** — Tailwind v4 `@theme` tokens replacing ~8 hardcoded hex sites in App.tsx with NES-inspired 16-color retro arcade colors.
2. **Pixel-Grid Car Sprite** — Inline SVG built from `<rect>` primitives on a coarse grid (`viewBox 0 0 64 32`), with `image-rendering: pixelated` for authentic 8-bit look. Zero licensing risk.
3. **Seamless Background** — CSS `translateX(0 → -50%)` tile-duplicate loop (existing `@keyframes scrollBackground` pattern), with pixel-art tile artwork and `prefers-reduced-motion` support.
4. **Pixel Font Typography** — "Press Start 2P" (OFL, Google Fonts) for titles/HUD; Manrope retained for body text.

## Pixelated Retro Delta (Design Update — supersedes the neon-synthwave default)

**Direction**: the final look is **8-bit arcade** — pixel art, chunky pixels, hard corners, Press Start 2P display type. The neon-synthwave defaults of ORCHESTRATOR.md (frosted-glass blur panels, smooth radial glows, blurred orbs) are superseded. This change is already partially implemented (`ArcadeBackground.tsx`, `CarSprite.tsx`, `App.tsx` consumption all exist); this delta is **surgical** — close the listed gaps, don't re-architect.

**Stays** (already correct): CSS `translateX(0 → -50%)` tile loop; inline-SVG `<rect>` sprite; `image-rendering: pixelated`; `prefers-reduced-motion` + pause-until-`isMoving` behavior; token palette in `@theme`; traffic-light color exception; Manrope body font.

**Changes**:
- **Glass → pixel panels**: no `backdrop-blur` anywhere. Panels become solid `--color-surface` + 2px chunky border (`--color-frame-strong`) + hard offset shadow (`--color-hard-shadow`), `border-radius: 0`.
- **Glow/blur → hard edges**: remove the two `blur-[150px]` orbs and the `blur(12px)` car aura; replace with stepped, hard-edged shapes. Glow box-shadows become hard offset shadows. Crash `filter: blur` → stepped opacity/transform only.
- **Curves → corners**: zero the `--radius-*` tokens (kills all `rounded-*`); explicit `rounded-full` sites (stoplight, lives pips, trophy ring) get `rounded-none`.
- **Type**: Press Start 2P minimum 12px (HUD/buttons) / 16px (headings); see Typography.
- **Tokenize leftovers**: 10 CarSprite hexes, ArcadeBackground `rgba(41,173,255,0.04)`, 6 App.tsx rgba shadow/vignette sites.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| Car sprite approach | (A) Inline SVG rects, (B) External raster sprite, (C) Canvas draw | (A) zero deps/license risk but manual art; (B) asset pipeline needed; (C) breaks DOM pattern | **(A) Inline SVG `<rect>` primitives** — zero risk, consistent with DOM stack |
| Background loop technique | (A) CSS translateX tile-duplicate, (B) Canvas tile loop, (C) JS RAF ticker | (A) proven in codebase, GPU-composited; (B/C) adds complexity and canvas | **(A) CSS translateX** — extends existing `scrollBackground` pattern |
| Font loading | (A) CSS `@import`, (B) `<link>` in index.html, (C) Self-hosted | (A) simplest, zero build changes; (B) blocks HTML parse; (C) adds asset pipeline | **(A) CSS `@import`** — one line in index.css, CDN fallback built-in |
| Palette token strategy | (A) Replace all hex with tokens, (B) Tokens + keep traffic-light hex | (A) total consistency; (B) pragmatic — traffic-light colors are semantically distinct | **(B) Tokens + traffic-light exception** — traffic-light `bg-red-500` etc. are intentional, not brand |
| Component extraction | (A) ArcadeBackground + CarSprite extracted from App.tsx, (B) Keep monolith | (A) testable, typed props, smaller App.tsx; (B) simpler but 524-line monolith | **(A) Extract both** — typed props enable isolated reasoning |

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
| `--color-highlight` (score, emphasis) | `#ffec27` | 15.53 | 14.04 | ✅ | ✅ |
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
| `--color-font-pixel` | `"Press Start 2P"` | `font-pixel` | Pixel font family |

### Tokens added by this delta

| Token | Value | Tailwind Utility | Usage |
|-------|-------|------------------|-------|
| `--color-frame-strong` | `#6a6a9a` | `border-frame-strong` | Chunky 2px pixel-panel borders (3.72:1 vs bg — passes non-text AA) |
| `--color-hard-shadow` | `#05050c` | `shadow-hard` | Hard offset shadows, no blur (`4px 4px 0`) |
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

**Scale (delta)**: render at integer scale — `w-28 h-16` (112×64px = 1.75×) becomes `w-32 h-16` (128×64px = exactly 2×), so each 4-unit rect maps to 8 whole pixels. Art stays 16×8 effective pixels on the 64×32 viewBox. A 128×64 viewBox art refinement (32×16 effective) is deferred — not needed for the requested look and adds rect-churn risk.

## Background Loop

Extends existing `@keyframes scrollBackground` (`translateX(0) → translateX(-50%)`). `ArcadeBackground.tsx` renders a 200%-width container with two pixel-identical tile children per layer (sky checkerboard, ground stripes, road dashes). Animation uses `arcade-scroll-*` CSS classes paused by default; `isMoving` adds `arcade-scroll-running` to resume. `@media (prefers-reduced-motion: reduce)` sets `animation: none !important`, showing the static frame at `translateX(0)`.

**Seam fix (delta)**: the dash layer is NOT mathematically periodic with panel-relative tile widths — 20×`w-32` (128px) dashes + 19×`gap-16` (64px) gaps = 3776px; half of that (1888px) ≠ integer × 192px period, so one dash merges at the wrap seam every cycle. Fix: replace the flex-dash row with a `repeating-linear-gradient(90deg, var(--color-dash) 0 128px, transparent 128px 192px)` on a tile with `background-size: 1920px 100%` and `background-repeat: repeat`. 1920px = exactly 10 periods. **Critical periodicity constraint**: seamless wrapping requires the pan distance (one tile width) to be ≡ 0 (mod 192px). The dash layer therefore uses TWO FIXED `1920px` tiles inside a `3840px` container (`ArcadeBackground.tsx`), so `translateX(-50%)` pans exactly one container half (1920px = 10 periods) and the A/B boundary stays on a period boundary at every viewport width. Do NOT use `w-1/2` tiles for this layer: tile width then equals the panel width (1100px at the runner's `max-w-[1100px]`), `1100 mod 192 = 140`, and the 64px gap collapses to ~12px at the tile boundary, producing a visible moving seam each 2s cycle (verified finding R3-1). The ground stripe `rgba(41,173,255,0.04)` hardcode becomes `--color-track-line`; sky/ground layers keep their `background-repeat` tiles and are visually continuous at the designed panel width (sky period 100px, 1100 mod 100 = 0; ground period 40px, half-cell offset is sub-visible at rgba alpha 0.04).

## Typography

- **Pixel font**: "Press Start 2P" (Google Fonts, OFL, CSS `@import` before Tailwind) — applied ONLY to `<h1>`, `<h2>`, HUD score displays, "GAME OVER" title, and arcade button labels, via `--font-pixel` theme token.
  - **Minimum sizes (delta, readability)**: display/headings **≥ 16px**; HUD labels, buttons, small titles **≥ 12px**. Current 10px HUD label must bump to 12px — Press Start 2P is illegible below 12px on dark bg and does not anti-alias. Below 12px, use Manrope.
- **Body font (decision, delta)**: **keep Manrope** — Spanish sentence-case question text is unreadable in a pixel face; VT323 rejected for body (thin strokes, needs ≥18px, slower reading). VT323 optionally allowed for short arcade flavor labels (`INSERT COIN`, `HIGH SCORE`) at ≥18px — not required.
- **Fallback**: `ui-sans-serif, sans-serif` if CDN fails. No layout shift.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/CarSprite.tsx` | **Modify** | Tokenize all 10 hardcoded hex → `--color-car-*`; render at integer 2× scale (`w-32 h-16`) |
| `src/components/ArcadeBackground.tsx` | **Modify** | Fix dash wrap seam (periodic 1920px tile); tokenize ground stripe rgba → `--color-track-line` |
| `src/index.css` | **Modify** | Zero `--radius-*`; add frame-strong/hard-shadow/car/track/dash/vignette/atmosphere/smoke/danger-text tokens; replace `.glass-panel` with `.pixel-panel`; hard-edged `.car-aura` (no blur) |
| `src/App.tsx` | **Modify** | Replace 6 remaining rgba/glow sites + glass classes; square stoplight/pips/trophy ring; remove blur orbs; pixel crash/exhaust FX |
| `DESIGN.md` | **Modify** | This file — delta sections (palette + AA matrix, typography, loop, sprite) |

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
| Visual | Pixel sprite crisp at 2× integer scale; dash seam invisible across ≥5 cycles | Browser inspection, `image-rendering: pixelated`, long scroll observation |
| Pixel chrome | No `backdrop-blur` / `blur(` / soft `rounded-*` left in the view (except documented stoplight/traffic exceptions) | Grep audit of `blur`, `rounded`, `backdrop` in src/ |
| Accessibility | Matrix pairs ≥ 4.5:1; the 4.35:1 danger-on-surface case never renders via `--color-danger-text` | Computed ratios in this file; manual WebAIM verification |
| Motion | `prefers-reduced-motion: reduce` disables all animation | OS/browser setting toggle |
| Performance | Sustained ~60fps, no leaked RAF/listeners; removed blur filters lower jank risk | DevTools Performance tab |
| Palette | No leftover hardcoded hex/rgba (except traffic-light and tokenized rgba values) | Grep audit of `#`, `rgba`, `rgb(` in src/ |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. All changes are surgical in-place edits (component tokenization, index.css tokens/classes, App.tsx rgba/class swaps). Git revert of the feature branch is the complete rollback plan.

## Open Questions (all resolved by the delta)

- [x] Exact pixel art for car sprite `<rect>` coordinates — **RESOLVED**: current 64×32 art stays; changes are tokenization + 2× integer scale only.
- [x] Scanline overlay beyond `.scanline` — **RESOLVED**: keep the two existing overlays at current opacities; no enhancement.
- [x] Body font vs pixel font — **RESOLVED**: Manrope for body, Press Start 2P ≥ 12px (HUD/buttons) / ≥ 16px (headings).
- [x] Sprite pixel density — **RESOLVED**: 64×32 viewBox at 2× integer scale now; 128×64 art refinement deferred (optional future nicety).

---

# Part 2 — Backend & Data-Layer Rigor

**Status:** shipped in commit `de74dbe`. **Never verified** — see [Verification debt](#verification-debt). Full record: `openspec/changes/archive/2026-09-26-backend-data-rigor/`.

## Technical Approach

Replace the ad-hoc data access — one hardcoded easy-only endpoint, a hardcoded `db_hard` array standing in for the hard mode, and an unversioned database — with a versioned schema, a single mode-validated endpoint serving both modes from Neon, and an env-driven API base URL. A local fallback bank per mode is kept on purpose so the game still runs with the backend down.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| Hard-mode tables | (A) Mirror `hard_questions`/`hard_answers`, (B) generic `questions`/`answers` + `mode` column | (A) zero disruption to live easy data, reuses the existing JOIN shape; (B) cleaner model but requires migrating live easy rows | **(A) Mirror schema** — easy is live with data; a generic table would mean a risky live migration for a final project |
| Migration format | (A) Plain `db/migrations/NNNN_*.sql` + a hand-rolled runner, (B) `node-pg-migrate`, (C) one `schema.sql` | (A) zero new deps, git-versioned; (B) mature but a new dependency and API to learn; (C) simplest but no incremental history | **(A) Plain sequential SQL files** — matches the repo's zero-dependency posture |
| Migration ledger | (A) A `schema_migrations` table, (B) no ledger, idempotency in the SQL itself | (A) records what ran, but adds a table and write-path state; (B) zero state, every statement must be re-runnable | **(B) No ledger** — every statement is `CREATE TABLE IF NOT EXISTS` or guarded by `WHERE NOT EXISTS`. `ON CONFLICT` is unavailable because no unique constraint exists on question text |
| API shape | (A) `GET /api/questions/:mode`, (B) keep `/easy` and add `/hard`, (C) `?mode=` query | (A) one route, mode validated against a fixed set; (B) mirrors the old code most closely; (C) query strings for filters | **(A) `GET /api/questions/:mode`** — the mode toggle stays in the URL path, and the handler is shared with the legacy alias |
| Response contract | One shape for both modes: `{ question, options[], answer, photoString }` | Guarantees the frontend treats easy and hard identically | **Unified contract** — `App.tsx` already consumed exactly this shape from easy |
| Answer index | (A) Store an ordinal column, (B) derive from answer primary-key order | (A) explicit and stable; (B) zero schema change, deterministic via `ORDER BY` | **(B) Derived** — see [Open risk](#open-risk-answer-index-is-positional) |
| API base URL | (A) `VITE_API_BASE_URL` with a localhost default, (B) relative Vite proxy | (A) explicit, works for a deployed client/server split; (B) cleaner in dev but needs proxy config | **(A) `VITE_API_BASE_URL`**, defaulting to `http://localhost:3001` |
| Local fallback | (A) Keep a hardcoded bank per mode, (B) drop it and require the backend | (A) the game is playable offline; (B) one source of truth | **(A) Keep it** — a university demo that dies when the database is unreachable is not a demo. This **contradicts** the original plan to drop `db_hard` entirely; the reversal was deliberate |
| `photostring` | (A) Keep base64 inline, (B) move to hosted media URLs | (A) zero migration of existing rows; (B) smaller payloads but needs storage and URL rewriting | **(A) Keep base64** — pragmatic at this scope; render client-side as `data:image/jpeg;base64,…` |

## Schema

Four tables, one questions/answers pair per mode, related 1:N. All identifiers lowercase and unquoted — **Postgres folds unquoted identifiers to lowercase**, so `q.idHardQuestion` and `q.idhardquestion` resolve to the same column, but writing them lowercase everywhere is what keeps the SQL, the JS and the docs from disagreeing.

```sql
-- created by db/migrations/0001_bootstrap.sql
CREATE TABLE IF NOT EXISTS hard_questions (
  idhardquestion SERIAL PRIMARY KEY,
  question      VARCHAR(255) NOT NULL,
  photostring   TEXT
);

CREATE TABLE IF NOT EXISTS hard_answers (
  idhardanswer    SERIAL PRIMARY KEY,
  answer          VARCHAR(255) NOT NULL,
  iscorrect       BOOLEAN NOT NULL,
  relatedtoquestion INTEGER NOT NULL REFERENCES hard_questions(idhardquestion)
);
```

`easy_questions` / `easy_answers` have the same shape (`ideasyquestion` / `ideasyanswer` / `relatedtoquestion`) and pre-date the repo.

> **Hazard.** `neondb_guide.txt` documents the easy tables in quoted CamelCase (`q."idEasyQuestion"`) with an `idAnswer` column that does not exist. If the live tables were ever created from that snippet, their columns are genuinely mixed-case and every lowercase query in `server.js` fails. Read the real DDL off Neon before trusting this section.

## Endpoint Contract

```
GET /api/questions/:mode        mode ∈ { easy, hard }
  200 → [{ question, options[], answer, photoString }]
  400 → { error: "Invalid mode '<mode>'. Allowed modes: easy, hard" }
  500 → { error: "Failed to fetch <mode> questions" }

GET /api/questions/easy         transitional alias → same handler
```

Design points:

- **Mode selects tables through a fixed map, never string interpolation of user input.** `MODE_CONFIG` (`server.js:28-41`) holds the only four identifiers that reach the SQL text. The mode itself is validated before any query runs, so an unknown mode never reaches Postgres.
- **`answer` is a positional index derived at query time.** `groupQuestions()` (`server.js:46-72`) appends each row's answer to `options` and records the index where `iscorrect` was true. The query pins row order with `ORDER BY` on the answers primary key, which is what makes the index deterministic. A question with no correct answer serializes as `answer: -1` rather than silently resolving to option 0.
- **500s leak nothing.** Pool credentials, SQL text and driver messages stay server-side; the client gets a mode-scoped message.
- **The legacy `/api/questions/easy` route stays registered** and delegates to the same `sendQuestions('easy', res)`. It is not removed while a consumer might still call it.

## Migration Strategy

`db/apply.js` reads `db/migrations/*.sql` in filename order and executes each sequentially against Neon. It reuses `pg` and `dotenv` — both already required by the server — so it adds **zero dependencies**.

Idempotency lives entirely in the SQL, not in runner state:

- DDL uses `CREATE TABLE IF NOT EXISTS`.
- Every seed insert is guarded by a `WHERE NOT EXISTS` subquery. `ON CONFLICT` cannot be used: there is no unique constraint on the question text.
- `0001_bootstrap.sql` seeds 5 easy + 5 hard questions with 20 answers each, transcribed verbatim from the `db_easy` / `db_hard` arrays in `App.tsx`.

Because there is no ledger, the runner replays every file on every invocation. That is the accepted cost of the zero-dependency posture.

TLS is configured in one place per process: `sslmode` is stripped from `DATABASE_URL`, then the pool sets `ssl: { rejectUnauthorized: false }`. A `sslmode` in the URL and a pool `ssl` option together are ambiguous; stripping removes the ambiguity. `server.js` and `db/apply.js` duplicate this five-line block deliberately — they run in separate processes and sharing it would mean adding a module.

## Frontend Wiring

```ts
const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
```

One `useEffect` per mode fetches `${apiBase}/api/questions/${mode}`. On a network error **or an empty array**, that mode falls back to its hardcoded bank and logs why. `getNewQuestion` prefers the fetched bank when non-empty.

The obsolete SQL comment block that documented a single `questions` table with inline options was deleted — it was wrong, and `db/migrations/` is now the only schema documentation. The empty `src/db.ts` and the `metadata.json` AI Studio template were deleted in the same commit.

## Verification debt

**Paid on 2026-09-26.** A live database turned out to be reachable, so the skipped checks were executed. Results:

- [x] Both endpoints return the unified contract from a live database — `GET /api/questions/easy` and `/hard` both 200 with the same shape; `/medium` 400 with the exact error body.
- [~] Hard mode draws from the DB, not `db_hard` — confirmed **indirectly**: the returned option order follows the live scrambled primary keys (`answer` indices 1–3, e.g. `80 km/h` at index 3), which `db_hard` could not produce since it authors them in order. Not confirmed by network tab or by deliberately breaking `db_hard`.
- [x] Migrations are idempotent under double-apply — the file was run twice in one transaction against a throwaway schema; every row count unchanged.
- [x] Migrations apply to a **fresh** database — the file was executed verbatim against an empty namespace, 22/22 assertions, three consecutive runs. This also uncovered a second defect, planner-dependent seed ordering, now fixed. See `openspec/changes/archive/2026-09-26-fresh-db-bootstrap/`.
- [x] `tsc --noEmit` clean, no new `any`.

The technique that made the fresh-database check possible: `BEGIN` → `CREATE SCHEMA <probe>` → `SET search_path` → run the migration file → assert → `ROLLBACK`. Unqualified table names resolve to the throwaway schema, so the real empty-database path executes and nothing persists. Uncommitted work cannot survive a session, so residue is impossible — confirmed afterwards against the live instance.

The honest state of this arc is now **shipped and data-layer verified**, with the indirect hard-mode check above as the one remaining caveat.

## Open risk: answer index is positional

`answer` is not a stored column. It is recomputed on every request from row arrival order, which the query pins with `ORDER BY` on the answers primary key. Deterministic today, but an implicit contract: renumbering answer rows silently changes every question's correct-option index, and no schema-level guard would catch it. A stored ordinal column, or an `ORDER BY` on a stable semantic column, would make the guarantee explicit.

Verification sharpened this from theory to practice. The live `easy_answers` primary keys are interleaved across questions, so the live easy option order differs from `db_easy` for every question — each response is internally consistent, so the game is never wrong, but the online and offline experience of one question differ. The `ord` column now in the seed data makes *fresh* databases match `db_easy`; it is a seed-time constant, not a persisted column, so existing rows are unaffected.

## Rollback

All changes are additive. `git revert de74dbe` restores the code. The migration itself inserted seed rows, which a revert does not un-insert — undoing the data layer entirely means dropping `hard_questions` / `hard_answers` and deleting the seeded `easy_*` rows by hand. The easy remediation seed is non-destructive by construction: every insert is guarded by `WHERE NOT EXISTS` on the question text, so it cannot duplicate or overwrite live easy data.

## Threat Matrix

Minimal, and unchanged by this arc:

- **SQL injection** — the only interpolated SQL identifiers come from the fixed `MODE_CONFIG` map; the `:mode` parameter is validated against a two-value allowlist and never reaches the query text.
- **Credential exposure** — `DATABASE_URL` is read from the environment only, never logged, and connection strings are stripped of `sslmode` rather than echoed. 500 responses carry no driver detail.
- **Data exposure** — `GET /api/questions/:mode` is unauthenticated and serves the full question bank including base64 images. Acceptable for a public quiz; it would not be for a real assessment, where answers would need to stay server-side.

