import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../components/Badge";
import {
  fetchCandidates,
  fetchTeam,
  fetchTeams,
  runTransferBattle,
  type Candidate,
  type Team,
  type TeamDetail,
} from "../api/api";

function getWinnerBadgeType(label: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const v = label.toLowerCase();
  if (v.includes("move a")) return "success";
  if (v.includes("move b")) return "info";
  if (v.includes("tie")) return "warning";
  return "neutral";
}

function getVerdictBadgeType(label: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const v = label.toLowerCase();
  if (v.includes("strong upgrade") || v.includes("upgrade")) return "success";
  if (v.includes("neutral")) return "warning";
  if (v.includes("downgrade")) return "danger";
  return "info";
}

function improvementLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  if (value >= 8) return "Major improvement";
  if (value >= 3) return "Good improvement";
  if (value > -3) return "Little change";
  if (value > -8) return "Slight downgrade";
  return "Major downgrade";
}

export default function TransferBattle() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | "">("");
  const [teamDetail, setTeamDetail] = useState<TeamDetail | null>(null);

  const [moveAOutgoing, setMoveAOutgoing] = useState<number | "">("");
  const [moveAIncoming, setMoveAIncoming] = useState<number | "">("");
  const [moveBOutgoing, setMoveBOutgoing] = useState<number | "">("");
  const [moveBIncoming, setMoveBIncoming] = useState<number | "">("");
  const [candidateSearch, setCandidateSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(false);
  const [battleLoading, setBattleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [teamsData, candidatesData] = await Promise.all([
          fetchTeams(),
          fetchCandidates("all"),
        ]);
        setTeams(teamsData);
        setCandidates(candidatesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load transfer battle");
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    async function loadTeamDetail() {
      setError(null);
      setResult(null);
      setMoveAOutgoing("");
      setMoveAIncoming("");
      setMoveBOutgoing("");
      setMoveBIncoming("");
      setCandidateSearch("");

      if (!selectedTeamId) {
        setTeamDetail(null);
        return;
      }

      setTeamLoading(true);

      try {
        const data = await fetchTeam(Number(selectedTeamId));
        setTeamDetail(data);
      } catch (err) {
        setTeamDetail(null);
        setError(err instanceof Error ? err.message : "Failed to load team roster");
      } finally {
        setTeamLoading(false);
      }
    }

    loadTeamDetail();
  }, [selectedTeamId]);

  const filteredCandidates = useMemo(() => {
    let pool = candidates;

    if (teamDetail) {
      const activeRosterIds = new Set(teamDetail.roster.map((player) => player.player_id));
      pool = pool.filter((candidate) => !activeRosterIds.has(candidate.player_id));
    }

    if (candidateSearch.trim()) {
      const q = candidateSearch.trim().toLowerCase();
      pool = pool.filter((candidate) => {
        return (
          candidate.nickname?.toLowerCase().includes(q) ||
          candidate.role?.toLowerCase().includes(q) ||
          candidate.secondary_role?.toLowerCase().includes(q) ||
          candidate.team?.toLowerCase().includes(q) ||
          candidate.status?.toLowerCase().includes(q)
        );
      });
    }

    return pool;
  }, [candidates, teamDetail, candidateSearch]);

  async function handleCompare() {
    if (!selectedTeamId || !moveAOutgoing || !moveAIncoming || !moveBOutgoing || !moveBIncoming) {
      setError("Please complete both moves before comparing.");
      return;
    }

    setError(null);
    setBattleLoading(true);
    setResult(null);

    try {
      const data = await runTransferBattle({
        team_id: Number(selectedTeamId),
        move_a: {
          outgoing_player_id: Number(moveAOutgoing),
          incoming_player_id: Number(moveAIncoming),
        },
        move_b: {
          outgoing_player_id: Number(moveBOutgoing),
          incoming_player_id: Number(moveBIncoming),
        },
      });

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer battle failed");
    } finally {
      setBattleLoading(false);
    }
  }

  if (loading) return <div style={styles.page}>Loading transfer battle...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.heroBlock}>
        <h1 style={styles.title}>Transfer Battle</h1>
        <p style={styles.subtitle}>
          Compare two roster moves side by side and see which move the model prefers.
        </p>
      </div>

      {!selectedTeamId && (
        <div style={styles.emptyHero}>
          <div style={styles.emptyHeroCard}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>How Transfer Battle works</h2>
              <Badge label="Start here" type="info" />
            </div>
            <p>Pick one team, then compare two possible roster moves for that team.</p>
            <ul style={styles.list}>
              <li style={styles.listItem}>Choose a team</li>
              <li style={styles.listItem}>Build Move A and Move B</li>
              <li style={styles.listItem}>Compare projected improvement, role fit, and verdict</li>
            </ul>
          </div>

          <div style={styles.emptyHeroCard}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Good use cases</h2>
              <Badge label="Ideas" type="warning" />
            </div>
            <ul style={styles.list}>
              <li style={styles.listItem}>Compare two different replacements for the same weak role</li>
              <li style={styles.listItem}>Compare a free agent move against an active roster target</li>
              <li style={styles.listItem}>Test whether a stronger player actually improves role balance</li>
            </ul>
            <div style={styles.linkRow}>
              <Link to="/teams" style={styles.inlineLink}>Browse teams</Link>
              <Link to="/simulator" style={styles.inlineLink}>Open simulator</Link>
            </div>
          </div>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.panel}>
        <div style={styles.field}>
          <label style={styles.label}>Select Team</label>
          <select
            style={styles.select}
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Choose a team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Search Incoming Players</label>
          <input
            style={styles.input}
            type="text"
            placeholder="Search nickname, role, team, status..."
            value={candidateSearch}
            onChange={(e) => setCandidateSearch(e.target.value)}
          />
        </div>

        <div style={styles.resultMeta}>
          Incoming candidates shown: {filteredCandidates.length}
        </div>
      </div>

      {teamLoading && <p style={styles.loadingText}>Loading team roster...</p>}

      {teamDetail && (
        <>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>{teamDetail.name}</h2>
            <Link to={`/teams/${teamDetail.id}`} style={styles.inlineLink}>
              Open team page
            </Link>
          </div>

          <div style={styles.gridTwo}>
            <div style={styles.card}>
              <div style={styles.moveHeader}>
                <h2 style={styles.sectionTitle}>Move A</h2>
                <Badge label="Scenario A" type="info" />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Outgoing Player</label>
                <select
                  style={styles.select}
                  value={moveAOutgoing}
                  onChange={(e) => setMoveAOutgoing(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Choose outgoing player</option>
                  {teamDetail.roster.map((player) => (
                    <option key={player.player_id} value={player.player_id}>
                      {player.nickname} {player.role ? `(${player.role})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Incoming Player</label>
                <select
                  style={styles.select}
                  value={moveAIncoming}
                  onChange={(e) => setMoveAIncoming(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Choose incoming player</option>
                  {filteredCandidates.map((candidate) => (
                    <option key={candidate.player_id} value={candidate.player_id}>
                      {candidate.nickname} {candidate.role ? `(${candidate.role}${candidate.team ? ` • ${candidate.team}` : ""})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.moveHeader}>
                <h2 style={styles.sectionTitle}>Move B</h2>
                <Badge label="Scenario B" type="warning" />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Outgoing Player</label>
                <select
                  style={styles.select}
                  value={moveBOutgoing}
                  onChange={(e) => setMoveBOutgoing(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Choose outgoing player</option>
                  {teamDetail.roster.map((player) => (
                    <option key={player.player_id} value={player.player_id}>
                      {player.nickname} {player.role ? `(${player.role})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Incoming Player</label>
                <select
                  style={styles.select}
                  value={moveBIncoming}
                  onChange={(e) => setMoveBIncoming(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Choose incoming player</option>
                  {filteredCandidates.map((candidate) => (
                    <option key={candidate.player_id} value={candidate.player_id}>
                      {candidate.nickname} {candidate.role ? `(${candidate.role}${candidate.team ? ` • ${candidate.team}` : ""})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button style={styles.button} onClick={handleCompare} disabled={battleLoading}>
            {battleLoading ? "Comparing..." : "Compare Moves"}
          </button>
        </>
      )}

      {result && (
        <div style={styles.sectionBlock}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Battle Result</h2>
            <Badge label={result.comparison.winner} type={getWinnerBadgeType(result.comparison.winner)} />
          </div>

          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <p style={styles.eyebrow}>WINNER</p>
              <p style={styles.bigText}>{result.comparison.winner}</p>
            </div>

            <div style={styles.summaryCard}>
              <p style={styles.eyebrow}>MOVE A IMPROVEMENT</p>
              <p style={styles.bigText}>{result.comparison.move_a_delta}</p>
              <p style={styles.smallText}>{improvementLabel(result.comparison.move_a_delta)}</p>
            </div>

            <div style={styles.summaryCard}>
              <p style={styles.eyebrow}>MOVE B IMPROVEMENT</p>
              <p style={styles.bigText}>{result.comparison.move_b_delta}</p>
              <p style={styles.smallText}>{improvementLabel(result.comparison.move_b_delta)}</p>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Why this move wins</h3>
            <p>{result.comparison.winner_reason}</p>
          </div>

          <div style={styles.gridTwo}>
            <div style={styles.card}>
              <div style={styles.moveHeader}>
                <h3 style={styles.cardTitle}>Move A</h3>
                <Badge
                  label={result.move_a.summary.verdict}
                  type={getVerdictBadgeType(result.move_a.summary.verdict)}
                />
              </div>
              <p>
                <Link to={`/players/${result.move_a.swap.outgoing.id}`} style={styles.inlineLink}>
                  {result.move_a.swap.outgoing.nickname}
                </Link>{" "}
                →{" "}
                <Link to={`/players/${result.move_a.swap.incoming.id}`} style={styles.inlineLink}>
                  {result.move_a.swap.incoming.nickname}
                </Link>
              </p>
              <p>Role Fit: {result.move_a.summary.role_fit_label}</p>
              <p>Strength Change: {result.move_a.summary.strength_change_label}</p>
              <p>
                Missing Roles:{" "}
                {result.move_a.after.role_balance.missing_roles.length
                  ? result.move_a.after.role_balance.missing_roles.join(", ")
                  : "None"}
              </p>
              <p>
                Duplicate Roles:{" "}
                {result.move_a.after.role_balance.duplicate_roles.length
                  ? result.move_a.after.role_balance.duplicate_roles.join(", ")
                  : "None"}
              </p>
            </div>

            <div style={styles.card}>
              <div style={styles.moveHeader}>
                <h3 style={styles.cardTitle}>Move B</h3>
                <Badge
                  label={result.move_b.summary.verdict}
                  type={getVerdictBadgeType(result.move_b.summary.verdict)}
                />
              </div>
              <p>
                <Link to={`/players/${result.move_b.swap.outgoing.id}`} style={styles.inlineLink}>
                  {result.move_b.swap.outgoing.nickname}
                </Link>{" "}
                →{" "}
                <Link to={`/players/${result.move_b.swap.incoming.id}`} style={styles.inlineLink}>
                  {result.move_b.swap.incoming.nickname}
                </Link>
              </p>
              <p>Role Fit: {result.move_b.summary.role_fit_label}</p>
              <p>Strength Change: {result.move_b.summary.strength_change_label}</p>
              <p>
                Missing Roles:{" "}
                {result.move_b.after.role_balance.missing_roles.length
                  ? result.move_b.after.role_balance.missing_roles.join(", ")
                  : "None"}
              </p>
              <p>
                Duplicate Roles:{" "}
                {result.move_b.after.role_balance.duplicate_roles.length
                  ? result.move_b.after.role_balance.duplicate_roles.join(", ")
                  : "None"}
              </p>
            </div>
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
  emptyHero: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  emptyHeroCard: {
    ...baseCard,
  },
  panel: {
    display: "grid",
    gap: "16px",
    ...baseCard,
    marginBottom: "24px",
  },
  field: {
    display: "grid",
    gap: "8px",
    marginBottom: "16px",
  },
  label: {
    fontWeight: 700,
    color: "#e5e7eb",
  },
  select: {
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #4b5563",
    background: "#0f172a",
    color: "#f9fafb",
  },
  input: {
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #4b5563",
    background: "#0f172a",
    color: "#f9fafb",
  },
  button: {
    padding: "12px 16px",
    borderRadius: "12px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: "24px",
  },
  resultMeta: {
    color: "#d1d5db",
  },
  error: {
    background: "#7f1d1d",
    border: "1px solid #b91c1c",
    color: "#fecaca",
    padding: "12px 14px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
  loadingText: {
    color: "#d1d5db",
    marginBottom: "16px",
  },
  sectionBlock: {
    marginBottom: "28px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  sectionTitle: {
    margin: 0,
  },
  inlineLink: {
    color: "#93c5fd",
    textDecoration: "none",
    fontWeight: 600,
  },
  linkRow: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    marginTop: "12px",
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "16px",
    marginBottom: "16px",
  },
  card: {
    ...baseCard,
  },
  moveHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "16px",
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
    fontSize: "22px",
    fontWeight: 700,
    margin: 0,
  },
  smallText: {
    color: "#d1d5db",
    marginTop: "8px",
    marginBottom: 0,
  },
  cardTitle: {
    margin: 0,
  },
  list: {
    margin: 0,
    paddingLeft: "18px",
  },
  listItem: {
    marginBottom: "8px",
    color: "#e5e7eb",
  },
};