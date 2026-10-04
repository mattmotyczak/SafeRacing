# Design — `arcade-scene-backdrop`

**Change:** `arcade-scene-backdrop`
**Domain:** `game`
**Status:** design complete — `tasks.md` and all implementation pending. Nothing is implemented.
**Requirements (source of truth):** `openspec/changes/arcade-scene-backdrop/specs/game/spec.md`
**Base spec (merged, not yet edited):** `openspec/specs/game/spec.md`
**Long-lived rationale for the shipped arc this builds on:** `openspec/design/arcade-retrofit.md`
**Discharges:** `state.yaml` → `design_debt[parallax-rung-60s]`, `design_debt[parallax-rung-120s-sky]`

> **This file is architecture and rationale. It does not restate requirements.** The delta owns
> what the change must do; this file owns why each option lost, what it costs, and where the
> delta and the design reasoning diverge. Where this file contradicts the delta, the
> contradiction is recorded in [Reconciliation ledger](#reconciliation-ledger) rather than
> silently resolved.

> **`proposal.md` and `exploration.md` carry superseded layer tables. Do not take geometry from
> them.** The delta's *Background scroll layers* table is the only geometry of record. This file
> reproduces it verbatim in [The canonical layer table](#the-canonical-layer-table).

> **Line-number provenance — content anchors are authoritative, bare line numbers are not.**
> **Two bases are in play, deliberately.** Citations in this document are **working-tree** numbers:
> `src/App.tsx` carries **uncommitted** work (the question-bank extraction into `src/data/questions.*`
> plus draw-without-replacement) that shifts every line below ~30 by **+25** relative to the
> committed file. The delta labels its own pre-existing citations as the **committed** basis and
> marks amendment-era ones "working tree", so a committed number and a working-tree number must
> never be compared. An implementer must treat the **content** anchor as authoritative and the
> number as a convenience: `src/App.tsx` is under active edit, so a number can drift while the
> thing it points at does not. Where a claim is load-bearing the content is quoted inline.
> **Both the delta and `state.yaml` name the committed basis as `e26fcf1`; `HEAD` has since moved
> to `453b542`.** That commit added only `src/data/questions.easy.ts` and
> `src/data/questions.hard.ts` — it changed neither `src/App.tsx` nor `src/index.css` — so the
> committed-basis numbers still resolve to the same content. **The label is stale; the arithmetic
> is not.** `src/index.css` is unmodified in both bases, so its numbers are unambiguous.

---

## Technical Approach

Seven CSS-only parallax layers inside one fixed-geometry tile system, plus a token and shadow
cleanup that closes three live contract violations and adjudicates **thirteen** zero-consumer theme
tokens down to **eleven** deletions.

Three structural commitments, in order of blast radius:

1. **One tile geometry for every layer.** A `w-[3840px]` flex container holding two
   `w-[1920px]` tiles, panned by the existing `translateX(0 → -50%)` `scrollBackground`
   keyframes. Sky and ground migrate off `w-1/2`. Because `-50%` of `3840px` is exactly
   `1920px`, the pan distance becomes a **constant**, independent of the viewport. That single
   change converts a viewport-dependent correctness condition into a compile-time-looking
   integer one, and it is the only reason a period of 128 px is admissible at all.
2. **One speed ladder, exhausted and extended twice.** `2 / 10 / 25 / 60 / 120` seconds. Speed is
   `1920 ÷ duration` for every layer, so the ladder *is* the speed table, and speed rises
   strictly with proximity. Two new rungs are added; both are recorded as tradeoffs below.
3. **Zero new runtime dependencies, zero JS animation.** No `requestAnimationFrame`, no ticker,
   no per-component interval, no image assets, no canvas, no SVG filter. Every layer is a
   `background-image` gradient or a `clip-path` silhouette, paused by default and resumed by the
   existing `arcade-scroll-running` class.

The change is delivered as two chained PRs, split so that the reviewer's first pass contains no
new scenery and the second contains no contract cleanup.

---

## The two invariants

They are **independent**. A layer table can satisfy one and violate the other, and this change
produced exactly that failure twice before it was caught. Both must hold for every layer.

### Invariant A — Divisibility (no seam)

```
tile_width ≡ 0  (mod period)
pan        ≡ 0  (mod period)
```

With the fixed geometry, `pan ≡ tile_width ≡ 1920 px`, so this collapses to a single condition:
**the period must divide 1920.**

| Layer | Period | `1920 / period` | Integer? |
|---|---|---|---|
| Sky | 128 px | 15 | ✅ |
| Hills | 640 px | 3 | ✅ |
| Trees | 240 px | 8 | ✅ |
| Ground tint | 40 px | 48 | ✅ |
| Road edge lines | 60 px | 32 | ✅ |
| Rumble strip | 192 px | 10 | ✅ |
| Road dashes | 192 px | 10 | ✅ |

This invariant is what makes the seam condition **viewport-independent**. The `w-1/2` geometry
has no width ceiling — traced coverage holds at every panel width `P`, because the container
spans `[−tP, (2−t)P]` and the panel is `[0, P]` — but it makes correctness depend on a single
unverifiable congruence, `W mod period == 0`, where `W` is whatever the viewport happens to be.
Nothing in this project can check that. The `W`-dependent form is what let two live bugs ship.

### Invariant B — Monotone speed-by-proximity (depth reads correctly)

```
speed(far) < speed(mid) < speed(near)     for every pair, all values distinct
```

**Divisibility does not imply this.** Constructive counterexample, using only periods from the
table above so Invariant A holds perfectly:

| Layer | Period | Duration | Speed | Paint order |
|---|---|---|---|---|
| Sky | 128 px | 120 s | 16 px/s | backmost |
| Hills | 640 px | 25 s | 76.8 px/s | middle |
| Trees | 240 px | 60 s | 32 px/s | frontmost of far plane |

Every period divides 1920 (`15`, `3`, `8`). Invariant A is perfectly satisfied. And the
frontmost layer of the far plane runs at 32 px/s while the layer *behind* it runs at 76.8 px/s
— depth inverts inside a single plane. The table is internally consistent and renders wrong.

The historical instance is worse. The post-interview table this change replaces had the sky at
25 s (76.8 px/s) sitting **behind** hills at 60 s (32 px/s) — a 2.4× inversion between the
backdrop and the mid-ground, with every other pairing correct. It would have shipped as a
visible bug and would have passed any check that only tested divisibility.

**Therefore: the layer table is verified on two axes, and the speed axis is the one that has
failed twice.** Any future layer must be checked against both, and a table that passes A is not
evidence about B.

### The canonical layer table

Reproduced verbatim from the delta. Rows are ordered back to front, so **table order is paint
order**.

| Layer | Class | Period | Duration | Speed | Plane | Tile geometry |
|---|---|---|---|---|---|---|
| **Sky** | `.arcade-scroll-sky` | 128 px | 120 s | 16 px/s | far, backmost | `w-[3840px]` + 2 × `w-[1920px]` |
| **Hills** | `.arcade-scroll-hills` | 640 px | 60 s | 32 px/s | far | `w-[3840px]` + 2 × `w-[1920px]` |
| **Trees** | `.arcade-scroll-trees` | 240 px | 25 s | 76.8 px/s | far | `w-[3840px]` + 2 × `w-[1920px]` |
| **Ground tint** | `.arcade-scroll-ground` | 40 px | 10 s | 192 px/s | surface | `w-[3840px]` + 2 × `w-[1920px]` |
| **Road edge lines** | `.arcade-scroll-edges` | 60 px | 2 s | 960 px/s | road | `w-[3840px]` + 2 × `w-[1920px]` |
| **Rumble strip** | `.arcade-scroll-rumble` | 192 px | 2 s | 960 px/s | road | `w-[3840px]` + 2 × `w-[1920px]` |
| **Road dashes** | `.arcade-scroll-dashes` | 192 px | 2 s | 960 px/s | road | `w-[3840px]` + 2 × `w-[1920px]` |

Speed check: `16 < 32 < 76.8 < 192 < 960` — five distinct values, strictly increasing with
proximity. Invariant A: all seven periods divide 1920. Invariant B: holds.

> **Annotation correction.** The delta's table marks the trees duration "(was 30 s)" and the
> edge lines "(was 1.2 s)". Neither value has ever shipped — `src/index.css` carries only
> `25s` (`:108`, sky), `10s` (`:113`, ground) and `2s` (`:118`, dashes). Those two "was"
> annotations refer to superseded drafts of this same delta, not to code on disk. The sky's
> "was 25 s" *is* real shipped code. This is the same defect species the project has tracked
> twice before: an unverified figure in a record presented as measured.

---

## Design-debt discharge — `AGENTS.md` hard rule 5

Two entries in `state.yaml` → `design_debt` are owed by this phase. Both record a deliberate
choice that pushes against a project posture. Each states the decision, the alternatives, and
what it costs.

### Debt 1 — the 60 s rung (`parallax-rung-60s`)

**Decision.** The pre-existing parallax ladder `2 s / 10 s / 25 s` was fully consumed — sky took
25 s, ground tint took 10 s, road paint took 2 s. Rather than introduce a second, parallel speed
vocabulary for the far plane, a **fourth rung at 60 s** was added to the single existing ladder
and the hills joined it.

**Alternatives considered.**

| Option | Why it lost |
|---|---|
| **Put the hills on an existing rung** — 25 s, 10 s, or 2 s | Every one of the three is already owned by a layer that must keep it. Hills at 25 s would tie the hills with the trees at 76.8 px/s and fuse two far-plane layers into one slab; at 10 s the hills would run at 192 px/s, six times the sky, collapsing the far plane into a single blur; at 2 s the hills would run at 960 px/s, identical to the road paint, and the depth read would end at the first horizon. Each of these is a smaller version of the defect the 120 s rung exists to fix. |
| **Start a parallel far-plane scale** (the shape `exploration.md` took: 18 s hills, 10 s mid) | Two vocabularies means a future contributor can pick a rung from either, and neither set alone makes the "all speeds distinct, monotone by proximity" property checkable by inspection. The exhaustion of one ladder is a feature, not an inconvenience: when it runs out you have to think about depth instead of reaching for the next number. One exhaustible ladder forces that thought; two ladders defer it. |
| **Make the hills static (0 px/s)** | Free on every axis — no rung, no period, no seam risk, and it would have simplified the layer. Rejected because the hills *are* the primary far-plane depth cue: a repeated silhouette that does not move is a wallpaper, and the hills are the layer that tells the player the world has depth at all. The same argument is applied, in the opposite direction, to the sky below. |
| **An intermediate rung — 40 s or 45 s** | 60 s is not a round-number choice; it is the rung that makes the sky exactly **half** the hills. The binding constraint is the sky/hills ratio (see Debt 2), and 60 s is the only rung on the ladder that yields it without breaking the hills < trees ordering. An arbitrary 45 s would have forced a sky period that reads as static. |

**What it costs.**

- **The ladder's spacing is now irregular**: `2, 10, 25, 60, 120` — ratios of 5, 2.5, 2.4, 2. It
  was already irregular before this change; the new rungs make the irregularity a pattern rather
  than an accident, which is marginally better (the tail is a clean doubling pair) but means the
  ladder is **enumerable, not derivable**. There is no formula that produces the next rung.
- **The ladder is no longer memorable**, and a contributor reaching for "the rung above 25" will
  guess 45 or 50 and land *between* two existing rungs, breaking Invariant B without breaking
  Invariant A — the exact failure mode the two-invariant framing exists to catch. Mitigation:
  the ladder is written out as an enumerated set in the delta and here, and `tasks.md` should
  carry it verbatim rather than describing it.
- **60 s is a long time to watch anything.** The hills advance 32 px per second; over one 3 s
  green light they move 96 px, about 8.7% of the 1100 px panel. See Debt 2 for the shared cost
  and its review implication.

### Debt 2 — the 120 s rung (`parallax-rung-120s-sky`)

**Decision.** The sky is slowed **4.8×**, from its shipped 25 s to 120 s: `1920 / 120 = 16 px/s`,
exactly **half** the hills' 32 px/s. The sky was already the backmost layer in paint order; this
decision makes it the slowest layer in speed, which is the only arrangement in which the z-order
is also the speed order.

**The chain of reasoning, including the two obvious answers and why both are wrong.**

*The obvious answer 1 — leave the sky at 25 s.* Wrong, and badly. The sky is **backmost**.
Every nearer layer must move faster or depth inverts. At 25 s the sky ran at
`1920 / 25 = 76.8 px/s` while sitting behind hills at `1920 / 60 = 32 px/s` — a **2.4×
inversion**: the backdrop moved two and a half times faster than the mid-ground in front of it.
This is the worst defect this change contains, because it is invisible in a table and obvious
in motion.

*The obvious answer 2 — share the hills' 60 s rung.* Also wrong, for a different reason.
At a shared 60 s both layers run at 32 px/s. Two layers at **identical** speed with one behind
the other produce **zero relative motion**, and the far plane collapses into a single flat
sliding sheet. Depth is read from *differential* velocity, not absolute velocity: the eye
compares each layer against its neighbours, so a tie reads as one plane. A shared rung is
worse than an inversion in one specific way — an inversion at least gives the eye *some*
structure to read, while a tie gives it none, and it does so at the exact layer the change
exists to build.

*The defence that was tried and failed — "the sky is a non-figurative gradient, so nobody will
notice."* This was the actual argument for leaving the sky fast, and it is **false on the
source's own terms**. The shipped sky is a **100 px periodic lattice**: one
`linear-gradient(45deg, …)` gradient at `background-size: 100px 100px` plus a **50,50-offset
duplicate** (`ArcadeBackground.tsx:17-20` and `:39-42` — one `tileGradient` string holding two
identical layers, positioned `"0 0,50px 50px"`). A periodic lattice with a half-pitch offset is a
**repetitive grating** — the most motion-salient pattern class there is, and the textbook
trigger for wallpaper-pattern hallucination under peripheral motion. The premise inverted the
fact: the sky is not the least perceptually salient layer, it is among the most. A flat,
non-figurative gradient would have been the safe choice; this is not one. The graded
`--color-scene-sky-top → --color-scene-sky-horizon` replacement is *less* salient, but it is
still a banded field, so "slow enough that the grating does not read as motion" remains the
operative criterion, not "invisible".

*The alternative that was offered and declined — make the sky static (0 px/s).* This would have
been the strictly simpler design. It would have produced a **perfectly monotone ladder**
(0 < 32 < 76.8 < 192 < 960), it would have removed the sky from the periodicity constraint
entirely (a static layer has no pan distance and no seam), it would have avoided adding a fifth
rung, and it would have eliminated the largest review risk in this document. It was declined
because it **removes the sky as a layer**: a sky that does not move is a backdrop plate, and
the parallax read depends on the player perceiving more than one velocity in the far plane. A
static sky is the same mistake as a fused sky — both collapse the far plane — reached by a
different route. The maintainer chose to keep the sky animated, and this records that it was a
choice with a cheaper option available.

**What it costs.**

- **A fifth rung breaks the 2/10/25/60 cadence.** The ladder is now `2, 10, 25, 60, 120` — two
  new rungs, not one, and the tail is a doubling pair that no formula predicts. Debt 1 already
  records the irregular-spacing cost; this is the second half of it.
  - **16 px/s is slow enough that a reviewer may read it as "not working."** This is quantified
  and it is real. During one 3 s green light (`2000 ms` green + `1000 ms` yellow,
  `App.tsx:141-147`, in `startGame`) each layer advances:

  | Layer | px/s | Travel in 3 s | As a fraction of the 1100 px panel |
  |---|---|---|---|
  | Sky | 16 | **48 px** | **4.4%** |
  | Hills | 32 | 96 px | 8.7% |
  | Trees | 76.8 | 230 px | 20.9% |
  | Ground tint | 192 | 576 px | 52.4% |
  | Road paint | 960 | 2880 px | 262% (2.6 panels) |

  The sky moves 48 px in the entire green window. A reviewer watching one question will
  reasonably conclude the animation is dead, and may file it as a regression against a
  layer that *is* working. This is the single largest verification risk in the change, and
  there is no automated check for it (see [Verification](#verification-tsc-greps-and-a-human-with-the-app-open)).
- **The mitigation is accumulation, and it is not obvious.** The animation is
  `infinite` with `animation-play-state: paused`; it resumes from where it stopped rather than
  restarting, so the sky's 48 px accumulates across questions. Over a 10-question run the sky
  has travelled 480 px — 44% of the panel width — which is enough for the grating to register.
  **`verify-report.md` must therefore state the accumulation explicitly**, or the reviewer will
  see 48 px and call it broken.
- **The sky is the one layer whose period change cannot be separated from its geometry change**
  (Decision 3). The cost of the 120 s rung is therefore not just a review risk; it is a
  coupling that makes the highest-risk edit in the change a two-part atomic commit.

---

## Architecture decisions

### Decision 1: fixed 1920 px tiles, and the panel ceiling they create

**Choice.** Every layer: a `w-[3840px]` flex container holding two `w-[1920px]` tiles, panned
1920 px per cycle.

The code picked between two complementary geometries **by accident** — the dash layer was
migrated to fixed tiles in the arcade retrofit to fix one seam (R3-1), and the two
`w-1/2` layers were left alone under a justification that has since been withdrawn as
mathematically false. The accident happened to land on the right geometry, for the wrong
reason, on one of three layers.

| Property | `w-1/2` tiles in `w-[200%]` | Fixed `w-[1920px]` in `w-[3840px]` |
|---|---|---|
| Traced coverage | Holds at **every** width `P` — container spans `[−tP, (2−t)P]`, panel is `[0,P]`. **No width ceiling.** | At `t=1` the container spans `[−1920, +1920]`. **Ceiling: the panel cannot exceed 1920 px**, or a hole opens. |
| Pan distance | `t × P` — **viewport-dependent** | `1920 px` — a **constant** |
| Correctness condition | `P mod period == 0` — one congruence **per viewport width**, checked nowhere | `1920 mod period == 0` — one congruence, checked once, by hand |
| Verifiable today? | **No.** No test runner, no browser. The condition changes with the window. | **Yes.** Integer division, recorded in this table. |
| Failure mode observed | Two live seams, one at the flagship width, one at 19 of 20 enumerated widths | None reachable at the current cap |

**Rationale.** The decisive difference is not the coverage ceiling — it is the other way round.
`w-1/2` has the *better* coverage profile and the fixed tile has the *worse* one, and that is
the honest comparison. But the thing `w-1/2` buys is a property nobody can check, and the thing
the fixed tile costs is a property nobody currently needs: the panel is capped at
`max-w-[1100px]` (`App.tsx:235`, `w-full max-w-[1100px] perspective-1000`), and `1100 < 1920`.
A ceiling that is unreachable is cheaper than a correctness condition that is unverifiable.

**The ceiling, stated so it is not lifted by accident.** `max-w-[1100px]` at `App.tsx:235` and
the 1920 px tile width are **two independent decisions that happen to be compatible**. Lifting
the panel cap past 1920 px without touching the layer geometry opens a visible hole at the end of
every cycle on every layer. The cap and the tile geometry are coupled by coincidence, not by
design, and nothing in the code enforces the coupling.

**Escape hatch, if the cap ever lifts.** The delta's version of this is arithmetically wrong
(see [Reconciliation ledger](#reconciliation-ledger), item R-5). The correct escape hatch needs
**no keyframe change at all**:

```
container  w-[7680px]        (4 tiles)
tiles      4 × w-[1920px]
pan        translateX(-50%)  →  -50% of 7680 = 3840 px = exactly 2 tiles
congruence 3840 mod {128, 640, 240, 40, 60, 192} = {30, 6, 16, 96, 64, 20}  — all integers
coverage   at t=1 the container spans [-3840, +3840]; a 1920 px panel is covered
```

`translateX(-50%)` is already the keyframe. Doubling the container from 3840 to 7680 doubles the
pan to 3840 px, which is two whole tiles and is divisible by every period in the table. The
delta's `pan -25% (3840 px = exactly 2 tiles)` is self-inconsistent: `-25%` of a 7680 px
container is 1920 px, which is one tile, not two — and a one-tile pan would not need four tiles
at all.

### Decision 2 — Two live bugs, treated as two bugs, because they are two different bugs

Both are period/tile mismatches on `w-1/2` layers. They are the same *invariant* failing at two
sites with opposite *symptoms*, and merging them is how a fix gets scoped wrong.

| | **Ground** | **Sky** |
|---|---|---|
| Period today | 40 px | 100 px |
| Tile today | `w-1/2` in `w-[200%]` | `w-1/2` in `w-[200%]` |
| `1100 mod period` | **20** → seams | **0** → clean |
| `720 mod period` | **0** → clean | 20 → seams |
| Widths where it seams | any `W` not a multiple of 40 (1080, 1180, 1100…) | 1024, 976, 852, 768, 720, 540, 414, 390, 375, 360, 1920, 1440, 1366, 1280, 1080 |
| Character | **Flagship-layout design-consistency failure** — broken at the one width the design was tuned for | **Responsive failure** — clean on desktop, broken on every tablet and phone |
| Fix | Tile migration only. `1920 mod 40 = 0`. | Tile migration **plus** period change. `1920 mod 100 = 20`, so geometry alone is impossible. |
| Ships in | **PR1** — it is a one-line class swap on an existing layer | **PR2** — coupled to the sky's period and duration change and to its complete redraw |

**Why the asymmetry drives PR scoping.** The ground fix is a pure contract fix: change `w-1/2` to
`w-[1920px]` and `w-[200%]` to `w-[3840px]`, change nothing else, alter no period and no speed.
It is reviewable in isolation, and it is a strict improvement at every width. The sky fix
*cannot* be separated from its period and duration change (Decision 3), and its content is
replaced wholesale in the same change. Landing it in PR1 would mean PR1 changes a layer's speed
from 76.8 px/s to 16 px/s — which is a composition change, and PR1's defining property is that
it has none.

**Severity correction on the ground seam — this is not a flicker.** The natural reading of a
seam on a scrolling layer is a transient artefact that flashes past. That reading is wrong here,
and the reason is the game loop. `isMoving` runs for **3 s** (2000 ms green + 1000 ms yellow,
`App.tsx:141-147`) and then stops; the question panel is gated on `!isMoving` (`App.tsx:389`).
The layer therefore advances only **0.3 of a cycle** per green light. Today, on `w-1/2`, the
A/B tile boundary starts at container `x = 1100` and travels `0.3 × 1100 = 330 px` in those
3 s, landing at **screen `x = 770 px` — and parking there for the entire question period**,
because nothing resumes the animation until the next green light. The 20 px half-spacing
compression is therefore a **fixed mid-panel artefact present for most of play time**, not a
transient. Under the fix, the boundary starts at container `x = 1920` and advances
`0.3 × 1920 = 576 px` to screen `x = 1344` — **outside** the 1100 px panel — so the seam is
off-screen for the whole cycle instead of parked in view.

**One unverified `W mod period` invariant, failed differently in two places.** That is the
generalisable lesson and it is why Invariant A is defined against the pan distance rather than
against the viewport: the pre-change `arcade-retrofit.md` design record states that the sky and
ground layers "are visually continuous at the designed panel width (sky period 100px,
1100 mod 100 = 0; ground period 40px, half-cell offset is sub-visible at rgba alpha 0.04)". Both
halves of that sentence are true *and neither implies safety*: the sky happened to be clean at
1100 px by arithmetic luck and was never checked anywhere else, and the ground was called
"sub-visible" on an alpha-4% line rather than on its geometry — which is a visual claim used to
stand in for an arithmetic claim that was false. A visual observation is not a substitute for
the congruence.

### Decision 3 — The sky's period and tile migration are ONE atomic step

**This is the most likely way an implementer gets the change wrong. Read it before touching
`ArcadeBackground.tsx`.**

The delta requires the sky period to become 128 px, and requires the sky to migrate to fixed
1920 px tiles. Neither is valid without the other.

| Landed alone | Arithmetic | Result |
|---|---|---|
| Tile migration, period stays 100 px | `1920 mod 100 = 20` | **Introduces a seam where none exists today.** `1100 mod 100 = 0`, so desktop is currently clean. This is a net regression at the flagship width, shipped as a "fix". |
| Period change to 128 px, tiles stay `w-1/2` | `1100 mod 128 = 76` | **Worse than the bug being fixed** — 76 px of phase error, three times the ground's 20 px, and still broken at 19 of 20 enumerated widths because `w-1/2` is viewport-dependent. |
| **Both, together** | `1920 mod 128 = 0`, pan is the constant 1920 px | Correct at every viewport width, forever. |

**Design consequence: this is a single commit with no intermediate state.** There is no partial
version of the sky migration that is an improvement. The task list must express it as one
deliverable — change the period, the duration, the tile class, and the container class in the
same edit — and the reviewer's `git diff` on `ArcadeBackground.tsx` should show all four together.
If a diff shows the sky's `background-size` changed without the tile class changing, **stop**.

**The generalisable rule, worth more than this one layer:** for a `translateX(-50%)` tile loop,
*the period is not a free parameter.* It is constrained by the pan distance, which is constrained
by the tile geometry. Changing any one of the three is a coupled change, and the coupling is
invisible in a single-file diff.

### Decision 4 — Two new token families in `@theme`: `--color-scene-*` and `--shadow-hard`

**Choice.** Create the `--color-scene-*` colour namespace (**11** tokens) and the
`--shadow-hard` token, which is the **first member of a namespace this project has never had**.

The 11 are fixed by the delta's *The scene palette is a fixed token set* requirement, which names
each by **role** rather than by token identifier — `sky-horizon #bfe9ff`, `sky-top #5ec5f5`,
`clouds #ffffff`, `far-hills #4a9e5c`, `trees-light #2f7a46`, `trees-dark #245f38`,
`road #3a3a48`, `rumble-red #e03a3a`, `rumble-white #f0f0f5`, `road-dashes #e8e8f0`,
`car-body #ffc23a`. The naming convention is **not specified by the delta** and this design fixes
it: `--color-scene-<role>` with hyphens, matching `--color-surface-container-highest`. Only
`--color-scene-car-body` is named explicitly in the delta, so the other ten are an
implementation-phase naming decision recorded here so `tasks.md` and `verify-report.md` share one
spelling.

**Why `shadow-hard` does not exist today — the root cause is structural, not an oversight.**
Tailwind v4 derives a `shadow-<name>` utility from a `--shadow-<name>` theme token. `@theme` has
`--color-hard-shadow` (a **colour**), which generates `text-hard-shadow` / `bg-hard-shadow` /
`border-hard-shadow` and **no** shadow utility at all. The colour half of the concept exists;
the shadow half has no token to hang on, so the offset is written out by hand wherever it is
needed. This is not three authors forgetting a convention — it is a missing namespace that
makes the convention unwritable.

**The three migration sites, all three named:**

| Site | Current | Becomes |
|---|---|---|
| `src/index.css:69` — `.pixel-panel` | `box-shadow: 4px 4px 0 var(--color-hard-shadow);` | `box-shadow: var(--shadow-hard);` |
| `src/index.css:79` — `.game-sector-glow` | `box-shadow: inset 0 0 0 2px var(--color-frame-strong), 4px 4px 0 var(--color-hard-shadow);` | `box-shadow: inset 0 0 0 2px var(--color-frame-strong), var(--shadow-hard);` — **the inset ring survives; this is not a pure substitution** |
| `src/App.tsx:344` — the "Jugar" button | `shadow-[4px_4px_0_var(--color-hard-shadow)]` | `shadow-hard` |

**Alternatives.**

| Option | Why it lost |
|---|---|
| Keep the arbitrary-value utility and document it | It is already there and it works. But three sites hold three copies of a literal, which is the exact duplication the change exists to remove, and `shadow-[4px_4px_0_…]` is greppable while `shadow-hard` is a token — so the current form is *harder* to audit, not easier. |
| A plain CSS class `.shadow-hard` in `@layer components` | Works, but reintroduces a hand-written class in a project whose whole token strategy is `@theme` → generated utility. The token route also makes the offset available to `@apply`, which the `.pixel-panel` / `.game-sector-glow` rewrite needs. |
| Promote the offset to a `@utility` rule | Tailwind v4's `@utility` is for utilities with parameters, which this does not have. Overkill for a constant. |

**Two costs to state.**

1. **`--shadow-hard` becomes coupled to `--color-hard-shadow`.** The value is
   `4px 4px 0 var(--color-hard-shadow)`, so deleting or renaming the colour token silently
   invalidates the shadow — the declaration stays present and stops rendering, which is the
   worst failure mode for a token. This coupling must be recorded next to the token definition,
   not only here.
2. **The delta's "the literal `4px 4px 0` does not appear a second time" verify needs one
   exception it does not name:** the literal must still appear *inside* the `--shadow-hard`
   definition in `index.css`. A grep for `4px 4px 0` over `src/` returns exactly one hit, and
   `verify-report.md` must read that hit and confirm it is the definition, not a violation.

### Decision 5 — Token debt: adopt `--color-on-dark`, and fix the false "legacy" comment

**Verified census.** `@theme` (`index.css:4-58`) declares **39** `--color-*` tokens. **13** have
zero consumers — zero Tailwind utility references (no `bg-`/`text-`/`border-`/`fill-`/`stroke-`/
`from-`/`to-`/`via-`/`ring-`/`outline-`/`shadow-`/`divide-`/`placeholder-`/`accent-`/`caret-`/
`decoration-` utility naming them) and zero `var()` references across `App.tsx`,
`ArcadeBackground.tsx`, `CarSprite.tsx`, and zero `@apply` references in `index.css` outside the
`@theme` block itself:

```
:10 on-dark   :12 accent-blue  :13 accent-yellow  :14 accent-green  :16 accent-pink
:20 surface-bright            :21 surface-container-lowest
:22 surface-container-low     :23 surface-container
:24 surface-container-high    :25 surface-container-highest
:29 secondary                 :35 danger-text
```

The `/* Legacy tokens kept for backward compatibility */` comment at `index.css:19` sits above
**11** declarations (`:20-30`), of which **7** have zero consumers and **4** are live
(`--color-on-surface-variant`, `--color-primary`, `--color-on-primary`, `--color-tertiary`). So
the accurate statement is *thirteen tokens have zero consumers, seven of them sitting under a
comment that also labels the live four as legacy* — the comment is false in both directions, and
correcting it is required, because leaving it makes the next reader believe a falsehood about the
theme.

**The deletion count is 11, and the subtraction is shown so it is checkable.** This is ruling R-1,
applied to the delta on 2026-09-28. The figure in this document before that ruling was 13, which
counted *adjudication* as *deletion*:

```
13  --color-* tokens have zero consumers today
 -1  --color-on-dark        RETAINED — it becomes live at the eight mapped sites below
 -1  --color-accent-yellow  RETAINED — it becomes live as the sun
 = 11 deletions
```

The 11, and only these 11, MUST be deleted: `--color-accent-blue`, `--color-accent-green`,
`--color-accent-pink`, `--color-surface-bright`, `--color-surface-container-lowest`,
`--color-surface-container-low`, `--color-surface-container`, `--color-surface-container-high`,
`--color-surface-container-highest`, `--color-secondary`, `--color-danger-text`. **That list is
identical to the one the delta now names** — the census above was already correct and needed no
change; only the *count of deletions* was wrong. Two further tokens are LIVE today and are retired
by this change rather than deleted as dead — `--color-track-line` and `--color-dash` (R-8) — and
they are **not** part of the 11.

**Decision: adopt `--color-on-dark`, do not delete it — mapped per site, not by blanket rule.**
The token is `#fff1e8` at all nine former `text-white` / `hover:text-white` sites in `App.tsx`
(339, 360, 369, 376, 381, 409, 439, 453, 469). What R-2 replaced is not the token but the
**blanket legibility claim**: eight of the nine sit on a surface where the token measures 15.43:1
and the ninth does not. See the per-site mapping below.

| Option | Why it lost / won |
|---|---|
| **Adopt `--color-on-dark` (chosen)** | The token already exists, is already documented as "primary body text on dark" in `arcade-retrofit.md:53,97`, and measures 17.07:1 on page bg and 15.43:1 on panel surface — AA normal and AA large, both clear. `#fff1e8` is a warm off-white, which matches the daylight-warm scene palette; pure `#fff` is currently the coldest colour in the frame. Adopting it is zero new tokens, and it revives a dead token rather than minting a second one for the same value. **Role note, and the correction of an earlier revision of the delta: `--color-on-dark` is the *headline/HUD* colour, not the body-text colour.** The source of truth for the body-text role is `--color-on-surface` `#c2c8d0` (`index.css:17`), applied by the `body` rule at `index.css:62` (`@apply bg-background text-on-surface …`); the delta's scene-palette reuse table now says "body text → `--color-on-surface` `#c2c8d0`" and "muted body → `--color-on-surface-variant` `#bdc8d1`", and this design agrees. An earlier revision of that table named `--color-on-dark` / `#fff1e8` as body text; that pairing is source-false and is not repeated here. |
| Delete `--color-on-dark` and keep `text-white` | `text-white` resolves to Tailwind's built-in `--color-white`, so it is not a hard rule 1 violation today. But it is a token the project never adopted, it is invisible to the delta's token-discipline audit (it is not a hex literal), and it leaves the theme's stated intent — a warm off-white body colour — unimplemented. |
| Mint a new token | Worst of the three: a second token for a value that already exists in the theme. |

**Costs.**

- The eight mapped sites get a **1.5% darker** white. A reviewer diffing `text-white` →
  `text-on-dark` will ask why, and the answer ("the token already existed and was documented for
  exactly this") needs to be in the PR description. The ninth site, the score value, is not a
  colour change at all and will not appear in that diff.
- `--color-on-dark` is the hex `#fff1e8`, and `openspec/config.yaml` documents that a bare `F1`
  alternative in the framing audit false-positives on it. Adopting the token does not increase
  that exposure — only `index.css` holds the hex, not the 9 `.tsx` sites — but the coupling is
  worth knowing before anyone edits the audit pattern.

**The mapping is per site, and one site is carved out. This is ruling R-2, applied to the delta on
2026-09-28** — it is no longer a design-phase finding awaiting a spec amend. The delta now carries
a per-site mapping table and its own requirement, *The score HUD carries a pixel-panel chip*; the
delta's table is authoritative and is reproduced here:

| Site | Working tree | Backing surface after this change | Contrast |
|------|--------------|-----------------------------------|----------|
| menu `<h1>` | `App.tsx:339` | `.pixel-panel` over `--color-surface` | 15.43:1 ✅ |
| mode `<h2>` | `App.tsx:360` | same | 15.43:1 ✅ |
| difficulty "Fácil" | `App.tsx:369` | same | 15.43:1 ✅ |
| difficulty "Realista" | `App.tsx:376` | same | 15.43:1 ✅ |
| back link (`hover:text-white`) | `App.tsx:381` | same | 15.43:1 ✅ |
| question `<h3>` | `App.tsx:409` | same | 15.43:1 ✅ |
| game-over `<h2>` | `App.tsx:439` | same | 15.43:1 ✅ |
| "Jugar" button | `App.tsx:453` | `.pixel-panel` with solid `bg-surface` | 15.43:1 ✅ |
| **score value — THE EXCEPTION** | `App.tsx:469` | **the new `.pixel-panel` HUD chip this change adds** | 15.43:1 **only because of the chip** |

**The carve-out is a surface requirement, not a token swap.** The score value still takes
`--color-on-dark`; what is different about it is that it is the only one of the nine whose surface
is `status === 'playing'`, so its background is the new bright scene. Against sky-top `#5ec5f5`
the token measures **1.76:1** and `#ffffff` **1.95:1** — both fail. The theme owns **no** white
that is legible over the bare sky, so the fix has to add a surface; recolouring the text cannot
work, and that is what makes this a layout requirement rather than a colour decision.

**The answer needs no new token and no new colour: give the score HUD the same `pixel-panel` chip
the stoplight already has** (`App.tsx:250` is already a `pixel-panel` at `absolute top-6 right-6`,
working tree), with a **solid** `--color-surface` background, not a transparent one, because the
scene is bright enough to show through. Symmetry with the stoplight, 15.43:1 restored, one class,
and the panel's two fixed HUD corners become the same object. The chip is a **PR2** item: it exists
only to fix legibility against the new scene, and the new scene lands in PR2.

**What was withdrawn, precisely.** "All 9 sites take `--color-on-dark`" is true only as a
class-name swap and false as a legibility claim, and the two must not be conflated. The token is
still `--color-on-dark` at all nine; the blanket **legibility** assertion is what the per-site
mapping replaces.

**The unsanctioned colour-utility census — three subtotals, never a blended total.** This is
ruling R-3, applied to the delta on 2026-09-28. The delta's decomposition is authoritative, and it
is stated as **three separate groups** so the arithmetic error this section used to carry cannot
recur. All three are tokenised, **all-or-nothing**: each is a raw Tailwind palette step or
step-opacity standing in for a colour the theme already owns a name for, and minting a separate
alpha token for them would be wrong because every one of them is an overlay or divider on a surface
that already has a token — the opacity is part of the role, not a separate colour. Tokenising some
and leaving others is not a middle position; it produces a theme where the same value is named in
one place and spelled inline in another, which is strictly worse than either uniform choice.

| Group | Subtotal | Composition |
|-------|----------|-------------|
| white/black utilities in `src/**/*.tsx` | **17** | `text-white` ×8 (339, 360, 369, 376, 409, 439, 453, 469) · `hover:text-white` ×1 (381) · `border-white/5` ×3 (`ArcadeBackground.tsx` 34, 60, 69) · `bg-white/10` ×2 (312, 471) · `border-white/10` ×1 (405) · `bg-black/20` ×1 (405) · `hover:bg-white/5` ×1 (453) |
| `bg-slate-900/20` at `ArcadeBackground.tsx:57` | **1** | a `@theme` token |
| hard-coded `rgba()` in `.scanline` at `index.css:73-74` | **5** | `rgba(18,16,16,0)`, `rgba(0,0,0,0.25)`, `rgba(255,0,0,0.06)`, `rgba(0,255,0,0.02)`, `rgba(0,0,255,0.06)` → `@theme` tokens |

**No blended total is stated, deliberately — and none of the historical figures below is live.** The
pre-ruling text here headed its census with a single number, and its own decomposition did not sum
to it, while the delta headed its own with a different one: two documents disagreeing about one
census, which is exactly how an audit count drifts. Both headline figures are void. The three
subtotals above are the only form in which these numbers may be written, and no fourth number may
be derived from them by an implementer. This design's 17 matches the delta's 17, and the four
utilities this section originally flagged — `bg-white/10`, `border-white/10`, `bg-black/20`,
`hover:bg-white/5` — are now inside the delta's table with the same line numbers.

### Decision 6 — The car-colour tension: the spec agent's encoding is unimplementable, and the real legibility failure is tier 1

**The tension, stated plainly.** The base spec (*Car sprite states and lives-based recoloring*)
requires: "Body color MUST come from the lives tier tokens" — a 5-row table. The delta adds
`--color-scene-car-body` `#ffc23a` as "the base skin" while keeping the tier tokens "as the
recolouring mechanism".

**I challenge the encoding "base skin + recolouring mechanism".** It is not implementable as
written. The body fill is a single `color` prop resolved by `carColor(lives)` (`CarSprite.tsx:24-32` — a 5-arm
`switch` whose `default` branch returns `var(--color-car-tier5)`). There is
**no code path** by which `#ffc23a` reaches a body `<rect>`. Under the delta's own encoding the
new token is **born dead** — which is the exact defect species the same delta is auditing out of
the theme, and the same species as the `--car-color` property it is simultaneously fixing
(R2-1). A token with no consumer on day one is not a base skin; it is dead code with a palette
value.

**Resolution, ranked:**

| Option | Assessment |
|---|---|
| **(1) `--color-scene-car-body` replaces `--color-car-tier5` (recommended)** | `#facc15` and `#ffc23a` contrast at **1.05:1** — they are the same colour to the eye. The 5+ slot *is* the scene body colour under another name. Replacing it makes the base spec's "body colour comes from the lives tier tokens" still literally true (four tier tokens plus one scene token, one ladder), gives the new token a real consumer, and removes a duplicate. **Cost:** the base spec's 5-row table must be edited at archive, and "5+ lives" stops being accidentally-yellow and becomes deliberately-the-scene-body. |
| (2) `--color-scene-car-body` as a trim/outline layer over the tier fill | Needs a second fill pass over 8 `<rect>` primitives, changing the sprite's structure, and the crash state already carries its own colour set. More structure than the problem needs. |
| (3) Delete `--color-scene-car-body` | Defensible — the tier ladder is already a complete handle. **Cost:** the scene palette then has no car role, so a future restyle has no scene-side colour to reach for. |

**Recommendation: (1).** It is a spec decision; this design phase recommends it and the delta
amends it. Recorded in the ledger.

**The legibility risk, quantified — the spec's tier table has no contrast expectations and should.**

The tier ladder is a **luminance ramp that inverts**: tier 1 is the darkest, tier 5 the lightest.
Against the new road `#3a3a48` — the surface the car actually sits on:

| lives | token | hex | vs road `#3a3a48` | vs `--color-scene-car-body` `#ffc23a` |
|---|---|---|---|---|
| 1 | `--color-car-tier1` | `#64748b` | **2.35:1** ❌ below the 3:1 non-text line | 2.95:1 |
| 2 | `--color-car-tier2` | `#7ba7c9` | 4.37:1 ✅ | 1.59:1 |
| 3 | `--color-car-tier3` | `#8ed5ff` | 6.98:1 ✅ | **1.01:1** |
| 4 | `--color-car-tier4` | `#7dd3fc` | 6.70:1 ✅ | **1.03:1** |
| 5+ | `--color-car-tier5` | `#facc15` | 7.30:1 ✅ | **1.05:1** |

Two findings the spec does not state:

1. **Tier 1 is the failure, not tier 5.** At one life — the state a player is in when the game is
   hardest — the car body is at **2.35:1** against the road and effectively disappears. This is a
   pre-existing problem the dark panel surface was hiding (the old surface `#1a1a2e` is *darker*
   than the new road, so tier 1 at 2.35:1 against the road was previously ~1.5:1 — actually
   *worse*, but nobody noticed because the scene had no road). The bright daytime scene makes it
   visible. It is not introduced by this change; it is **exposed** by it, and that is a reason to
   fix it here rather than defer it.
2. **The ladder is not distinguishable end-to-end at 2× scale.** Adjacent-pair contrast:
   tier1↔tier2 **1.86**, tier2↔tier3 **1.59**, tier3↔tier4 **1.04**, tier4↔tier5 **1.09**.
   Tiers 3 and 4 differ by a few degrees of hue at 1.04:1, on a 128×64 sprite — the player cannot
   see the change. **Therefore the lives signal cannot be carried by body hue.**
   (`tier2↔tier3` reads **1.59** here, matching the delta's figure. The pre-ruling text in this
   document said 1.60 — a 0.01 drift corrected to the delta's value, since the delta is
   authoritative.)

   > **BLOCKING PRECONDITION on the car-recolour task — recorded, not solved.** The delta records
   > these adjacent-pair ratios as *evidence that the legibility obligation is a risk*, not as
   > confirmation that it is satisfied. **No contrast ratio was supplied with ruling R-4 for tiers
   > 1–4 against `--color-scene-car-body` `#ffc23a`**, so nothing computed in this document can
   > discharge the obligation. The car-recolour task is **blocked** until a person with the app
   > open and the sprite at 2× confirms the four tiers stay distinguishable; if two of them land
   > under roughly 3:1, sign-off fails and the task returns to this decision. Tiers 3 and 4 are
   > the exposure — they are already 1.04:1 apart from each other. **Do not mark this satisfied
   > because a ratio was computed for a *different* pair**; that is the specific error this
   > precondition exists to prevent.

**Architectural consequence, and the design decision it forces.** The *visible* lives signal must
come from the **5 life pips** at `App.tsx:310-313` (`bg-red-500` lit, `bg-white/10` unlit) — five
unambiguous discrete marks — and the body colour must be treated as **flavour, not as the lives
channel**. The `aria-label` at `CarSprite.tsx:100` already announces lives to assistive tech, and
`.car-aura` is reserved for 5+. Three independent channels, only one of which is hue. This is
stated here so a future contributor does not "fix" the tier ladder by making it the primary
signal and break the depth of the design.

**Two costs.** Tier 1 needs a lightening (it is the only tier below 3:1) or a hard outline, which
changes the sprite's rect structure; and a reviewer seeing four near-identical blues may read the
tier table as sloppy rather than as a deliberate flavour ramp, so the reasoning belongs in the
PR description.

### Decision 7 — Off-seam placement is a first-class rule about *(position, width)*, not about position

**Choice.** Enforce the predicate on the **pair**.

```
A drawn feature spanning [x, x + w] in tile-local coordinates is off-seam
iff  x >= clearance  AND  x + w <= 1920 - clearance
```

| Layer | Count | Positions (local) | Max width | Clearances |
|---|---|---|---|---|
| Hills | 3 | `213 / 853 / 1493` (uniform 640 px pitch; `213 + 1920 = 2133` is the next tile's first peak, so the pattern wraps) | **≤ 380 px** | 23 px each side |
| Trees | **8** | `120 + 240k` for `k = 0..7` → `120 / 360 / 600 / 840 / 1080 / 1320 / 1560 / 1800` | **≤ 96 px** | 72 px each side |

Arithmetic: trees — innermost clears the left edge by `120 − 48 = 72`; outermost clears the
right by `1920 − (1800 + 48) = 72`. Symmetric, no tree crosses either edge. Hills — first peak
clears the left by `213 − 190 = 23`; the wrapped peak at 2133 starts at `2133 − 190 = 1943`, 23 px
past `x = 1920`, so the seam is clear on the right by the same margin.

**Why the width bound is part of the rule and not incidental.** Three reasons, in increasing
order of how badly they bite:

1. **The predicate needs both coordinates.** "Off-seam" is a claim about a *box*, not a *point*.
   An unbounded peak at `x = 213` extends left as far as you like; nothing in the position alone
   constrains it. Without a width the claim is **unfalsifiable** — and the delta's own reversal
   log records exactly this: the earlier draft asserted "peaks at 213/853/1493 are off-seam" with
   no width, and the re-verification had to add the bound to make the claim testable.
2. **Zero clearance satisfies the predicate and still looks wrong.** A tree at `x = 0` satisfies
   `x >= 0`, and its wrapped twin at `x = 1920` sits flush beside it — the player sees one 96 px
   double-wide tree, not a gap. The predicate is **necessary but not sufficient for the read**;
   the clearance margin is what buys the read. This is why the bounds are 72 px and 23 px and not
   zero.
3. **The count is fixed by pitch, not chosen.** `1920 / 240 = 8` tree periods fit in the tile, so
   anything other than 8 leaves a **non-uniform gap** — and a non-uniform gap is itself a feature
   that draws the eye. The delta's reversal log records the earlier draft's `4` trees, "verified"
   by `840 + 120 = 960 < 1920`; that inequality proves dead space on the right, which says nothing
   about whether a tree straddles `x = 0`, which is the property actually required. The
   per-edge clearance arithmetic above replaces it.

**The hills' 23 px is the thinnest margin in the entire change** — an order of magnitude below
the trees' 72 px, and only 3.6% of the 640 px pitch. It is the first thing to eyeball with the
app open, and it should be named in `verify-report.md` as the thinnest clearance rather than left
as a number in a table.

**Gradient-generated layers satisfy this by construction.** Road edge lines (pitch 60) and the
rumble strip (pitch 192) have pitches that divide 1920, and their `repeating-linear-gradient(90deg,
…)` starts a run at local `x = 0` in *both* tiles, so the boundary lands exactly on a run start.
No manual placement, and the property is a consequence of Invariant A rather than of care.
Sun and clouds are static within their tile and carry no period constraint, but must still be
off-seam.

### Decision 8 — Remove the redundant `backgroundSize` from the dash tile

**Choice.** Delete `backgroundSize: "1920px 100%"` and the accompanying `backgroundRepeat:
"repeat"` from both dash tiles (`ArcadeBackground.tsx:95-96` and `:103-104`).

**Why it is a no-op today.** The tile is exactly 1920 px wide. `background-size: 1920px 100%`
makes the painted image exactly 1920 px wide, so one image fills the padding box exactly and
`repeat` **can never fire** — there is no second image to repeat. The declarations describe a
tiling that the geometry has already made moot. The dash pattern is produced entirely by
`repeating-linear-gradient(90deg, var(--color-dash) 0 128px, transparent 128px 192px)`, which
tiles internally at 192 px. Removing `backgroundSize` leaves the rendered pattern **bit-identical**,
so the removal is verifiable by inspection with no visual risk.

**Why it is actively harmful.** On a `w-1/2` regression — the exact mistake Decision 1 exists to
prevent — the tile becomes the panel width (1100 px) while the image stays 1920 px wide. The
paint is then **cropped**: the last 820 px of the dash cycle never renders, and the visible run
is `1100 / 192 = 5.729` periods. The gradient is truncated mid-period and `background-position`
is never animated, so that truncation is a **permanent vertical discontinuity at the tile
boundary**. The declaration would therefore *create* the seam it appears to guard against, while
making the guard invisible. A redundant declaration that sabotages a future regression is worse
than no declaration.

**Cost.** None. Two lines removed, no rendering change, one fewer thing for a future contributor
to reason about. The delta's verify should confirm the *absence*, so the grep is inverted from
"must be present" to "`backgroundSize` must not appear on a scroll-layer tile".

### Decision 9 — PR boundary: contract first, then composition

**PR1 — contract compliance and provenance.** Everything that fixes a live violation or a false
claim, and nothing that changes what the player sees in composition:

- the `shadow-hard` / `--shadow-hard` consolidation and its three migration sites (Decision 4)
- the three violating shadow sites: `App.tsx:251-253` (three 15 px glows), `App.tsx:339`
  (`drop-shadow-2xl`), `App.tsx:405` (`shadow-lg`)
- the **ground seam fix** — the only one of the two live seams that is a pure class swap
- the token cleanup: thirteen zero-consumer tokens adjudicated down to **eleven** deletions, the
  false `/* Legacy tokens … */` comment deleted, and the **eight** `text-white` /
  `hover:text-white` sites whose surface is already legible adopted onto `--color-on-dark`. The
  ninth — the score value at `App.tsx:469` — is a PR2 layout change, not a PR1 colour swap (R-2)
- the `tracking-tighter` / `tracking-tight` removal on the two pixel-font sites
- the `CarSprite` `rx` correction to the 4-unit grid
- the `--car-color` property resolved (consumed or removed — R2-1)
- `.car-aura`'s missing `motion-reduce:animate-none` (R2-2's sibling deviation)
- the **six ungated `motion.div` entrance animations** gated on `prefersReducedMotion`:
  `App.tsx:236` (stage), `:325` (menu), `:353` (mode select), `:390` (question),
  `:430` (game over), `:491` (footer). The three *looping* motions at `:282`, `:296`, and
  `:332` are **already** gated and are not touched
- deletion of the blur/glow DEBUG toggle, retaining the removal note
- **docs:** the false claims in `openspec/design/arcade-retrofit.md` — the "6 rgba sites" count
  (actually 3), the traffic-light carve-out conflation, and the tolerance language with no
  backing authority — all three recorded as `tracked_gaps` in `state.yaml`

**PR2 — visual work.** The scene: the four new layers plus the sky and ground migration, the
11 `--color-scene-*` tokens and the migrated layer colours, the layer paint order, the
`--shadow-hard` consumers' new neighbours, the car grid and tier-legibility work, the question
typography, the stoplight lamp, and the answer-feedback snapshot.

**Why the split is on these lines — reviewability, not chronology.** A reviewer's attention is
the scarce resource, and the two halves of this change consume it differently. PR1 is a
**verifiable-by-grep** change: every claim in it is a count, a grep, or a class swap, and a
reviewer can prove it exhausted without rendering anything. PR2 is a **human-judgement** change:
almost every requirement in it says "not verifiable in-browser" and depends on someone with the
app open. Mixing them produces a diff where the cheap claims and the expensive ones are
interleaved, so the reviewer has to hold both cost models at once, and the cheap work gets
skipped because the expensive work is still open.

**What makes PR1 independently shippable.** It changes no layer count, no composition, no period,
and no duration. Every layer still scrolls at the speed it scrolls at today, so the rendered
result is visually near-identical to `main` apart from the seam it removes. It can ship on its
own merits: it removes a real defect, deletes a DEBUG experiment, and corrects three false
records.

**What makes PR1 separately revertible.** Reverting it restores the three hard shadows to
arbitrary values, the three soft glows, the two negative-tracking pixel headings, and the eleven
deleted tokens — a cosmetic regression with **no** data, schema, API, state-machine, or
layer-geometry consequence. It is a clean revert.

**The reverse is not true, and that asymmetry is the argument.** Reverting PR2 after PR1 has
landed leaves the *fixed* ground layer and the *still-broken* sky: the invariant is half
enforced, and the file reads as though someone tried and gave up. PR2 is therefore forward-only
in practice. **That is the reason the ground fix goes in PR1 and the sky migration goes in PR2**
— it is the only assignment under which the fix that can be reverted cleanly is separated from
the fix that cannot.

> **This overrides the delta.** The delta's *Every layer's tile width is congruent to 0 modulo
> its own period* requirement says "**Two live bugs exist today and MUST be fixed in PR1**" and
> lists both. Splitting them is a delivery-plan change, not a requirement change — both bugs are
> fixed by the end of the change either way — but the delta's text names PR1 and is not this
> phase's to edit. Recorded in the ledger; reconcile at `sdd-tasks` or at archive.

---

## Data flow

No new data. No new state. No new props.

```
App.tsx
  status === 'playing'  ──gates──▶  <ArcadeBackground isMoving={isMoving} />
                                           │
  isMoving ──▶ scrollState = "arcade-scroll-running"   (index.css:122-124)
                                           │  and .car-bounce steps() bounce (CarSprite.tsx:108)
                                           │  animation-play-state: running
                                           ▼
  7 layer containers  (w-[3840px], 2 × w-[1920px] each)
    sky 16 px/s ─┐
    hills 32 ────┤
    trees 76.8 ──┤  invariant B: strictly increasing with proximity
    ground 192 ──┤
    edges 960 ───┤
    rumble 960 ──┤  same speed, same plane — allowed, not a tie across planes
    dashes 960 ──┘
                                           │
                                           ▼
  @keyframes scrollBackground: translateX(0 → -50%)
        -50% of 3840 = 1920 px  = 1 tile  = 10 sky periods = 3 hill periods
                                   = 8 tree periods = 48 ground periods
                                   = 32 edge periods = 10 rumble/dash periods
                                           │
                                           ▼
  prefers-reduced-motion: reduce  ──▶  animation: none !important
                                         (index.css:127-135 — 5 classes today, 7 after)
```

```
CarSprite(isMoving, isCrashed, lives)
  lives ──▶ carColor(lives) ──▶ --color-car-tier1..5   (the ONE body fill)
          ──▶ --car-color  (set at :92)  ──▶  must have a consumer (R2-1)
          ──▶ .car-aura backgroundColor    (lives >= 5 only, :117-123)
```

```
App.tsx  --isMoving-->  ArcadeBackground        (play-state toggle only)
         --isMoving-->  CarSprite .car-bounce   (300ms steps(1))
         --lives─────▶  CarSprite body fill     (one colour channel)
         --lives─────▶  5 life pips             (the PRIMARY visible lives signal)
```

---

## File changes

No file outside this table is touched. No file is created or deleted.

| File | PR | Action | Description |
|------|----|--------|-------------|
| `src/index.css` | 1, 2 | **Modify** | PR1: add `--shadow-hard`; collapse the two `box-shadow` literals; delete the false legacy comment; adjudicate the thirteen zero-consumer tokens down to **11** deletions (R-1); tokenise the **5** hard-coded `.scanline` `rgba()` values at `:73-74`; delete the DEBUG toggle classes, keep the removal note; add `motion-reduce:animate-none` support checks. PR2: add the 11 `--color-scene-*` tokens; add `.arcade-scroll-hills` / `-trees` / `-edges` / `-rumble`; retune `.arcade-scroll-sky` to `128px`/`120s`; extend the `prefers-reduced-motion` block from 3 entries to **7** |
| `src/components/ArcadeBackground.tsx` | 1, 2 | **Modify** | PR1: ground `w-1/2` → `w-[1920px]`, `w-[200%]` → `w-[3840px]`. PR2: sky tile + period + duration as **one atomic edit**; delete `backgroundSize`/`backgroundRepeat` from the dash tiles; add the four new layers in paint order; tokenise the **3** `border-white/5` and the **1** `bg-slate-900/20` (the file's share of the two non-`.tsx` subtotals) |
| `src/components/CarSprite.tsx` | 1, 2 | **Modify** | PR1: correct 8 `rx` values (currently `1`/`2`) to `0`/`4`; resolve `--car-color`; add `motion-reduce:animate-none` to `.car-aura`. PR2: tier-1 legibility fix; scene-body replacement for tier 5 — **blocked on the human sign-off precondition above** |
| `src/App.tsx` | 1, 2 | **Modify** | PR1: 3 soft glows → hard offset; drop `drop-shadow-2xl`; drop `shadow-lg`; the **8** `text-white` / `hover:text-white` sites whose backing surface is already legible → `--color-on-dark` (R-2 per-site mapping); tokenise `bg-white/10` ×2, `border-white/10`, `bg-black/20`, `hover:bg-white/5`; remove `tracking-tighter`/`tracking-tight` on the 2 pixel-font sites; gate the 6 ungated `motion.div` entrances. PR2: question typography, stoplight lamp, feedback snapshot, and the score-HUD `pixel-panel` chip at `:469` |
| `openspec/design/arcade-retrofit.md` | 1 | **Modify** | Correct the three false claims recorded in `state.yaml` → `tracked_gaps` |
| `openspec/changes/arcade-scene-backdrop/state.yaml` | 2 | **Modify** | Set `artifacts.design: openspec/changes/arcade-scene-backdrop/design.md`, flip `phases.design: complete`, set `next_phase: tasks`, and record the R-1..R-10 reconciliation — **done in this phase** |

**Explicitly unchanged:** `package.json`, `server.js`, `db/**`, `openspec/config.yaml`,
`openspec/conventions.md`, `openspec/status.md`, `openspec/specs/data-layer/spec.md`, and
everything under `openspec/changes/archive/**`.

---

## Interfaces / contracts

No new TypeScript interface, prop, or exported symbol. The two existing contracts are unchanged
and are recorded here so a reviewer can confirm it:

```tsx
// CarSprite.tsx — unchanged by this change
interface CarSpriteProps {
  isMoving: boolean;
  isCrashed: boolean;
  lives: number;
  className?: string;
}

// ArcadeBackground.tsx — unchanged by this change
interface ArcadeBackgroundProps {
  isMoving: boolean;
  className?: string;
}
```

The **CSS contract** is what this change extends, and it has exactly four members:

```css
/* 1. one keyframe, shared by all seven layers */
@keyframes scrollBackground { from { transform: translateX(0) } to { transform: translateX(-50) } }

/* 2. one play-state toggle — a toggle, NOT a layer */
.arcade-scroll-running { animation-play-state: running; }

/* 3. seven layer classes, each paused by default */
.arcade-scroll-sky    { animation: scrollBackground 120s linear infinite; animation-play-state: paused; }
.arcade-scroll-hills  { animation: scrollBackground  60s linear infinite; animation-play-state: paused; }
.arcade-scroll-trees  { animation: scrollBackground  25s linear infinite; animation-play-state: paused; }
.arcade-scroll-ground { animation: scrollBackground  10s linear infinite; animation-play-state: paused; }
.arcade-scroll-edges  { animation: scrollBackground   2s linear infinite; animation-play-state: paused; }
.arcade-scroll-rumble { animation: scrollBackground   2s linear infinite; animation-play-state: paused; }
.arcade-scroll-dashes { animation: scrollBackground   2s linear infinite; animation-play-state: paused; }

/* 4. the reduced-motion block, listing SEVEN classes — and NOT .arcade-scroll-running */
@media (prefers-reduced-motion: reduce) {
  .arcade-scroll-sky, .arcade-scroll-hills, .arcade-scroll-trees, .arcade-scroll-ground,
  .arcade-scroll-edges, .arcade-scroll-rumble, .arcade-scroll-dashes,
  .car-bounce, .car-aura { animation: none !important; }
}
```

**Census warning for the verify phase.** A grep for `arcade-scroll` in `index.css` returns **7
lines** today — 4 class definitions (`sky` `:107`, `ground` `:112`, `dashes` `:117`, `running`
`:122`) plus 3 in the reduced-motion selector list (`:128-130`) — and **10 lines** after this
change (7 class definitions + 3 listed in the block, which grows to 7 layer selectors). **A
count of 3 class *definitions* is a stale-grep signal, not a pass.**
`.arcade-scroll-running` MUST NOT be added to the reduced-motion block: `animation: none
!important` removes the shorthand entirely, leaving nothing for `animation-play-state` to pause,
so listing it is dead weight that implies a mechanism that no longer exists.

---

## Constraints this design inherits, stated as binding

### No new runtime dependency (`AGENTS.md` hard rule 5)

The zero-dependency posture is **deliberate and load-bearing**, not incidental. `db/apply.js` is
hand-rolled rather than pulling in `node-pg-migrate`; the whole project would otherwise be 10
dependencies, 3 of which are server-side and irrelevant to a quiz game's rendering. This change
adds **nothing**. Every new layer is `background-image` gradients and `clip-path` polygons. There
is no image asset, no canvas, no SVG filter, no animation library beyond the `motion` package
already used, and no new build plugin. `package.json` is not in the file-changes table because
nothing in it changes.

### Animation is CSS-only (`AGENTS.md` hard rule 4)

No `requestAnimationFrame`, no JS ticker, no per-component interval, no `setInterval` anywhere
in the new layers. Every layer is `animation-play-state: paused` by default and runs **only**
while `isMoving` is true, via the existing `arcade-scroll-running` class. The play-state toggle
is the entire JS↔CSS contract and it already exists.

### The second reduced-motion entry is the frequently-forgotten step

Every animated layer MUST carry `motion-reduce:animate-none` **in markup** *and* an entry in the
`prefers-reduced-motion` block **in `index.css`** — two places, no exceptions, and **both are
required**. A layer covered by the media block but missing the class does not satisfy the rule.

This is not a hypothetical. The live tree contains the exact failure: **`.car-aura`
(`CarSprite.tsx:117-123`) has `className="car-aura absolute inset-0"` with no
`motion-reduce:animate-none`**, while `index.css:132` does list it. Behaviour is correct; the
documented pattern is not satisfied. The deviation survived precisely because the two mechanisms
are ~120 lines and one file apart — the element is where the author's eye is, and the CSS block is
where nothing pulls them.

**This change multiplies the risk sevenfold**: seven new layer elements each need a class in the
markup and a selector in a block at the bottom of a stylesheet. `tasks.md` must express these as
**one task with two named edits**, not as "add the layers" plus a later "update the
reduced-motion list". And the one class that must **not** be added —
`.arcade-scroll-running` — is the one that looks like it belongs.

### Verification: tsc, greps, and a human with the app open

There is **no test runner, no browser tooling, and no test dependency** in this project. Not
`strict_tdd`, not "add one" — the project has no test script, no test dependency, and no config,
and `conventions.md` is explicit: *do not add one uninvited.*

| Check | Command / method | Gate |
|---|---|---|
| Types | `npx tsc --noEmit` | **automated — the only one** |
| Hard-coded colour | `Select-String -Pattern '#[0-9a-fA-F]{3,8}\b\|rgba?\(' src\*.tsx src\**\*.tsx` | automated — target **0**, from **3** (the stoplight glows, `App.tsx:251-253`) |
| Soft shadow | grep `shadow-\[\|shadow-(sm\|md\|lg\|xl\|2xl\|inner)\b\|drop-shadow` over `src/**/*.tsx,src/**/*.css` | automated — target **0** |
| Hard offset defined once | grep `4px 4px 0` and `4px_4px_0` over `src/` | automated — **exactly 1** hit, inside the `--shadow-hard` definition |
| Blur | grep `backdrop-blur\|blur(\|blur-\|filter:\s*blur` over `src/` | automated — **0** |
| Rounded | grep `rounded-*` except `rounded-none` | automated — **0** |
| `rx` on grid | grep `rx=` in `CarSprite.tsx` | automated — 8 hits (`CarSprite.tsx:51,53,55,57,59,61,63,64`), each currently `rx="1"` or `rx="2"`, all to become `0` or `4`; `ry=` → 0 |
| Layer census | grep `^\s*\.arcade-scroll` in `index.css` | automated — **7 class definitions** (4 today → 7 after), never 3 |
| Reduced motion | `motion-reduce:animate-none` on each of the 7 layers + `.car-bounce`; `prefersReducedMotion` guards the 6 ungated entrances at `App.tsx:236,325,353,390,430,491` | automated |
| Dead custom property | grep `var(--car-color)` in `src/` | automated — **≥1 match, or 0 `--car-color`** |
| Dead tokens | each of the adjudicated tokens absent; `--color-scene-*` present | automated |
| Seam arithmetic | the two invariants, computed | **hand-written in the artifact** — this is the proof, and it is hand-checked |
| **Depth read** | does the scene read as three planes of distance? | **HUMAN — app open.** No check exists. |
| **Seam appearance** | 5+ cycles per layer, is the boundary visible? | **HUMAN — app open.** |
| **Off-seam** | do the hills and trees read as separate objects, not a wall? | **HUMAN — app open.** |
| **"Bright daytime"** | does the panel read as daytime and not dusk? | **HUMAN — app open.** |
| **70ch measure** | is `max-w-[70ch]` right for this panel? | **HUMAN — app open.** |
| **Sky at 16 px/s** | is it *too* slow — i.e. does it read as not-animating? | **HUMAN — app open.** See Debt 2. |
| **Tier legibility** | are tiers 1–4 distinguishable from `#ffc23a` at 2×? | **HUMAN — app open, and a BLOCKING PRECONDITION on the car-recolour task.** No ratio was supplied with R-4, so no computed figure discharges it. See Decision 6. |

**The standing R3-2 follow-up is not closed by this change and cannot be closed from this
project.** There is no way to automate the seam regression test here, and a period change re-opens
the seam silently. The mitigation is the recorded ladder plus the two-invariant table — a human
protocol, not a guard rail.

### The framing audit currently FAILS — noted, not fixed

`openspec/config.yaml` → `rules.verify.audits` carries a FRAMING AUDIT whose **code check returns
non-zero today** at `src/App.tsx:497` (`Desarrollado por el Equipo Foxtrot`) and `src/App.tsx:499`
(`Proyecto Final`), both rendered in the in-game footer to every player. This is open gap 8 and
it is recorded in the base spec as a BLOCKER.

**This design does not fix it and must not.** Rewriting a credit line is an **authorship**
decision, not an agent's judgement — deleting "Equipo Foxtrot" strips a name from work the team
did. It is out of scope per the delta's own *Out of scope* section and it needs a human decision
from the team. It is recorded here so that the verify phase's audit result is not misread as a
regression introduced by this change: **it fails identically before and after.**

The docs half of the same audit must also stay clean. `config.yaml` documents two traps: the
pattern **must** include the Spanish strings (`universidad|Equipo Foxtrot|Proyecto Final`) because
an English-only version passed clean against a live violation; and a bare `F1` alternative must
**not** be added, because it false-positives on the hex `#fff1e8` and on commit `e26fcf1`.

---

## Threat matrix

**N/A — no routing, shell command, subprocess, VCS/PR automation, executable-file
classification, or process-integration boundary is introduced by this change.** Every edit is a
CSS class, a token declaration, a gradient, or a JSX element. There is no input parsing, no
network surface, no file access, no subprocess, and no data path. The threat matrix is recorded
as not applicable rather than manufactured, per the phase rules.

The one boundary-adjacent item is `PR1 / PR2` — a VCS/PR split — and it introduces **no**
automation: no bot, no workflow file, no script, no CLI invocation. The split is a human
sequencing decision recorded in this document and `tasks.md`.

---

## Migration / rollout

**No data migration. No schema change. No API change. No feature flag. No environment change.**

The rollback plan is `git revert` of the change branch, in reverse PR order. The asymmetry is
documented in [Decision 9](#decision-9--pr-boundary-contract-first-then-composition): **PR1 is
cleanly revertible in isolation; PR2 is not** — reverting it after PR1 lands leaves the ground
seam fixed and the sky seam broken.

There is no staged rollout, because there is nothing to roll out. The scene appears only behind
`status === 'playing'`, which is a pre-existing gate. The accepted trade-off, recorded in the
delta: the menu and mode-selection screens therefore show **none** of the new scene, so the
product's identity appears only once the player is already playing. That was a knowing
acceptance, not an oversight, and this design does not reopen it.

---

## Reconciliation ledger

Findings raised by the design phase. Items 1–4 are delta-versus-source. Item 5 is
delta-versus-delta.

> **All ten have since been ruled by the orchestrator and applied to the delta (2026-09-28).** The
> `Disposition` column below is the design phase's **pre-ruling recommendation**, kept verbatim as
> the record of *why* each ruling went the way it did — it is **not** a statement of current state.
> R-1 through R-8 are now delta requirements; R-9 was resolved by instruction and its two files
> were left in place; R-10 is recorded as a pre-existing verify blocker in `state.yaml`.
> **This document was reconciled against the rulings on 2026-09-28.** Four statements in it had
> become false and are corrected above: the delete count (13 → **11**), the blanket `text-white`
> claim (replaced by the per-site mapping with the score HUD carved out), the blended utility
> total (replaced by the three subtotals **17 / 1 / 5**), and the body-text token pairing
> (`--color-on-surface` `#c2c8d0`, not `--color-on-dark` `#fff1e8`). **The nine architecture
> decisions and the two discharged design debts are unchanged by the rulings.**
>
> **`file:line` citations in the `Where` column are stale by construction** — they were taken
> against the delta *before* the amendment renumbered it. The requirement **headings** are the
> durable anchor; the numbers are not. The machine-readable record of what each ruling changed is
> `state.yaml` → `reconciliation` (`applied`, `resolved_by_instruction`, `deferred`).

| # | Finding | Where | Disposition |
|---|---|---|---|
| **R-1** | `--color-accent-yellow` is **simultaneously required to be deleted and to be consumed.** *Visual token discipline* (`spec.md:182-187`) said thirteen tokens had zero consumers, that `--color-on-dark` is retained, and that a following list of **twelve** MUST be deleted — a list which nevertheless contained `--color-accent-yellow (becomes live as the sun)` — while *The scene palette is a fixed token set* (`spec.md:505`, `:523`) listed it in the "Reused as-is" table **as the sun** and stated "the sun is its first consumer". A token cannot be both deleted and be the sun. The parenthetical is self-defeating: it is inside the delete list *and* says it becomes live. The arithmetic also did not close: thirteen zero-consumer − `on-dark` (retained) − `accent-yellow` (consumed) = **11** deletions, not the twelve the delta then named. | delta `Visual token discipline` vs `The scene palette is a fixed token set` | **Resolve in the design: delete 11, retain `on-dark`, retain `accent-yellow` as the sun.** This recommendation was the ruling. |
| **R-2** | The score HUD at `App.tsx:465-471` sits directly over the new bright scene with no dark backing. `--color-on-dark` measures **1.76:1** and `#ffffff` measures **1.95:1** against sky-top `#5ec5f5`; both fail. The delta mapped each of the nine `text-white` / `hover:text-white` sites to `--color-on-dark` without distinguishing this one, and asserted legibility for the set. | delta `Visual token discipline` | **Recommend: give the score HUD the `pixel-panel` chip the stoplight already has** (`App.tsx:250`). 15.43:1, no new token, symmetric with the stoplight. This recommendation was the ruling. |
| **R-3** | Four further unsanctioned colour utilities are omitted from the token-discipline table: `bg-white/10` (`App.tsx:312`, `:471`), `border-white/10` and `bg-black/20` (`App.tsx:405`), `hover:bg-white/5` (`App.tsx:453`). The delta lists 15 sites; the true count is 17. | delta `Visual token discipline` | **Flagged.** If `border-white/5` is unsanctioned, so are these. Recommend widening the table rather than tokenising three of seven on an arbitrary basis. |
| **R-4** | The `--color-scene-*` encoding — "scene-car-body is the base skin, tier tokens remain the recolouring mechanism" — is **unimplementable as written**: `carColor(lives)` has no path returning `#ffc23a`, so the token is born dead. | delta `Car sprite states and lives-based recoloring` | **Recommend `--color-scene-car-body` replaces `--color-car-tier5`** (they are 1.05:1 apart — the same colour). See [Decision 6](#decision-6--the-car-colour-tension-the-spec-agents-encoding-is-unimplementable-and-the-real-legibility-failure-is-tier-1). Needs a delta amend. |
| **R-5** | The escape hatch is arithmetically self-inconsistent: "four `w-[1920px]` tiles in a `w-[7680px]` flex row and pan `-25%` (**3840 px** = exactly 2 tiles)". `-25%` of 7680 is **1920 px** = one tile. And a one-tile pan would not need four tiles. | delta `Layer coverage is bounded and the bound is recorded` | **Corrected in [Decision 1](#decision-1-fixed-1920-px-tiles-and-the-panel-ceiling-they-create): keep `translateX(-50%)` (3840 px of 7680 = 2 tiles), and 3840 is divisible by all six periods — so the correct escape hatch needs no keyframe change at all.** |
| **R-6** | "Two live bugs exist today and MUST be fixed in **PR1**" names both the ground and the sky. This design assigns the ground to PR1 and the sky to PR2. | delta `Every layer's tile width is congruent to 0 modulo its own period` | **Delivery-plan override, justified in [Decision 9](#decision-9--pr-boundary-contract-first-then-composition). Both bugs are fixed by the end of the change; only the sequencing differs. The delta's text is not this phase's to edit.** |
| **R-7** | The delta's trees `(was 30 s)` and edge-lines `(was 1.2 s)` annotations reference superseded drafts of the same delta, not shipped code. `src/index.css` contains only 25 s, 10 s and 2 s. | delta `Background scroll layers` | **Noted.** Same defect species as the two `tracked_gaps` already filed in `state.yaml` — an unverified figure presented as measured. |
| **R-8** | `--color-track-line` (`rgba(41,173,255,0.04)`) and `--color-dash` (`rgba(255,255,255,0.15)`) are **dark-scene** tokens and appear in **neither** the delta's "Reused as-is" table nor its new-token table, yet they are the fills of two layers in the canonical table (ground tint and road dashes). Composited, they measure **1.02–1.06:1** against the new bright scene — an animated layer at ~1.04:1 is perceptually static. The scene palette already provides `--color-scene-road` `#3a3a48` and `--color-scene-road-dashes` `#e8e8f0` (**9.17:1** over the road). | delta `The scene palette is a fixed token set` | **Flagged as a gap in the delta, not a requirement change.** The design's recommendation: the ground-tint and dash layers draw from the scene palette, not from the two legacy dark-scene tokens. Needs a delta amend or an explicit decision to keep them. |
| **R-9** | `proposal.md` and `exploration.md` each carry a **third and fourth** layer table, both superseded and both wrong. `proposal.md` asserts sky at 1920 px / 25 s, which renders the sky **perfectly static** (`1920 / 25` against a 1920 px period, and the sky is backmost so it would be the slowest layer by construction). `exploration.md` asserts hills 240 px / 18 s and mid 480 px / 10 s. | `proposal.md` §Success criteria; `exploration.md` §Scene layers | **Left in place by instruction — not edited in this phase.** Both files are superseded by the delta's table. The delta's header already states they MUST NOT be implemented. `state.yaml` → `tracked_gaps` → `proposal-and-exploration-layer-tables` records this. **The design phase does not take any geometry from either file**; every number in this document traces to the delta or to `src/`. |
| **R-10** | The framing audit's **code check fails today** at `App.tsx:497,499`. | `config.yaml` `rules.verify.audits`; `status.md` gap 8 | **Noted, not fixed.** An authorship decision, out of scope per the delta. It fails identically before and after this change. |

---

## Open questions

Each of these is a decision the design phase **could not** make, with the recommendation the
design phase would give if asked.

- [x] **R-1 / R-2 / R-4 / R-5 / R-6 / R-8 — CLOSED 2026-09-28.** All six were ruled by the
  orchestrator and applied to the delta. This design's recommendations were the rulings for R-1
  (delete **11**), R-2 (the `pixel-panel` score-HUD chip), R-4 (`--color-scene-car-body` **replaces**
  `--color-car-tier5`), R-5 (keep `translateX(-50%)`) and R-8 (the ground-tint and dash layers draw
  from the scene palette); R-6's ground-in-PR1 / sky-in-PR2 split is now a delta requirement.
  **No unapplied delta amend remains** — this item no longer points back at the governing artifact.
- [x] **The score HUD's backing (R-2) — CLOSED 2026-09-28.** The delta now carries its own
  requirement, *The score HUD carries a pixel-panel chip*, and its per-site mapping names the
  score value at `App.tsx:469` as the single exception. The design's recommendation was adopted.
- [ ] **R-4's legibility obligation is unverified and blocks the car-recolour task.** The delta
  requires tiers 1–4 to stay distinguishable from `#ffc23a` at 2× and names it a human sign-off
  item, but **no ratio was supplied with the ruling**, so no computed figure can discharge it. If
  two tiers land under ~3:1, sign-off fails. This is a precondition, not a solved problem — see
  [Decision 6](#decision-6--the-car-colour-tension-the-spec-agents-encoding-is-unimplementable-and-the-real-legibility-failure-is-tier-1).
- [ ] **Two line-number bases are in use across the artifacts, and content anchors are
  authoritative.** The delta and `state.yaml` name the committed basis `e26fcf1`; `HEAD` is now
  `453b542`, which changed neither `src/App.tsx` nor `src/index.css`, so the numbers still
  resolve but the label is stale. A **bare line number in any artifact is not a citation** — name
  the basis beside it, or cite the requirement heading. See the provenance note at the top.
- [ ] **The framing audit's live BLOCKER (R-10).** Needs a human decision from the team about
  attribution. Not an agent's call, not this change's job, and it will still be failing when this
  change ships.
- [ ] **Is 16 px/s the right speed for the sky?** Debt 2 argues it is the only value that
  satisfies the depth constraint, and quantifies the review risk it creates (48 px per green
  light). Whether that risk is acceptable is a maintainer judgement, and it cannot be settled
  without watching the app. The ladder, if rejected, does not have a good alternative — the
  options were a fused plane, an inversion, or a static sky.
- [ ] **Is 23 px enough clearance for the hills?** The thinnest margin in the change, an order of
  magnitude below the trees' 72 px. Computed and correct, but correct arithmetic is not the same
  as a good read.
- [ ] **R3-2** — the automated seam regression test. Not closable from this project. The
  mitigation is a human protocol, which is strictly worse than a guard rail, and this change makes
  the protocol more load-bearing (seven layers instead of three) rather than less.

---

## Design-debt closure

| `state.yaml` entry | Rule | Discharged in | Status |
|---|---|---|---|
| `parallax-rung-60s` | `AGENTS.md` hard rule 5 | [Debt 1](#debt-1--the-60-s-rung-parallax-rung-60s) | **discharged** — decision, four rejected alternatives, three costs |
| `parallax-rung-120s-sky` | `AGENTS.md` hard rule 5 | [Debt 2](#debt-2--the-120-s-rung-parallax-rung-120s-sky) | **discharged** — decision, four rejected alternatives (25 s, shared 60 s, the "non-figurative gradient" defence, static), two costs |

Both debts were opened by the `spec` phase and are marked `owed_by: design`. The delta's
*The parallax ladder gains two rungs* requirement says the tradeoff records are "verified by that
file existing and naming both the 60 s and the 120 s rungs — checked at design/verify, not now".
Both are named above, in the headings, with the word "rung" in each.
