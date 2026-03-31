import { Link } from "react-router-dom";
import type { Team } from "../api/api";

type Props = {
  team: Team;
};

export default function TeamCard({ team }: Props) {
  return (
    <Link to={`/teams/${team.id}`} style={styles.link}>
      <div
        style={styles.card}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
      >
        <div style={styles.headerRow}>
          <div>
            <p style={styles.rank}>#{team.rank ?? "-"}</p>
            <h3 style={styles.title}>{team.name}</h3>
          </div>
          <div style={styles.badge}>
            {team.competitive_tier ? `Tier ${team.competitive_tier}` : "Unrated"}
          </div>
        </div>

        <p style={styles.meta}>Region: {team.region ?? "Unknown"}</p>
        <p style={styles.meta}>
          Avg Strength: {team.average_strength ?? "N/A"}
        </p>
        <p style={styles.meta}>
          Active Players: {team.active_player_count ?? team.active_players?.length ?? 0}
        </p>

        <div style={styles.playersBlock}>
          <p style={styles.playersLabel}>Roster</p>
          <p style={styles.playersText}>
            {team.active_players && team.active_players.length > 0
              ? team.active_players.join(", ")
              : "No active roster available"}
          </p>
        </div>
      </div>
    </Link>
  );
}

const styles: Record<string, React.CSSProperties> = {
  link: {
    textDecoration: "none",
    color: "inherit",
  },
  card: {
    background: "linear-gradient(145deg, #1f2937, #111827)",
    border: "1px solid #374151",
    borderRadius: "16px",
    padding: "20px",
    color: "#f9fafb",
    minHeight: "190px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
  },
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "10px",
  },
  rank: {
    margin: "0 0 6px 0",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#93c5fd",
  },
  title: {
    margin: "0 0 10px 0",
    fontSize: "20px",
  },
  badge: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#e5e7eb",
    background: "#1e293b",
    border: "1px solid #475569",
    borderRadius: "999px",
    padding: "6px 10px",
    whiteSpace: "nowrap",
  },
  meta: {
    margin: "4px 0",
    color: "#d1d5db",
  },
  playersBlock: {
    marginTop: "14px",
    paddingTop: "12px",
    borderTop: "1px solid #374151",
  },
  playersLabel: {
    margin: "0 0 6px 0",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#94a3b8",
  },
  playersText: {
    margin: 0,
    color: "#e5e7eb",
    lineHeight: 1.5,
    fontSize: "14px",
  },
};