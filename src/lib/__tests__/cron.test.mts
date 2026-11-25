import test from "node:test";
import assert from "node:assert/strict";
import {
  mapCronJobs,
  mapCronRuns,
  type CronJobEntry,
  type CronRunEntry,
} from "../cron.ts";

test("mapCronJobs: each of the 6 CronJobStatus values maps correctly", () => {
  const baseJob = (overrides: Partial<CronJobEntry>): CronJobEntry => ({
    id: "job-1",
    enabled: true,
    ...overrides,
  });

  const cases: Array<{ job: CronJobEntry; expected: string }> = [
    { job: baseJob({ status: "ok" }), expected: "ok" },
    { job: baseJob({ status: "error" }), expected: "error" },
    { job: baseJob({ status: "skipped" }), expected: "skipped" },
    { job: baseJob({ status: "running" }), expected: "running" },
    // pending: no recognized status string AND never run (lastRunAtMs null)
    { job: baseJob({ status: undefined, lastRunAtMs: undefined }), expected: "pending" },
    // unknown: no recognized status string BUT it HAS run before
    {
      job: baseJob({ status: "some-unrecognized-value", lastRunAtMs: 1000 }),
      expected: "unknown",
    },
  ];

  for (const { job, expected } of cases) {
    const [summary] = mapCronJobs([job]);
    assert.equal(summary.status, expected, `job ${JSON.stringify(job)} should map to ${expected}`);
  }
});

test("mapCronJobs: pending vs unknown distinction is driven by lastRunAtMs, not just status string", () => {
  // Same unrecognized/missing status, different lastRunAtMs presence —
  // this is the exact distinction Designer/Tester flagged as a real gap.
  const neverRun = mapCronJobs([
    { id: "a", enabled: true, status: undefined, lastRunAtMs: undefined },
  ])[0];
  assert.equal(neverRun.status, "pending");
  assert.equal(neverRun.lastRunAtMs, null);

  const ranOnceButUnrecognizedStatus = mapCronJobs([
    { id: "b", enabled: true, status: "weird-status", lastRunAtMs: 1700000000000 },
  ])[0];
  assert.equal(ranOnceButUnrecognizedStatus.status, "unknown");
  assert.equal(ranOnceButUnrecognizedStatus.lastRunAtMs, 1700000000000);
});

test("mapCronJobs: lastRunAtMs falls back from top-level to nested state", () => {
  const topLevelOnly = mapCronJobs([
    { id: "a", enabled: true, status: "ok", lastRunAtMs: 111 },
  ])[0];
  assert.equal(topLevelOnly.lastRunAtMs, 111);

  const nestedOnly = mapCronJobs([
    { id: "b", enabled: true, status: "ok", state: { lastRunAtMs: 222 } },
  ])[0];
  assert.equal(nestedOnly.lastRunAtMs, 222);

  const topLevelWins = mapCronJobs([
    { id: "c", enabled: true, status: "ok", lastRunAtMs: 333, state: { lastRunAtMs: 444 } },
  ])[0];
  assert.equal(topLevelWins.lastRunAtMs, 333);

  const neitherPresent = mapCronJobs([{ id: "d", enabled: true, status: "ok" }])[0];
  assert.equal(neitherPresent.lastRunAtMs, null);
});

test("mapCronJobs: consecutiveErrors defaults to 0 when state is absent or field is missing", () => {
  const noStateAtAll = mapCronJobs([{ id: "a", enabled: true, status: "ok" }])[0];
  assert.equal(noStateAtAll.consecutiveErrors, 0);

  const stateWithoutField = mapCronJobs([
    { id: "b", enabled: true, status: "ok", state: {} },
  ])[0];
  assert.equal(stateWithoutField.consecutiveErrors, 0);

  const stateWithField = mapCronJobs([
    { id: "c", enabled: true, status: "ok", state: { consecutiveErrors: 3 } },
  ])[0];
  assert.equal(stateWithField.consecutiveErrors, 3);

  const zeroIsNotTreatedAsMissing = mapCronJobs([
    { id: "d", enabled: true, status: "ok", state: { consecutiveErrors: 0 } },
  ])[0];
  assert.equal(zeroIsNotTreatedAsMissing.consecutiveErrors, 0);
});

test("mapCronJobs: lastError falls back from top-level lastRunError to nested state.lastError", () => {
  const topLevelOnly = mapCronJobs([
    { id: "a", enabled: true, status: "error", lastRunError: "boom" },
  ])[0];
  assert.equal(topLevelOnly.lastError, "boom");

  const nestedOnly = mapCronJobs([
    { id: "b", enabled: true, status: "error", state: { lastError: "nested boom" } },
  ])[0];
  assert.equal(nestedOnly.lastError, "nested boom");

  const topLevelWins = mapCronJobs([
    {
      id: "c",
      enabled: true,
      status: "error",
      lastRunError: "top boom",
      state: { lastError: "nested boom" },
    },
  ])[0];
  assert.equal(topLevelWins.lastError, "top boom");

  const neitherPresent = mapCronJobs([{ id: "d", enabled: true, status: "ok" }])[0];
  assert.equal(neitherPresent.lastError, null);

  // Explicit null in nested state must NOT be coerced to a truthy fallback.
  const explicitNullNested = mapCronJobs([
    { id: "e", enabled: true, status: "ok", state: { lastError: null } },
  ])[0];
  assert.equal(explicitNullNested.lastError, null);
});

test("mapCronJobs: name/agentId resolve through their documented fallback chains", () => {
  const displayNameWins = mapCronJobs([
    { id: "a", enabled: true, status: "ok", displayName: "Display", name: "raw-name" },
  ])[0];
  assert.equal(displayNameWins.name, "Display");

  const nameFallback = mapCronJobs([
    { id: "b", enabled: true, status: "ok", name: "raw-name" },
  ])[0];
  assert.equal(nameFallback.name, "raw-name");

  const idFallback = mapCronJobs([{ id: "c", enabled: true, status: "ok" }])[0];
  assert.equal(idFallback.name, "c");

  const effectiveAgentIdWins = mapCronJobs([
    { id: "d", enabled: true, status: "ok", effectiveAgentId: "effective", agentId: "raw" },
  ])[0];
  assert.equal(effectiveAgentIdWins.agentId, "effective");

  const agentIdFallback = mapCronJobs([
    { id: "e", enabled: true, status: "ok", agentId: "raw" },
  ])[0];
  assert.equal(agentIdFallback.agentId, "raw");

  const noAgentId = mapCronJobs([{ id: "f", enabled: true, status: "ok" }])[0];
  assert.equal(noAgentId.agentId, null);
});

test("mapCronRuns: status normalization reuses the same pending/unknown rule as mapCronJobs", () => {
  const neverRun: CronRunEntry = { ts: 1, jobId: "a", status: undefined, runAtMs: undefined };
  const ranWithUnknownStatus: CronRunEntry = {
    ts: 2,
    jobId: "a",
    status: "weird",
    runAtMs: 1700000000000,
  };
  const ok: CronRunEntry = { ts: 3, jobId: "a", status: "ok", runAtMs: 1700000000000 };

  const [a, b, c] = mapCronRuns([neverRun, ranWithUnknownStatus, ok]);
  assert.equal(a.status, "pending");
  assert.equal(b.status, "unknown");
  assert.equal(c.status, "ok");
});

test("mapCronRuns: durationMs and summary default to null when absent", () => {
  const [entry] = mapCronRuns([{ ts: 1, jobId: "a", status: "ok" }]);
  assert.equal(entry.durationMs, null);
  assert.equal(entry.summary, null);
  assert.equal(entry.runAtMs, null);
});
