# ADR: Local-serve deployment target + CLI shell-out as the data layer

**Status:** Accepted
**Date:** 2026-11-25
**Related:** #2, #3, #4, #5

## Context

Mission Control's Wave 1 scaffold (#2) needed a deployment-target decision
(Synology Docker vs. local-serve on the Mac mini) and an implicit data-fetching
pattern decision, both inherited informally from the predecessor Olympus app
rather than decided fresh for this codebase.

The live data layer (`src/lib/openclaw-cli.ts`) does not read flat JSON files.
It shells out via Node's `child_process.execFile` (promisified) to the
`openclaw` CLI binary on the local host — e.g. `openclaw agents list --json`,
`openclaw sessions --all-agents --json`, `openclaw automations list --all --json`,
`openclaw automations runs <id> --json` — and parses stdout as JSON. This talks
to the gateway over its local socket/session; it is not a network-reachable
API call.

This is architecturally different from, and more sound than, how the prior
Olympus build was described in earlier review commentary (which referenced
`execSync` and flat cron-state files under `~/.openclaw/cron/`). Neither of
those apply to the current `mission-control` codebase as built: there are no
flat-file reads anywhere in `src/`, and the call primitive is `execFile`, not
`execSync`.

## Decision

1. **Deployment target: local-serve on the Mac mini, not Synology Docker**, for
   as long as the data layer shells out to the local `openclaw` CLI/gateway
   socket. A separate Docker host cannot reach this host's gateway socket
   without either installing/authenticating the CLI remotely (not how this is
   set up) or replacing the shell-out with a real network API call to the
   gateway. Revisit only after such a refactor; not worth bundling into Wave 1
   or Wave 2.
2. **Data-fetching pattern: server-side `execFile` calls to the `openclaw` CLI
   from Next.js Route Handlers**, parsed into typed interfaces in `src/lib/`,
   is the accepted pattern for this app's lifetime as a local-only tool. It is
   adequate for current scale (single host, 6-agent crew, low request volume,
   10s timeout, `maxBuffer` set).

## Consequences

- The README's prior claim that the data layer uses `execSync` is **factually
  incorrect** for the current codebase (`src/lib/openclaw-cli.ts` uses
  `execFile`). This should be corrected — see Review Findings comment on #5
  for the exact wording fix. `execFile` vs `execSync` is not a cosmetic nit:
  `execFile` is non-blocking (async, doesn't block the Node event loop per
  request) and does not invoke a shell by default, which is a materially
  better security/reliability posture than `execSync` would imply. The
  deployment-target *conclusion* (local-serve) is unaffected either way, but
  the stated *rationale* should describe the real mechanism.
- Because this is a shell-out pattern against a locally-trusted CLI, this app
  must stay localhost/trusted-LAN-only. Any future move to expose it beyond
  that boundary requires revisiting input handling into `execFile` args (none
  are currently user-influenced, which is good — all args are static/one path
  param that is not currently sanitized against injection into the `openclaw`
  CLI's own argument parsing, see Review Findings item on `cron/[id]` route
  path param).
- No caching layer exists in front of repeated CLI shell-outs. Fine at current
  scale (30s client auto-refresh, 1 CLI call per API route per page load).
  Flagged as a watch item, not a blocker, if/when session-history volume or
  concurrent dashboard tabs grow.
