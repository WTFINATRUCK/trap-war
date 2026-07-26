import { useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { useCloudSave } from "@/hooks/useCloudSave";
import TrapWarGame from "@/components/TrapWarGame";
import CrewPanel from "@/components/CrewPanel";
import VaultPanel from "@/components/VaultPanel";
import { BOT_LINK, CHANNEL_URL, COMMUNITY_URL, isLiveTelegramUrl } from "@/config/telegram";

type Tab = "game" | "crew" | "vault";

export default function App() {
  const { user, ready } = useTelegram();
  const { save, loading, saveGame, persist } = useCloudSave(user);
  const [tab, setTab] = useState<Tab>("game");
  const [score, setScore] = useState(0);
  const [hideChannelBanner, setHideChannelBanner] = useState(false);

  if (!ready) {
    return <div className="loading-screen">LOADING TRAP WAR…</div>;
  }

  if (!user) {
    return (
      <div className="start-screen">
        <div className="start-content">
          <h1>TRAP WAR</h1>
          <p>Open from Telegram via the bot, or use local dev with <code>?tg=12345</code>.</p>
          <div className="start-buttons">
            <a className="action-button" href={BOT_LINK} style={{ textDecoration: "none", display: "block" }}>
              Open Telegram Bot
            </a>
            {isLiveTelegramUrl(COMMUNITY_URL) && (
              <a
                className="action-button"
                href={COMMUNITY_URL}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none", display: "block" }}
              >
                💬 Join Community Chat
              </a>
            )}
            <a
              className="action-button ghost"
              href={CHANNEL_URL}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none", display: "block" }}
            >
              📢 Join Channel
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-screen">SYNCING YOUR STASH…</div>;
  }

  const cash = save?.game?.cash ?? 500;
  const invites = save?.inviteCount ?? 0;
  const runsCompleted = save?.runsCompleted ?? 0;

  return (
    <div className="telegram-shell">
      <div className="app">
        <div id="game-container">
          <header className="app-header">
            <h1>TRAP WAR</h1>
            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <div
                className="cash-pill runs-pill"
                title="Full 30-day runs completed"
              >
                <span className="cash-icon" style={{ background: "linear-gradient(145deg,#facc15,#ca8a04)" }}>
                  30
                </span>
                {runsCompleted}
              </div>
              <button
                type="button"
                className="cash-pill"
                style={{ cursor: "pointer", border: "1px solid var(--border-strong)" }}
                title="Your invite count — open CREW"
                onClick={() => setTab("crew")}
              >
                <span className="cash-icon" style={{ background: "linear-gradient(145deg,#c084fc,#7c3aed)" }}>
                  ↗
                </span>
                {invites}
              </button>
              <div className="cash-pill">
                <span className="cash-icon">$</span>
                {cash.toLocaleString()}
              </div>
            </div>
          </header>
          <div className="user-tag">
            {user.firstName || user.username || `ID ${user.id}`}
            {user.isTelegram ? " · Telegram" : " · Dev"}
            {" · "}
            <a href={BOT_LINK} style={{ color: "var(--purple)", textDecoration: "none" }}>
              Bot
            </a>
          </div>
          <div className="beta-banner" role="status">
            <strong>PRIVATE BETA</strong>
            <span>
              Free game · no real money · vault / NFT / pay-to-earn are previews only · progress can
              reset
            </span>
          </div>
          {!hideChannelBanner && (
            <div className="channel-banner">
              <div className="channel-banner-links">
                {isLiveTelegramUrl(COMMUNITY_URL) ? (
                  <a href={COMMUNITY_URL} target="_blank" rel="noreferrer" className="channel-banner-link">
                    💬 Community chat — talk with players
                  </a>
                ) : null}
                <a href={CHANNEL_URL} target="_blank" rel="noreferrer" className="channel-banner-link">
                  📢 Channel — Word on the Street
                </a>
              </div>
              <button
                type="button"
                className="channel-banner-x"
                aria-label="Dismiss"
                onClick={() => setHideChannelBanner(true)}
              >
                ×
              </button>
            </div>
          )}
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
              runsCompleted={runsCompleted}
            />
          )}
          {tab === "crew" && (
            <div className="side-panel">
              <CrewPanel
                telegramId={user.id}
                cloudSave={save}
                onInviteCountChange={(count) => {
                  if (save && (save.inviteCount ?? 0) !== count) {
                    void persist({ ...save, inviteCount: count });
                  }
                }}
              />
            </div>
          )}
          {tab === "vault" && (
            <div className="side-panel">
              <VaultPanel
                game={save?.game ?? null}
                lastScore={score}
                walletConnected={!!save?.walletAddress}
                runsCompleted={runsCompleted}
                bestRunScore={save?.bestRunScore ?? 0}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
