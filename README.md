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

## Deployment Target (open — pending Architecture review)

Not yet decided. Candidates on the table, per the Wave 1 scaffold issue (#2):

- **Synology Docker** — matches the original Olympus deployment plan; more infra to stand up, but persistent/always-on and reachable beyond this machine.
- **Simpler local-only serve** (e.g. `next start` behind a local reverse proxy, or a portal-style dev server) — faster to stand up, no containerization, but scoped to this machine unless/until exposed.

This tradeoff is explicitly **not** being decided unilaterally here — it's being flagged for Athena's architecture review (issue #5) per the epic's anti-pattern guidance. This section will be updated once that review lands.
