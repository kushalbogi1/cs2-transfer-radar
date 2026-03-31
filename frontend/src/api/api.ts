const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export type Team = {
  id: number;
  name: string;
  slug: string;
  region: string | null;
  is_tracked: boolean;
  competitive_tier?: string | null;
  average_strength?: number | null;
  active_players?: string[];
  active_player_count?: number;
  rank?: number;
};

export type TeamPlayer = {
  player_id: number;
  nickname: string;
  full_name: string | null;
  nationality: string | null;
  age: number | null;
  role: string | null;
  strength_score?: number | null;
};

export type TeamDetail = {
  id: number;
  name: string;
  slug: string;
  region: string | null;
  competitive_tier?: string | null;
  average_strength?: number | null;
  roster: TeamPlayer[];
};

export type TeamAnalysis = {
  team: {
    id: number;
    name: string;
  };
  roster_health_score: number;
  label: string;
  role_structure: {
    score: number;
    role_counts: Record<string, number>;
    missing_roles: string[];
    duplicate_roles: string[];
  };
  firepower: {
    average_strength: number;
    max_strength: number;
    min_strength: number;
    spread: number;
    balance_label: string;
    balance_score: number;
  };
  suggested_action: string;
  explanations: string[];
};

export type Player = {
  id: number;
  nickname: string;
  full_name?: string | null;
  nationality?: string | null;
  age?: number | null;
  role?: string | null;
  primary_role?: string | null;
  secondary_role?: string | null;
  strength_score?: number | null;
  current_rating?: number | null;
  team?: string | null;
  status?: string | null;
  market_value_tier?: string | null;
  rank?: number;
};

export type PlayerStatsResponse = {
  player: {
    id: number;
    nickname: string;
    full_name: string | null;
    strength_score: number | null;
  };
  latest_snapshot: {
    source: string;
    snapshot_date: string;
    rating: number | null;
    impact: number | null;
    adr: number | null;
    kast: number | null;
    maps_played: number | null;
  } | null;
  snapshot_count: number;
  snapshots: {
    id: number;
    source: string;
    snapshot_date: string;
    rating: number | null;
    impact: number | null;
    adr: number | null;
    kast: number | null;
    maps_played: number | null;
  }[];
};

export type Candidate = {
  player_id: number;
  nickname: string;
  role: string | null;
  secondary_role?: string | null;
  source: string;
  score: number | null;
  strength_score: number | null;
  status?: string | null;
  market_value_tier?: string | null;
  team?: string | null;
};

export type SuggestionResponse = {
  team: {
    id: number;
    name: string;
    competitive_tier?: string | null;
  };
  outgoing_player: {
    id: number;
    nickname: string;
    role: string | null;
    secondary_role: string | null;
    strength_score: number | null;
  };
  candidate_mode: "available_only" | "active_targets" | "all";
  suggestions: {
    player_id: number;
    nickname: string;
    role: string | null;
    secondary_role: string | null;
    strength_score: number | null;
    fit_score: number;
    status: string | null;
    market_value_tier: string | null;
    candidate_team: string | null;
    candidate_team_tier: string | null;
  }[];
};

export type SimulationResponse = {
  team: {
    id: number;
    name: string;
  };
  swap: {
    outgoing: {
      id: number;
      nickname: string;
      role: string | null;
      strength_score: number | null;
    };
    incoming: {
      id: number;
      nickname: string;
      role: string | null;
      strength_score: number | null;
    };
  };
  summary: {
    verdict: string;
    role_fit_label: string;
    strength_change_label: string;
    combined_delta: number;
    role_delta: number;
    strength_delta: number;
  };
  before: {
    role_balance: {
      score: number;
      label: string;
      role_counts: Record<string, number>;
      breakdown: Record<string, { ideal: number; actual: number; diff: number }>;
      missing_roles: string[];
      duplicate_roles: string[];
    };
    strength: {
      score: number;
      player_scores: {
        player_id: number;
        nickname: string;
        strength_score: number;
      }[];
    };
    combined_score: number;
  };
  after: {
    role_balance: {
      score: number;
      label: string;
      role_counts: Record<string, number>;
      breakdown: Record<string, { ideal: number; actual: number; diff: number }>;
      missing_roles: string[];
      duplicate_roles: string[];
    };
    strength: {
      score: number;
      player_scores: {
        player_id: number;
        nickname: string;
        strength_score: number;
      }[];
    };
    combined_score: number;
  };
  delta: number;
  verdict: string;
  explanations: string[];
};

export type DreamTeamResponse = {
  selected_players: {
    id: number;
    nickname: string;
    role: string | null;
    secondary_role?: string | null;
    strength_score: number | null;
  }[];
  role_balance: {
    score: number;
    label: string;
    role_counts?: Record<string, number>;
    breakdown?: Record<string, { ideal: number; actual: number; diff: number }>;
    missing_roles: string[];
    duplicate_roles: string[];
  };
  strength: {
    score: number;
    player_scores?: {
      player_id: number;
      nickname: string;
      strength_score: number;
    }[];
  };
  combined_score: number;
  explanations: string[];
};

