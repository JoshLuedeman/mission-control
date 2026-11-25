"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CronJobSummary, CronRunSummary } from "@/lib/cron";

interface CronListResponse {
  ok: boolean;
  data?: CronJobSummary[];
  error?: string;
}

interface CronRunsResponse {
  ok: boolean;
  data?: CronRunSummary[];
  total?: number;
  error?: string;
}

function formatAbsoluteTime(ms: number | null): string {
  if (ms == null) return "never";
  return new Date(ms).toLocaleString();
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remSeconds}s`;
}

const statusColor: Record<string, string> = {
  ok: "bg-[var(--color-status-online)]",
  error: "bg-[var(--color-status-urgent)]",
  skipped: "bg-[var(--color-status-watch)]",
  running: "bg-[var(--color-status-scheduled)]",
  pending: "bg-muted-foreground/50",
  unknown: "bg-muted-foreground",
};

export default function CronJobDetailClient({ id }: { id: string }) {
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "error"; message: string }
    | { phase: "ready"; job: CronJobSummary | null; runs: CronRunSummary[] }
  >({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/cron").then((res) => res.json() as Promise<CronListResponse>),
      fetch(`/api/cron/${id}/runs`).then((res) => res.json() as Promise<CronRunsResponse>),
    ])
      .then(([jobsJson, runsJson]) => {
        if (cancelled) return;
        if (!runsJson.ok) {
          setState({ phase: "error", message: runsJson.error ?? "Unknown error" });
          return;
        }
        const job = jobsJson.ok
          ? (jobsJson.data ?? []).find((j) => j.id === id) ?? null
          : null;
        setState({ phase: "ready", job, runs: runsJson.data ?? [] });
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
  }, [id]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link
        href="/cron"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Cron Job Health
      </Link>

      {state.phase === "loading" && (
        <p className="mt-4 text-sm text-muted-foreground">Loading job history…</p>
      )}

      {state.phase === "error" && (
        <div className="mt-4 rounded-lg border border-[var(--color-border-dim)] bg-[var(--color-surface)] p-4 text-sm text-destructive">
          Run history is not available right now ({state.message}). This is
          not built with sample data as a fallback — fix the data source
          instead.
        </div>
      )}

      {state.phase === "ready" && (
        <>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            {state.job?.name ?? id}
          </h1>
          {state.job && (
            <p className="mt-1 text-sm text-muted-foreground">
              {state.job.agentId ?? "unassigned"}
              {state.job.kind ? ` · ${state.job.kind}` : ""} · last run{" "}
              {formatAbsoluteTime(state.job.lastRunAtMs)}
            </p>
          )}

          <h2 className="mt-8 text-lg font-medium">Recent runs</h2>

          {state.runs.length === 0 ? (
            <div className="mt-4 rounded-lg border border-[var(--color-border-dim)] bg-[var(--color-surface)] p-4 text-sm text-muted-foreground">
              No run history available for this job yet.
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {state.runs.map((run) => (
                <li
                  key={run.ts}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border-dim)] bg-[var(--color-surface)] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        statusColor[run.status] ?? statusColor.unknown
                      }`}
                      aria-label={run.status}
                    />
                    <div className="text-sm">{formatAbsoluteTime(run.runAtMs)}</div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {formatDuration(run.durationMs)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
