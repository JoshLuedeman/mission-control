import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Shells out to the `openclaw` CLI on this host. Server-only — never
 * expose this helper (or its output) to client-side code directly.
 * Each caller is responsible for shaping the raw CLI JSON into a
 * stable response contract for its own route.
 */
export async function runOpenclawJson<T = unknown>(
  args: string[],
  timeoutMs = 10_000,
): Promise<T> {
  const { stdout } = await execFileAsync("openclaw", args, {
    timeout: timeoutMs,
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(stdout) as T;
}
