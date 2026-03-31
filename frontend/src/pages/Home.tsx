import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import Badge from "../components/Badge";
import {
  fetchDashboardOverview,
  fetchPlayers,
  fetchTeams,
  type DashboardOverview,
  type Player,
  type Team,
} from "../api/api";

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
];

export default function Home() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickSearch, setQuickSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [overviewData, teamsData, playersData] = await Promise.all([
          fetchDashboardOverview(),
          fetchTeams(),
          fetchPlayers(),
        ]);
        setOverview(overviewData);
        setTeams(teamsData);
        setPlayers(playersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
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
      .slice(0, 4)
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
      .slice(0, 4)
      .map((player) => ({
        type: "player",
        id: player.id,
        label: player.nickname,
        sublabel: `${player.team ?? "No team"} • ${player.primary_role ?? player.role ?? "Unknown"}`,
      }));

    return [...routeMatches, ...teamMatches, ...playerMatches].slice(0, 8);
  }, [quickSearch, teams, players]);

  function handleSelect(result: SearchResult) {
    setSearchOpen(false);
    setQuickSearch("");

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

  function handleQuickSearch() {
    const q = quickSearch.trim().toLowerCase();
    if (!q) return;

    if (searchResults.length > 0) {
      handleSelect(searchResults[0]);
      return;
    }

    navigate("/players");
    setSearchOpen(false);
    setQuickSearch("");
  }

  if (loading) return <div style={styles.page}>Loading dashboard...</div>;
  if (error) return <div style={styles.page}>Error: {error}</div>;

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroMain}>
          <Badge label="CS2 Transfer Intelligence" type="info" />
          <h1 style={styles.heroTitle}>CS2 Transfer Radar</h1>
          <p style={styles.heroSubtitle}>
            Explore roster changes, compare realistic transfers, build dream teams,
            and analyze where teams are strongest, weakest, or most unstable.
          </p>

          <div style={styles.searchBlock} ref={searchRef}>
            <label style={styles.searchLabel}>Quick Search</label>
            <div style={styles.searchRow}>
              <input
                style={styles.searchInput}
                type="text"
                placeholder="Search players, teams, simulator, battle..."
                value={quickSearch}
                onChange={(e) => {
                  setQuickSearch(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleQuickSearch();
                }}
              />
              <button style={styles.searchButton} onClick={handleQuickSearch}>
                Go
              </button>
            </div>

            {searchOpen && quickSearch.trim() && (
              <div style={styles.dropdown}>
                {searchResults.length > 0 ? (
                  searchResults.map((result, idx) => (
                    <button
                      key={`${result.type}-${idx}-${result.label}`}
                      style={styles.resultButton}
                      onClick={() => handleSelect(result)}
                    >
                      <p style={styles.resultLabel}>{result.label}</p>
                      <p style={styles.resultSubLabel}>
                        {result.type === "route"
                          ? `Page • ${result.sublabel ?? ""}`
                          : `${result.type === "team" ? "Team" : "Player"} • ${result.sublabel ?? ""}`}
                      </p>
                    </button>
                  ))
                ) : (
                  <div style={styles.emptyState}>No matches found.</div>
                )}
              </div>
            )}
          </div>

          <div style={styles.heroActions}>
            <Link to="/simulator" style={styles.primaryButton}>
              Open Simulator
            </Link>
            <Link to="/teams" style={styles.secondaryButton}>
              Browse Teams
            </Link>
            <Link to="/players" style={styles.secondaryButton}>
              Browse Players
            </Link>
          </div>
        </div>

        <div style={styles.heroSide}>
          <div style={styles.quickPanel}>
            <p style={styles.eyebrow}>AT A GLANCE</p>
            <p style={styles.quickLine}>
              Teams tracked: <strong>{overview?.counts?.teams ?? 0}</strong>
            </p>
            <p style={styles.quickLine}>
              Players tracked: <strong>{overview?.counts?.players ?? 0}</strong>
            </p>
            <p style={styles.quickLine}>
              #1 Player: <strong>{overview?.strongest_player?.nickname ?? "N/A"}</strong>
            </p>
            <p style={styles.quickLine}>
              Rating: <strong>{overview?.strongest_player?.current_rating ?? "N/A"}</strong>
            </p>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Overview</h2>
          <p style={styles.sectionSubtitle}>Core tracking and ranking summary.</p>
        </div>

        <div style={styles.summaryGrid}>
          <Link to="/teams" style={styles.linkCard}>
            <div style={styles.summaryCard}>
              <p style={styles.eyebrow}>TRACKED TEAMS</p>
              <p style={styles.bigText}>{overview?.counts?.teams ?? 0}</p>
              <p style={styles.smallText}>Open full team rankings</p>
            </div>
          </Link>

          <Link to="/players" style={styles.linkCard}>
            <div style={styles.summaryCard}>
              <p style={styles.eyebrow}>TRACKED PLAYERS</p>
              <p style={styles.bigText}>{overview?.counts?.players ?? 0}</p>
              <p style={styles.smallText}>Open player rankings</p>
            </div>
          </Link>

          <Link
            to={overview?.strongest_player ? `/players/${overview.strongest_player.id}` : "/players"}
            style={styles.linkCard}
          >
            <div style={styles.summaryCard}>
              <p style={styles.eyebrow}>#1 PLAYER</p>
              <p style={styles.bigText}>{overview?.strongest_player?.nickname ?? "N/A"}</p>
              <p style={styles.smallText}>
                Rating: {overview?.strongest_player?.current_rating ?? "N/A"}
              </p>
            </div>
          </Link>

          <Link
            to={overview?.most_unstable_team?.team?.id ? `/teams/${overview.most_unstable_team.team.id}` : "/teams"}
            style={styles.linkCard}
          >
            <div style={styles.summaryCard}>
              <p style={styles.eyebrow}>MOST UNSTABLE TEAM</p>
              <p style={styles.bigText}>
                {overview?.most_unstable_team?.team?.name ?? "N/A"}
              </p>
              <p style={styles.smallText}>
                Click to open reasons and roster suggestions
              </p>
            </div>
          </Link>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Featured Insights</h2>
          <p style={styles.sectionSubtitle}>
            Click any card to open the page behind the recommendation.
          </p>
        </div>

        <div style={styles.gridTwo}>
          <Link
            to={
              overview?.featured_best_move?.team?.id
                ? `/teams/${overview.featured_best_move.team.id}`
                : "/teams"
            }
            style={styles.linkCard}
          >
            <div style={styles.featureCard}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Featured Best Move</h3>
                <Badge label="Recommendation" type="success" />
              </div>

              {overview?.featured_best_move ? (
                <>
                  <p>
                    <strong>Team:</strong> {overview.featured_best_move.team.name}
                  </p>
                  <p>
                    <strong>Out:</strong>{" "}
                    {overview.featured_best_move.move.outgoing_player.nickname} (
                    {overview.featured_best_move.move.outgoing_player.role ?? "Unknown"})
                  </p>
                  <p>
                    <strong>In:</strong>{" "}
                    {overview.featured_best_move.move.incoming_player.nickname} (
                    {overview.featured_best_move.move.incoming_player.role ?? "Unknown"})
                  </p>
                  <p>
                    <strong>Verdict:</strong>{" "}
                    {overview.featured_best_move.move.projection.summary.verdict}
                  </p>
                  <p>
                    <strong>Projected Improvement:</strong>{" "}
                    {overview.featured_best_move.move.projection.summary.combined_delta}
                  </p>
                  <p style={styles.cardHint}>
                    Click to open the team page and see more suggested roster changes.
                  </p>
                </>
              ) : (
                <p>No upgrade-quality move available yet.</p>
              )}
            </div>
          </Link>

          <Link
            to={overview?.most_unstable_team?.team?.id ? `/teams/${overview.most_unstable_team.team.id}` : "/teams"}
            style={styles.linkCard}
          >
            <div style={styles.featureCard}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Most Unstable Team Insight</h3>
                <Badge label="Watchlist" type="warning" />
              </div>

              {overview?.most_unstable_team ? (
                <>
                  <p>
                    <strong>Team:</strong> {overview.most_unstable_team.team.name}
                  </p>
                  <p>
                    <strong>Roster Health:</strong> {overview.most_unstable_team.roster_health_score}
                  </p>
                  <p>
                    <strong>Status:</strong> {overview.most_unstable_team.label}
                  </p>
                  <p>
                    <strong>Suggested Action:</strong> {overview.most_unstable_team.suggested_action}
                  </p>
                  <p style={styles.cardHint}>
                    Click to open why this team is unstable and see possible roster changes.
                  </p>
                </>
              ) : (
                <p>No instability signal available yet.</p>
              )}
            </div>
          </Link>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Rankings</h2>
          <p style={styles.sectionSubtitle}>
            Quick access to the strongest players and teams right now.
          </p>
        </div>

        <div style={styles.gridTwo}>
          <div style={styles.rankCard}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Top 5 Players</h3>
              <Link to="/players" style={styles.linkText}>
                View full ranking
              </Link>
            </div>

            <div style={styles.listBlock}>
              {overview?.top_players && overview.top_players.length > 0 ? (
                overview.top_players.map((player) => (
                  <Link key={player.id} to={`/players/${player.id}`} style={styles.listLink}>
                    <div style={styles.listRow}>
                      <div>
                        <p style={styles.listTitle}>
                          #{player.rank} {player.nickname}
                        </p>
                        <p style={styles.listSubtitle}>
                          {player.team ?? "No team"} • {player.primary_role ?? "Unknown"}
                        </p>
                      </div>
                      <Badge label={`Rating ${player.current_rating ?? "N/A"}`} type="info" />
                    </div>
                  </Link>
                ))
              ) : (
                <p>No player ranking data available.</p>
              )}
            </div>
          </div>

          <div style={styles.rankCard}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Top 5 Teams</h3>
              <Link to="/teams" style={styles.linkText}>
                View full ranking
              </Link>
            </div>

            <div style={styles.listBlock}>
              {overview?.top_teams && overview.top_teams.length > 0 ? (
                overview.top_teams.map((team) => (
                  <Link key={team.id} to={`/teams/${team.id}`} style={styles.listLink}>
                    <div style={styles.listRow}>
                      <div>
                        <p style={styles.listTitle}>
                          #{team.rank} {team.name}
                        </p>
                        <p style={styles.listSubtitle}>
                          {team.region ?? "Unknown"} • Avg {team.average_strength ?? "N/A"}
                        </p>
                      </div>
                      <Badge
                        label={team.competitive_tier ? `Tier ${team.competitive_tier}` : "Unrated"}
                        type="warning"
                      />
                    </div>
                  </Link>
                ))
              ) : (
                <p>No team ranking data available.</p>
              )}
            </div>
          </div>
        </div>
      </section>
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
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
    gap: "20px",
    marginBottom: "28px",
  },
  heroMain: {
    ...baseCard,
  },
  heroSide: {
    display: "grid",
  },
  quickPanel: {
    ...baseCard,
    height: "100%",
  },
  heroTitle: {
    marginTop: "14px",
    marginBottom: "10px",
    fontSize: "40px",
  },
  heroSubtitle: {
    color: "#d1d5db",
    lineHeight: 1.7,
    marginBottom: "18px",
    maxWidth: "760px",
  },
  searchBlock: {
    marginBottom: "18px",
    position: "relative",
  },
  searchLabel: {
    display: "block",
    fontWeight: 700,
    color: "#e5e7eb",
    marginBottom: "8px",
  },
  searchRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  searchInput: {
    flex: 1,
    minWidth: "240px",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #4b5563",
    background: "#0f172a",
    color: "#f9fafb",
  },
  searchButton: {
    padding: "12px 16px",
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
    zIndex: 20,
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
  heroActions: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  primaryButton: {
    textDecoration: "none",
    background: "#2563eb",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "12px",
    fontWeight: 700,
  },
  secondaryButton: {
    textDecoration: "none",
    background: "#111827",
    color: "#e5e7eb",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid #374151",
    fontWeight: 700,
  },
  quickLine: {
    color: "#e5e7eb",
    margin: "10px 0",
  },
  section: {
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
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "16px",
  },
  summaryCard: {
    ...baseCard,
    minHeight: "150px",
  },
  linkCard: {
    textDecoration: "none",
    color: "inherit",
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
    fontSize: "24px",
    fontWeight: 700,
    margin: 0,
  },
  smallText: {
    color: "#d1d5db",
    marginTop: "8px",
    marginBottom: 0,
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "16px",
  },
  featureCard: {
    ...baseCard,
    minHeight: "260px",
    height: "100%",
  },
  rankCard: {
    ...baseCard,
    minHeight: "320px",
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
  cardHint: {
    marginTop: "14px",
    color: "#93c5fd",
    fontSize: "14px",
  },
  linkText: {
    color: "#93c5fd",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "14px",
  },
  listBlock: {
    display: "grid",
    gap: "12px",
  },
  listLink: {
    textDecoration: "none",
    color: "inherit",
  },
  listRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    paddingBottom: "12px",
    borderBottom: "1px solid #374151",
  },
  listTitle: {
    margin: 0,
    fontWeight: 700,
  },
  listSubtitle: {
    margin: "6px 0 0 0",
    color: "#d1d5db",
    fontSize: "14px",
  },
};