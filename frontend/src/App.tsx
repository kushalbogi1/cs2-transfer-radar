import { BrowserRouter, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import DreamTeam from "./pages/DreamTeam";
import PlayerPage from "./pages/PlayerPage";
import Players from "./pages/Players";
import Simulator from "./pages/Simulator";
import TeamPage from "./pages/TeamPage";
import Teams from "./pages/Teams";
import TransferBattle from "./pages/TransferBattle";

export default function App() {
  return (
    <BrowserRouter>
      <div style={styles.app}>
        <NavBar />
        <main style={styles.main}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:teamId" element={<TeamPage />} />
            <Route path="/players" element={<Players />} />
            <Route path="/players/:playerId" element={<PlayerPage />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/dream-team" element={<DreamTeam />} />
            <Route path="/transfer-battle" element={<TransferBattle />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, rgba(30, 41, 59, 0.55) 0%, rgba(11, 18, 32, 1) 42%)",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  main: {
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "8px 0 40px 0",
  },
};