import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Badge from "../components/Badge";
import { fetchTeam, type TeamDetail } from "../api/api";

type TeamAnalysis = {
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
  weak_link?: {
    id: number;
    nickname: string;
    role?: string | null;
    strength_score?: number | null;
    reason: string;
  } | null;
  instability_reasons: string[];
  suggested_action: string;
  explanations: string[];
  suggested_moves: Array<{
    outgoing_player: {
      id: number;
      nickname: string;
      role?: string | null;
      strength_score?: number | null;
    };
    incoming_player: {
      id: number;
      nickname: string;
      role?: string | null;
      secondary_role?: string | null;
      strength_score?: number | null;
      fit_score?: number | null;
      status?: string | null;
      market_value_tier?: string | null;
      candidate_team?: string | null;
    };
    projection: {
      summary: {
        combined_delta: number;
        verdict: string;
      };
    };
  }>;
};

function getHealthBadgeType(label: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const v = label.toLowerCase();
  if (v.includes("elite") || v.includes("stable")) return "success";
  if (v.includes("small change")) return "warning";
  if (v.includes("risky") || v.includes("rebuild")) return "danger";
  return "info";
}

function getVerdictBadgeType(label: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const v = label.toLowerCase();
  if (v.includes("upgrade")) return "success";
  if (v.includes("neutral")) return "warning";
  if (v.includes("downgrade")) return "danger";
  return "info";
}

