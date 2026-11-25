import { NextResponse } from "next/server";
import { runOpenclawJson } from "@/lib/openclaw-cli";
import {
  mergeCrewData,
  type AgentConfigEntry,
  type SessionsListResponse,
} from "@/lib/crew";

export async function GET() {
  try {
    const [agents, sessionsResponse] = await Promise.all([
      runOpenclawJson<AgentConfigEntry[]>(["agents", "list", "--json"]),
      runOpenclawJson<SessionsListResponse>([
        "sessions",
        "--all-agents",
        "--json",
        "--limit",
        "all",
      ]),
    ]);

    const crew = mergeCrewData(agents, sessionsResponse.sessions ?? []);

    return NextResponse.json({ ok: true, data: crew });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error fetching crew data",
      },
      { status: 502 },
    );
  }
}
