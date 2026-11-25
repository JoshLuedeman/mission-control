import { NextResponse } from "next/server";
import { runOpenclawJson } from "@/lib/openclaw-cli";
import { mapCronRuns, type CronRunsResponse } from "@/lib/cron";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const raw = await runOpenclawJson<CronRunsResponse>([
      "automations",
      "runs",
      id,
      "--json",
      "--limit",
      "20",
    ]);

    const runs = mapCronRuns(raw.entries ?? []);

    return NextResponse.json({ ok: true, data: runs, total: raw.total ?? runs.length });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error fetching run history",
      },
      { status: 502 },
    );
  }
}
