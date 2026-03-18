import { useEffect, useState } from "react";
import { fetchTeams, type Team } from "../api/api";
import TeamCard from "../components/TeamCard";

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTeams() {
      try {
        const data = await fetchTeams();
        setTeams(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadTeams();
  }, []);

  if (loading) return <div style={styles.page}>Loading teams...</div>;
  if (error) return <div style={styles.page}>Error: {error}</div>;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Teams</h1>
      <div style={styles.grid}>
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
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
  title: {
    marginBottom: "20px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "18px",
  },
};