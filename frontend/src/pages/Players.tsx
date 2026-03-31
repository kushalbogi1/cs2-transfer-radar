import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../components/Badge";
import { fetchPlayers, type Player } from "../api/api";

function getRatingType(rating?: number | null): "success" | "warning" | "danger" | "info" | "neutral" {
  if (rating === null || rating === undefined) return "neutral";
  if (rating >= 1.15) return "success";
  if (rating >= 1.05) return "info";
  if (rating >= 0.95) return "warning";
  return "danger";
}

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [limit, setLimit] = useState<"5" | "10" | "20" | "all">("20");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

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

  const visiblePlayers = useMemo(() => {
    let filtered = players;

    if (roleFilter !== "all") {
      filtered = filtered.filter(
        (player) =>
          player.primary_role === roleFilter ||
          player.role === roleFilter ||
          player.secondary_role === roleFilter
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((player) => {
        return (
          player.nickname?.toLowerCase().includes(q) ||
          player.team?.toLowerCase().includes(q) ||
          player.primary_role?.toLowerCase().includes(q) ||
          player.secondary_role?.toLowerCase().includes(q) ||
          player.nationality?.toLowerCase().includes(q)
        );
      });
    }

    if (limit === "all") return filtered;
    return filtered.slice(0, Number(limit));
  }, [players, limit, roleFilter, search]);

  if (loading) return <div style={styles.page}>Loading players...</div>;
  if (error) return <div style={styles.page}>Error: {error}</div>;

  return (
    <div style={styles.page}>
      <div style={styles.heroBlock}>
        <h1 style={styles.title}>Players</h1>
        <p style={styles.subtitle}>
          Ranked by current rating, with primary and secondary roles visible for faster scouting.
        </p>
      </div>

      <div style={styles.filters}>
        <div style={styles.filterGroupWide}>
          <label style={styles.label}>Search</label>
          <input
            style={styles.input}
            type="text"
            placeholder="Search player, team, role, nationality..."
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

        <div style={styles.filterGroup}>
          <label style={styles.label}>Role Filter</label>
          <select
            style={styles.select}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All roles</option>
            <option value="IGL">IGL</option>
            <option value="AWPer">AWPer</option>
            <option value="Entry">Entry</option>
            <option value="Support">Support</option>
            <option value="Lurker">Lurker</option>
          </select>
        </div>
      </div>

      <div style={styles.resultMeta}>
        Showing {visiblePlayers.length} player{visiblePlayers.length === 1 ? "" : "s"}
      </div>

      <div style={styles.grid}>
        {visiblePlayers.map((player) => (
          <Link key={player.id} to={`/players/${player.id}`} style={styles.linkCard}>
            <div
              style={styles.card}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
            >
              <div style={styles.cardHeader}>
                <div>
                  <p style={styles.rank}>#{player.rank ?? "-"}</p>
                  <h3 style={styles.name}>{player.nickname}</h3>
                </div>
                <Badge
                  label={`Rating ${player.current_rating ?? "N/A"}`}
                  type={getRatingType(player.current_rating)}
                />
              </div>

              <p>Primary Role: {player.primary_role ?? player.role ?? "Unknown"}</p>
              <p>Secondary Role: {player.secondary_role ?? "None"}</p>
              <p>Team: {player.team ?? "Free agent / unassigned"}</p>
              <p>Status: {player.status ?? "Unknown"}</p>
              <p>Rating: {player.current_rating ?? "N/A"}</p>
              <p>Internal Score: {player.strength_score ?? "N/A"}</p>
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
  filters: {
    display: "grid",
    gridTemplateColumns: "minmax(260px, 1.5fr) repeat(2, minmax(150px, 200px))",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
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
    transition: "all 0.2s ease",
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "10px",
    flexWrap: "wrap",
  },
  rank: {
    margin: "0 0 6px 0",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#93c5fd",
  },
  name: {
    marginTop: 0,
    marginBottom: "10px",
  },
};