export type CronJobStatus = "ok" | "error" | "skipped" | "running" | "unknown";

export interface CronJobEntry {
  id: string;
  declarationKey?: string;
  displayName?: string;
  name?: string;
  agentId?: string;
  enabled: boolean;
  schedule?: unknown;
  payload?: { kind?: string };
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastRunStatus?: string;
    lastDurationMs?: number;
    consecutiveErrors?: number;
    consecutiveSkipped?: number;
    lastError?: string | null;
  };
  nextRunAtMs?: number;
  lastRunAtMs?: number;
  lastRunStatus?: string;
  lastRunError?: string | null;
  effectiveAgentId?: string;
  status?: string;
}

export interface CronJobsListResponse {
  jobs: CronJobEntry[];
}

export interface CronJobSummary {
  id: string;
  name: string;
  agentId: string | null;
  kind: string | null;
  enabled: boolean;
  status: CronJobStatus;
  lastRunAtMs: number | null;
  nextRunAtMs: number | null;
  lastDurationMs: number | null;
  consecutiveErrors: number;
  lastError: string | null;
}

function normalizeStatus(raw: string | undefined): CronJobStatus {
  if (raw === "ok" || raw === "error" || raw === "skipped" || raw === "running") {
    return raw;
  }
  return "unknown";
}

export function mapCronJobs(jobs: CronJobEntry[]): CronJobSummary[] {
  return jobs.map((job): CronJobSummary => {
    const state = job.state ?? {};
    return {
      id: job.id,
      name: job.displayName ?? job.name ?? job.id,
      agentId: job.effectiveAgentId ?? job.agentId ?? null,
      kind: job.payload?.kind ?? null,
      enabled: job.enabled,
      status: normalizeStatus(job.status ?? state.lastRunStatus),
      lastRunAtMs: job.lastRunAtMs ?? state.lastRunAtMs ?? null,
      nextRunAtMs: job.nextRunAtMs ?? state.nextRunAtMs ?? null,
      lastDurationMs: state.lastDurationMs ?? null,
      consecutiveErrors: state.consecutiveErrors ?? 0,
      lastError: job.lastRunError ?? state.lastError ?? null,
    };
  });
}
