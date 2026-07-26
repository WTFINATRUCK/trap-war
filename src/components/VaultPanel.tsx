import type { GameState } from "@/lib/game/types";
import { RANKS } from "@/lib/game/constants";

interface VaultPanelProps {
  game: GameState | null;
  lastScore: number;
  walletConnected: boolean;
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

export default function VaultPanel({ game, lastScore, walletConnected }: VaultPanelProps) {
  const protectedReserves = game?.protectedReserves ?? 0;
  const payToEarn = game?.payToEarnBoost ?? false;
  const progress = yieldProgress(game);
  const rankName = RANKS.find((r) => r.id === game?.rank)?.name ?? "Corner Boy";

  return (
    <>
      {/* Protected Vault */}
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
        <div className="vault-label">Locked Reserves</div>
        <p className="vault-copy">8% of every win auto-locks here. Untouchable gas stash.</p>
      </div>

      {lastScore > 0 && (
        <div className="stat-card" style={{ marginBottom: "1.25rem" }}>
          <div className="label">Last Run Value</div>
          <div className="value green">${lastScore.toLocaleString()}</div>
        </div>
      )}

      {/* Dynamic Founder NFT */}
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
        Claim your 1-of-1 PFP after day 1 — gas sponsored. Chain thickens as you rank up.
      </p>

      {/* Pay-to-Earn */}
      <h2>Pay-to-Earn</h2>
      {payToEarn ? (
        <div className="boost-banner">
          <span className="boost-icon">⚡</span>
          SIM BOOST ACTIVE — 1.5× yield
        </div>
      ) : (
        <p className="boost-idle">
          Deposit $10+ in TON or USDT Jetton for 1.5× yield + extended raid shield. Week 2 goes live
          on-chain.
        </p>
      )}
      <button type="button" className="action-button ton" disabled>
        {walletConnected ? "TON Connect — week 2" : "Connect TON Wallet"}
      </button>

      <h2 style={{ marginTop: "1.5rem" }}>Coming Soon</h2>
      <div className="client-row">
        <strong>Week 2</strong> — TON Connect · real Pay-to-Earn · on-chain crew payouts
      </div>
      <div className="client-row">
        <strong>Founder NFT</strong> — sponsored mint · evolves with rank & vault
      </div>
      <div className="client-row">
        <strong>Channel</strong> — Word on the Street drops · NFT rush
      </div>
      <div className="client-row">
        <strong>Later</strong> — Base / Aerodrome LP · leaderboards · crew wars
      </div>
      <p className="boost-idle" style={{ marginTop: "0.75rem" }}>
        In Telegram bot: /guide (how to play) · /soon (roadmap)
      </p>
    </>
  );
}
