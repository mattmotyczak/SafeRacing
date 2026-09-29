# Tasks — `arcade-scene-backdrop`

> **Authority.** The delta (`specs/game/spec.md`) owns every requirement; `design.md` owns the
> geometry, the 9 decisions and the 2 discharged debts. **Take NO geometry from `proposal.md` or
> `exploration.md` — both carry superseded layer tables.**
> **Citations.** Cite a **content anchor**, never a bare line number. The delta labels its
> numbers against `e26fcf1`; HEAD is `453b542` (touched neither `App.tsx` nor `index.css`, so
> the numbers resolve, but the label is stale). Numbers below are the *current working tree*.

## Shared-file write fence — run this before ANY task that edits `src/**`

`git status` · `git log --oneline -3` · `git stash list` · `LastWriteTime` scan of `src\`.
**If another agent has written `src/` recently, STOP that task and re-read first.**
`git status` already shows `src/App.tsx` dirty from the parallel `driving-safety-question-bank`
change. **Never touch `db_easy`, `db_hard`, or `fetchQuestions` in `App.tsx` — that agent's
territory.** `server.js` and `db/**` are out of scope entirely.

## Verification reality

`npx tsc --noEmit` is the **only** automated gate, plus the `config.yaml` greps. **No test
runner, no browser, no test dependency.** The depth read at 16 vs 32 px/s, tier-colour
legibility, seam appearance, and the ~70ch measure are **human sign-off** items — **do not write
a test that cannot exist.**

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | PR1 **~120** · PR2 **~160** · combined **~280** |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes (decided at interview, not by size) |
| Suggested split | PR1 contract compliance + provenance → PR2 the scene |
| Delivery strategy | auto-chain (split decided in interview) |
| Chain strategy | stacked-to-main (PR1 merges first; PR2 rebases) |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Contract compliance + provenance, no composition change | PR1 | `npx tsc --noEmit` | `npm run dev` + `npm start`, Easy mode, one 3 s green light | Clean `git revert`. Returns three soft glows + 11 tokens. No data/schema/API/state consequence. |
| 2 | The seven-layer scene | PR2 | `npx tsc --noEmit` | `npm run dev` + `npm start`, Easy mode, 10+ questions | **Not independently revertible.** Reverting after PR1 leaves ground fixed + sky broken. Revert in reverse order. |

**Already done before this phase (record, do not re-do):** the `openspec/specs/game/spec.md`
false-provenance removal and the three `openspec/design/arcade-retrofit.md` token/utility
corrections (`state.yaml` → `tracked_gaps`, `status: fixed-in-this-pass`).

---

## PR1 — Contract compliance + provenance

Changes no layer count, no period, no duration, no composition.

- [ ] **1.1 Ground seam (pure class swap).** `ArcadeBackground.tsx`, the `{/* Ground / Road */}` block: container `w-[200%]` → `w-[3840px]`, both tiles `w-1/2` → `w-[1920px]`. `1920 mod 40 = 0`. Changes nothing else. *(This is a **different bug** from the sky: ground seams at 1100 px but is clean at 720.)*
- [ ] **1.2 Create the shadow token.** `index.css` `@theme`: `--shadow-hard: 4px 4px 0 var(--color-hard-shadow);` with a comment recording that it is coupled to `--color-hard-shadow`. Tailwind v4 derives `shadow-hard` from `--shadow-hard`; `--color-hard-shadow` is a colour and generates no shadow utility. *(fence)*
- [ ] **1.3 Collapse the three hard-offset sites** onto `var(--shadow-hard)` / `shadow-hard`: `index.css` `.pixel-panel`, `index.css` `.game-sector-glow` (**keep** its `inset 0 0 0 2px` ring — not a pure substitution), and the "Jugar" button's `shadow-[4px_4px_0_var(--color-hard-shadow)]`. *(fence)*
- [ ] **1.4 Delete the soft shadows.** The three `shadow-[0_0_15px_rgba(...)]` stoplight glows, `drop-shadow-2xl` on the menu `<h1>`, `shadow-lg` on the question `<img>`. *(fence)*
- [ ] **1.5 Stoplight lamp contract.** Lit lamp → `4px 4px 0` in a **darkened shade of its own hue**; unlit lamps → **no shadow**. Retain the fill difference (`bg-red-500` vs `bg-red-950/40`) as the primary signal, so the lamp keeps two independent signals. *(fence)*
- [ ] **1.6 Fix the two negative-tracking pixel-font headings.** The menu `<h1>SafeRacing</h1>` (`tracking-tighter`) and `<h2>Seleccione Modalidad</h2>` (`tracking-tight`) — Press Start 2P is monospace with no side bearing. Do **not** widen to the sans-font sites. *(fence)*
- [ ] **1.7 Delete the redundant dash-tile declarations.** `backgroundSize: "1920px 100%"` + `backgroundRepeat: "repeat"` on both dash tiles: a no-op today, and a landmine that crops the paint mid-cycle on any revert to `w-1/2`.
- [ ] **1.8 Delete the false comment** `/* Legacy tokens kept for backward compatibility */` in `index.css` — false in both directions (7 of its 11 declarations are dead, the other 4 are live).
- [ ] **1.9 Delete the 11 dead tokens** from `@theme`: `accent-blue`, `accent-green`, `accent-pink`, `surface-bright`, `surface-container-lowest`, `surface-container-low`, `surface-container`, `surface-container-high`, `surface-container-highest`, `secondary`, `danger-text`. **Retain** `--color-on-dark` and `--color-accent-yellow`.
- [ ] **1.10 Tokenise the 17 white/black utilities in `src/**/*.tsx` — all 17, all-or-nothing.** The 8 legible `text-white` / `hover:text-white` sites → `--color-on-dark`. The other 8 → `@theme` tokens: `border-white/5` ×3, `bg-white/10` ×2, `border-white/10` ×1, `bg-black/20` ×1, `hover:bg-white/5` ×1. **The score value is excluded here — its backing surface changes in 2.12, not its colour.** *(fence; per-site mapping is in the delta, do not blend the groups)*
- [ ] **1.11 Tokenise `bg-slate-900/20`** (the ground layer container) → `@theme` token.
- [ ] **1.12 Tokenise the 5 `.scanline` `rgba()` values** in `index.css` → `@theme` tokens. *(Kept as its own count — 17 / 1 / 5, never a blended total.)*
- [ ] **1.13 Blur removal note.** **The DEBUG toggle and its `/* DEBUG-DELETABLE */` marker do NOT exist in the current tree** (grep: 0 functional `blur`; the only hit is a prose comment "replaces blurred orbs"). Do **not** invent a toggle. Add the short note to `index.css` recording that blur was trialled, rejected, and why (soft edges break the 8-bit pixel contract); confirm the blur audit still returns 0.
- [ ] **1.14 `CarSprite` 8 `rx` values → the 4-unit grid** (`rx="0"` or `rx="4"`; `rx="2"` is not acceptable). Anchors: main body, roof, window, rear spoiler, front bumper, headlights, both wheels.
- [ ] **1.15 Resolve `--car-color`.** Consumed by `.car-aura` / `.car-bounce` / the crash treatment (preferred), or removed. Set-but-unread fails.
- [ ] **1.16 Add `motion-reduce:animate-none`** to the `.car-aura` div (`className="car-aura absolute inset-0"`).
- [ ] **1.17 Gate the ungated entrance animations** on `prefersReducedMotion`. There are **10** `<motion.div>` in `App.tsx`; **4** are already gated (crash, smoke, wiper, gamepad wobble) and **6** are not — the stage wrapper, the menu block, the mode-select block, the question panel, game over, and the footer. Gate exactly those 6; leave the 4 alone. *(fence)*

---

## PR2 — The scene

- [ ] **2.1 Add the 11 `--color-scene-*` tokens** to `@theme`: `sky-horizon #bfe9ff`, `sky-top #5ec5f5`, `clouds #ffffff`, `far-hills #4a9e5c`, `trees-light #2f7a46`, `trees-dark #245f38`, `road #3a3a48`, `rumble-red #e03a3a`, `rumble-white #f0f0f5`, `road-dashes #e8e8f0`, `car-body #ffc23a`. The namespace **does not exist today**.
- [ ] **2.2 Sky migration — ATOMIC, one edit, no intermediate state.** In the same edit: sky tile `w-1/2` → `w-[1920px]`, container `w-[200%]` → `w-[3840px]`, `backgroundSize "100px 100px"` → `"128px 128px"`, `.arcade-scroll-sky` `25s` → `120s`, plus the sky-top → sky-horizon fill, the sun (`--color-accent-yellow`) and 2 clouds, both off-seam. **WHY:** `1920 mod 100 = 20`, so migrating without the period change **introduces a seam where none exists today at 1100 px** (`1100 mod 100 = 0`) — a net regression shipped as a fix. And `1100 mod 128 = 76` if the period lands first. **If a diff shows the sky's `background-size` changed without the tile class changing, STOP.** *(fence)*
- [ ] **2.3 Hills layer** `.arcade-scroll-hills`, period 640, `60s`, 32 px/s: 3 peaks at local `x = 213 / 853 / 1493`, each **≤ 380 px** wide, 23 px clearance. *(Thinnest margin in the change — check it with the app open.)*
- [ ] **2.4 Trees layer** `.arcade-scroll-trees`, period 240, `25s`, 76.8 px/s: **8 per tile** at `120 + 240k` (k=0..7), each **≤ 96 px**, 72 px clearance. `1920 / 240 = 8` — the count is fixed by the period.
- [ ] **2.5 Road edge lines + rumble** — `.arcade-scroll-edges` (period 60, `2s`) and `.arcade-scroll-rumble` (period 192, `2s`), `repeating-linear-gradient`; off-seam by construction.
- [ ] **2.6 Repoint ground tint and road dashes** to `--color-scene-road` `#3a3a48` and `--color-scene-road-dashes` `#e8e8f0` (**9.17:1**). The legacy fills measure **1.02 / 1.06:1** — an animated layer at ~1.04:1 is perceptually static. Then delete `--color-track-line` and `--color-dash` from `@theme` (they are the two *retired-live* tokens, **not** part of the 11).
- [ ] **2.7 Paint order in the JSX**, back to front: sky → hills → trees → ground tint → edges → rumble → dashes. Hills and trees render **under** the ground stripe; edge lines, rumble and dashes **over** it.
- [ ] **2.8 Reduced-motion block — DISTINCT STEP, the most forgotten one.** Add the four new layer selectors to the `prefers-reduced-motion` block at the bottom of `index.css`. The `motion-reduce:animate-none` classes go in the markup (2.2–2.5); **  this is the second, separate mechanism** and both are required. **MUST NOT add `.arcade-scroll-running`** — `animation: none` leaves nothing to pause. **Census (`^\s*\.arcade-scroll` in `index.css`):** today **4 definitions + 3 reduced-motion entries = 7 matching lines**; after this change **8 definitions + 7 entries = 15 lines**. `.arcade-scroll-running` is the 8th definition and the reason the two totals differ — a count of 7 after PR2 is a **missed-task signal, not a pass**.
- [ ] **2.9 Answer-feedback snapshot.** In `handleAnswer`, capture `{ chosen, correct, isCorrect }` into retained local state **before** both `setCurrentQuestion(null)` calls. `correct` comes from the resolved `answer` field, **never** from authored option order (live/offline order disagrees — gap 2). Options read the retained state, not `currentQuestion`. *(fence)*
- [ ] **2.10 Answer-feedback visual — no glyph.** Correct-but-not-chosen always carries a 2 px outline; the chosen option swaps its 2 px border to the outcome colour and gains `4px 4px 0` in the outcome colour. No lucide icon, no `✓`/`✗` in the question panel block. *(fence)*
- [ ] **2.11 Question typography.** The question `<h3>` → Manrope body prose, `text-xl sm:text-2xl` or larger, `text-wrap: pretty`, `max-w-[70ch]`. Press Start 2P stays on `<h1>`/`<h2>`/HUD/titles only, with a ≥12 px rendered floor.
- [ ] **2.12 Score HUD `pixel-panel` chip.** At the `{/* Score HUD */}` anchor, wrap the HUD container in the same `pixel-panel` chip the stoplight already uses (`pixel-panel p-2 flex flex-col gap-2`), with a **solid** `bg-surface` — the stoplight chip is a `pixel-panel` and the score HUD is bare, which is the whole defect. Only then does the `{score}` span's `text-white` become legible (15.43:1; 1.76:1 with the token, 1.95:1 with `#fff`, both failing over bare sky) — and only then map it to `text-on-dark`. No new token; the two HUD corners become the same object. *(fence)*
- [ ] **2.13 `CarSprite`: `--color-scene-car-body` replaces `--color-car-tier5`** as the 5+ rung (both the `case` and the `default` arm of `carColor`), and delete `--color-car-tier5` from `@theme`. **BLOCKED by 2.14.**
- [ ] **2.14 R-4 IS A BLOCK, NOT A RISK — human sign-off gate, before 2.13.** The 2× legibility obligation (4 tier colours distinguishable from `#ffc23a`) arrived as a ruling with **no contrast ratio attached**, so it is **not dischargeable by reasoning**. A person with the app open and the sprite at 2× must sign off, and the sign-off must be recorded in the PR. Adjacent-pair ratios (tier1↔tier2 1.86, tier2↔tier3 1.59, tier3↔tier4 1.04) are evidence that it is a **risk**, not confirmation that it is acceptable. **TRAP: do not mark this satisfied because a ratio was computed for a DIFFERENT pair** (e.g. tiers vs road `#3a3a48`, or a tier-vs-tier pair) — the design is stricter than the delta here, and the design governs. If two tiers land under ~3:1, sign-off fails and 2.13 returns to `design.md` Decision 6.
- [ ] **2.15 Tier-1 legibility** *(design-sourced, Decision 6 — not a delta MUST, deferrable with a note)*: `--color-car-tier1` `#64748b` is **2.35:1** against the road, below the 3:1 non-text line; at one life the car effectively disappears. Lighten tier 1 or add a hard outline; record the choice.
- [ ] **2.16 Human sign-off list** (no check can confirm these — the app open, Easy mode, 10+ questions): depth read at 16 vs 32 px/s; seam appearance over 5+ cycles; off-seam read of hills (23 px) and trees (72 px); "bright daytime, not dusk"; the ~70ch measure; tier legibility. **Sky accumulation:** the sky moves only **48 px** per 3 s green light — 4.4% of the panel. `animation-play-state: paused` resumes rather than restarts, so it accumulates to **480 px over 10 questions**. State this in `verify-report.md` or a reviewer will read 48 px as a dead animation.

