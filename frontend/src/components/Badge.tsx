export default function Badge({
  label,
  type,
}: {
  label: string;
  type: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  const palette: Record<
    string,
    { bg: string; border: string; text: string }
  > = {
    success: {
      bg: "rgba(22, 163, 74, 0.15)",
      border: "rgba(34, 197, 94, 0.35)",
      text: "#86efac",
    },
    warning: {
      bg: "rgba(234, 179, 8, 0.15)",
      border: "rgba(250, 204, 21, 0.35)",
      text: "#fde68a",
    },
    danger: {
      bg: "rgba(220, 38, 38, 0.15)",
      border: "rgba(248, 113, 113, 0.35)",
      text: "#fca5a5",
    },
    info: {
      bg: "rgba(37, 99, 235, 0.16)",
      border: "rgba(96, 165, 250, 0.35)",
      text: "#93c5fd",
    },
    neutral: {
      bg: "rgba(107, 114, 128, 0.16)",
      border: "rgba(156, 163, 175, 0.35)",
      text: "#d1d5db",
    },
  };

  const c = palette[type] ?? palette.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        letterSpacing: "0.01em",
      }}
    >
      {label}
    </span>
  );
}