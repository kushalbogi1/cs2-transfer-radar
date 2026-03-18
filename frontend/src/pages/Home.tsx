import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../components/Badge";
import { fetchDashboardOverview, type DashboardOverview } from "../api/api";

export default function Home() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOverview() {
      try {
        const data = await fetchDashboardOverview();
        setOverview(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    loadOverview();
  }, []);

  if (loading) return <div style={styles.page}>Loading dashboard...</div>;
  if (error) return <div style={styles.page}>Error: {error}</div>;

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroText}>
          <Badge label="Data-Driven CS2 Roster Intelligence" type="info" />
          <h1 style={styles.heroTitle}>CS2 Transfer Radar</h1>
          <p style={styles.heroSubtitle}>
            Analyze roster changes, compare transfer ideas, build dream lineups,
            and surface the best moves with stat-derived scoring.
          </p>
        </div>

        <div style={styles.heroCard}>
          <p style={styles.heroEyebrow}>FEATURE HIGHLIGHTS</p>
          <ul style={styles.heroList}>
            <li>Roster Simulator</li>
            <li>Dream Team Builder</li>
            <li>Transfer Battle</li>
            <li>Best Move Engine</li>
          </ul>
        </div>
      </section>

      {overview && (
        <>
          <div style={styles.summaryGrid}>
            <div
              style={styles.summaryCard}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
            >
              <p style={styles.eyebrow}>TRACKED TEAMS</p>
              <p style={styles.bigText}>{overview.counts.teams}</p>
            </div>

            <div
              style={styles.summaryCard}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
            >
              <p style={styles.eyebrow}>TRACKED PLAYERS</p>
              <p style={styles.bigText}>{overview.counts.players}</p>
            </div>

            <div
              style={styles.summaryCard}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
            >
              <p style={styles.eyebrow}>STRONGEST PLAYER</p>
              <p style={styles.bigText}>
                {overview.strongest_player
                  ? overview.strongest_player.nickname
                  : "N/A"}
              </p>
              <p style={styles.smallText}>
                {overview.strongest_player?.strength_score ?? "N/A"}
              </p>
            </div>

            <div
              style={styles.summaryCard}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
            >
              <p style={styles.eyebrow}>MOST UNSTABLE TEAM</p>
              <p style={styles.bigText}>
                {overview.most_unstable_team
                  ? overview.most_unstable_team.team.name
                  : "N/A"}
              </p>
              <p style={styles.smallText}>
                {overview.most_unstable_team?.label ?? "No data"}
              </p>
            </div>
          </div>

          <div style={styles.gridTwo}>
            <div
              style={styles.card}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
            >
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Featured Best Move</h2>
                <Badge label="Recommendation" type="success" />
              </div>

              {overview.featured_best_move ? (
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
                    <strong>Delta:</strong>{" "}
                    {overview.featured_best_move.move.projection.summary.combined_delta}
                  </p>
                </>
              ) : (
                <p>No upgrade-quality move available yet.</p>
              )}
            </div>

            <div
              style={styles.card}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
            >
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Most Unstable Team Insight</h2>
                <Badge label="Watchlist" type="warning" />
              </div>

              {overview.most_unstable_team ? (
                <>
                  <p>
                    <strong>Team:</strong> {overview.most_unstable_team.team.name}
                  </p>
                  <p>
                    <strong>Health Score:</strong> {overview.most_unstable_team.roster_health_score}
                  </p>
                  <p>
                    <strong>Status:</strong> {overview.most_unstable_team.label}
                  </p>
                  <p>
                    <strong>Suggested Action:</strong>{" "}
                    {overview.most_unstable_team.suggested_action}
                  </p>
                </>
              ) : (
                <p>No unstable team insight available.</p>
              )}
            </div>
          </div>
        </>
      )}

      <section style={styles.quickLinks}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Explore the Platform</h2>
          <p style={styles.sectionSubtitle}>
            Jump into teams, players, simulations, and roster-building tools.
          </p>
        </div>

        <div style={styles.linkGrid}>
          <Link
            to="/teams"
            style={styles.linkCard}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
          >
            <h3>Teams</h3>
            <p>Inspect roster health, role issues, and top recommended moves.</p>
          </Link>

          <Link
            to="/players"
            style={styles.linkCard}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
          >
            <h3>Players</h3>
            <p>Browse player profiles, strength scores, and stat snapshots.</p>
          </Link>

          <Link
            to="/simulator"
            style={styles.linkCard}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
          >
            <h3>Simulator</h3>
            <p>Test swaps and understand roster fit, strength, and verdicts.</p>
          </Link>

          <Link
            to="/dream-team"
            style={styles.linkCard}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
          >
            <h3>Dream Team</h3>
            <p>Build a fantasy lineup and score it instantly.</p>
          </Link>

          <Link
            to="/transfer-battle"
            style={styles.linkCard}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
          >
            <h3>Transfer Battle</h3>
            <p>Compare two roster moves side by side and see the better option.</p>
          </Link>
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
    gridTemplateColumns: "minmax(0, 1.8fr) minmax(280px, 1fr)",
    gap: "20px",
    alignItems: "stretch",
    marginBottom: "28px",
  },
  heroText: {
    display: "grid",
    gap: "14px",
    alignContent: "center",
  },
  heroTitle: {
    fontSize: "48px",
    lineHeight: 1.05,
    margin: 0,
  },
  heroSubtitle: {
    color: "#d1d5db",
    fontSize: "18px",
    maxWidth: "840px",
    lineHeight: 1.6,
    margin: 0,
  },
  heroCard: {
    ...baseCard,
  },
  heroEyebrow: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#94a3b8",
    marginTop: 0,
    marginBottom: "12px",
  },
  heroList: {
    margin: 0,
    paddingLeft: "18px",
    color: "#e5e7eb",
    display: "grid",
    gap: "10px",
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
    fontSize: "24px",
    fontWeight: 800,
    margin: 0,
    color: "#f8fafc",
  },
  smallText: {
    color: "#cbd5e1",
    marginTop: "8px",
    marginBottom: 0,
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "16px",
    marginBottom: "28px",
  },
  card: {
    ...baseCard,
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
  quickLinks: {
    marginTop: "8px",
  },
  sectionHeader: {
    marginBottom: "16px",
  },
  sectionTitle: {
    marginBottom: "8px",
  },
  sectionSubtitle: {
    margin: 0,
    color: "#cbd5e1",
  },
  linkGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  linkCard: {
    display: "block",
    textDecoration: "none",
    color: "#f9fafb",
    background: "linear-gradient(145deg, #1f2937, #111827)",
    border: "1px solid #374151",
    borderRadius: "16px",
    padding: "20px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
  },
};