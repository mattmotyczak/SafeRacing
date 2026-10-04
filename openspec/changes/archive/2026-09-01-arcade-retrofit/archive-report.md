# Archive Report — Arcade Retrofit: Pixelated Retro (8-bit) Delta

> **Migrated from Engram** (`sdd/arcade-retrofit/archive-report`, observation #51) on 2026-09-26. This report existed only in a local Engram database; it is now in the repo.

**Change:** `arcade-retrofit`
**Status:** **CLOSED** — complete, verified, reviewed, archived.
**Date:** 2026-09-01
**Commits:** `89d4174` → `b2e635e` on branch `new_designs`.

## Delta synopsis

Shipped the pixelated-retro 8-bit retrofit per `DESIGN.md`:

- **Palette / tokens** — `src/index.css` gained 18 `@theme` tokens (frame-strong, hard-shadow, danger-text, track-line, dash, vignette, atmosphere, smoke, car-tier1..5, car-window, car-dark, car-damage, car-spark, car-headlight). All `--radius-*` zeroed. `.glass-panel` → `.pixel-panel` (solid bg, 2px chunky border, 4 px offset hard shadow, no `backdrop-blur`, radius 0). `.car-aura` blur → hard `steps(1)` blink. `.game-sector-glow` → hard inner border.
- **`ArcadeBackground.tsx`** — dash layer made periodic by construction: two tile children using `repeating-linear-gradient(90deg, var(--color-dash) 0 128px, transparent 128px 192px)` with `background-size: 1920px 100%` (10 periods). Ground stripe → `var(--color-track-line)`. Zero hex/rgba left in the file.
- **`CarSprite.tsx`** — all 12 hardcoded hex → `var(--color-car-*)`; `carColor()` tier switch preserved. Rendered at integer 2× scale (`w-32 h-16` = 128×64, exactly 2× the 64×32 viewBox).
- **`App.tsx`** — `blur-[150px]` orbs replaced with hard stepped pixel shapes; JUGAR glow → hard offset shadow; 8 glass→pixel panel swaps; crash smoke/exhaust → stepped pixel squares and flame; crash filter reduced to `brightness(0.5)`; vignette/atmosphere tokenized; stoplight, lives pips and trophy ring → `rounded-none`; HUD text bumped to 12 px.
- **Dash seam fix (review correction R3-1)** — `flex` added to the dash container className at `src/components/ArcadeBackground.tsx:88`, so the `w-[3840px]` two-tile container lays tiles side-by-side. Without it the tiles stacked vertically and everything past x=1920 was blank. 1-line forecast, 2 lines actual.

## Verification

See `verify-report.md` in this folder. Summary: `tsc --noEmit` exit 0; all grep audits clean; verdict **PASS WITH WARNINGS**, 10/10 tasks, 0 CRITICAL.

## Review lifecycle

- Bounded 4-lens review `review-78ec872d71631526` (Engram #46) — **APPROVED**, `terminal_state: approved`, `resolved_finding_ids: [R3-1]`. R1 risk clean; R2 three SUGGESTIONs; R3-1 CRITICAL (fixed); R4-1 WARNING.
- Pre-commit gate: **allow** (`gentle-ai review validate --gate pre-commit`).
- `original_criteria` and `correction_regression` both passed on the R3-1 correction.

## Artifact index and traceability

| Artifact | Engram topic key | Observation | Repo file |
|----------|------------------|-------------|-----------|
| SDD init context | `sdd-init/saferacing` | #39 | `openspec/config.yaml` (context block) |
| Exploration | `sdd/arcade-retrofit/explore` | #42 | `exploration.md` |
| Proposal | — | **not produced** | — |
| Delta spec | — | **not produced** | — |
| Design | `sdd/arcade-retrofit/design` | #43 | `DESIGN.md` (full design, sections below) |
| Tasks | `sdd/arcade-retrofit/tasks` | #44 | reconstructed below |
| Apply progress | `sdd/arcade-retrofit/apply-progress` | #45 | this report |
| Verify report | `sdd/arcade-retrofit/verify-report` | #47 | `verify-report.md` |
| Review receipt | `sdd/arcade-retrofit/review` | #46 | this report |
| Archive decision | `sdd/arcade-retrofit/archive-report` | #51, #52 | `archive-report.md` |

The design was never split into a separate `design.md` artifact — it was written straight to the repo's `DESIGN.md`, which remains the canonical design document. The current `openspec/specs/game/spec.md` is the post-merge source of truth.

### Reconstructed task list (from observation #44)

Review workload forecast: ~160–210 changed lines (index.css ~45, App.tsx ~110, CarSprite + ArcadeBackground remainder). Budget risk **Low**. Single PR recommended; chained PRs not recommended. No decision needed before apply.

| # | Task | File |
|---|------|------|
| 1.1 | Add delta `@theme` tokens; zero all `--radius-*` | `src/index.css` |
| 1.2 | `.glass-panel` → `.pixel-panel`; hard-edge `.car-aura`; hard `.game-sector-glow` | `src/index.css` |
| 1.3 | Replace the two `blur-[150px]` orbs with hard stepped shapes | `src/App.tsx` |
| 2.1 | Tokenize all 12 hardcoded hex → `var(--color-car-*)` | `src/components/CarSprite.tsx` |
| 2.2 | Render at integer 2× scale (`w-32 h-16` wrapper) | `src/App.tsx` |
| 2.3 | Tokenize the ground stripe rgba → `--color-track-line` | `src/components/ArcadeBackground.tsx` |
| 3.1 | Replace the 6 remaining rgba/glow sites + glass classes in `App.tsx` | `src/App.tsx` |
| 3.2 | Square stoplight / lives pips / trophy ring | `src/App.tsx` |
| 3.3 | Pixel crash + exhaust FX; drop the crash blur filter | `src/App.tsx` |
| 3.4 | Bump Press Start 2P HUD type to the 12 px floor | `src/App.tsx` |
| 4.1 | Verify (owned by `sdd-verify`) | — |

The dash seam fix (**R3-1**) was not a planned task — it was found by review after apply.

## Follow-ups (informational, non-blocking)

| ID | Finding | Still open? |
|----|---------|-------------|
| R2-1 | Dead `--car-color` custom property | **Yes** — `CarSprite.tsx:92` |
| R2-2 | SVG `rx` vs zero-radius contract | **Yes** — `CarSprite.tsx:51-65` |
| R2-3 | Legacy `@theme` tokens | **Partly** — block remains at `index.css:19-30` |
| R4-1 | Google Fonts `@import` + FOUT | **Yes** — `index.css:1` |
| R3-2 | No automated seam regression test | **Yes** — still no test runner |

## Rollback

Per `DESIGN.md`: all changes are surgical in-place edits. Complete rollback = `git revert` of the feature branch (commits `89d4174`..`b2e635e`), or a targeted revert of `src/index.css`, `src/components/ArcadeBackground.tsx`, `src/components/CarSprite.tsx`, `src/App.tsx` and `DESIGN.md`.

## Exploration findings (from observation #42)

The exploration's headline finding: **the retrofit was already implemented** when it ran. Commits `89d4174`..`b2e635e` existed with a clean working tree, `ArcadeBackground.tsx`, `CarSprite.tsx` and `DESIGN.md` were all present, and `App.tsx` already consumed both components. That is why there is no proposal and no spec delta — the change was scoped as a *delta* against shipped code rather than a greenfield build, and the review workload forecast landed at 160–210 lines rather than a full retrofit.

## SDD cycle complete

Change fully planned, implemented, verified, reviewed and archived. Session `sdd-arcade-retrofit`, project `saferacing`, scope project.
