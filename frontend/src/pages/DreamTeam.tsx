import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../components/Badge";
import { fetchPlayers, runDreamTeam, type DreamTeamResponse, type Player } from "../api/api";

function getScoreType(score?: number | null): "success" | "warning" | "danger" | "info" | "neutral" {
  if (score === null || score === undefined) return "neutral";
  if (score >= 85) return "success";
  if (score >= 70) return "warning";
  return "danger";
}

function getRatingType(rating?: number | null): "success" | "warning" | "danger" | "info" | "neutral" {
  if (rating === null || rating === undefined) return "neutral";
  if (rating >= 1.15) return "success";
  if (rating >= 1.05) return "info";
  if (rating >= 0.95) return "warning";
  return "danger";
}

type PoolFilter = "current" | "inactive" | "retired" | "all";

export default function DreamTeam() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [result, setResult] = useState<DreamTeamResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [poolFilter, setPoolFilter] = useState<PoolFilter>("current");
  const [limit, setLimit] = useState<"5" | "10" | "20" | "all">("20");
  const [sortBy, setSortBy] = useState<"rating" | "strength" | "role">("rating");

  useEffect(() => {
    async function loadPlayers() {
      try {
        const data = await fetchPlayers();
        setPlayers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch players");
      } finally {
        setLoading(false);
      }
    }

    loadPlayers();
  }, []);

  const selectedPlayers = useMemo(
    () => players.filter((player) => selectedIds.includes(player.id)),
    [players, selectedIds]
  );

  const availablePlayers = useMemo(() => {
    let filtered = players.filter((player) => !selectedIds.includes(player.id));

    filtered = filtered.filter((player) => {
      const status = (player.status ?? "").toLowerCase();

      if (poolFilter === "current") {
        return status === "active" || status === "bench" || status === "free_agent";
      }

      if (poolFilter === "inactive") {
        return status === "inactive";
      }

      if (poolFilter === "retired") {
        return status === "retired";
      }

      return true;
    });

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
          player.nationality?.toLowerCase().includes(q) ||
          player.status?.toLowerCase().includes(q)
        );
      });
    }

    filtered.sort((a, b) => {
      if (sortBy === "role") {
        const roleA = (a.primary_role ?? a.role ?? "").toLowerCase();
        const roleB = (b.primary_role ?? b.role ?? "").toLowerCase();
        if (roleA !== roleB) return roleA.localeCompare(roleB);

        const ratingA = a.current_rating ?? -1;
        const ratingB = b.current_rating ?? -1;
        if (ratingA !== ratingB) return ratingB - ratingA;

        return (a.nickname ?? "").localeCompare(b.nickname ?? "");
      }

      if (sortBy === "strength") {
        const scoreA = a.strength_score ?? -1;
        const scoreB = b.strength_score ?? -1;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return (a.nickname ?? "").localeCompare(b.nickname ?? "");
      }

      const ratingA = a.current_rating ?? -1;
      const ratingB = b.current_rating ?? -1;
      if (ratingA !== ratingB) return ratingB - ratingA;
      return (a.nickname ?? "").localeCompare(b.nickname ?? "");
    });

    if (limit === "all") return filtered;
    return filtered.slice(0, Number(limit));
  }, [players, selectedIds, roleFilter, poolFilter, search, sortBy, limit]);

  function togglePlayer(playerId: number) {
    setResult(null);
    setError(null);

    setSelectedIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, playerId];
    });
  }

  async function handleAnalyze() {
    if (selectedIds.length !== 5) {
      setError("Please select exactly 5 players.");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const data = await runDreamTeam({ player_ids: selectedIds });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze dream team");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) return <div style={styles.page}>Loading dream team builder...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.heroBlock}>
        <h1 style={styles.title}>Dream Team</h1>
        <p style={styles.subtitle}>
          Pick five players, analyze the lineup, and compare role balance with player quality.
        </p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.panel}>
        <div style={styles.summaryRow}>
          <Badge label={`Selected ${selectedIds.length}/5`} type={selectedIds.length === 5 ? "success" : "info"} />
          <button style={styles.button} onClick={handleAnalyze} disabled={analyzing || selectedIds.length !== 5}>
            {analyzing ? "Analyzing..." : "Analyze Dream Team"}
          </button>
        </div>
      </div>

      <div style={styles.sectionBlock}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Selected Players</h2>
          <p style={styles.sectionSubtitle}>Click a card to remove a player. Use the link to open the player page.</p>
        </div>

        {selectedPlayers.length === 0 ? (
          <div style={styles.card}>No players selected yet.</div>
        ) : (
          <div style={styles.grid}>
            {selectedPlayers.map((player) => (
              <div
                key={player.id}
                style={styles.card}
                onClick={() => togglePlayer(player.id)}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
              >
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{player.nickname}</h3>
                  <Badge
                    label={`Rating ${player.current_rating ?? "N/A"}`}
                    type={getRatingType(player.current_rating)}
                  />
                </div>
                <p>Primary Role: {player.primary_role ?? player.role ?? "Unknown"}</p>
                <p>Secondary Role: {player.secondary_role ?? "None"}</p>
                <p>Team: {player.team ?? "Free agent / unassigned"}</p>
                <p>Status: {player.status ?? "Unknown"}</p>
                <div style={styles.linkRow}>
                  <Link
                    to={`/players/${player.id}`}
                    style={styles.inlineLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open player
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.sectionBlock}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Available Players</h2>
          <p style={styles.sectionSubtitle}>
            Search, filter, and sort the player pool before building your lineup.
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
            <label style={styles.label}>Pool</label>
            <select
              style={styles.select}
              value={poolFilter}
              onChange={(e) => setPoolFilter(e.target.value as PoolFilter)}
            >
              <option value="current">Current players</option>
              <option value="inactive">Inactive players</option>
              <option value="retired">Retired players</option>
              <option value="all">All players</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Role</label>
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

          <div style={styles.filterGroup}>
            <label style={styles.label}>Sort By</label>
            <select
              style={styles.select}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "rating" | "strength" | "role")}
            >
              <option value="rating">Rating</option>
              <option value="strength">Internal Score</option>
              <option value="role">Role</option>
            </select>
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
          Available players shown: {availablePlayers.length}
        </div>

        <div style={styles.grid}>
          {availablePlayers.map((player) => {
            const isSelected = selectedIds.includes(player.id);

            return (
              <div
                key={player.id}
                style={{
                  ...styles.playerButton,
                  ...(isSelected ? styles.playerButtonSelected : {}),
                }}
                onClick={() => togglePlayer(player.id)}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
              >
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{player.nickname}</h3>
                  <Badge
                    label={isSelected ? "Selected" : `Rating ${player.current_rating ?? "N/A"}`}
                    type={isSelected ? "success" : getRatingType(player.current_rating)}
                  />
                </div>
                <p>Primary Role: {player.primary_role ?? player.role ?? "Unknown"}</p>
                <p>Secondary Role: {player.secondary_role ?? "None"}</p>
                <p>Team: {player.team ?? "Free agent / unassigned"}</p>
                <p>Status: {player.status ?? "Unknown"}</p>
                <div style={styles.linkRow}>
                  <Link
                    to={`/players/${player.id}`}
                    style={styles.inlineLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open player
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {result && (
        <div style={styles.sectionBlock}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Dream Team Result</h2>
            <Badge label={`${result.combined_score}`} type={getScoreType(result.combined_score)} />
          </div>

          <div style={styles.gridTwo}>
            <div style={styles.card}>
              <p style={styles.eyebrow}>COMBINED SCORE</p>
              <p style={styles.bigText}>{result.combined_score}</p>
            </div>

            <div style={styles.card}>
              <p style={styles.eyebrow}>ROLE BALANCE</p>
              <p style={styles.bigText}>{result.role_balance.score}</p>
              <p style={styles.smallText}>{result.role_balance.label}</p>
            </div>

            <div style={styles.card}>
              <p style={styles.eyebrow}>STRENGTH SCORE</p>
              <p style={styles.bigText}>{result.strength.score}</p>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Role Summary</h3>
            <p>
              Missing Roles:{" "}
              {result.role_balance.missing_roles.length
                ? result.role_balance.missing_roles.join(", ")
                : "None"}
            </p>
            <p>
              Duplicate Roles:{" "}
              {result.role_balance.duplicate_roles.length
                ? result.role_balance.duplicate_roles.join(", ")
                : "None"}
            </p>
          </div>
        </div>
      )}
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
  title: {
    marginBottom: "8px",
  },
  subtitle: {
    color: "#d1d5db",
    marginBottom: 0,
    maxWidth: "900px",
    lineHeight: 1.6,
  },
  panel: {
    ...baseCard,
    marginBottom: "24px",
  },
  summaryRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  button: {
    padding: "12px 16px",
    borderRadius: "12px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  error: {
    background: "#7f1d1d",
    border: "1px solid #b91c1c",
    color: "#fecaca",
    padding: "12px 14px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
  sectionBlock: {
    marginBottom: "28px",
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
  filters: {
    display: "grid",
    gridTemplateColumns: "minmax(260px, 1.5fr) repeat(4, minmax(140px, 180px))",
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
    minWidth: "140px",
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
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "16px",
  },
  card: {
    ...baseCard,
  },
  playerButton: {
    ...baseCard,
    cursor: "pointer",
  },
  playerButtonSelected: {
    border: "1px solid #22c55e",
    boxShadow: "0 0 0 1px rgba(34,197,94,0.4), 0 4px 20px rgba(0,0,0,0.25)",
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
  linkRow: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    marginTop: "12px",
  },
  inlineLink: {
    color: "#93c5fd",
    textDecoration: "none",
    fontWeight: 600,
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
  smallText: {
    color: "#d1d5db",
    marginTop: "8px",
    marginBottom: 0,
  },
};