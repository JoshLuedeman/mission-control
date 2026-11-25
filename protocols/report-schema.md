# Daily Agent Report Schema (v1)

Inter-agent machine-readable contract for daily reports produced by the Security agent (security audit) and the Platform admin (platform check). The Hub's Morning Review consumes these blocks deterministically instead of re-parsing prose.

This schema is **additive** — the human-readable Markdown report stays untouched. The JSON block is appended after the human report under a `## Machine-Readable` heading, fenced as ```json so it round-trips through Discord / Markdown viewers without rendering.

## Envelope

Top-level shape follows the `{ ok, data, error, meta }` convention:

```json
{
 "ok": true,
 "data": {... },
 "error": null,
 "meta": { "schema_version": 1, "generated_at": "<ISO8601>" }
}
```

- `ok` (bool, required) — did the run complete the checks? `false` only when the agent could not produce a valid report (cron failure, env missing, etc.). Findings present on a successful run do NOT make `ok` false; that's what `findings` is for.
- `error` (string|null) — populated only when `ok` is false. Single human-readable line.
- `meta.schema_version` (int) — bump when fields change shape.
- `meta.generated_at` (ISO8601 string) — UTC timestamp the report was written.

## `data` payload

| Field | Type | Required | Notes |
|---|---|---|---|
| `agent` | string | yes | One of `security`, `platform`. Producer identity. |
| `date` | string (YYYY-MM-DD) | yes | Calendar date the report covers (America/New_York). |
| `platform_versions` | object | yes | `{ macos, node, hermes, tailscale }` — strings, live values captured this run. Use `null` if a value could not be obtained; never omit a key. |
| `checks` | array of object | yes | Each: `{ name: string, passed: bool, detail: string }`. `passed=false` means the check itself failed (not "finding found"). Risk-accepted items are `passed=true` with detail noting the acceptance. |
| `findings` | array of object | yes | Each: `{ severity, title, description, remediation }`. Empty array when clean. `severity` is one of `critical`, `high`, `medium`, `low`, `info`. |
| `metrics` | object | yes | Numeric values used for degradation detection. Free-form keys; downstream diffs by key. The Security agent's standard set: `failed_ssh_attempts_24h`, `open_listening_ports`, `gateway_log_errors`, `disk_usage_percent`, `launch_daemon_count`, `launch_agent_count`, `env_perm_violations`. The Platform admin's standard set: `cron_jobs_total`, `cron_jobs_failed`, `cron_jobs_blocked`, `disk_usage_percent`, `gateway_status_ok`. |
| `models` | object | no | Model inventory in THREE distinct buckets (see below). The Platform admin populates it on the platform check; omit entirely when not reporting models (e.g. The Security agent). Optional + additive — the parser ignores it, so no `schema_version` bump. |
| `action_required` | bool | yes | Does the human / another agent need to do something today? |
| `summary` | string | yes | One-line BLUF, same content as the prose BLUF. |

## `data.models` — three-bucket inventory

When an agent reports model assignments, the three categories MUST stay distinct. They are different *kinds* of thing; collapsing them produces a miscount (e.g. listing the x_search toolset model as an extra "agent"). Shape (the model names below are illustrative examples — substitute whatever your fleet actually runs):

```json
"models": {
 "agents": { "hub": "claude-opus-4.8", "coder": "claude-opus-4.8", "platform": "claude-sonnet-4.6" },
 "toolset": { "x_search": "grok-4.20-reasoning" },
 "auxiliary": { "vision": "gemini-3.1-pro-preview", "web_extract": "gpt-5.4-mini", "compression": "claude-haiku-4.5", "approval": "claude-haiku-4.5" }
}
```

- `agents` (object) — per-profile `model.default`, keyed by profile name. **This is the only bucket that counts toward the agent total.** Re-derive live from each profile's config; assignments drift.
- `toolset` (object) — models a toolset invokes, NOT agents. Keyed by toolset name (e.g. `x_search`). A toolset model is never an agent.
- `auxiliary` (object) — the `auxiliary:` config block, keyed by task (`vision`, `web_extract`, `compression`, `approval`, …).

All three are live values captured this run, mirroring `platform_versions`. The agent count in any prose summary is the size of `agents` only.

## Severity ladder

`critical` > `high` > `medium` > `low` > `info`. Downstream consumers can filter by severity for alerting (the Hub Morning Review escalates `critical`/`high` to the human immediately, lists the rest).

## Placement in the report

Append exactly one fenced block at the bottom of the human-readable report:

````markdown
... human report above...

## Machine-Readable

```json
{ "ok": true, "data": {... }, "error": null, "meta": {... } }
```
````

The parser at `~/.hermes/scripts/parse_agent_report.py` extracts the LAST ```json fenced block under a `## Machine-Readable` heading. One block per file. If multiple blocks exist (legacy), the last one wins.

## Non-Goals

- Not posted to Discord. The JSON block lives in `~/.hermes/shared/reports/{security,platform}-latest.md` and the per-day archive only.
- No external schema validators. Stdlib `json` + the helper script are the contract.
- No backward compatibility shim. The Hub's Morning Review tolerates a missing block (falls back to prose parsing) until both producers are migrated.
