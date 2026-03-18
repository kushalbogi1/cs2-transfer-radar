import { useEffect, useMemo, useState } from "react";
import Badge from "../components/Badge";
import { fetchPlayers, runDreamTeam, type DreamTeamResponse, type Player } from "../api/api";

function getScoreType(score?: number | null): "success" | "warning" | "danger" | "info" | "neutral" {
  if (score === null || score === undefined) return "neutral";
  if (score >= 85) return "success";
  if (score >= 70) return "warning";
  return "danger";
}

export default function DreamTeam() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [result, setResult] = useState<DreamTeamResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return <div style={styles.page}>Loading players...</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.heroBlock}>
        <h1 style={styles.title}>Dream Team Builder</h1>
        <p style={styles.subtitle}>
          Pick any five players, then see how the lineup scores on role balance, overall strength,
          and combined team quality.
        </p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.topBar}>
        <div style={styles.selectionInfo}>
          <Badge label={`${selectedIds.length}/5 selected`} type="info" />
          {selectedIds.length === 5 ? (
            <Badge label="Ready to analyze" type="success" />
          ) : (
            <Badge label="Pick 5 players" type="warning" />
          )}
        </div>

        <button style={styles.button} onClick={handleAnalyze} disabled={analyzing || selectedIds.length !== 5}>
          {analyzing ? "Analyzing..." : "Analyze Dream Team"}
        </button>
      </div>

      <div style={styles.sectionBlock}>
        <h2 style={styles.sectionTitle}>Selected Players</h2>
        {selectedPlayers.length === 0 ? (
          <div style={styles.card}>No players selected yet.</div>
        ) : (
          <div style={styles.grid}>
            {selectedPlayers.map((player) => (
              <div
                key={player.id}
                style={styles.card}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
              >
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{player.nickname}</h3>
                  <Badge
                    label={`Strength ${player.strength_score ?? "N/A"}`}
                    type={getScoreType(player.strength_score)}
                  />
                </div>
                <p>Role: {player.role ?? "Unknown"}</p>
                <p>Team: {player.team ?? "Free agent / unassigned"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.sectionBlock}>
        <h2 style={styles.sectionTitle}>Available Players</h2>
        <div style={styles.grid}>
          {players.map((player) => {
            const isSelected = selectedIds.includes(player.id);

            return (
              <button
                key={player.id}
                type="button"
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
                    label={isSelected ? "Selected" : `Strength ${player.strength_score ?? "N/A"}`}
                    type={isSelected ? "success" : getScoreType(player.strength_score)}
                  />
                </div>
                <p>Role: {player.role ?? "Unknown"}</p>
                <p>Team: {player.team ?? "Free agent / unassigned"}</p>
                <p>Nationality: {player.nationality ?? "Unknown"}</p>
              </button>
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

          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <p style={styles.eyebrow}>COMBINED SCORE</p>
              <p style={styles.bigText}>{result.combined_score}</p>
            </div>

            <div style={styles.summaryCard}>
              <p style={styles.eyebrow}>ROLE SCORE</p>
              <p style={styles.bigText}>{result.role_balance.score}</p>
            </div>

            <div style={styles.summaryCard}>
              <p style={styles.eyebrow}>ROLE LABEL</p>
              <p style={styles.bigText}>{result.role_balance.label}</p>
            </div>

            <div style={styles.summaryCard}>
              <p style={styles.eyebrow}>STRENGTH SCORE</p>
              <p style={styles.bigText}>{result.strength.score}</p>
            </div>
          </div>

          <div style={styles.gridTwo}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Role Issues</h3>
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

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Selected Lineup</h3>
              {result.selected_players.map((player) => (
                <p key={player.id}>
                  {player.nickname} — {player.role ?? "Unknown"} — {player.strength_score ?? "N/A"}
                </p>
              ))}
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
  error: {
    background: "#7f1d1d",
    border: "1px solid #b91c1c",
    color: "#fecaca",
    padding: "12px 14px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "24px",
  },
  selectionInfo: {
    display: "flex",
    gap: "10px",
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
  sectionBlock: {
    marginBottom: "28px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  sectionTitle: {
    margin: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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
  playerButton: {
    ...baseCard,
    color: "#f9fafb",
    textAlign: "left",
    cursor: "pointer",
  },
  playerButtonSelected: {
    border: "1px solid rgba(34, 197, 94, 0.45)",
    background: "linear-gradient(145deg, #14532d, #111827)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "10px",
    flexWrap: "wrap",
  },
  cardTitle: {
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
  list: {
    margin: 0,
    paddingLeft: "18px",
  },
  listItem: {
    marginBottom: "8px",
    color: "#e5e7eb",
  },
};