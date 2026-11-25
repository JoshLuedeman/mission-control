"use client";

import { useEffect, useState } from "react";
import type { CronJobSummary } from "@/lib/cron";

interface CronResponse {
  ok: boolean;
  data?: CronJobSummary[];
  error?: string;
}

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

const statusColor: Record<CronJobSummary["status"], string> = {
  ok: "bg-[var(--color-status-online)]",
  error: "bg-[var(--color-status-urgent)]",
  skipped: "bg-[var(--color-status-watch)]",
  running: "bg-[var(--color-status-scheduled)] animate-pulse",
  unknown: "bg-muted-foreground",
};

export default function CronHealthPage() {
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "error"; message: string }
    | { phase: "ready"; jobs: CronJobSummary[] }
  >({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/cron")
      .then((res) => res.json() as Promise<CronResponse>)
      .then((json) => {
        if (cancelled) return;
        if (!json.ok || !json.data) {
          setState({ phase: "error", message: json.error ?? "Unknown error" });
          return;
        }
        setState({ phase: "ready", jobs: json.data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          phase: "error",
          message: err instanceof Error ? err.message : "Request failed",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Cron Job Health</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Live automations status — reads directly from this host&apos;s
        OpenClaw gateway RPC (no flat-file cron path on this host).
      </p>

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

        {state.phase === "ready" && state.jobs.length === 0 && (
          <div className="rounded-lg border border-[var(--color-border-dim)] bg-[var(--color-surface)] p-4 text-sm text-muted-foreground">
            No automations configured on this host.
          </div>
        )}

        {state.phase === "ready" && state.jobs.length > 0 && (
          <ul className="flex flex-col gap-3">
            {state.jobs.map((job) => (
              <li
                key={job.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border-dim)] bg-[var(--color-surface)] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${statusColor[job.status]}`}
                    aria-label={job.status}
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
                        <span className="ml-2 text-[var(--color-status-urgent)]">
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
