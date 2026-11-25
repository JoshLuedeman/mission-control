# Mission Control

Dashboard for the OpenClaw agent crew — status, cron jobs, memory, routing, and system health in one place.

## How this project is run

This repo is coordinated under the **dev-team-in-a-box** protocol set (`protocols/`), adapted toward the hve-core-aligned dispatch model: hub-and-spoke coordination, issue-as-source-of-truth, structured `{ok, data, error, meta}` handoff envelopes between agents, and explicit sign-off gates before anything ships.

- **Coordinator:** Zeus — owns task breakdown, assigns work to crew members, enforces the envelope contract between handoffs, tracks issues as the single source of truth.
- **Hub:** Helios — reviews/escalates, does not dispatch directly.
- **Build:** Hephaestus and crew, per Zeus's assignment.
- **Security/quality gate:** Argus reviews before anything ships.

All work is tracked as GitHub Issues in this repo, not ad hoc chat threads. See `protocols/issue-driven-development.md` and `protocols/operational-rules.md` for the ground rules, and `protocols/report-schema.md` for the required envelope shape on every inter-agent handoff.

## Status

Wave 1 scaffold in progress — see #2. Next.js 16 App Router + TypeScript + Tailwind v4 + shadcn/ui (`radix-nova` style) scaffolded, dark-only theme base in place, CI (lint + build) wired via GitHub Actions.

## Deployment Target — RESOLVED

**Local-serve on the Mac mini.** Decided via architecture review (#5), ratified on issue #2.

Reasoning: the live data layer shells out to the local CLI/gateway socket via Node's `execFile` (async, no shell invocation by default) to the `openclaw` CLI binary — e.g. `openclaw agents list --json`, `openclaw sessions --all-agents --json`, `openclaw automations list --all --json` — not network-portable to a separate Synology Docker container as currently architected. Docker becomes viable only after a future refactor to a real network API; not worth bundling into Wave 1.

See ADR: `docs/decisions/2026-11-25-local-serve-cli-shellout-data-layer.md`.
