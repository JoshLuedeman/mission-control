export type CronJobStatus = "ok" | "error" | "skipped" | "running" | "pending" | "unknown";

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

export interface CronRunEntry {
  ts: number;
  jobId: string;
  action?: string;
  status?: string;
  completionStatus?: string;
  runAtMs?: number;
  durationMs?: number;
  nextRunAtMs?: number;
  jobName?: string;
  tsIso?: string;
  runAtIso?: string;
  nextRunAtIso?: string;
  summary?: string;
}

export interface CronRunsResponse {
  entries: CronRunEntry[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  nextOffset?: number;
}

export interface CronRunSummary {
  ts: number;
  status: CronJobStatus;
  runAtMs: number | null;
  durationMs: number | null;
  summary: string | null;
}

function normalizeStatus(
  raw: string | undefined,
  lastRunAtMs: number | null,
): CronJobStatus {
  if (raw === "ok" || raw === "error" || raw === "skipped" || raw === "running") {
    return raw;
  }
  // A job that has genuinely never run is a distinct, meaningful state —
  // don't collapse it into the same "unknown" bucket as a real mapping gap.
  if (lastRunAtMs == null) {
    return "pending";
  }
  return "unknown";
}

export function mapCronJobs(jobs: CronJobEntry[]): CronJobSummary[] {
  return jobs.map((job): CronJobSummary => {
    const state = job.state ?? {};
    const lastRunAtMs = job.lastRunAtMs ?? state.lastRunAtMs ?? null;
    return {
      id: job.id,
      name: job.displayName ?? job.name ?? job.id,
      agentId: job.effectiveAgentId ?? job.agentId ?? null,
      kind: job.payload?.kind ?? null,
      enabled: job.enabled,
      status: normalizeStatus(job.status ?? state.lastRunStatus, lastRunAtMs),
      lastRunAtMs,
      nextRunAtMs: job.nextRunAtMs ?? state.nextRunAtMs ?? null,
      lastDurationMs: state.lastDurationMs ?? null,
      consecutiveErrors: state.consecutiveErrors ?? 0,
      lastError: job.lastRunError ?? state.lastError ?? null,
    };
  });
}

export function mapCronRuns(entries: CronRunEntry[]): CronRunSummary[] {
  return entries.map((entry): CronRunSummary => ({
    ts: entry.ts,
    status: normalizeStatus(entry.status, entry.runAtMs ?? null),
    runAtMs: entry.runAtMs ?? null,
    durationMs: entry.durationMs ?? null,
    summary: entry.summary ?? null,
  }));
}
