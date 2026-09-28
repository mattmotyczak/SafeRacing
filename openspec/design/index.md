# Design Records — SafeRacing

Rationale behind the requirements in `openspec/specs/`. One file per shipped arc, split out of the root `DESIGN.md` on 2026-09-28.

| Record | Arc | Status | Requirements |
|--------|-----|--------|--------------|
| [`arcade-retrofit.md`](./arcade-retrofit.md) | A — Arcade Retrofit: Pixelated Retro (8-bit) | Shipped, verified, archived | `openspec/specs/game/spec.md` |
| [`backend-data-rigor.md`](./backend-data-rigor.md) | B — Backend & Data-Layer Rigor | Shipped, data layer verified | `openspec/specs/data-layer/spec.md` |

## How this relates to a change's own `design.md`

A change's `design.md` under `openspec/changes/{name}/` holds the rationale for **that change**, and is archived with it. These files hold the **long-lived** rationale for arcs that shipped before `openspec/` was the artifact store — they had nowhere else to live. When Arc A and Arc B are ever re-planned, prefer a new change's `design.md` and leave these as the historical record.

## What each record contains

Sections that are stable and worth keeping: **Architecture Decisions** (options / tradeoff / choice), computed **contrast matrices**, **token tables**, the **seam arithmetic**, **schema and endpoint contracts**, **rollback**, and the **threat matrix**.

Sections that are point-in-time and will rot: `File Changes` tables (list files as they were at ship time), and `Open Questions` (resolved checkboxes are historical). Treat both as a record of what was decided, not as current state.
