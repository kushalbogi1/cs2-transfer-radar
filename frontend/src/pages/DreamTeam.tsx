import { useEffect, useState } from "react";

type Player = {
  id: number;
  nickname: string;
  role: string | null;
  team: string | null;
};

type DreamTeamResponse = {
  selected_players: {
    id: number;
    nickname: string;
    role: string | null;
    strength_score: number | null;
  }[];
  role_balance: {
    score: number;
    label: string;
    missing_roles: string[];
    duplicate_roles: string[];
  };
  strength: {
    score: number;
  };
  combined_score: number;
  explanations: string[];
};

export default function DreamTeam() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [result, setResult] = useState<DreamTeamResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    async function loadPlayers() {
      try {
        const res = await fetch("http://127.0.0.1:8000/players");
        if (!res.ok) throw new Error("Failed to fetch players");
        const data = await res.json();
        setPlayers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadPlayers();
  }, []);

  function togglePlayer(id: number) {
    setError(null);
    setResult(null);

    if (selected.includes(id)) {
      setSelected(selected.filter((p) => p !== id));
      return;
    }

    if (selected.length >= 5) {
      setError("You can only select 5 players.");
      return;
    }

    setSelected([...selected, id]);
  }

  async function analyzeDreamTeam() {
    if (selected.length !== 5) {
      setError("Please select exactly 5 players.");
      return;
    }

    setError(null);
    setAnalyzing(true);
    setResult(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/dream-team/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          player_ids: selected,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to analyze dream team");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return <div style={styles.page}>Loading players...</div>;
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Dream Team Builder</h1>
      <p style={styles.subtitle}>
        Pick any 5 players and see how the lineup scores on structure and strength.
      </p>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Selected ({selected.length}/5)</h2>
        <div style={styles.selectedWrap}>
          {selected.length === 0 ? (
            <span style={styles.muted}>No players selected yet.</span>
          ) : (
            players
              .filter((p) => selected.includes(p.id))
              .map((p) => (
                <span key={p.id} style={styles.badge}>
                  {p.nickname}
                </span>
              ))
          )}
        </div>

        <button style={styles.button} onClick={analyzeDreamTeam} disabled={analyzing}>
          {analyzing ? "Analyzing..." : "Analyze Dream Team"}
        </button>
      </div>

      <div style={styles.grid}>
        {players.map((player) => {
          const active = selected.includes(player.id);

          return (
            <button
              key={player.id}
              onClick={() => togglePlayer(player.id)}
              style={{
                ...styles.playerCard,
                border: active ? "2px solid #2563eb" : "1px solid #374151",
                background: active ? "#172554" : "#1f2937",
              }}
            >
              <div style={styles.playerName}>{player.nickname}</div>
              <div style={styles.playerMeta}>Role: {player.role ?? "Unknown"}</div>
              <div style={styles.playerMeta}>Team: {player.team ?? "Unassigned"}</div>
            </button>
          );
        })}
      </div>

      {result && (
        <div style={styles.resultPanel}>
          <h2 style={styles.sectionTitle}>Dream Team Result</h2>

          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>Combined Score</h3>
              <p style={styles.bigText}>{result.combined_score}</p>
            </div>

            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>Role Fit</h3>
              <p style={styles.bigText}>{result.role_balance.label}</p>
            </div>

            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>Role Score</h3>
              <p style={styles.bigText}>{result.role_balance.score}</p>
            </div>

            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>Strength Score</h3>
              <p style={styles.bigText}>{result.strength.score}</p>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>Role Issues</h3>
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
            <h3 style={styles.sectionTitle}>Selected Players</h3>
            <ul style={styles.list}>
              {result.selected_players.map((player) => (
                <li key={player.id} style={styles.listItem}>
                  {player.nickname} — {player.role ?? "Unknown"} — Strength:{" "}
                  {player.strength_score ?? "N/A"}
                </li>
              ))}
            </ul>
          </div>

          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>Explanations</h3>
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

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "32px",
    color: "#f9fafb",
  },
  title: {
    marginBottom: "8px",
  },
  subtitle: {
    color: "#d1d5db",
    marginBottom: "24px",
  },
  error: {
    background: "#7f1d1d",
    border: "1px solid #b91c1c",
    color: "#fecaca",
    padding: "12px 14px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
  card: {
  background: "linear-gradient(145deg, #1f2937, #111827)",
  border: "1px solid #374151",
  borderRadius: "16px",
  padding: "20px",
  marginBottom: "16px",
  transition: "all 0.2s ease",
  boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
},
  sectionTitle: {
    marginTop: 0,
    marginBottom: "12px",
  },
  selectedWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "16px",
  },
  badge: {
    background: "#2563eb",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "14px",
  },
  muted: {
    color: "#9ca3af",
  },
  button: {
    padding: "12px 16px",
    borderRadius: "10px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },
  playerCard: {
    textAlign: "left",
    padding: "16px",
    borderRadius: "14px",
    color: "#f9fafb",
    cursor: "pointer",
  },
  playerName: {
    fontWeight: 700,
    marginBottom: "8px",
  },
  playerMeta: {
    color: "#d1d5db",
    marginBottom: "4px",
  },
  resultPanel: {
    marginTop: "28px",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "16px",
  },
  summaryCard: {
    background: "#1f2937",
    border: "1px solid #374151",
    borderRadius: "14px",
    padding: "16px",
  },
  summaryTitle: {
    marginTop: 0,
    marginBottom: "10px",
    fontSize: "16px",
    color: "#d1d5db",
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