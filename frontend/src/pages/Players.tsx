import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../components/Badge";
import { fetchPlayers, type Player } from "../api/api";

function getStrengthType(score?: number | null): "success" | "warning" | "danger" | "info" | "neutral" {
  if (score === null || score === undefined) return "neutral";
  if (score >= 75) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlayers() {
      try {
        const data = await fetchPlayers();
        setPlayers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadPlayers();
  }, []);

  if (loading) return <div style={styles.page}>Loading players...</div>;
  if (error) return <div style={styles.page}>Error: {error}</div>;

  return (
    <div style={styles.page}>
      <div style={styles.heroBlock}>
        <h1 style={styles.title}>Players</h1>
        <p style={styles.subtitle}>
          Browse player profiles, stat-derived strength scores, roles, and current team context.
        </p>
      </div>

      <div style={styles.grid}>
        {players.map((player) => (
          <Link key={player.id} to={`/players/${player.id}`} style={styles.linkCard}>
            <div
              style={styles.card}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
            >
              <div style={styles.cardHeader}>
                <h3 style={styles.name}>{player.nickname}</h3>
                <Badge
                  label={`Strength ${player.strength_score ?? "N/A"}`}
                  type={getStrengthType(player.strength_score)}
                />
              </div>

              <p>Role: {player.role ?? "Unknown"}</p>
              <p>Team: {player.team ?? "Free agent / unassigned"}</p>
              <p>Nationality: {player.nationality ?? "Unknown"}</p>
              <p>Age: {player.age ?? "Unknown"}</p>
            </div>
          </Link>
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
    marginBottom: "24px",
  },
  title: {
    marginBottom: "8px",
  },
  subtitle: {
    color: "#d1d5db",
    marginBottom: 0,
    maxWidth: "820px",
    lineHeight: 1.6,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },
  linkCard: {
    textDecoration: "none",
    color: "inherit",
  },
  card: {
    background: "linear-gradient(145deg, #1f2937, #111827)",
    border: "1px solid #374151",
    borderRadius: "16px",
    padding: "20px",
    minHeight: "180px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "12px",
    flexWrap: "wrap",
  },
  name: {
    margin: 0,
  },
};