export type TransferBattleResponse = {
  team: {
    id: number;
    name: string;
  };
  move_a: SimulationResponse;
  move_b: SimulationResponse;
  comparison: {
    winner: string;
    winner_reason: string;
    move_a_delta: number;
    move_b_delta: number;
  };
};

export type BestMoveResponse = {
  team: {
    id: number;
    name: string;
  };
  top_moves: {
    outgoing_player: {
      id: number;
      nickname: string;
      role: string | null;
      strength_score: number | null;
    };
    incoming_player: {
      id: number;
      nickname: string;
      role: string | null;
      strength_score: number | null;
      fit_score: number;
    };
    projection: SimulationResponse;
  }[];
  meta: {
    evaluated_moves: number;
    returned_moves: number;
    best_delta_overall: number | null;
    summary_message: string;
  };
};

export type DashboardOverview = {
  counts: {
    teams: number;
    players: number;
  };
  strongest_player?: {
    id: number;
    nickname: string;
    strength_score: number;
    current_rating?: number | null;
    primary_role?: string | null;
    secondary_role?: string | null;
    team?: string | null;
    status?: string | null;
    market_value_tier?: string | null;
    rank?: number;
  } | null;
  top_players?: Array<{
    id: number;
    nickname: string;
    strength_score: number;
    current_rating?: number | null;
    primary_role?: string | null;
    secondary_role?: string | null;
    team?: string | null;
    status?: string | null;
    market_value_tier?: string | null;
    rank?: number;
  }>;
  top_teams?: Array<{
    id: number;
    name: string;
    region?: string | null;
    competitive_tier?: string | null;
    average_strength?: number | null;
    active_players?: string[];
    rank?: number;
  }>;
  most_unstable_team?: any;
  featured_best_move?: any;
};


export async function fetchTeams(): Promise<Team[]> {
  const res = await fetch(`${API_BASE_URL}/teams/`);
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
}

export async function fetchTeam(teamId: number): Promise<TeamDetail> {
  const res = await fetch(`${API_BASE_URL}/teams/${teamId}`);
  if (!res.ok) throw new Error("Failed to fetch team");
  return res.json();
}

export async function fetchTeamAnalysis(teamId: number): Promise<TeamAnalysis> {
  const res = await fetch(`${API_BASE_URL}/teams/${teamId}/analysis`);
  if (!res.ok) throw new Error("Failed to fetch team analysis");
  return res.json();
}

export async function fetchPlayers(): Promise<Player[]> {
  const res = await fetch(`${API_BASE_URL}/players/`);
  if (!res.ok) throw new Error("Failed to fetch players");
  return res.json();
}

export async function fetchPlayer(playerId: number): Promise<Player> {
  const res = await fetch(`${API_BASE_URL}/players/${playerId}`);
  if (!res.ok) throw new Error("Failed to fetch player");
  return res.json();
}

export async function fetchPlayerStats(playerId: number): Promise<PlayerStatsResponse> {
  const res = await fetch(`${API_BASE_URL}/players/${playerId}/stats`);
  if (!res.ok) throw new Error("Failed to fetch player stats");
  return res.json();
}

export async function fetchCandidates(
  candidateMode: "available_only" | "active_targets" | "all" = "all"
): Promise<Candidate[]> {
  const res = await fetch(`${API_BASE_URL}/simulator/candidates?candidate_mode=${candidateMode}`);
  if (!res.ok) throw new Error("Failed to fetch candidates");
  return res.json();
}

export async function fetchSuggestions(
  teamId: number,
  outgoingPlayerId: number,
  candidateMode: "available_only" | "active_targets" | "all" = "available_only"
): Promise<SuggestionResponse> {
  const res = await fetch(
    `${API_BASE_URL}/teams/${teamId}/suggestions/${outgoingPlayerId}?candidate_mode=${candidateMode}`
  );
  if (!res.ok) throw new Error("Failed to fetch suggestions");
  return res.json();
}

export async function runSimulation(payload: {
  team_id: number;
  outgoing_player_id: number;
  incoming_player_id: number;
}): Promise<SimulationResponse> {
  const res = await fetch(`${API_BASE_URL}/simulator/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to run simulation");
  }

  return res.json();
}

export async function runDreamTeam(payload: {
  player_ids: number[];
}): Promise<DreamTeamResponse> {
  const res = await fetch(`${API_BASE_URL}/dream-team/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to analyze dream team");
  }

  return res.json();
}

export async function runTransferBattle(payload: {
  team_id: number;
  move_a: {
    outgoing_player_id: number;
    incoming_player_id: number;
  };
  move_b: {
    outgoing_player_id: number;
    incoming_player_id: number;
  };
}): Promise<TransferBattleResponse> {
  const res = await fetch(`${API_BASE_URL}/transfer-battle/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to run transfer battle");
  }

  return res.json();
}

export async function fetchBestMove(teamId: number): Promise<BestMoveResponse> {
  const res = await fetch(`${API_BASE_URL}/teams/${teamId}/best-move`);
  if (!res.ok) throw new Error("Failed to fetch best move");
  return res.json();
}

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const res = await fetch(`${API_BASE_URL}/dashboard/overview`);
  if (!res.ok) throw new Error("Failed to fetch dashboard overview");
  return res.json();
}