---

## Verification — both PRs

- [ ] **V.1** `npx tsc --noEmit` exits 0.
- [ ] **V.2** Greps (`Get-ChildItem -Recurse | Select-String`; `ripgrep` is unavailable): hex/`rgba()` in `src/**/*.tsx` → **0**; soft-shadow pattern → **0**; `4px 4px 0` → exactly **1** hit, inside the `--shadow-hard` definition; `rounded-*` other than `rounded-none` → 0; `rx=` in `CarSprite.tsx` → 8, all `0` or `4`, `ry=` → 0; each of the 11 dead + 3 retired/replaced tokens absent, `--color-scene-*` present; `track-line|--color-dash` → 0; `rgba(` inside the `.scanline` rule → 0 (today 5 on 2 lines; the 4 `@theme` colour tokens are separate and are not this count); `var(--car-color)` ≥1 **or** `--car-color` → 0; `^\s*\.arcade-scroll` → **8** definitions with **7** reduced-motion entries (see 2.8 — 15 matching lines, and a 7 is a failure signal, not a pass); `prefersReducedMotion` guards all 6 entrance blocks and the 4 pre-existing crash/smoke/wobble sites. **The 8 traffic-light uses** (`bg-red-950/40` ×3, `text-red-500` ×2, `text-green-400`, `hover:border-red-500/50`, `border-red-500/20`) are **sanctioned by the widened exception** and must survive untouched — no code change, only audit tolerance.
- [ ] **V.3 Seam arithmetic, hand-computed and written into `verify-report.md`**: `1920 mod {128, 640, 240, 40, 60, 192} = {15, 3, 8, 48, 32, 10}`; speeds `16 < 32 < 76.8 < 192 < 960`; `1100 < 1920` (coverage); under the ground fix the seam parks at screen `x = 1344`, **outside** the 1100 px panel.
- [ ] **V.4 R-10 — EXPECTED FAIL, NOT A REGRESSION.** The framing audit's **code check fails at `src/App.tsx:497,499`** ("Desarrollado por el Equipo Foxtrot" / "Proyecto Final", the in-game footer). It is **pre-existing** and **fails identically before and after this change** — verified today against the current tree. `sdd-verify` WILL fail that audit. Annotate the failure as `pre_existing_blockers`; **a reviewer who reads it as a break is wrong.** Do not "fix" it — deleting the credit is a team authorship decision, explicitly out of scope.
- [ ] **V.5** `verify-report.md` records the human sign-offs from 2.14 and 2.16, and states that R3-2 (an automated seam regression test) remains open and is **not closable from this project**.
