# Gapture FT-07 — Regulatory Compliance Intelligence Platform

Continuous RBI/SEBI regulatory monitoring, OCR + NLP document intelligence
compared against company compliance policies, delivered as in-app
notifications with a voice-enabled contextual Q&A experience.

**Status:** Planning complete, implementation not started. See
[`docs/IMPLEMENTATION-PLAN.md`](docs/IMPLEMENTATION-PLAN.md) for the full
23-phase build plan, architecture decisions, and open items.

## Source documents

- `master prd.md` — Master Product Requirements Document
- `Gapture_FT07_BRD.md` — Business Requirements Document
- `Gapture_FT-07_HLSA.md` — High-Level System Architecture
- `Gapture_FT-07_Database_Schema.md` — PostgreSQL schema, DDL, query library
- `Gapture FT-07 — Detailed Technology Stack & Architecture.md` — approved tech stack
- `skills/` — Gapture development guidance (see `docs/IMPLEMENTATION-PLAN.md` §4 for how each skill applies to FT-07's narrower scope)

## Node version

This repo is developed against Node `24.15.0` (see `.nvmrc`). Package
management uses `pnpm` (workspaces).

## Getting started

Repository scaffolding (`apps/web`, `worker`, `packages/shared`) has not been
created yet — that's Phase 1 of the implementation plan. Phase 0 setup
status is tracked in `docs/IMPLEMENTATION-PLAN.md` §10.
