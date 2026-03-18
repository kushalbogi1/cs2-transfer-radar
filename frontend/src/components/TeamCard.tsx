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
        <h3 style={styles.title}>{team.name}</h3>
        <p style={styles.meta}>Region: {team.region ?? "Unknown"}</p>
        <p style={styles.meta}>Tracked: {team.is_tracked ? "Yes" : "No"}</p>
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
    minHeight: "120px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
  },
  title: {
    margin: "0 0 10px 0",
    fontSize: "20px",
  },
  meta: {
    margin: "4px 0",
    color: "#d1d5db",
  },
};