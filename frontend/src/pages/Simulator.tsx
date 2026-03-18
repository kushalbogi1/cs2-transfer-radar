import { useEffect, useMemo, useState } from "react";
import Badge from "../components/Badge";
import {
  fetchCandidates,
  fetchSuggestions,
  fetchTeam,
  fetchTeams,
  runSimulation,
  type Candidate,
  type SimulationResponse,
  type SuggestionResponse,
  type Team,
  type TeamDetail,
} from "../api/api";

function getVerdictBadgeType(label: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const v = label.toLowerCase();
  if (v.includes("upgrade")) return "success";
  if (v.includes("neutral")) return "warning";
  if (v.includes("downgrade")) return "danger";
  return "info";
}

export default function Simulator() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | "">("");
  const [selectedOutgoingId, setSelectedOutgoingId] = useState<number | "">("");
  const [selectedIncomingId, setSelectedIncomingId] = useState<number | "">("");
  const [teamDetail, setTeamDetail] = useState<TeamDetail | null>(null);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [teamsData, candidatesData] = await Promise.all([
          fetchTeams(),
          fetchCandidates(),
        ]);
        setTeams(teamsData);
        setCandidates(candidatesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    async function loadTeamDetail() {
      if (!selectedTeamId) {
        setTeamDetail(null);
        setSelectedOutgoingId("");
        setSuggestions(null);
        return;
      }

      setTeamLoading(true);
      setResult(null);

      try {
        const data = await fetchTeam(Number(selectedTeamId));
        setTeamDetail(data);
        setSelectedOutgoingId("");
        setSelectedIncomingId("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load team roster");
      } finally {
        setTeamLoading(false);
      }
    }

    loadTeamDetail();
  }, [selectedTeamId]);

  useEffect(() => {
    async function loadSuggestions() {
      if (!selectedTeamId || !selectedOutgoingId) {
        setSuggestions(null);
        return;
      }

      setSuggestionsLoading(true);

      try {
        const data = await fetchSuggestions(Number(selectedTeamId), Number(selectedOutgoingId));
        setSuggestions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load suggestions");
      } finally {
        setSuggestionsLoading(false);
      }
    }

    loadSuggestions();
  }, [selectedTeamId, selectedOutgoingId]);

  const filteredCandidates = useMemo(() => {
    if (!teamDetail) return candidates;
    const activeRosterIds = new Set(teamDetail.roster.map((player) => player.player_id));
    return candidates.filter((candidate) => !activeRosterIds.has(candidate.player_id));
  }, [candidates, teamDetail]);

  async function handleSimulate() {
    if (!selectedTeamId || !selectedOutgoingId || !selectedIncomingId) {
      setError("Please select a team, outgoing player, and incoming player.");
      return;
    }

    setError(null);
    setSimLoading(true);
    setResult(null);

    try {
      const data = await runSimulation({
        team_id: Number(selectedTeamId),
        outgoing_player_id: Number(selectedOutgoingId),
        incoming_player_id: Number(selectedIncomingId),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setSimLoading(false);
    }
  }

  if (loading) return <div style={styles.page}>Loading simulator...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.heroBlock}>
        <h1 style={styles.title}>Roster Simulator</h1>
        <p style={styles.subtitle}>
          Test a swap, see how role structure changes, and understand whether the move is an upgrade or downgrade.
        </p>
      </div>

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
          <label style={styles.label}>Outgoing Player</label>
          <select
            style={styles.select}
            value={selectedOutgoingId}
            onChange={(e) => setSelectedOutgoingId(e.target.value ? Number(e.target.value) : "")}
            disabled={!teamDetail || teamLoading}
          >
            <option value="">Choose outgoing player</option>
            {teamDetail?.roster.map((player) => (
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
            value={selectedIncomingId}
            onChange={(e) => setSelectedIncomingId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Choose incoming player</option>
            {filteredCandidates.map((candidate) => (
              <option key={candidate.player_id} value={candidate.player_id}>
                {candidate.nickname}{" "}
                {candidate.role ? `(${candidate.role} • ${Math.round(candidate.strength_score ?? 0)})` : ""}
              </option>
            ))}
          </select>
        </div>

        <button style={styles.button} onClick={handleSimulate} disabled={simLoading}>
          {simLoading ? "Simulating..." : "Run Simulation"}
        </button>
      </div>

      {teamLoading && <p style={styles.loadingText}>Loading team roster...</p>}

      {teamDetail && (
        <div style={styles.sectionBlock}>
          <h2 style={styles.sectionTitle}>{teamDetail.name} Roster</h2>
          <div style={styles.grid}>
            {teamDetail.roster.map((player) => (
              <div
                key={player.player_id}
                style={styles.card}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
              >
                <h3 style={styles.cardTitle}>{player.nickname}</h3>
                <p>Role: {player.role ?? "Unknown"}</p>
                <p>Strength: {player.strength_score ?? "N/A"}</p>
                <p>Age: {player.age ?? "Unknown"}</p>
                <p>Nationality: {player.nationality ?? "Unknown"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedOutgoingId && (
        <div style={styles.sectionBlock}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Smart Suggestions</h2>
            {suggestions?.outgoing_player?.role ? (
              <Badge label={`Replacing ${suggestions.outgoing_player.role}`} type="info" />
            ) : null}
          </div>

          {suggestionsLoading ? (
            <div style={styles.card}>Loading suggestions...</div>
          ) : suggestions ? (
            <div style={styles.grid}>
              {suggestions.suggestions.map((item) => (
                <button
                  key={item.player_id}
                  style={styles.cardButton}
                  onClick={() => setSelectedIncomingId(item.player_id)}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
                >
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>{item.nickname}</h3>
                    <Badge label={`Fit ${item.fit_score}`} type="info" />
                  </div>
                  <p>Role: {item.role ?? "Unknown"}</p>
                  <p>Secondary: {item.secondary_role ?? "None"}</p>
                  <p>Strength: {item.strength_score ?? "N/A"}</p>
                </button>
              ))}
            </div>
          ) : (
            <div style={styles.card}>No suggestions available.</div>
          )}
        </div>
      )}

      {result && (
        <div style={styles.sectionBlock}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Simulation Result</h2>
            <Badge label={result.summary.verdict} type={getVerdictBadgeType(result.summary.verdict)} />
          </div>

          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <p style={styles.eyebrow}>COMBINED DELTA</p>
              <p style={styles.bigText}>{result.summary.combined_delta}</p>
            </div>

            <div style={styles.summaryCard}>
              <p style={styles.eyebrow}>ROLE FIT</p>
              <p style={styles.bigText}>{result.summary.role_fit_label}</p>
            </div>

            <div style={styles.summaryCard}>
              <p style={styles.eyebrow}>STRENGTH CHANGE</p>
              <p style={styles.bigText}>{result.summary.strength_change_label}</p>
            </div>

            <div style={styles.summaryCard}>
              <p style={styles.eyebrow}>VERDICT</p>
              <p style={styles.bigText}>{result.summary.verdict}</p>
            </div>
          </div>

          <div style={styles.gridTwo}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Swap</h3>
              <p>
                Out: <strong>{result.swap.outgoing.nickname}</strong> ({result.swap.outgoing.role ?? "Unknown"})
              </p>
              <p>
                In: <strong>{result.swap.incoming.nickname}</strong> ({result.swap.incoming.role ?? "Unknown"})
              </p>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Role Issues After Move</h3>
              <p>
                Missing Roles:{" "}
                {result.after.role_balance.missing_roles.length
                  ? result.after.role_balance.missing_roles.join(", ")
                  : "None"}
              </p>
              <p>
                Duplicate Roles:{" "}
                {result.after.role_balance.duplicate_roles.length
                  ? result.after.role_balance.duplicate_roles.join(", ")
                  : "None"}
              </p>
            </div>
          </div>

          <div style={styles.gridTwo}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Before</h3>
              <p>Role Score: {result.before.role_balance.score}</p>
              <p>Strength Score: {result.before.strength.score}</p>
              <p>Combined Score: {result.before.combined_score}</p>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>After</h3>
              <p>Role Score: {result.after.role_balance.score}</p>
              <p>Strength Score: {result.after.strength.score}</p>
              <p>Combined Score: {result.after.combined_score}</p>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Explanations</h3>
            <ul style={styles.list}>
              {result.explanations.map((item, idx) => (
                <li key={idx} style={styles.listItem}>
                  {item}
                </li>
              ))}
            </ul>
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
    display: "grid",
    gap: "16px",
    ...baseCard,
    marginBottom: "28px",
  },
  field: {
    display: "grid",
    gap: "8px",
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
    marginBottom: "16px",
  },
  card: {
    ...baseCard,
  },
  cardButton: {
    ...baseCard,
    color: "#f9fafb",
    textAlign: "left",
    cursor: "pointer",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "8px",
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: "10px",
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