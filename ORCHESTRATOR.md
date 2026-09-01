# ORCHESTRATOR.md — Arcade Retrofit: Looping Background & Car Sprite

## Purpose

This file orchestrates an autonomous, multi-phase implementation session for **[PROJECT NAME]**. It's written to run under the **gentle-ai** SDD (Spec-Driven Development) orchestrator on top of **OpenCode**, using OpenCode's native skill loading, Plan/Build modes, and — if configured — Engram for persistent cross-session memory.

Target stack: **HTML, JavaScript, TypeScript, React**.

## Scope of this change

1. Analyze the existing codebase (rendering approach, current theming, component structure).
2. Design and document a modernized, arcade-style color scheme in `DESIGN.md`.
3. Implement a seamless looping background.
4. Implement an animated car sprite.
5. Verify the result (visual, performance, type-safety, accessibility).

---

## 0. Operating rules (apply for the whole session)

- **Work autonomously** through the phases below without pausing for confirmation, except where explicitly marked `[BLOCKING]`.
- **First action**: if the orchestrator doesn't already have write/run access to this repo (shell, file write, package manager), request it from the operator before doing anything else. This is the only upfront blocking step.
- **4-file rule**: if understanding the current rendering/animation flow requires reading 4+ files, delegate that reading to an explore sub-agent instead of doing it inline in the parent thread.
- **Multi-file write rule**: any phase touching 2+ non-trivial files runs through a single writer sub-agent, followed by a fresh reviewer pass before being marked done.
- **Incident rule**: after any wrong-directory error, failed build, or confusing test/lint output, stop and re-run a short audit (repo root check, `git status`, install state) before continuing.
- **Long-session rule**: after roughly 20 tool calls, or 5 exploratory reads, or 2 non-mechanical edits, pause, summarize progress, and either delegate the next chunk or re-plan.
- Parent/orchestrator thread stays thin: it tracks phase state and summaries; sub-agents do the actual reading/writing.
- If Engram (or equivalent persistent memory) is available, save at minimum: the chosen palette, the sprite/animation architecture decision, and each phase's verify notes — e.g. under keys like `sdd/arcade-retrofit/design`, `sdd/arcade-retrofit/apply-progress`, `sdd/arcade-retrofit/verify-report`.

---

## Phase 1 — Explore: Codebase Analysis *(sdd-explore)*

Delegate to an explore sub-agent. Deliverable: a short written inventory, not code changes.

Inventory:

- **Rendering approach** for anything visual/animated today: plain DOM + CSS, `<canvas>`, or SVG — and which is used where.
- **Existing animation loops**, if any: CSS `@keyframes`/`animation`, `requestAnimationFrame` usage, any game-loop/ticker abstraction already present.
- **Current theming**: where colors live (CSS custom properties, Tailwind config, styled-components theme, or hardcoded hex values scattered across components). This determines how disruptive the palette change will be.
- **Component structure**: which React components should host the background and the car (a `<GameCanvas>`, `<Hero>`, or page-level component?), and their current props/state shape in TypeScript.
- **Asset pipeline**: how images/sprite sheets are currently imported and served, and whether a car sprite asset already exists or needs to be created/sourced.
- **Performance budget**: any existing constraints (Lighthouse targets, low-end device support) the looping background/sprite must respect.

Output: a short `EXPLORE-NOTES.md` (or equivalent Engram entry) summarizing the above — used as input to Phase 2.

---

## Phase 2 — Design: Arcade Palette & `DESIGN.md` *(sdd-design)*

Delegate to a design sub-agent, using the Phase 1 notes as input.

Requirements for the new color scheme:

