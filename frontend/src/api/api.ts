const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

//
// Basic team types
//
export type Team = {
  id: number;
  name: string;
  slug: string;
  region: string | null;
  is_tracked: boolean;
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
  roster: TeamPlayer[];
};

//
// Team analysis / rebuild meter
//
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

//
// Player types
//
export type Player = {
  id: number;
  nickname: string;
  full_name: string | null;
  nationality: string | null;
  age: number | null;
  role?: string | null;
  team?: string | null;
  strength_score?: number | null;
  primary_role?: string | null;
  secondary_role?: string | null;
  current_team?: {
    team_id: number;
    team_name: string;
  } | null;
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

//
// Candidate / suggestions
//
export type Candidate = {
  player_id: number;
  nickname: string;
  role: string | null;
  source: string;
  score: number | null;
  strength_score: number | null;
};

export type SuggestionResponse = {
  team: {
    id: number;
    name: string;
  };
  outgoing_player: {
    id: number;
    nickname: string;
    role: string | null;
    secondary_role: string | null;
    strength_score: number | null;
  };
  suggestions: {
    player_id: number;
    nickname: string;
    role: string | null;
    secondary_role: string | null;
    strength_score: number | null;
    fit_score: number;
  }[];
};

//
// Simulator
//
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

//
// Dream team
//
export type DreamTeamResponse = {
  selected_players: {
    id: number;
    nickname: string;
    role: string | null;
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

//
// Transfer battle
//
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

//
// Best move
//
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

//
// Dashboard
//
export type DashboardOverview = {
  counts: {
    teams: number;
    players: number;
  };
  strongest_player: {
    id: number;
    nickname: string;
    strength_score: number | null;
  } | null;
  most_unstable_team: {
    team: {
      id: number;
      name: string;
    };
    roster_health_score: number;
    label: string;
    suggested_action: string;
  } | null;
  featured_best_move: {
    team: {
      id: number;
      name: string;
    };
    move: {
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
    };
  } | null;
};

//
// Teams
//
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

//
// Players
//
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

//
// Candidates / suggestions
//
export async function fetchCandidates(): Promise<Candidate[]> {
  const res = await fetch(`${API_BASE_URL}/simulator/candidates`);
  if (!res.ok) throw new Error("Failed to fetch candidates");
  return res.json();
}

export async function fetchSuggestions(
  teamId: number,
  outgoingPlayerId: number
): Promise<SuggestionResponse> {
  const res = await fetch(`${API_BASE_URL}/teams/${teamId}/suggestions/${outgoingPlayerId}`);
  if (!res.ok) throw new Error("Failed to fetch suggestions");
  return res.json();
}

//
// Simulator
//
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

//
// Dream team
//
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

//
// Transfer battle
//
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

//
// Best move
//
export async function fetchBestMove(teamId: number): Promise<BestMoveResponse> {
  const res = await fetch(`${API_BASE_URL}/teams/${teamId}/best-move`);
  if (!res.ok) throw new Error("Failed to fetch best move");
  return res.json();
}

//
// Dashboard
//
export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const res = await fetch(`${API_BASE_URL}/dashboard/overview`);
  if (!res.ok) throw new Error("Failed to fetch dashboard overview");
  return res.json();
}