# ORCHESTRATOR.md — SafeRacing

> **This file is a pointer.** The current state, open gaps, artifact provenance, and change flow moved into `openspec/status.md` on 2026-09-28.

| You want | Read |
|----------|------|
| Current state, **open gaps**, migrated-artifact provenance, next change, working agreement | [`openspec/status.md`](./openspec/status.md) |
| Requirements — the source of truth | `openspec/specs/game/spec.md`, `openspec/specs/data-layer/spec.md` |
| Conventions, gotchas, read-order | `openspec/conventions.md` |
| Why each decision was made | `openspec/design/` |
| SDD config, per-phase rules, verify audits | `openspec/config.yaml` |
| Conventions for coding agents | [`AGENTS.md`](./AGENTS.md) |

## The two things worth keeping inline

**Artifact store: OpenSpec, not Engram.** SDD artifacts are files in this repo. `openspec/config.yaml` declares `artifact_store: openspec`. Engram is ad-hoc memory only — bugfixes, discoveries, session summaries. If an SDD phase tells you to `mem_save` an artifact, it is reading a stale mode; write the file instead.

**Never edit or delete a folder under `openspec/changes/archive/`.** Archived artifacts reference `AGENTS.md`, `DESIGN.md`, `ORCHESTRATOR.md`, `README.md`, and `neondb_guide.txt` by path. This file, `DESIGN.md`, and `neondb_guide.txt` have no content of their own any more and exist only to keep those historical references resolving — do not delete them.

## SafeRacing

A **Spanish-language driving-safety quiz game for high-school students**. React 19 + Vite 6 + Tailwind v4 + motion frontend, Express 4 + Neon Postgres backend.

> "SafeRacing" is a product name, not a description of the content. The game is about driving, not Formula 1. Earlier revisions of this file described it as a "racing-safety quiz" built as "a final university project by Team Foxtrot" — both were wrong, and the framing had hardened into a normative decision in the data-layer spec. Corrected 2026-09-28; the correction is now a requirement. See *The game is a driving-safety quiz for high-school students* in `openspec/specs/game/spec.md`.
