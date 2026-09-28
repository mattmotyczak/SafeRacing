# DESIGN.md — SafeRacing

> **This file is a pointer.** The design rationale moved into `openspec/design/` on 2026-09-28.

| Record | Arc | Requirements |
|--------|-----|--------------|
| [`openspec/design/arcade-retrofit.md`](./openspec/design/arcade-retrofit.md) | A — Arcade Retrofit: Pixelated Retro (8-bit) | `openspec/specs/game/spec.md` |
| [`openspec/design/backend-data-rigor.md`](./openspec/design/backend-data-rigor.md) | B — Backend & Data-Layer Rigor | `openspec/specs/data-layer/spec.md` |
| [`openspec/design/index.md`](./openspec/design/index.md) | How these records relate to a change's own `design.md` | — |

Each record holds the *why* behind the requirements: architecture decisions with options and tradeoffs, verified WCAG contrast matrices, `@theme` token tables, the seam arithmetic, the schema and endpoint contracts, rollback plans, and threat matrices.

**This file is kept only because seven archived change folders reference it by path**, and `openspec/config.yaml` forbids editing or deleting an archived folder. Do not delete it, and do not add content to it — a new arc's rationale goes in its own change's `design.md`, and anything long-lived goes in `openspec/design/`.
