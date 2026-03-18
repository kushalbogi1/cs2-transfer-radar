import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Badge from "../components/Badge";
import { fetchPlayer, fetchPlayerStats, type Player, type PlayerStatsResponse } from "../api/api";

function getStrengthType(score?: number | null): "success" | "warning" | "danger" | "info" | "neutral" {
  if (score === null || score === undefined) return "neutral";
  if (score >= 75) return "success";
  if (score >= 60) return "warning";
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
    async function loadPlayerPage() {
      if (!playerId) {
        setError("Missing player id.");
        setLoading(false);
        setStatsLoading(false);
        return;
      }

      try {
        const numericPlayerId = Number(playerId);

        const [playerData, statsData] = await Promise.all([
          fetchPlayer(numericPlayerId),
          fetchPlayerStats(numericPlayerId),
        ]);

        setPlayer(playerData);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load player page");
      } finally {
        setLoading(false);
        setStatsLoading(false);
      }
    }

    loadPlayerPage();
  }, [playerId]);

  if (loading) return <div style={styles.page}>Loading player...</div>;
  if (error) return <div style={styles.page}>Error: {error}</div>;
  if (!player) return <div style={styles.page}>Player not found.</div>;

  return (
    <div style={styles.page}>
      <div style={styles.heroBlock}>
        <div style={styles.heroHeader}>
          <div>
            <h1 style={styles.title}>{player.nickname}</h1>
            <p style={styles.subtitle}>
              {player.team ?? "Free agent / unassigned"} • {player.role ?? "Unknown role"}
            </p>
          </div>
          <Badge
            label={`Strength ${player.strength_score ?? "N/A"}`}
            type={getStrengthType(player.strength_score)}
          />
        </div>
      </div>

      <div style={styles.summaryGrid}>
        <div
          style={styles.summaryCard}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
        >
          <p style={styles.eyebrow}>STRENGTH SCORE</p>
          <p style={styles.bigText}>{player.strength_score ?? "N/A"}</p>
        </div>

        <div
          style={styles.summaryCard}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
        >
          <p style={styles.eyebrow}>NATIONALITY</p>
          <p style={styles.bigText}>{player.nationality ?? "Unknown"}</p>
        </div>

        <div
          style={styles.summaryCard}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
        >
          <p style={styles.eyebrow}>AGE</p>
          <p style={styles.bigText}>{player.age ?? "Unknown"}</p>
        </div>

        <div
          style={styles.summaryCard}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
        >
          <p style={styles.eyebrow}>ROLE</p>
          <p style={styles.bigText}>{player.role ?? "Unknown"}</p>
        </div>
      </div>

      {statsLoading ? (
        <div style={styles.card}>Loading stats...</div>
      ) : stats ? (
        <>
          <div
            style={styles.card}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
          >
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Latest Snapshot</h2>
              {stats.latest_snapshot ? (
                <Badge label={stats.latest_snapshot.snapshot_date} type="info" />
              ) : null}
            </div>

            {stats.latest_snapshot ? (
              <div style={styles.gridTwo}>
                <div>
                  <p><strong>Source:</strong> {stats.latest_snapshot.source}</p>
                  <p><strong>Date:</strong> {stats.latest_snapshot.snapshot_date}</p>
                  <p><strong>Rating:</strong> {stats.latest_snapshot.rating ?? "N/A"}</p>
                </div>

                <div>
                  <p><strong>Impact:</strong> {stats.latest_snapshot.impact ?? "N/A"}</p>
                  <p><strong>ADR:</strong> {stats.latest_snapshot.adr ?? "N/A"}</p>
                  <p><strong>KAST:</strong> {stats.latest_snapshot.kast ?? "N/A"}</p>
                  <p><strong>Maps Played:</strong> {stats.latest_snapshot.maps_played ?? "N/A"}</p>
                </div>
              </div>
            ) : (
              <p>No snapshots available.</p>
            )}
          </div>

          <div
            style={styles.card}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
          >
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Snapshot History</h2>
              <Badge label={`${stats.snapshot_count} snapshot(s)`} type="neutral" />
            </div>

            {stats.snapshots.length === 0 ? (
              <p>No historical snapshots found.</p>
            ) : (
              <div style={styles.historyList}>
                {stats.snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    style={styles.historyCard}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
                  >
                    <div style={styles.historyHeader}>
                      <strong>{snapshot.snapshot_date}</strong>
                      <Badge label={snapshot.source} type="info" />
                    </div>
                    <p><strong>Rating:</strong> {snapshot.rating ?? "N/A"}</p>
                    <p><strong>Impact:</strong> {snapshot.impact ?? "N/A"}</p>
                    <p><strong>ADR:</strong> {snapshot.adr ?? "N/A"}</p>
                    <p><strong>KAST:</strong> {snapshot.kast ?? "N/A"}</p>
                    <p><strong>Maps:</strong> {snapshot.maps_played ?? "N/A"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
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
  heroBlock: {
    marginBottom: "24px",
  },
  heroHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
  },
  title: {
    marginBottom: "8px",
  },
  subtitle: {
    color: "#d1d5db",
    marginBottom: 0,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
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
  card: {
    ...baseCard,
    marginBottom: "16px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "12px",
    flexWrap: "wrap",
  },
  cardTitle: {
    margin: 0,
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
  },
  historyList: {
    display: "grid",
    gap: "12px",
  },
  historyCard: {
    border: "1px solid #374151",
    borderRadius: "16px",
    padding: "16px",
    background: "linear-gradient(145deg, #111827, #0f172a)",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
  },
  historyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "10px",
    flexWrap: "wrap",
  },
};