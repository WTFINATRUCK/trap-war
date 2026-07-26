import { useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { useCloudSave } from "@/hooks/useCloudSave";
import TrapWarGame from "@/components/TrapWarGame";
import CrewPanel from "@/components/CrewPanel";
import VaultPanel from "@/components/VaultPanel";

type Tab = "game" | "crew" | "vault";

export default function App() {
  const { user, ready } = useTelegram();
  const { save, loading, saveGame } = useCloudSave(user);
  const [tab, setTab] = useState<Tab>("game");
  const [score, setScore] = useState(0);

  if (!ready) {
    return <div className="loading-screen">LOADING TRAP WAR…</div>;
  }

  if (!user) {
    return (
      <div className="start-screen">
        <div className="start-content">
          <h1>TRAP WAR</h1>
          <p>
            Open from Telegram, or add <code>?tg=12345</code> for local dev.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-screen">SYNCING YOUR STASH…</div>;
  }

  const cash = save?.game?.cash ?? 500;

  return (
    <div className="telegram-shell">
      <div className="app">
        <div id="game-container">
          <header className="app-header">
            <h1>TRAP WAR</h1>
            <div className="cash-pill">
              <span className="cash-icon">$</span>
              {cash.toLocaleString()}
            </div>
          </header>
          <div className="user-tag">
            {user.firstName || user.username || `ID ${user.id}`}
            {user.isTelegram ? " · Telegram" : " · Dev"}
          </div>
          <nav className="app-nav">
            <button type="button" className={tab === "game" ? "active" : ""} onClick={() => setTab("game")}>
              HUSTLE
            </button>
            <button type="button" className={tab === "crew" ? "active" : ""} onClick={() => setTab("crew")}>
              CREW
            </button>
            <button type="button" className={tab === "vault" ? "active" : ""} onClick={() => setTab("vault")}>
              VAULT
            </button>
          </nav>

          {tab === "game" && (
            <TrapWarGame
              telegramId={user.id}
              initialGame={save?.game ?? null}
              onSave={saveGame}
              onGameOver={setScore}
            />
          )}
          {tab === "crew" && (
            <div className="side-panel">
              <CrewPanel telegramId={user.id} cloudSave={save} />
            </div>
          )}
          {tab === "vault" && (
            <div className="side-panel">
              <VaultPanel
                game={save?.game ?? null}
                lastScore={score}
                walletConnected={!!save?.walletAddress}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