export default function TeamPage() {
  const { teamId } = useParams();
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [analysis, setAnalysis] = useState<TeamAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTeam() {
      if (!teamId) return;

      try {
        const data = await fetchTeam(Number(teamId));
        setTeam(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load team");
      } finally {
        setLoading(false);
      }
    }

    loadTeam();
  }, [teamId]);

  useEffect(() => {
    async function loadAnalysis() {
      if (!teamId) return;

      try {
        const base =
          import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
          "http://127.0.0.1:8000";
        const res = await fetch(`${base}/teams/${teamId}/analysis`);
        if (!res.ok) throw new Error("Failed to load team analysis");
        const data = await res.json();
        setAnalysis(data);
      } catch {
        setAnalysis(null);
      } finally {
        setAnalysisLoading(false);
      }
    }

    loadAnalysis();
  }, [teamId]);

  if (loading) return <div style={styles.page}>Loading team...</div>;
  if (error || !team) return <div style={styles.page}>Error: {error ?? "Team not found"}</div>;

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div>
          <div style={styles.badgeRow}>
            <Badge
              label={team.competitive_tier ? `Tier ${team.competitive_tier}` : "Unrated"}
              type="warning"
            />
            <Badge
              label={`Avg Strength ${team.average_strength ?? "N/A"}`}
              type="info"
            />
            {analysis ? (
              <Badge label={analysis.label} type={getHealthBadgeType(analysis.label)} />
            ) : null}
          </div>

          <h1 style={styles.title}>{team.name}</h1>
          <p style={styles.subtitle}>
            {team.region ?? "Unknown region"} • Current active roster, roster health, and suggested changes
          </p>
        </div>
      </div>

      <div style={styles.mainGrid}>
        <div style={styles.leftColumn}>
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Active Roster</h2>
              <p style={styles.sectionSubtitle}>Click any player to open their profile page.</p>
            </div>

            <div style={styles.grid}>
              {team.roster.map((player) => (
                <Link
                  key={player.player_id}
                  to={`/players/${player.player_id}`}
                  style={styles.linkCard}
                >
                  <div
                    style={styles.card}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
                  >
                    <div style={styles.cardHeader}>
                      <h3 style={styles.cardTitle}>{player.nickname}</h3>
                      <Badge
                        label={player.strength_score !== null && player.strength_score !== undefined ? `${player.strength_score}` : "N/A"}
                        type="info"
                      />
                    </div>

                    <p>Primary Role: {player.role ?? "Unknown"}</p>
                    <p>Secondary Role: {player.secondary_role ?? "None"}</p>
                    <p>Nationality: {player.nationality ?? "Unknown"}</p>
                    <p>Age: {player.age ?? "Unknown"}</p>
                    <p style={styles.cardHint}>Open player page</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Roster Health</h2>
              <p style={styles.sectionSubtitle}>Why this team is stable or unstable.</p>
            </div>

            {analysisLoading ? (
              <div style={styles.card}>Loading team analysis...</div>
            ) : analysis ? (
              <>
                <div style={styles.summaryGrid}>
                  <div style={styles.summaryCard}>
                    <p style={styles.eyebrow}>ROSTER HEALTH</p>
                    <p style={styles.bigText}>{analysis.roster_health_score}</p>
                  </div>

                  <div style={styles.summaryCard}>
                    <p style={styles.eyebrow}>ROLE SCORE</p>
                    <p style={styles.bigText}>{analysis.role_structure.score}</p>
                  </div>

                  <div style={styles.summaryCard}>
                    <p style={styles.eyebrow}>FIREPOWER</p>
                    <p style={styles.bigText}>{analysis.firepower.average_strength}</p>
                  </div>

                  <div style={styles.summaryCard}>
                    <p style={styles.eyebrow}>PROFILE</p>
                    <p style={styles.bigTextSmall}>{analysis.firepower.balance_label}</p>
                  </div>
                </div>

                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Why this team is unstable</h3>
                  <ul style={styles.list}>
                    {analysis.instability_reasons.map((reason, idx) => (
                      <li key={idx} style={styles.listItem}>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                {analysis.weak_link ? (
                  <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Weak Link</h3>
                    <p>
                      <Link to={`/players/${analysis.weak_link.id}`} style={styles.inlineLink}>
                        {analysis.weak_link.nickname}
                      </Link>{" "}
                      {analysis.weak_link.role ? `(${analysis.weak_link.role})` : ""}
                    </p>
                    <p>Strength: {analysis.weak_link.strength_score ?? "N/A"}</p>
                    <p>{analysis.weak_link.reason}</p>
                  </div>
                ) : null}

                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Suggested Action</h3>
                  <p>{analysis.suggested_action}</p>
                </div>
              </>
            ) : (
              <div style={styles.card}>No team analysis available yet.</div>
            )}
          </div>
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.stickyColumn}>
            <div style={styles.sidePanel}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Suggested Roster Moves</h2>
                <Badge label="Watchlist" type="warning" />
              </div>

              {analysisLoading ? (
                <p>Loading suggestions...</p>
              ) : analysis?.suggested_moves && analysis.suggested_moves.length > 0 ? (
                <div style={styles.sideList}>
                  {analysis.suggested_moves.map((move, idx) => (
                    <div key={idx} style={styles.sideCard}>
                      <div style={styles.cardHeader}>
                        <p style={styles.sideCardTitle}>Move {idx + 1}</p>
                        <Badge
                          label={move.projection.summary.verdict}
                          type={getVerdictBadgeType(move.projection.summary.verdict)}
                        />
                      </div>

                      <p>
                        Out:{" "}
                        <Link to={`/players/${move.outgoing_player.id}`} style={styles.inlineLink}>
                          {move.outgoing_player.nickname}
                        </Link>{" "}
                        ({move.outgoing_player.role ?? "Unknown"})
                      </p>

                      <p>
                        In:{" "}
                        <Link to={`/players/${move.incoming_player.id}`} style={styles.inlineLink}>
                          {move.incoming_player.nickname}
                        </Link>{" "}
                        ({move.incoming_player.role ?? "Unknown"})
                      </p>

                      <p>Projected Improvement: {move.projection.summary.combined_delta}</p>
                      <p>Status: {move.incoming_player.status ?? "Unknown"}</p>
                      <p>Market Tier: {move.incoming_player.market_value_tier ?? "Unknown"}</p>
                      <p>Current Team: {move.incoming_player.candidate_team ?? "No team"}</p>

                      <div style={styles.linkRow}>
                        <Link to="/simulator" style={styles.inlineLink}>
                          Test in simulator
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No realistic suggested moves available yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const baseCard: React.CSSProperties = {
  background: "linear-gradient(145deg, #1f2937, #111827)",
  border: "1px solid #374151",
  borderRadius: "16px",
  padding: "20px",
  transition: "all 0.2s ease",
  boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "32px",
    color: "#f9fafb",
  },
  hero: {
    ...baseCard,
    marginBottom: "24px",
  },
  badgeRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "14px",
  },
  title: {
    marginTop: 0,
    marginBottom: "10px",
    fontSize: "38px",
  },
  subtitle: {
    color: "#d1d5db",
    marginBottom: 0,
    lineHeight: 1.6,
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)",
    gap: "20px",
    alignItems: "start",
  },
  leftColumn: {
    display: "grid",
    gap: "24px",
  },
  rightColumn: {
    display: "grid",
  },
  stickyColumn: {
    position: "sticky",
    top: "24px",
  },
  section: {
    marginBottom: "8px",
  },
  sectionHeader: {
    marginBottom: "14px",
  },
  sectionTitle: {
    margin: 0,
    marginBottom: "6px",
  },
  sectionSubtitle: {
    margin: 0,
    color: "#d1d5db",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
  },
  linkCard: {
    textDecoration: "none",
    color: "inherit",
  },
  card: {
    ...baseCard,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "16px",
  },
  summaryCard: {
    ...baseCard,
  },
  sidePanel: {
    ...baseCard,
  },
  sideList: {
    display: "grid",
    gap: "14px",
  },
  sideCard: {
    background: "#0f172a",
    border: "1px solid #374151",
    borderRadius: "14px",
    padding: "16px",
  },
  sideCardTitle: {
    margin: 0,
    fontWeight: 700,
  },
  eyebrow: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#94a3b8",
    marginTop: 0,
    marginBottom: "10px",
  },
  bigText: {
    fontSize: "22px",
    fontWeight: 700,
    margin: 0,
  },
  bigTextSmall: {
    fontSize: "18px",
    fontWeight: 700,
    margin: 0,
    lineHeight: 1.4,
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "10px",
    flexWrap: "wrap",
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: "10px",
  },
  inlineLink: {
    color: "#93c5fd",
    textDecoration: "none",
    fontWeight: 600,
  },
  linkRow: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    marginTop: "12px",
  },
  cardHint: {
    marginTop: "12px",
    color: "#93c5fd",
    fontSize: "14px",
  },
  list: {
    margin: 0,
    paddingLeft: "18px",
  },
  listItem: {
    marginBottom: "8px",
    color: "#e5e7eb",
  },
};