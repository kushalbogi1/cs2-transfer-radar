import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchPlayers, fetchTeams, type Player, type Team } from "../api/api";

type SearchResult =
  | { type: "team"; id: number; label: string; sublabel?: string }
  | { type: "player"; id: number; label: string; sublabel?: string }
  | { type: "route"; path: string; label: string; sublabel?: string };

const QUICK_ROUTES: Array<{ keywords: string[]; path: string; label: string; sublabel: string }> = [
  {
    keywords: ["simulator", "simulate", "swap"],
    path: "/simulator",
    label: "Roster Simulator",
    sublabel: "Run and compare roster swaps",
  },
  {
    keywords: ["dream", "dream team"],
    path: "/dream-team",
    label: "Dream Team",
    sublabel: "Build your ideal lineup",
  },
  {
    keywords: ["battle", "transfer battle", "compare"],
    path: "/transfer-battle",
    label: "Transfer Battle",
    sublabel: "Compare two moves side by side",
  },
  {
    keywords: ["teams", "team rankings"],
    path: "/teams",
    label: "Teams",
    sublabel: "Browse ranked teams",
  },
  {
    keywords: ["players", "player rankings"],
    path: "/players",
    label: "Players",
    sublabel: "Browse ranked players",
  },
  {
  keywords: ["predictions", "prediction", "points"],
  path: "/predictions",
  label: "Predictions",
  sublabel: "Track prediction points and streak",
},
];

export default function NavBar() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function loadSearchData() {
      try {
        const [teamsData, playersData] = await Promise.all([fetchTeams(), fetchPlayers()]);
        setTeams(teamsData);
        setPlayers(playersData);
      } catch {
        // keep navbar usable even if search preload fails
      }
    }

    loadSearchData();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const routeMatches: SearchResult[] = QUICK_ROUTES
      .filter((route) => route.keywords.some((k) => k.includes(q) || q.includes(k)))
      .slice(0, 3)
      .map((route) => ({
        type: "route",
        path: route.path,
        label: route.label,
        sublabel: route.sublabel,
      }));

    const teamMatches: SearchResult[] = teams
      .filter((team) => {
        const rosterText = (team.active_players ?? []).join(" ").toLowerCase();
        return (
          team.name?.toLowerCase().includes(q) ||
          team.region?.toLowerCase().includes(q) ||
          team.competitive_tier?.toLowerCase().includes(q) ||
          rosterText.includes(q)
        );
      })
      .slice(0, 5)
      .map((team) => ({
        type: "team",
        id: team.id,
        label: team.name,
        sublabel: `${team.region ?? "Unknown"}${team.rank ? ` • #${team.rank}` : ""}`,
      }));

    const playerMatches: SearchResult[] = players
      .filter((player) => {
        return (
          player.nickname?.toLowerCase().includes(q) ||
          player.team?.toLowerCase().includes(q) ||
          player.primary_role?.toLowerCase().includes(q) ||
          player.secondary_role?.toLowerCase().includes(q) ||
          player.nationality?.toLowerCase().includes(q)
        );
      })
      .slice(0, 5)
      .map((player) => ({
        type: "player",
        id: player.id,
        label: player.nickname,
        sublabel: `${player.team ?? "No team"} • ${player.primary_role ?? player.role ?? "Unknown"}`,
      }));

    return [...routeMatches, ...teamMatches, ...playerMatches].slice(0, 8);
  }, [query, teams, players]);

  function handleSelect(result: SearchResult) {
    setOpen(false);
    setQuery("");

    if (result.type === "route") {
      navigate(result.path);
      return;
    }

    if (result.type === "team") {
      navigate(`/teams/${result.id}`);
      return;
    }

    navigate(`/players/${result.id}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const q = query.trim().toLowerCase();
    if (!q) return;

    if (results.length > 0) {
      handleSelect(results[0]);
      return;
    }

    navigate("/players");
    setOpen(false);
    setQuery("");
  }

  return (
    <div style={styles.navWrap}>
      <nav style={styles.nav}>
        <div style={styles.left}>
          <Link to="/" style={styles.brand}>
            CS2 Transfer Radar
          </Link>

          <div style={styles.links}>
            <Link to="/teams" style={styles.link}>Teams</Link>
            <Link to="/players" style={styles.link}>Players</Link>
            <Link to="/simulator" style={styles.link}>Simulator</Link>
            <Link to="/dream-team" style={styles.link}>Dream Team</Link>
            <Link to="/transfer-battle" style={styles.link}>Transfer Battle</Link>
            <Link to="/predictions" style={styles.link}>Predictions</Link>
          </div>
        </div>

        <div style={styles.searchWrap} ref={containerRef}>
          <form onSubmit={handleSubmit} style={styles.searchForm}>
            <input
              style={styles.searchInput}
              type="text"
              placeholder="Search teams, players, simulator..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
            />
            <button type="submit" style={styles.searchButton}>
              Search
            </button>
          </form>

          {open && query.trim() && (
            <div style={styles.dropdown}>
              {results.length > 0 ? (
                results.map((result, idx) => (
                  <button
                    key={`${result.type}-${idx}-${result.label}`}
                    style={styles.resultButton}
                    onClick={() => handleSelect(result)}
                  >
                    <div>
                      <p style={styles.resultLabel}>{result.label}</p>
                      <p style={styles.resultSubLabel}>
                        {result.type === "route"
                          ? `Page • ${result.sublabel ?? ""}`
                          : `${result.type === "team" ? "Team" : "Player"} • ${result.sublabel ?? ""}`}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div style={styles.emptyState}>No matches found.</div>
              )}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  navWrap: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "rgba(3, 7, 18, 0.9)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid #1f2937",
  },
  nav: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "14px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    color: "#f9fafb",
    flexWrap: "wrap",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },
  brand: {
    color: "#f9fafb",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: "18px",
  },
  links: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
  },
  link: {
    color: "#d1d5db",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "14px",
  },
  searchWrap: {
    position: "relative",
    minWidth: "320px",
    flex: "1 1 360px",
    maxWidth: "460px",
  },
  searchForm: {
    display: "flex",
    gap: "8px",
  },
  searchInput: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #374151",
    background: "#0f172a",
    color: "#f9fafb",
  },
  searchButton: {
    padding: "10px 14px",
    borderRadius: "12px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    right: 0,
    background: "#111827",
    border: "1px solid #374151",
    borderRadius: "14px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
    overflow: "hidden",
  },
  resultButton: {
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    color: "#f9fafb",
    padding: "12px 14px",
    cursor: "pointer",
    borderBottom: "1px solid #1f2937",
  },
  resultLabel: {
    margin: 0,
    fontWeight: 700,
  },
  resultSubLabel: {
    margin: "4px 0 0 0",
    color: "#9ca3af",
    fontSize: "13px",
  },
  emptyState: {
    padding: "14px",
    color: "#9ca3af",
  },
};