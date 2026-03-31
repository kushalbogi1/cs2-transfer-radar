import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Badge from "../components/Badge";
import { fetchPlayer, fetchPlayerStats, type Player, type PlayerStatsResponse } from "../api/api";

function getRatingType(rating?: number | null): "success" | "warning" | "danger" | "info" | "neutral" {
  if (rating === null || rating === undefined) return "neutral";
  if (rating >= 1.15) return "success";
  if (rating >= 1.05) return "info";
  if (rating >= 0.95) return "warning";
  return "danger";
}

export default function PlayerPage() {
  const { playerId } = useParams();
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlayer() {
      if (!playerId) return;

      try {
        const data = await fetchPlayer(Number(playerId));
        setPlayer(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load player");
      } finally {
        setLoading(false);
      }
    }

    loadPlayer();
  }, [playerId]);

  useEffect(() => {
    async function loadStats() {
      if (!playerId) return;

      try {
        const data = await fetchPlayerStats(Number(playerId));
        setStats(data);
      } catch {
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    }

    loadStats();
  }, [playerId]);

  if (loading) return <div style={styles.page}>Loading player...</div>;
  if (error || !player) return <div style={styles.page}>Error: {error ?? "Player not found"}</div>;

  const latest = stats?.latest_snapshot ?? null;
  const history = stats?.history ?? [];
  const compactHistory = history.slice(0, 5);

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div>
          <div style={styles.heroBadgeRow}>
            <Badge
              label={`Rating ${latest?.rating ?? player.current_rating ?? "N/A"}`}
              type={getRatingType(latest?.rating ?? player.current_rating)}
            />
            <Badge
              label={player.primary_role ?? player.role ?? "Unknown role"}
              type="info"
            />
            {player.secondary_role ? (
              <Badge label={`Secondary ${player.secondary_role}`} type="warning" />
            ) : null}
          </div>

          <h1 style={styles.title}>{player.nickname}</h1>
          <p style={styles.subtitle}>
            {player.team ?? "Free agent / unassigned"} • {player.primary_role ?? player.role ?? "Unknown role"}
            {player.secondary_role ? ` • Secondary: ${player.secondary_role}` : ""}
          </p>
        </div>
      </div>

      <div style={styles.summaryGrid}>
        <div
          style={styles.summaryCard}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
        >
          <p style={styles.eyebrow}>CURRENT RATING</p>
          <p style={styles.bigText}>{latest?.rating ?? player.current_rating ?? "N/A"}</p>
        </div>

        <div
          style={styles.summaryCard}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
        >
          <p style={styles.eyebrow}>PRIMARY ROLE</p>
          <p style={styles.bigText}>{player.primary_role ?? player.role ?? "Unknown"}</p>
        </div>

        <div
          style={styles.summaryCard}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
        >
          <p style={styles.eyebrow}>SECONDARY ROLE</p>
          <p style={styles.bigText}>{player.secondary_role ?? "None"}</p>
        </div>

        <div
          style={styles.summaryCard}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
        >
          <p style={styles.eyebrow}>INTERNAL SCOUTING SCORE</p>
          <p style={styles.bigText}>{player.strength_score ?? "N/A"}</p>
        </div>

        <div
          style={styles.summaryCard}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
        >
          <p style={styles.eyebrow}>TEAM</p>
          <p style={styles.bigTextSmall}>{player.team ?? "Unassigned"}</p>
        </div>

        <div
          style={styles.summaryCard}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
        >
          <p style={styles.eyebrow}>STATUS</p>
          <p style={styles.bigText}>{player.status ?? "Unknown"}</p>
        </div>

        <div
          style={styles.summaryCard}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
        >
          <p style={styles.eyebrow}>NATIONALITY</p>
          <p style={styles.bigTextSmall}>{player.nationality ?? "Unknown"}</p>
        </div>

        <div
          style={styles.summaryCard}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
        >
          <p style={styles.eyebrow}>AGE</p>
          <p style={styles.bigText}>{player.age ?? "Unknown"}</p>
        </div>
      </div>

      <div style={styles.gridTwo}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Current Snapshot</h2>
            {statsLoading ? <Badge label="Loading" type="neutral" /> : <Badge label="Latest" type="info" />}
          </div>

          {latest ? (
            <div style={styles.statsGrid}>
              <p>Rating: {latest.rating ?? "N/A"}</p>
              <p>Impact: {latest.impact ?? "N/A"}</p>
              <p>ADR: {latest.adr ?? "N/A"}</p>
              <p>KAST: {latest.kast ?? "N/A"}</p>
              <p>Maps Played: {latest.maps_played ?? "N/A"}</p>
              <p>Snapshot Date: {latest.snapshot_date ?? "N/A"}</p>
            </div>
          ) : (
            <p>No snapshot stats available yet.</p>
          )}
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Profile</h2>
            <Badge label="Scouting View" type="warning" />
          </div>

          <div style={styles.statsGrid}>
            <p>Nickname: {player.nickname}</p>
            <p>Full Name: {player.full_name ?? "Unknown"}</p>
            <p>Primary Role: {player.primary_role ?? player.role ?? "Unknown"}</p>
            <p>Secondary Role: {player.secondary_role ?? "None"}</p>
            <p>Market Tier: {player.market_value_tier ?? "Unknown"}</p>
            <p>Internal Score: {player.strength_score ?? "N/A"}</p>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Recent Snapshot History</h2>
          <Badge label={`${compactHistory.length} shown`} type="info" />
        </div>

        {compactHistory.length > 0 ? (
          <div style={styles.historyList}>
            {compactHistory.map((item, idx) => (
              <div key={idx} style={styles.historyRow}>
                <div>
                  <p style={styles.historyTitle}>{item.snapshot_date ?? "Unknown date"}</p>
                  <p style={styles.historySubtitle}>
                    Rating {item.rating ?? "N/A"} • Impact {item.impact ?? "N/A"} • ADR {item.adr ?? "N/A"} • KAST{" "}
                    {item.kast ?? "N/A"}
                  </p>
                </div>
                <Badge label={`Maps ${item.maps_played ?? "N/A"}`} type="neutral" />
              </div>
            ))}
          </div>
        ) : (
          <p>No historical snapshots available.</p>
        )}
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
  heroBadgeRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "14px",
  },
  title: {
    marginTop: 0,
    marginBottom: "10px",
    fontSize: "40px",
  },
  subtitle: {
    color: "#d1d5db",
    marginBottom: 0,
    lineHeight: 1.6,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  summaryCard: {
    ...baseCard,
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
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  card: {
    ...baseCard,
    marginBottom: "24px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  cardTitle: {
    margin: 0,
  },
  statsGrid: {
    display: "grid",
    gap: "8px",
    color: "#e5e7eb",
  },
  historyList: {
    display: "grid",
    gap: "12px",
  },
  historyRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    paddingBottom: "12px",
    borderBottom: "1px solid #374151",
    flexWrap: "wrap",
  },
  historyTitle: {
    margin: 0,
    fontWeight: 700,
  },
  historySubtitle: {
    margin: "6px 0 0 0",
    color: "#d1d5db",
    fontSize: "14px",
    lineHeight: 1.5,
  },
};