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

Fresh start. No app code yet — Zeus is standing up the initial task breakdown.
