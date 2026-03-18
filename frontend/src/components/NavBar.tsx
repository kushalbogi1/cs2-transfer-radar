import { NavLink } from "react-router-dom";

export default function NavBar() {
  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <NavLink to="/" style={styles.brandLink}>
          <div style={styles.brand}>CS2 Transfer Radar</div>
        </NavLink>

        <div style={styles.links}>
          <NavLink to="/" style={({ isActive }) => getLinkStyle(isActive)}>
            Home
          </NavLink>
          <NavLink to="/teams" style={({ isActive }) => getLinkStyle(isActive)}>
            Teams
          </NavLink>
          <NavLink to="/players" style={({ isActive }) => getLinkStyle(isActive)}>
            Players
          </NavLink>
          <NavLink to="/simulator" style={({ isActive }) => getLinkStyle(isActive)}>
            Simulator
          </NavLink>
          <NavLink to="/dream-team" style={({ isActive }) => getLinkStyle(isActive)}>
            Dream Team
          </NavLink>
          <NavLink to="/transfer-battle" style={({ isActive }) => getLinkStyle(isActive)}>
            Transfer Battle
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

function getLinkStyle(isActive: boolean): React.CSSProperties {
  return {
    color: isActive ? "#ffffff" : "#cbd5e1",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "14px",
    padding: "10px 14px",
    borderRadius: "10px",
    background: isActive ? "rgba(37, 99, 235, 0.18)" : "transparent",
    border: isActive ? "1px solid rgba(59, 130, 246, 0.35)" : "1px solid transparent",
    transition: "all 0.2s ease",
  };
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    backdropFilter: "blur(10px)",
    background: "rgba(11, 18, 32, 0.82)",
    borderBottom: "1px solid rgba(55, 65, 81, 0.7)",
  },
  inner: {
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "14px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
  },
  brandLink: {
    textDecoration: "none",
  },
  brand: {
    color: "#f8fafc",
    fontWeight: 800,
    fontSize: "20px",
    letterSpacing: "-0.02em",
  },
  links: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
};