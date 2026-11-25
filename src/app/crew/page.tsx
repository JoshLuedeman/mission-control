"use client";

import { useEffect, useState } from "react";
import type { CrewMember } from "@/lib/crew";

interface CrewResponse {
  ok: boolean;
  data?: CrewMember[];
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

const statusColor: Record<CrewMember["status"], string> = {
  online: "bg-[var(--color-status-online)]",
  stale: "bg-[var(--color-status-watch)]",
  unknown: "bg-muted-foreground",
};

const statusLabel: Record<CrewMember["status"], string> = {
  online: "online",
  stale: "stale",
  unknown: "unknown",
};

export default function CrewStatusPage() {
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "error"; message: string }
    | { phase: "ready"; crew: CrewMember[] }
  >({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/crew")
      .then((res) => res.json() as Promise<CrewResponse>)
      .then((json) => {
        if (cancelled) return;
        if (!json.ok || !json.data) {
          setState({ phase: "error", message: json.error ?? "Unknown error" });
          return;
        }
        setState({ phase: "ready", crew: json.data });
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
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Crew Status</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Live agent roster — reads directly from this host&apos;s OpenClaw
        config and session state. No hardcoded list.
      </p>

      <div className="mt-8">
        {state.phase === "loading" && (
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            Loading crew data…
          </p>
        )}

        {state.phase === "error" && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-lg border border-[var(--color-border-dim)] bg-[var(--color-surface)] p-4 text-sm text-destructive"
          >
            Crew data is not available right now ({state.message}). This is
            not built with sample data as a fallback — fix the data source
            instead.
          </div>
        )}

        {state.phase === "ready" && state.crew.length === 0 && (
          <div role="status" className="rounded-lg border border-[var(--color-border-dim)] bg-[var(--color-surface)] p-4 text-sm text-muted-foreground">
            No agents configured on this host.
          </div>
        )}

        {state.phase === "ready" && state.crew.length > 0 && (
          <ul className="flex flex-col gap-3">
            {state.crew.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-[var(--color-border-dim)] bg-[var(--color-surface)] px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusColor[member.status]}`}
                    role="img"
                    aria-label={`status: ${statusLabel[member.status]}`}
                  />
                  <span className="text-lg" aria-hidden>
                    {member.emoji ?? "🤖"}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 font-medium">
                      <span className="truncate">{member.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        ({statusLabel[member.status]})
                      </span>
                      {member.isDefault && (
                        <span className="rounded bg-[var(--color-elevated)] px-1.5 py-0.5 text-xs text-muted-foreground">
                          default
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {member.model ?? "unknown model"}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(member.lastInteractionAt)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
