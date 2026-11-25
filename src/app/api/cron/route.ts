import { NextResponse } from "next/server";
import { runOpenclawJson } from "@/lib/openclaw-cli";
import { mapCronJobs, type CronJobsListResponse } from "@/lib/cron";

export async function GET() {
  try {
    const raw = await runOpenclawJson<CronJobsListResponse>([
      "automations",
      "list",
      "--all",
      "--json",
    ]);

    const jobs = mapCronJobs(raw.jobs ?? []);

    return NextResponse.json({ ok: true, data: jobs });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error fetching cron data",
      },
      { status: 502 },
    );
  }
}
