export interface AgentConfigEntry {
  id: string;
  name: string;
  identityName?: string;
  identityEmoji?: string;
  identitySource?: string;
  workspace?: string;
  agentDir?: string;
  model?: string;
  bindings?: number;
  isDefault?: boolean;
  createdVia?: string;
  creatorAgentId?: string | null;
  createdAt?: number;
}

export interface SessionEntry {
  key: string;
  agentId?: string;
  updatedAt?: number;
  ageMs?: number;
  lastInteractionAt?: number;
  model?: string;
  modelProvider?: string;
  kind?: string;
  abortedLastRun?: boolean;
}

export interface SessionsListResponse {
  sessions: SessionEntry[];
  count: number;
  totalCount: number;
}

export type CrewMemberStatus = "online" | "stale" | "unknown";

export interface CrewMember {
  id: string;
  name: string;
  emoji?: string;
  model: string | null;
  lastInteractionAt: number | null;
  status: CrewMemberStatus;
  isDefault: boolean;
}

/** A session is considered "online" if its :main key updated within this window. */
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes — matches the crew's heartbeat cadence

export function mergeCrewData(
  agents: AgentConfigEntry[],
  sessions: SessionEntry[],
): CrewMember[] {
  const mainSessionByAgent = new Map<string, SessionEntry>();
  for (const s of sessions) {
    if (s.agentId && s.key === `agent:${s.agentId}:main`) {
      mainSessionByAgent.set(s.agentId, s);
    }
  }

  const now = Date.now();

  return agents.map((agent): CrewMember => {
    const session = mainSessionByAgent.get(agent.id);
    const lastInteractionAt = session?.lastInteractionAt ?? null;

    let status: CrewMemberStatus = "unknown";
    if (lastInteractionAt != null) {
      status = now - lastInteractionAt <= STALE_THRESHOLD_MS ? "online" : "stale";
    }

    return {
      id: agent.id,
      name: agent.identityName ?? agent.name,
      emoji: agent.identityEmoji,
      model: session?.model ?? agent.model ?? null,
      lastInteractionAt,
      status,
      isDefault: agent.isDefault ?? false,
    };
  });
}
