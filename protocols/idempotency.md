# Idempotency

Agents and cron jobs retry. Without explicit dedup, a retry can re-create a GitHub issue, re-post a report, or re-fire an alert. This page is the standard pattern for preventing those duplicate side effects on a single host.

## When to use it

Wrap any side effect that:

- creates external state (GitHub issues, chat messages, files in a shared dir), AND
- could plausibly be re-executed by the same logical job within a bounded window (cron job retry, transient agent error, dispatcher reclaim, manual re-run).

Examples already covered by this pattern:

- Morning Review proposing issues → key on (job_id, ISO date, normalized title); 24h TTL.
- Daily Security / Platform audit deliveries → key on hash of report body; 24h TTL.
- Blocked-task monitor alerts → key on (task_id, blocked_reason_hash); 24h TTL (matches the existing "Gentle-Coding every 90 min" complaint).
- Cron report delivery → key on (job_id, hash of rendered output); TTL ≥ schedule interval.

Do NOT use this for:

- Message-level gateway dedup (that's a Hermes code change, not this library).
- Cross-host coordination (no distributed locks — single-host scope by design).
- Workflows where every run SHOULD produce a side effect (analytics ingestion, snapshots).

## The library

`~/.hermes/scripts/idempotency.py` exposes a tiny Python API and a CLI. SQLite-backed at `~/.hermes/idempotency.db` (override with `$HERMES_IDEMPOTENCY_DB`).

Python:

 import sys
 sys.path.insert(0, "~/.hermes/scripts")
 from idempotency import check_or_create, mark, seen, hash_payload

 # Pre-claim — atomically reserves the key.
 if check_or_create("issue-create", title.lower.strip, ttl_seconds=86400):
 create_issue(title=title, assignee="platform")
 else:
 # Already created within the TTL window — skip.
...

 # Hash-based dedup for cron reports.
 digest = hash_payload({"job": "security-audit", "body": rendered})
 if check_or_create("cron-delivery", digest, ttl_seconds=86400 * 2):
 deliver(rendered)

CLI (cron jobs and shell scripts):

 # Exit 0 if NEW (claimed), 1 if duplicate.
 if python3 ~/.hermes/scripts/idempotency.py check morning-review "$(date -u +%F)" --ttl 86400; then
 run_morning_review
 fi

Subcommands:

 check <ns> <key> [--ttl N] # claim; exit 0 if new, 1 if dup
 mark <ns> <key> [--ttl N] # unconditional record
 seen <ns> <key> # exit 0 if seen, 1 if not
 forget <ns> [<key>] # drop one key, or whole namespace
 purge # delete expired rows

## Conventions

Namespaces: lowercase, hyphen-separated, name the side effect — `issue-create`, `cron-delivery`, `alert-blocked-task`, `audit-report`.

Keys: the smallest stable identifier of the *condition* you're deduping on. For tasks, normalize the title (lowercase, strip whitespace) so "Fix bug" and "fix bug " collide. For reports, use `hash_payload(...)` on the rendered body. For alerts, hash the (subject, severity, context) tuple.

TTL: just longer than the natural retry / re-run interval. Cron jobs that run daily → 24h. Hourly monitors → 1h or 24h depending on whether you want hourly or daily dedup. Permanent dedup (e.g. one-shot migration) → omit the TTL, but then `forget` after the run-once condition is gone.

Pre-claim, don't post-mark. `check_or_create` claims atomically before the side effect; `mark` is only for "I already did this work, record it after the fact." Pre-claiming is the only safe pattern under concurrency.

## Edge cases

- **Clock skew backwards**: TTL is wall-clock based. If the system clock jumps backward, an entry may live longer than intended. Acceptable — "don't double-send" is the bias we want.
- **Side effect fails after claim**: the claim is still recorded, so a retry won't fire. If you need at-least-once semantics, call `forget(ns, key)` in your failure handler so the next retry can re-claim.
- **DB lock contention**: single SQLite file. WAL mode is on; conflicts retry inside the 10s timeout. Single-host scope, so this scales to all the cron jobs and agents on one modest box without trouble.
- **Database file grows**: run `python3 ~/.hermes/scripts/idempotency.py purge` from a weekly cron if you've accumulated lots of expired rows. Not load-bearing — expired rows are ignored on read.

## Coverage

Tested at 100% line + branch coverage (27 tests, pytest-cov gate at `--cov-fail-under=100`). Test suite lives in the task's workspace at `tests/test_idempotency.py`; promote to a permanent home if/when the library moves under a repo.