- Arcade/retro-neon direction: saturated primary + secondary hues (e.g. magenta/cyan/electric-blue family), a dark near-black background rather than plain white/gray, and one accent "highlight" color reserved for interactive/CTA elements.
- Maintain **WCAG AA contrast** (4.5:1 for body text, 3:1 for large text/UI) between text/background pairs — hard constraint, not a suggestion.
- Express the palette as **design tokens** (CSS custom properties, or the project's existing token mechanism from Phase 1) — not one-off hex values inside components.

Produce `DESIGN.md` at the repo root with, at minimum:

```markdown
# DESIGN.md

## Palette
| Token              | Value | Usage                       |
|---------------------|-------|------------------------------|
| --color-bg           | #...  | App background               |
| --color-primary      | #...  | Primary brand / UI accents   |
| --color-secondary    | #...  | Secondary accents            |
| --color-highlight    | #...  | CTAs, active states          |
| --color-text         | #...  | Body text (AA on --color-bg) |

## Typography
(existing or updated type scale, if touched)

## Background loop
- Technique: [CSS transform loop | canvas tile loop]
- Loop unit width/height, seam-matching approach, scroll speed

## Car sprite
- Source: sprite sheet [dimensions] x [frame count], or SVG frame set
- Animation technique: [CSS steps() | requestAnimationFrame frame-stepping]
- States: idle / driving / (optional: boost, crash)

## Accessibility notes
Contrast ratios for each text/background pairing above.
```

Sub-agent review before moving on: confirm contrast ratios pass AA, and that the chosen background/sprite techniques are compatible with the rendering approach found in Phase 1 (don't propose canvas if the rest of the app is pure CSS/DOM, unless justified).

---

## Phase 3 — Implement *(sdd-tasks → sdd-apply)*

Split into three isolated writer sub-agents, each producing one self-contained diff, reviewed before merge:

**3a. Looping background**
- Implement as a dedicated component (e.g. `ArcadeBackground.tsx`), typed with TS.
- Seamless loop: duplicate the background unit and translate both copies together, resetting the translation by exactly one unit-width on wrap (no visible seam/jump). If canvas-based, redraw a tiled pattern per frame instead.
- Drive the loop off a single `requestAnimationFrame` ticker (or CSS animation, per the Phase 2 decision) — no duplicate tickers per component.
- Respect `prefers-reduced-motion`: pause or drastically slow the loop when that OS setting is on.
- Clean up the animation frame/listener on unmount.

**3b. Car sprite**
- Implement as a typed component (e.g. `CarSprite.tsx`) accepting at least a `speed`/`state` prop.
- Frame-stepping via the technique chosen in `DESIGN.md`. If using a sprite sheet, load it once (not per-render) and step through frames on an interval tied to speed.
- Positioned in front of the looping background, aligned to it (same ground line).

**3c. Palette rollout**
- Replace old color tokens/hardcoded hex values found in Phase 1 with the new `DESIGN.md` tokens across affected components.
- No leftover hardcoded colors duplicating a token.

---

## Phase 4 — Verify *(sdd-verify)*

Delegate to a review sub-agent, separate from the ones that wrote the code. Produce a verify report:

- [ ] Visual: background loop has no visible seam/jump over several cycles; car sprite animates smoothly at the intended speed.
- [ ] Performance: sustained ~60fps on the animated view; no growing memory usage over a few minutes (no leaked RAF loops/listeners).
- [ ] `prefers-reduced-motion` respected.
- [ ] TypeScript: `tsc --noEmit` clean; no `any` introduced in the new components.
- [ ] Lint passes.
- [ ] Accessibility: contrast ratios in `DESIGN.md` verified against the actual rendered colors (not just the token table).
- [ ] No hardcoded pre-palette colors remain in touched components.

Review provides evidence, not authorization — normal repo policy (PR review, CI) still governs whether this ships.

---

## Deliverables checklist

- [ ] `EXPLORE-NOTES.md` (or Engram entry) from Phase 1
- [ ] `DESIGN.md`
- [ ] `ArcadeBackground` component + loop logic
- [ ] `CarSprite` component + animation logic
- [ ] Palette rollout across existing components
- [ ] Verify report

---

Adjust component names, file paths, and the exact palette to the real project once Phase 1 exploration is done — the values above are the defaults a sub-agent should propose, not hardcode.
