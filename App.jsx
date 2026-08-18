import React, { Suspense, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Layout } from "./components/Layout.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { routes } from "./routes.js";
import { getItems, getJson, logout, me } from "./lib/api.js";
import "./styles.css";

function LoadingPage() {
  return (
    <section className="page">
      <div className="mc-section">
        <h2>Laddar modul...</h2>
      </div>
    </section>
  );
}

function App() {
  const [active, setActive] = useState("dashboard");
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [user, setUser] = useState(null);

  const [health, setHealth] = useState({});
  const [analytics, setAnalytics] = useState({});
  const [matches, setMatches] = useState([]);
  const [gameEvents, setGameEvents] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);
  const [scout, setScout] = useState([]);
  const [profile, setProfile] = useState([]);
  const [media, setMedia] = useState([]);
  const [travel, setTravel] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [familyTasks, setFamilyTasks] = useState([]);

  async function loadAll() {
    const jobs = [
      getJson("/api/health", {}).then(setHealth),
      getJson("/api/analytics", {}).then(setAnalytics),
      getItems("matches", []).then(items => {
        setMatches(items);
        setSelectedMatchId(current => current || items[0]?.id || null);
      }),
      getItems("game_events", []).then(setGameEvents),
      getItems("player_stats", []).then(setPlayerStats),
      getItems("scout", []).then(setScout),
      getItems("player_profile", []).then(setProfile),
      getItems("media", []).then(setMedia),
      getItems("travel", []).then(setTravel),
      getItems("documents", []).then(setDocuments),
      getItems("family_tasks", []).then(setFamilyTasks)
    ];

    await Promise.allSettled(jobs);
  }

  useEffect(() => {
    loadAll();
    me().then(response => setUser(response?.user || null)).catch(() => setUser(null));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {});
    }
  }, []);

  async function handleLogout() {
    await logout().catch(() => {});
    setUser(null);
    setActive("dashboard");
  }

  const sharedProps = useMemo(() => ({
    active,
    setActive,
    selectedMatchId,
    setSelectedMatchId,
    user,
    setUser,
    health,
    analytics,
    matches,
    setMatches,
    gameEvents,
    setGameEvents,
    playerStats,
    setPlayerStats,
    scout,
    setScout,
    profile,
    setProfile,
    media,
    setMedia,
    travel,
    setTravel,
    documents,
    setDocuments,
    familyTasks,
    setFamilyTasks,
    reload: loadAll,
    onLogin: setUser,
    onLogout: handleLogout
  }), [
    active,
    selectedMatchId,
    user,
    health,
    analytics,
    matches,
    gameEvents,
    playerStats,
    scout,
    profile,
    media,
    travel,
    documents,
    familyTasks
  ]);

  const route = routes[active] || routes.dashboard;
  const ActivePage = route.component;

  return (
    <Layout
      active={active}
      setActive={setActive}
      user={user}
      onLogout={handleLogout}
    >
      <ErrorBoundary key={active} moduleName={route.label}>
        <Suspense fallback={<LoadingPage />}>
          <ActivePage {...sharedProps} />
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}

createRoot(document.getElementById("root")).render(<App />);
