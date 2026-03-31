import { useEffect, useMemo, useState } from "react";
import Badge from "../components/Badge";

type PredictionType = "Roster Move" | "Match Result";
type PredictionOutcome = "pending" | "correct" | "wrong";

type PredictionItem = {
  id: string;
  type: PredictionType;
  title: string;
  details: string;
  created_at: string;
  outcome: PredictionOutcome;
  points_awarded: number;
};

type PredictionStats = {
  total_points: number;
  streak: number;
  correct: number;
  wrong: number;
};

const STORAGE_KEY = "cs2_transfer_radar_predictions";
const STATS_KEY = "cs2_transfer_radar_prediction_stats";

function loadPredictions(): PredictionItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePredictions(items: PredictionItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadStats(): PredictionStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw
      ? JSON.parse(raw)
      : { total_points: 0, streak: 0, correct: 0, wrong: 0 };
  } catch {
    return { total_points: 0, streak: 0, correct: 0, wrong: 0 };
  }
}

function saveStats(stats: PredictionStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function getPoints(type: PredictionType) {
  return type === "Roster Move" ? 10 : 5;
}

export default function Predictions() {
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [stats, setStats] = useState<PredictionStats>({
    total_points: 0,
    streak: 0,
    correct: 0,
    wrong: 0,
  });

  const [type, setType] = useState<PredictionType>("Roster Move");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setPredictions(loadPredictions());
    setStats(loadStats());
  }, []);

  function addPrediction() {
    if (!title.trim()) return;

    const newItem: PredictionItem = {
      id: crypto.randomUUID(),
      type,
      title: title.trim(),
      details: details.trim(),
      created_at: new Date().toISOString(),
      outcome: "pending",
      points_awarded: 0,
    };

    const updated = [newItem, ...predictions];
    setPredictions(updated);
    savePredictions(updated);

    setTitle("");
    setDetails("");
  }

  function resolvePrediction(id: string, outcome: "correct" | "wrong") {
    const updatedPredictions = predictions.map((item) => {
      if (item.id !== id || item.outcome !== "pending") return item;

      return {
        ...item,
        outcome,
        points_awarded: outcome === "correct" ? getPoints(item.type) : 0,
      };
    });

    const target = predictions.find((p) => p.id === id);
    if (!target || target.outcome !== "pending") return;

    const newStats = { ...stats };

    if (outcome === "correct") {
      newStats.total_points += getPoints(target.type);
      newStats.streak += 1;
      newStats.correct += 1;
    } else {
      newStats.streak = 0;
      newStats.wrong += 1;
    }

    setPredictions(updatedPredictions);
    setStats(newStats);
    savePredictions(updatedPredictions);
    saveStats(newStats);
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STATS_KEY);
    setPredictions([]);
    setStats({
      total_points: 0,
      streak: 0,
      correct: 0,
      wrong: 0,
    });
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return predictions;
    const q = search.trim().toLowerCase();
    return predictions.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.outcome.toLowerCase().includes(q)
    );
  }, [predictions, search]);

  return (
    <div style={styles.page}>
      <div style={styles.heroBlock}>
        <h1 style={styles.title}>Predictions</h1>
        <p style={styles.subtitle}>
          Make roster move or match-result predictions, then mark them correct or wrong to build your score and streak.
        </p>
      </div>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <p style={styles.eyebrow}>TOTAL POINTS</p>
          <p style={styles.bigText}>{stats.total_points}</p>
        </div>

        <div style={styles.summaryCard}>
          <p style={styles.eyebrow}>STREAK</p>
          <p style={styles.bigText}>{stats.streak}</p>
        </div>

        <div style={styles.summaryCard}>
          <p style={styles.eyebrow}>CORRECT</p>
          <p style={styles.bigText}>{stats.correct}</p>
        </div>

        <div style={styles.summaryCard}>
          <p style={styles.eyebrow}>WRONG</p>
          <p style={styles.bigText}>{stats.wrong}</p>
        </div>
      </div>

      <div style={styles.panel}>
        <div style={styles.field}>
          <label style={styles.label}>Prediction Type</label>
          <select
            style={styles.select}
            value={type}
            onChange={(e) => setType(e.target.value as PredictionType)}
          >
            <option value="Roster Move">Roster Move</option>
            <option value="Match Result">Match Result</option>
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Title</label>
          <input
            style={styles.input}
            type="text"
            placeholder="Example: m0NESY joins Falcons"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Details</label>
          <textarea
            style={styles.textarea}
            placeholder="Optional details or reasoning"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>

        <div style={styles.buttonRow}>
          <button style={styles.primaryButton} onClick={addPrediction}>
            Add Prediction
          </button>
          <button style={styles.secondaryButton} onClick={resetAll}>
            Reset All
          </button>
        </div>
      </div>

      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Prediction History</h2>
        <input
          style={styles.searchInput}
          type="text"
          placeholder="Search predictions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={styles.grid}>
        {filtered.length === 0 ? (
          <div style={styles.card}>No predictions yet.</div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{item.title}</h3>
                <Badge label={item.type} type="info" />
              </div>

              <p>Status: {item.outcome}</p>
              <p>Points: {item.points_awarded}</p>
              <p>Created: {new Date(item.created_at).toLocaleString()}</p>
              {item.details ? <p>{item.details}</p> : null}

              {item.outcome === "pending" ? (
                <div style={styles.buttonRow}>
                  <button
                    style={styles.correctButton}
                    onClick={() => resolvePrediction(item.id, "correct")}
                  >
                    Mark Correct
                  </button>
                  <button
                    style={styles.wrongButton}
                    onClick={() => resolvePrediction(item.id, "wrong")}
                  >
                    Mark Wrong
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
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
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
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
  panel: {
    ...baseCard,
    display: "grid",
    gap: "16px",
    marginBottom: "24px",
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
  input: {
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #4b5563",
    background: "#0f172a",
    color: "#f9fafb",
  },
  textarea: {
    minHeight: "100px",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #4b5563",
    background: "#0f172a",
    color: "#f9fafb",
    resize: "vertical",
  },
  buttonRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  primaryButton: {
    padding: "12px 16px",
    borderRadius: "12px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid #374151",
    background: "#111827",
    color: "#e5e7eb",
    fontWeight: 700,
    cursor: "pointer",
  },
  correctButton: {
    padding: "10px 14px",
    borderRadius: "12px",
    border: "none",
    background: "#16a34a",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  wrongButton: {
    padding: "10px 14px",
    borderRadius: "12px",
    border: "none",
    background: "#dc2626",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  sectionTitle: {
    margin: 0,
  },
  searchInput: {
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #4b5563",
    background: "#0f172a",
    color: "#f9fafb",
    minWidth: "260px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
  },
  card: {
    ...baseCard,
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
};