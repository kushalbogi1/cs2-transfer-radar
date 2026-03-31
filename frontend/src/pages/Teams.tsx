import { useEffect, useMemo, useState } from "react";
import { fetchTeams, type Team } from "../api/api";
import TeamCard from "../components/TeamCard";

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [limit, setLimit] = useState<"5" | "10" | "20" | "all">("20");
  const [search, setSearch] = useState("");

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

  const visibleTeams = useMemo(() => {
    // Important fix:
    // First define the ranking slice, then search inside it.
    const basePool = limit === "all" ? teams : teams.slice(0, Number(limit));

    if (!search.trim()) return basePool;

    const q = search.trim().toLowerCase();
    return basePool.filter((team) => {
      const rosterText = (team.active_players ?? []).join(" ").toLowerCase();
      return (
        team.name?.toLowerCase().includes(q) ||
        team.region?.toLowerCase().includes(q) ||
        team.competitive_tier?.toLowerCase().includes(q) ||
        rosterText.includes(q)
      );
    });
  }, [teams, limit, search]);

  if (loading) return <div style={styles.page}>Loading teams...</div>;
  if (error) return <div style={styles.page}>Error: {error}</div>;

  return (
    <div style={styles.page}>
      <div style={styles.heroBlock}>
        <h1 style={styles.title}>Teams</h1>
        <p style={styles.subtitle}>
          Ranked by average active-roster strength, with current core players visible at a glance.
        </p>
      </div>

      <div style={styles.filters}>
        <div style={styles.filterGroupWide}>
          <label style={styles.label}>Search</label>
          <input
            style={styles.input}
            type="text"
            placeholder="Search team, region, tier, or player nickname..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Show</label>
          <select
            style={styles.select}
            value={limit}
            onChange={(e) => setLimit(e.target.value as "5" | "10" | "20" | "all")}
          >
            <option value="5">Top 5</option>
            <option value="10">Top 10</option>
            <option value="20">Top 20</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <div style={styles.resultMeta}>
        Showing {visibleTeams.length} team{visibleTeams.length === 1 ? "" : "s"} from{" "}
        {limit === "all" ? "the full ranking" : `the top ${limit}`}
      </div>

      <div style={styles.grid}>
        {visibleTeams.map((team) => (
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
  heroBlock: {
    marginBottom: "24px",
  },
  title: {
    marginBottom: "8px",
  },
  subtitle: {
    color: "#d1d5db",
    marginBottom: 0,
    maxWidth: "900px",
    lineHeight: 1.6,
  },
  filters: {
    display: "grid",
    gridTemplateColumns: "minmax(260px, 1.5fr) minmax(150px, 220px)",
    gap: "16px",
    alignItems: "end",
    marginBottom: "18px",
  },
  filterGroup: {
    display: "grid",
    gap: "8px",
  },
  filterGroupWide: {
    display: "grid",
    gap: "8px",
  },
  label: {
    fontWeight: 700,
    color: "#e5e7eb",
  },
  input: {
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #4b5563",
    background: "#0f172a",
    color: "#f9fafb",
    width: "100%",
  },
  select: {
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #4b5563",
    background: "#0f172a",
    color: "#f9fafb",
    minWidth: "150px",
  },
  resultMeta: {
    color: "#d1d5db",
    marginBottom: "16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "18px",
  },
};