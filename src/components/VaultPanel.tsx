import type { GameState } from "@/lib/game/types";
import { RANKS } from "@/lib/game/constants";

interface VaultPanelProps {
  game: GameState | null;
  lastScore: number;
  walletConnected: boolean;
  runsCompleted?: number;
  bestRunScore?: number;
}

/** Yield meter progress from rank + vault size (0–100) for NFT showcase */
function yieldProgress(game: GameState | null): number {
  if (!game) return 8;
  const rankIdx = RANKS.findIndex((r) => r.id === game.rank);
  const rankPct = Math.max(0, rankIdx) * 14;
  const vaultPct = Math.min(40, (game.protectedReserves / 500) * 20);
  const dayPct = Math.min(25, (game.day / 30) * 25);
  return Math.min(100, Math.round(8 + rankPct + vaultPct + dayPct));
}

export default function VaultPanel({
  game,
  lastScore,
  walletConnected,
  runsCompleted = 0,
  bestRunScore = 0,
}: VaultPanelProps) {
  const protectedReserves = game?.protectedReserves ?? 0;
  const payToEarn = game?.payToEarnBoost ?? false;
  const progress = yieldProgress(game);
  const rankName = RANKS.find((r) => r.id === game?.rank)?.name ?? "Corner Boy";

  return (
    <>
      <h2>Career</h2>
      <div className="stat-card" style={{ marginBottom: "0.65rem" }}>
        <div className="label">30-day runs completed</div>
        <div className="value green">{runsCompleted}</div>
      </div>
      {bestRunScore > 0 && (
        <div className="stat-card" style={{ marginBottom: "1.25rem" }}>
          <div className="label">Best run value</div>
          <div className="value">${bestRunScore.toLocaleString()}</div>
        </div>
      )}

      {/* Protected Vault — in-game sim only (not real funds) */}
      <div className="preview-badge">IN-GAME ONLY · NOT REAL MONEY</div>
      <h2>Protected Vault</h2>
      <div className="vault-hero">
        <div className="vault-particles" aria-hidden>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="vault-shield" aria-hidden>
          🛡️
        </div>
        <div className="vault-amount">${protectedReserves.toLocaleString()}</div>
        <div className="vault-label">Sim Locked Reserves</div>
        <p className="vault-copy">
          8% of every in-game win auto-locks here for the run. Numbers are for play — no real crypto
          is deposited or withdrawable yet.
        </p>
      </div>

      {lastScore > 0 && (
        <div className="stat-card" style={{ marginBottom: "1.25rem" }}>
          <div className="label">Last Run Value</div>
          <div className="value green">${lastScore.toLocaleString()}</div>
        </div>
      )}

      {/* Dynamic Founder NFT — preview only */}
      <div className="preview-badge">PREVIEW · NOT MINTABLE YET</div>
      <h2>Founder NFT</h2>
      <div className="nft-showcase">
        <div className="nft-frame">
          <div className="nft-aura" aria-hidden />
          <div className="nft-sparkles" aria-hidden>
            <span>✦</span>
            <span>$</span>
            <span>✦</span>
            <span>$</span>
          </div>
          <div className="nft-character">
            <div className="nft-face" title="Cartel Boss" />
            <div className="nft-chain" title="Miami Cuban" />
            <div className="nft-pendant" title="Trap War logo" />
          </div>
        </div>
        <div className="nft-title">
          {rankName === "Trap God" || rankName === "Trap Lord"
            ? "Late-game Boss"
            : rankName === "Hustler" || rankName === "Kingpin"
              ? "Midgame Hustler"
              : "Day 1 Broke"}{" "}
          · {rankName}
        </div>
        <div className="nft-subtitle">Evolves with rank · gold chain · purple aura · gas sponsored week 2</div>
        <div className="yield-meter">
          <div className="yield-meter-label">
            <span>Yield Power</span>
            <span>{progress}%</span>
          </div>
          <div className="yield-meter-track">
            <div className="yield-meter-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="progress-strip">
          <div className={`progress-card ${progress < 40 ? "active" : ""}`}>
            <strong>Day 1</strong>
            Broke
          </div>
          <div className={`progress-card ${progress >= 40 && progress < 75 ? "active" : ""}`}>
            <strong>Mid</strong>
            Hustler
          </div>
          <div className={`progress-card ${progress >= 75 ? "active" : ""}`}>
            <strong>Late</strong>
            Boss + Whip
          </div>
        </div>
      </div>
      <p className="boost-idle" style={{ marginBottom: "1.5rem" }}>
        Concept art for a future 1-of-1 PFP. No mint, no ownership, no gas — beta showcase only. Later
        it will evolve with rank.
      </p>

      {/* Pay-to-Earn — sim only */}
      <div className="preview-badge">SIM ONLY · NO DEPOSITS</div>
      <h2>Pay-to-Earn</h2>
      {payToEarn ? (
        <div className="boost-banner">
          <span className="boost-icon">⚡</span>
          SIM BOOST ACTIVE — 1.5× in-game yield (not real money)
        </div>
      ) : (
        <p className="boost-idle">
          Real deposits (TON / USDT) are not live. Do not send crypto to anyone. When week 2 ships, a
          wallet connect will appear here after contracts are audited.
        </p>
      )}
      <button type="button" className="action-button ton" disabled title="Not available in beta">
        {walletConnected ? "TON Connect — not live" : "Wallet connect — not live"}
      </button>
      <p className="boost-idle" style={{ marginTop: "0.5rem", fontSize: "0.7rem" }}>
        Never share seed phrases. Official play: Telegram bot only.
      </p>

      <h2 style={{ marginTop: "1.5rem" }}>Coming Soon (not live)</h2>
      <div className="client-row">
        <strong>Later</strong> — TON Connect · real Pay-to-Earn · audited contracts
      </div>
      <div className="client-row">
        <strong>Later</strong> — Founder NFT mint · evolves with rank & vault
      </div>
      <div className="client-row">
        <strong>Later</strong> — Word on the Street drops · leaderboards · crew wars
      </div>
      <p className="boost-idle" style={{ marginTop: "0.75rem" }}>
        Bot: /guide (how to play) · /soon (roadmap) · beta = free game only
      </p>
    </>
  );
}
