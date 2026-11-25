"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CronJobSummary } from "@/lib/cron";

interface CronResponse {
  ok: boolean;
  data?: CronJobSummary[];
  error?: string;
}

const AUTO_REFRESH_MS = 30_000;

function formatRelativeTime(ms: number | null): string {
  if (ms == null) return "never";
  const deltaMs = Date.now() - ms;
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatFutureTime(ms: number | null): string {
  if (ms == null) return "not scheduled";
  const deltaMs = ms - Date.now();
  if (deltaMs <= 0) return "due now";
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "in <1m";
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `in ${hours}h`;
}

// Dot color drives at-a-glance status (graphic, needs 3:1 contrast).
// Text uses a separate, lighter token (needs the stricter 4.5:1 text
// contrast) — these were previously the SAME token (#ef4444, ~4.95:1
// against the surface background), which left only a ~0.45 margin above
// the 4.5:1 text threshold for a value also used as a 3:1-requirement
// graphic. Per Josh's review on PR #9: split into two tokens so a future
// dot-color adjustment can't silently break text contrast.
// Verified contrast (relative-luminance WCAG formula, computed not eyeballed):
//   dot  #ef4444 vs surface #12121a → 4.951:1 (needs 3:1, real headroom)
//   text #f87171 vs surface #12121a → 6.735:1 (needs 4.5:1, real headroom)
const statusColor: Record<CronJobSummary["status"], string> = {
  ok: "bg-[var(--color-status-online)]",
  error: "bg-[var(--color-status-urgent)]",
  skipped: "bg-[var(--color-status-watch)]",
  running: "bg-[var(--color-status-scheduled)] animate-pulse",
  // pending (never run) is intentionally hollow/dashed rather than a filled
  // gray at reduced opacity — at 10px, an opacity difference against the
  // same hue as `unknown` composites to visually indistinguishable (flagged
  // by Designer review via luminance math). A distinct shape, not just an
  // alpha change, is what actually separates the two for low-vision users.
  pending: "bg-transparent border-2 border-dashed border-muted-foreground",
  unknown: "bg-muted-foreground",
};

const statusLabel: Record<CronJobSummary["status"], string> = {
  ok: "status: ok",
  error: "status: error",
  skipped: "status: skipped",
  running: "status: running",
  pending: "status: pending (never run)",
  unknown: "status: unknown",
};

// Error and skipped read as similar visual weight at the same dot size —
// give error a ring so it reads as "more severe" than skipped at a glance,
// not just a different hue.
const statusShape: Partial<Record<CronJobSummary["status"], string>> = {
  error: "ring-2 ring-offset-1 ring-offset-[var(--color-surface)] ring-[var(--color-status-urgent)]",
};

// error/urgent sorts first for glanceability, then running, then everything
// else roughly in "needs attention" order, pending/unknown last.
const statusSortWeight: Record<CronJobSummary["status"], number> = {
  error: 0,
  running: 1,
  skipped: 2,
  ok: 3,
  pending: 4,
  unknown: 5,
};

export default function CronHealthPage() {
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "error"; message: string }
    | { phase: "ready"; jobs: CronJobSummary[] }
  >({ phase: "loading" });
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    return fetch("/api/cron")
      .then((res) => res.json() as Promise<CronResponse>)
      .then((json) => {
        if (!json.ok || !json.data) {
          setState({ phase: "error", message: json.error ?? "Unknown error" });
          return;
        }
        setState({ phase: "ready", jobs: json.data });
        setLastFetchedAt(Date.now());
      })
      .catch((err: unknown) => {
        setState({
          phase: "error",
          message: err instanceof Error ? err.message : "Request failed",
        });
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      load();
    }, AUTO_REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, load]);

  const sortedJobs =
    state.phase === "ready"
      ? [...state.jobs].sort(
          (a, b) => statusSortWeight[a.status] - statusSortWeight[b.status],
        )
      : [];

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cron Job Health</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live automations status — reads directly from this host&apos;s
            OpenClaw gateway RPC (no flat-file cron path on this host).
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => load()}
              className="rounded-md border border-[var(--color-border-dim)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium hover:border-[var(--color-border-bright)]"
            >
              Refresh now
            </button>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Auto-refresh (30s)
            </label>
          </div>
          {lastFetchedAt && (
            <span className="text-xs text-muted-foreground">
              Updated {formatRelativeTime(lastFetchedAt)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-8">
        {state.phase === "loading" && (
          <p className="text-sm text-muted-foreground">Loading cron data…</p>
        )}

        {state.phase === "error" && (
          <div className="rounded-lg border border-[var(--color-border-dim)] bg-[var(--color-surface)] p-4 text-sm text-destructive">
            Cron data is not available right now ({state.message}). This is
            not built with sample data as a fallback — fix the data source
            instead.
          </div>
        )}

        {state.phase === "ready" && sortedJobs.length === 0 && (
          <div className="rounded-lg border border-[var(--color-border-dim)] bg-[var(--color-surface)] p-4 text-sm text-muted-foreground">
            No automations configured on this host.
          </div>
        )}

        {state.phase === "ready" && sortedJobs.length > 0 && (
          <ul className="flex flex-col gap-3">
            {sortedJobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/cron/${job.id}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border-dim)] bg-[var(--color-surface)] px-4 py-3 transition-colors hover:border-[var(--color-border-bright)]"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${statusColor[job.status]} ${
                        statusShape[job.status] ?? ""
                      }`}
                      role="img"
                      aria-label={statusLabel[job.status]}
                    />
                    <div>
                      <div className="font-medium">
                        {job.name}
                        {!job.enabled && (
                          <span className="ml-2 rounded bg-[var(--color-elevated)] px-1.5 py-0.5 text-xs text-muted-foreground">
                            disabled
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {job.agentId ?? "unassigned"}
                        {job.kind ? ` · ${job.kind}` : ""}
                        {job.consecutiveErrors > 0 && (
                          <span className="ml-2 text-[var(--color-status-urgent-text)]">
                            {job.consecutiveErrors} consecutive error
                            {job.consecutiveErrors === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>last: {formatRelativeTime(job.lastRunAtMs)}</div>
                    <div>next: {formatFutureTime(job.nextRunAtMs)}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
