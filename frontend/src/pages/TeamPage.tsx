import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Badge from "../components/Badge";
import {
  fetchBestMove,
  fetchTeam,
  fetchTeamAnalysis,
  type BestMoveResponse,
  type TeamAnalysis,
  type TeamDetail,
} from "../api/api";

function getStatusBadgeType(label: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const v = label.toLowerCase();
  if (v.includes("elite") || v.includes("stable")) return "success";
  if (v.includes("small")) return "warning";
  if (v.includes("risky") || v.includes("rebuild")) return "danger";
  return "info";
}

function getVerdictBadgeType(label: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const v = label.toLowerCase();
  if (v.includes("strong upgrade") || v.includes("slight upgrade")) return "success";
  if (v.includes("neutral")) return "warning";
  if (v.includes("downgrade")) return "danger";
  return "info";
}

export default function TeamPage() {
  const { teamId } = useParams();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [analysis, setAnalysis] = useState<TeamAnalysis | null>(null);
  const [bestMove, setBestMove] = useState<BestMoveResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [bestMoveLoading, setBestMoveLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPageData() {
      if (!teamId) {
        setError("Missing team id.");
        setLoading(false);
        setAnalysisLoading(false);
        setBestMoveLoading(false);
        return;
      }

      try {
        const numericTeamId = Number(teamId);

        const [teamData, analysisData, bestMoveData] = await Promise.all([
          fetchTeam(numericTeamId),
          fetchTeamAnalysis(numericTeamId),
          fetchBestMove(numericTeamId),
        ]);

        setTeam(teamData);
        setAnalysis(analysisData);
        setBestMove(bestMoveData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load team page");
      } finally {
        setLoading(false);
        setAnalysisLoading(false);
        setBestMoveLoading(false);
      }
    }

    loadPageData();
  }, [teamId]);

  if (loading) return <div style={styles.page}>Loading team...</div>;
  if (error) return <div style={styles.page}>Error: {error}</div>;
  if (!team) return <div style={styles.page}>Team not found.</div>;

  return (
    <div style={styles.page}>
      <div style={styles.heroBlock}>
        <h1 style={styles.title}>{team.name}</h1>
        <p style={styles.subtitle}>Region: {team.region ?? "Unknown"}</p>
      </div>

      {analysisLoading ? (
        <div style={styles.card}>Loading roster analysis...</div>
      ) : analysis ? (
        <>
          <div style={styles.summaryGrid}>
            <div
              style={styles.summaryCard}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
            >
              <p style={styles.eyebrow}>ROSTER HEALTH</p>
              <p style={styles.bigText}>{analysis.roster_health_score}</p>
            </div>

            <div
              style={styles.summaryCard}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
            >
              <p style={styles.eyebrow}>STATUS</p>
              <Badge label={analysis.label} type={getStatusBadgeType(analysis.label)} />
            </div>

            <div
              style={styles.summaryCard}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
            >
              <p style={styles.eyebrow}>ROLE STRUCTURE</p>
              <p style={styles.bigText}>{analysis.role_structure.score}</p>
            </div>

            <div
              style={styles.summaryCard}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
            >
              <p style={styles.eyebrow}>AVG STRENGTH</p>
              <p style={styles.bigText}>{analysis.firepower.average_strength}</p>
            </div>
          </div>

          <div style={styles.gridTwo}>
            <div
              style={styles.card}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
            >
              <h3 style={styles.cardTitle}>Role Issues</h3>
              <p>
                Missing Roles:{" "}
                {analysis.role_structure.missing_roles.length
                  ? analysis.role_structure.missing_roles.join(", ")
                  : "None"}
              </p>
              <p>
                Duplicate Roles:{" "}
                {analysis.role_structure.duplicate_roles.length
                  ? analysis.role_structure.duplicate_roles.join(", ")
                  : "None"}
              </p>
            </div>

            <div
              style={styles.card}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
            >
              <h3 style={styles.cardTitle}>Firepower Profile</h3>
              <p>Balance: {analysis.firepower.balance_label}</p>
              <p>Spread: {analysis.firepower.spread}</p>
              <p>Max Strength: {analysis.firepower.max_strength}</p>
              <p>Min Strength: {analysis.firepower.min_strength}</p>
            </div>
          </div>

          <div
            style={styles.card}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
          >
            <h3 style={styles.cardTitle}>Suggested Action</h3>
            <p>{analysis.suggested_action}</p>
          </div>

          <div
            style={styles.card}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
          >
            <h3 style={styles.cardTitle}>Analysis Notes</h3>
            <ul style={styles.list}>
              {analysis.explanations.map((item, idx) => (
                <li key={idx} style={styles.listItem}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      {bestMoveLoading ? (
        <div style={styles.card}>Loading best moves...</div>
      ) : bestMove ? (
        <div
          style={styles.card}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
        >
          <h3 style={styles.cardTitle}>Top Recommended Moves</h3>

          <p style={styles.metaText}>{bestMove.meta.summary_message}</p>
          <p style={styles.metaText}>Moves Evaluated: {bestMove.meta.evaluated_moves}</p>

          {bestMove.meta.best_delta_overall !== null &&
            bestMove.meta.best_delta_overall !== undefined && (
              <p style={styles.metaText}>
                Best Delta Overall: {bestMove.meta.best_delta_overall}
              </p>
            )}

          {bestMove.top_moves.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>
                No upgrade-quality moves are currently recommended for this team.
              </p>
            </div>
          ) : (
            bestMove.top_moves.map((move, index) => (
              <div key={index} style={styles.moveBlock}>
                <div style={styles.moveHeader}>
                  <h4 style={styles.moveTitle}>#{index + 1}</h4>
                  <Badge
                    label={move.projection.summary.verdict}
                    type={getVerdictBadgeType(move.projection.summary.verdict)}
                  />
                </div>

                <p>
                  <strong>Out:</strong> {move.outgoing_player.nickname} (
                  {move.outgoing_player.role ?? "Unknown"})
                </p>
                <p>
                  <strong>In:</strong> {move.incoming_player.nickname} (
                  {move.incoming_player.role ?? "Unknown"})
                </p>
                <p>
                  <strong>Combined Delta:</strong> {move.projection.summary.combined_delta}
                </p>
                <p>
                  <strong>Role Fit:</strong> {move.projection.summary.role_fit_label}
                </p>
                <p>
                  <strong>Strength Change:</strong> {move.projection.summary.strength_change_label}
                </p>
                <p>
                  <strong>Why:</strong>{" "}
                  {move.projection.explanations.length
                    ? move.projection.explanations[0]
                    : "No explanation available."}
                </p>
              </div>
            ))
          )}
        </div>
      ) : null}

      <h2 style={styles.sectionTitle}>Roster</h2>
      <div style={styles.grid}>
        {team.roster.map((player) => (
          <div
            key={player.player_id}
            style={styles.card}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
          >
            <h3 style={styles.playerName}>{player.nickname}</h3>
            <p>Role: {player.role ?? "Unknown"}</p>
            <p>Full name: {player.full_name ?? "Unknown"}</p>
            <p>Nationality: {player.nationality ?? "Unknown"}</p>
            <p>Age: {player.age ?? "Unknown"}</p>
            <p>Strength Score: {player.strength_score ?? "N/A"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "32px",
    color: "#f9fafb",
  },
  heroBlock: {
    marginBottom: "20px",
  },
  title: {
    marginBottom: "8px",
  },
  subtitle: {
    marginBottom: "8px",
    color: "#d1d5db",
  },
  eyebrow: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#94a3b8",
    marginTop: 0,
    marginBottom: "10px",
  },
  sectionTitle: {
    marginTop: "28px",
    marginBottom: "16px",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "16px",
  },
  summaryCard: {
    background: "linear-gradient(145deg, #1f2937, #111827)",
    border: "1px solid #374151",
    borderRadius: "16px",
    padding: "20px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
  },
  bigText: {
    fontSize: "22px",
    fontWeight: 700,
    margin: 0,
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
    marginBottom: "16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  card: {
    background: "linear-gradient(145deg, #1f2937, #111827)",
    border: "1px solid #374151",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "16px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: "12px",
  },
  moveHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  moveBlock: {
    borderTop: "1px solid #374151",
    paddingTop: "14px",
    marginTop: "14px",
  },
  moveTitle: {
    marginTop: 0,
    marginBottom: "10px",
    color: "#93c5fd",
  },
  metaText: {
    color: "#d1d5db",
    marginTop: "8px",
    marginBottom: 0,
  },
  emptyState: {
    marginTop: "16px",
    padding: "16px",
    border: "1px dashed #4b5563",
    borderRadius: "12px",
    background: "#111827",
  },
  emptyText: {
    margin: 0,
    color: "#d1d5db",
  },
  playerName: {
    marginTop: 0,
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