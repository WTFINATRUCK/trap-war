import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ADJACENT_CITIES,
  ASSETS,
  CITIES,
  MAX_ACTIONS_PER_DAY,
  MAX_DAYS,
  RANKS,
  type CityId,
} from "@/lib/game/constants";
import {
  buyAsset,
  canTravelTo,
  createInitialState,
  enablePayToEarn,
  endRunEarly,
  fightBack,
  getSellPrice,
  grantDispatcherGift,
  migrateSavedState,
  plantStash,
  retrieveStash,
  sellAsset,
  travel,
  usePlug,
  calculateTotalValue,
} from "@/lib/game/engine";
import type { GameMessage, GameState } from "@/lib/game/types";
import { processCompletionBonus, processDailyReferralDrip } from "@/lib/game/referralDrip";
import TrapPhone from "./TrapPhone";

interface TrapWarGameProps {
  telegramId: number;
  initialGame: GameState | null;
  onSave: (game: GameState) => Promise<void>;
  onGameOver: (score: number) => void;
}

type Sheet = "market" | "travel" | "stash" | null;
type Overlay = "inventory" | "phone" | null;

function displayName(name: string): string {
  if (name === "Coke") return "Cocaine";
  if (name === "Meth") return "Crystal";
  if (name === "The Stick") return "Glock 19";
  if (name === "The Chopper") return "Chopper";
  if (name === "The Whip") return "Whip";
  if (name === "The Plug") return "Plug Phone";
  return name;
}

const STREET_NAMES = ["P-Nut", "Big Lou", "Kayla", "Uncle Ray", "Ms. Pearl", "Dispatcher"];

export default function TrapWarGame({ telegramId, initialGame, onSave, onGameOver }: TrapWarGameProps) {
  const [gameState, setGameState] = useState<GameState | null>(initialGame);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showModal, setShowModal] = useState<GameMessage | null>(null);
  const [dispatcherGiftPending, setDispatcherGiftPending] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [marketMode, setMarketMode] = useState<"buy" | "sell">("buy");

  useEffect(() => {
    setGameState(initialGame);
  }, [initialGame]);

  const saveGame = useCallback(
    async (state: GameState) => {
      setGameState(state);
      await onSave(state);
    },
    [onSave]
  );

  const pushMessages = (msgs: GameMessage[]) => {
    if (msgs.length === 0) return;
    setMessages((prev) => [...msgs, ...prev].slice(0, 50));
    const important = msgs.find((m) => m.type === "street" || m.type === "event" || m.title);
    if (important) setShowModal(important);
  };

  const applyResult = async (state: GameState, msgs: GameMessage[]) => {
    const prevYield = gameState?.grossYieldLastDay ?? 0;
    await saveGame(state);
    pushMessages(msgs);

    if (state.grossYieldLastDay > 0 && state.grossYieldLastDay !== prevYield) {
      processDailyReferralDrip(telegramId, state.grossYieldLastDay);
    }
    if (state.clientProgress.dispatcher.complete && !state.dispatcherGiftClaimed) {
      setDispatcherGiftPending(true);
    }
    if (state.gameOver) {
      processCompletionBonus(telegramId, state.totalProtectedAtCompletion);
      onGameOver(state.finalScore);
    }
  };

  const startNewGame = async () => {
    const state = createInitialState();
    await saveGame(state);
    setMessages([]);
    setSheet(null);
    setOverlay(null);
    pushMessages([
      {
        type: "street",
        title: "Word on the Street",
        text: "Build your empire. Survive the streets. Become a legend. RUN THE CITY.",
      },
    ]);
  };

  const setQty = (name: string, v: number) => setQuantities((p) => ({ ...p, [name]: Math.max(1, v) }));

  const handleBuy = async (name: string) => {
    if (!gameState) return;
    const result = buyAsset(gameState, name, quantities[name] || 1);
    if (!result.blocked) await applyResult(result.state, result.messages);
    else pushMessages(result.messages);
  };

  const handleSell = async (name: string) => {
    if (!gameState) return;
    const result = sellAsset(gameState, name, quantities[name] || 1);
    if (!result.blocked) await applyResult(result.state, result.messages);
    else pushMessages(result.messages);
  };

  const handlePlant = async (name: string) => {
    if (!gameState) return;
    const result = plantStash(gameState, name, quantities[name] || 1);
    if (!result.blocked) await applyResult(result.state, result.messages);
    else pushMessages(result.messages);
  };

  const handleTravel = async (city: CityId, mode: "walk" | "chopper" | "whip") => {
    if (!gameState) return;
    const result = travel(gameState, city, mode);
    if (!result.blocked) {
      await applyResult(result.state, result.messages);
      setSheet(null);
    } else pushMessages(result.messages);
  };

  const handleFightBack = async (accept: boolean) => {
    if (!gameState) return;
    const result = fightBack(gameState, accept);
    await applyResult(result.state, result.messages);
  };

  const openMarket = (mode: "buy" | "sell") => {
    setMarketMode(mode);
    setOverlay(null);
    setSheet("market");
  };

  const notifFeed = useMemo(() => {
    const feed: { from: string; text: string; hot?: boolean }[] = [];
    messages.slice(0, 4).forEach((m, i) => {
      feed.push({
        from: STREET_NAMES[i % STREET_NAMES.length],
        text: m.text.slice(0, 72) + (m.text.length > 72 ? "…" : ""),
        hot: m.type === "success" || m.type === "street",
      });
    });
    if (feed.length === 0) {
      feed.push(
        { from: "P-Nut", text: "Compton quiet. Cop mids if prices soft.", hot: true },
        { from: "Kayla", text: "Check Market before you travel.", hot: false },
        { from: "Big Lou", text: "Heat rises with loud bags. Stay sharp." }
      );
    }
    return feed;
  }, [messages]);

  if (!gameState) {
    return (
      <div className="start-screen" style={{ minHeight: "480px", height: "auto", position: "relative" }}>
        <div className="start-content">
          <h1>TRAP WAR</h1>
          <p>Build your empire. Survive the streets. Become a legend.</p>
          <p style={{ fontSize: "0.75rem", color: "var(--dim)", marginTop: "-0.5rem" }}>
            Get Info → Buy Low → Travel → Sell High → Upgrade → Dominate
          </p>
          <div className="start-buttons">
            <button type="button" onClick={startNewGame} className="action-button">
              New Run
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.gameOver) {
    return (
      <section className="game-complete">
        <h2>RUN COMPLETE</h2>
        <p className="score">${gameState.finalScore.toLocaleString()}</p>
        <p>
          Protected: <span className="stat-value">${gameState.protectedReserves.toLocaleString()}</span>
        </p>
        <p className="log-info">{RANKS.find((r) => r.id === gameState.rank)?.name}</p>
        <button type="button" onClick={startNewGame} className="action-button" style={{ marginTop: "1rem" }}>
          Play Again
        </button>
      </section>
    );
  }

  const g = migrateSavedState(gameState);
  const rankName = RANKS.find((r) => r.id === g.rank)?.name ?? "Corner Boy";
  const planted = g.plantedStashes[g.location];
  const totalValue = calculateTotalValue(g);
  const invItems = Object.entries(g.inventory).filter(([, q]) => q > 0);
  const bagUnits = invItems.reduce((s, [, q]) => s + q, 0);
  const marketAssets = ASSETS.filter((a) => g.day >= a.availableFromDay);

  const energyPct = Math.round((g.actionsLeft / MAX_ACTIONS_PER_DAY) * 100);
  const heatPct = Math.min(
    100,
    Math.round((g.day / MAX_DAYS) * 35 + bagUnits * 0.5 + (g.inventory["Meth"] || 0) * 3 + (g.inventory["Molly"] || 0) * 2)
  );
  const repPct = Math.min(100, Math.round((totalValue / 50000) * 100));

  const stashValue = planted
    ? getSellPrice(g, planted.asset) * planted.units
    : 0;

  const held = (assetName: string, category: string) => {
    if (category === "weapon") return g.stickCount;
    if (assetName === "The Chopper") return g.hasChopper ? 1 : 0;
    if (assetName === "The Whip") return g.hasWhip ? 1 : 0;
    return g.inventory[assetName] || 0;
  };

  return (
    <div className="hustle-root">
      {/* Modals */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            {showModal.title && <h3>{showModal.title}</h3>}
            <p>{showModal.text}</p>
            <button type="button" className="action-button" onClick={() => setShowModal(null)}>
              Continue
            </button>
          </div>
        </div>
      )}

      {g.pendingFightBack && (
        <div className="modal-overlay">
          <div className="modal-box danger">
            <h3>ROBBERY</h3>
            <p>They tested you. Lost ${g.pendingFightBack.lossAmount.toLocaleString()}</p>
            <div className="modal-actions">
              <button type="button" className="action-button ghost" onClick={() => handleFightBack(false)}>
                Let it go
              </button>
              <button type="button" className="action-button sell" onClick={() => handleFightBack(true)}>
                Fight back
              </button>
            </div>
          </div>
        </div>
      )}

      {dispatcherGiftPending && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>DISPATCHER GIFT</h3>
            <p>Pick your ride — hop without burning the day.</p>
            <div className="modal-actions">
              <button
                type="button"
                className="action-button"
                onClick={async () => {
                  const r = grantDispatcherGift(g, "chopper");
                  await applyResult(r.state, r.messages);
                  setDispatcherGiftPending(false);
                }}
              >
                Chopper
              </button>
              <button
                type="button"
                className="action-button"
                onClick={async () => {
                  const r = grantDispatcherGift(g, "whip");
                  await applyResult(r.state, r.messages);
                  setDispatcherGiftPending(false);
                }}
              >
                Whip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trap Phone full screen */}
      {overlay === "phone" && (
        <TrapPhone
          game={g}
          streetMessages={notifFeed}
          onClose={() => setOverlay(null)}
          onOpenTravel={() => {
            setOverlay(null);
            setSheet("travel");
          }}
        />
      )}

      {/* Inventory slide-over */}
      {overlay === "inventory" && (
        <>
          <div className="overlay-dim" onClick={() => setOverlay(null)} />
          <aside className="panel-slide">
            <div className="panel-header">
              <h2>Inventory</h2>
              <button type="button" className="panel-close" onClick={() => setOverlay(null)}>
                ×
              </button>
            </div>
            <div className="panel-body">
              <h3 className="section-title">Products</h3>
              <div className="inv-list">
                {ASSETS.filter((a) => a.category === "core").map((a) => {
                  const qty = g.inventory[a.name] || 0;
                  return (
                    <div key={a.name} className="inv-row">
                      <div>
                        <div className="inv-name">
                          {a.emoji} {displayName(a.name)}
                        </div>
                        <div className="inv-sub">{a.defiLabel}</div>
                      </div>
                      <div className="inv-qty">×{qty}</div>
                    </div>
                  );
                })}
              </div>

              <h3 className="section-title">Equipment</h3>
              <div className="inv-list">
                <div className="inv-row">
                  <div>
                    <div className="inv-name">🔫 Glock 19</div>
                    <div className="inv-sub">Robbery deterrence · fight back</div>
                  </div>
                  <div className="inv-qty">×{g.stickCount}</div>
                </div>
                <div className="inv-row">
                  <div>
                    <div className="inv-name">🦺 Body Armor</div>
                    <div className="inv-sub">Raid shield when stash planted</div>
                  </div>
                  <div className="inv-qty">{planted ? "Active" : "—"}</div>
                </div>
                <div className="inv-row">
                  <div>
                    <div className="inv-name">⚖️ Scale</div>
                    <div className="inv-sub">Bag {bagUnits}/{g.coatSpace}</div>
                  </div>
                  <div className="inv-qty">{Math.round((bagUnits / g.coatSpace) * 100)}%</div>
                </div>
                {g.hasChopper && (
                  <div className="inv-row">
                    <div className="inv-name">🏍️ Chopper</div>
                    <div className="inv-qty">{g.chopperHopsLeft} hops</div>
                  </div>
                )}
                {g.hasWhip && (
                  <div className="inv-row">
                    <div className="inv-name">🚗 Whip</div>
                    <div className="inv-qty">{g.whipHopsLeft} hops</div>
                  </div>
                )}
              </div>

              <div className="cash-stack">
                <div className="cs-label">Cash Stack</div>
                <div className="cs-value">${g.cash.toLocaleString()}</div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Hero stage */}
      <div className="hero-stage">
        <div className="hud-top">
          <div className="hud-left">
            <div className="hud-day-block">
              <div className="hud-day">
                DAY {g.day}
                <span style={{ opacity: 0.5, fontWeight: 600 }}> / {MAX_DAYS}</span>
              </div>
              <div className="hud-city">
                {g.location}, California
              </div>
            </div>
            <div className="hud-stat-row">
              <div className="hud-stat">
                <div className="hs-label">Heat level</div>
                <div className="hs-value" style={{ color: "var(--red)" }}>
                  {heatPct}%
                </div>
              </div>
              <div className="hud-stat">
                <div className="hs-label">Energy</div>
                <div className="hs-value" style={{ color: "var(--yellow)" }}>
                  {g.actionsLeft}/{MAX_ACTIONS_PER_DAY}
                </div>
              </div>
              <div className="hud-stat">
                <div className="hs-label">Reputation</div>
                <div className="hs-value">
                  {rankName} · {repPct}%
                </div>
              </div>
              <div className="hud-stat">
                <div className="hs-label">Bag capacity</div>
                <div className="hs-value">
                  {bagUnits}/{g.coatSpace}
                </div>
              </div>
            </div>
          </div>

          <div className="hud-right">
            <div className="cash-display">
              <span className="cash-ico">$</span>
              {g.cash.toLocaleString()}
            </div>
            <div className="meter">
              <div className="meter-label">
                <span>Heat</span>
                <span>{heatPct}%</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill heat" style={{ width: `${heatPct}%` }} />
              </div>
            </div>
            <div className="meter">
              <div className="meter-label">
                <span>Energy</span>
                <span>
                  {g.actionsLeft}/{MAX_ACTIONS_PER_DAY}
                </span>
              </div>
              <div className="meter-track">
                <div className="meter-fill energy" style={{ width: `${energyPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Notifications rail */}
        <div className="notif-rail" aria-label="Recent texts">
          {notifFeed.slice(0, 3).map((n, i) => (
            <div key={i} className={`notif-bubble ${n.hot ? "hot" : ""}`}>
              <div className="nb-from">{n.from}</div>
              <div>{n.text}</div>
            </div>
          ))}
        </div>

        <div className="bottom-meta">
          <div className="meta-chip">
            <div className="mc-label">Bag capacity</div>
            <div className="mc-value">
              {bagUnits}/{g.coatSpace}
            </div>
          </div>
          <div className="loop-hint">
            Get Info → Buy Low → Travel
            <br />
            Sell High → Upgrade → Dominate
          </div>
          <div className="meta-chip stash">
            <div className="mc-label">Stash value</div>
            <div className="mc-value">
              {planted ? `$${stashValue.toLocaleString()}` : "$0"}
            </div>
          </div>
        </div>
      </div>

      {/* Sheets: market / travel / stash */}
      {sheet && (
        <>
          <div
            className="overlay-dim"
            style={{ zIndex: 115 }}
            onClick={() => setSheet(null)}
          />
          <div className="sheet-bottom">
            <div className="panel-header">
              <h2>
                {sheet === "market" && (marketMode === "buy" ? "Buy" : "Sell")}
                {sheet === "travel" && "Travel"}
                {sheet === "stash" && "Stash"}
              </h2>
              <button type="button" className="panel-close" onClick={() => setSheet(null)}>
                ×
              </button>
            </div>
            <div className="panel-body">
              {sheet === "market" && (
                <>
                  <div className="asset-grid">
                    {marketAssets.map((asset) => {
                      const h = held(asset.name, asset.category);
                      const price =
                        asset.category === "core" ? getSellPrice(g, asset.name) : g.prices[asset.name];
                      const mid = (asset.minPrice + asset.maxPrice) / 2;
                      const chg = Math.round(((price - mid) / mid) * 100);
                      return (
                        <article key={asset.name} className="asset-card">
                          <div>
                            <div className="asset-name">
                              {asset.emoji} {displayName(asset.name)}
                            </div>
                            <div className="asset-tag">{asset.defiLabel}</div>
                            <div className="asset-meta">
                              <span>
                                Price <strong>${price}</strong>
                              </span>
                              <span className={chg >= 0 ? "up" : "down"}>
                                <strong>
                                  {chg >= 0 ? "+" : ""}
                                  {chg}%
                                </strong>
                              </span>
                              <span>
                                Hold <strong>{h}</strong>
                              </span>
                            </div>
                          </div>
                          <div className="asset-actions">
                            <input
                              type="number"
                              className="quantity-input"
                              min={1}
                              value={quantities[asset.name] || 1}
                              onChange={(e) => setQty(asset.name, parseInt(e.target.value, 10) || 1)}
                            />
                            <div className="btn-row">
                              {marketMode === "buy" ? (
                                <button
                                  type="button"
                                  className="action-button small"
                                  onClick={() => handleBuy(asset.name)}
                                >
                                  Buy
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="action-button sell small"
                                  onClick={() => handleSell(asset.name)}
                                >
                                  Sell
                                </button>
                              )}
                              {asset.category === "core" && !planted && (
                                <button
                                  type="button"
                                  className="action-button plant small"
                                  onClick={() => handlePlant(asset.name)}
                                >
                                  Plant
                                </button>
                              )}
                              {asset.name === "The Plug" && h > 0 && (
                                <button
                                  type="button"
                                  className="action-button intel small"
                                  onClick={async () => {
                                    const r = usePlug(g);
                                    await applyResult(r.state, r.messages);
                                  }}
                                >
                                  Intel
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  <p className="hint-text">3 actions/day · 4th ends day · plant stash for yield + shield</p>
                </>
              )}

              {sheet === "travel" && (
                <>
                  <div className="city-map">
                    {CITIES.map((city) => {
                      const gate = canTravelTo(g, city);
                      const isHere = city === g.location;
                      const locked = !gate.allowed && !gate.softPenalty;
                      let cls = "city-chip";
                      if (isHere) cls += " current";
                      else if (locked) cls += " locked";
                      else if (gate.softPenalty) cls += " soft-lock";
                      return (
                        <button
                          key={city}
                          type="button"
                          className={cls}
                          disabled={isHere || locked}
                          title={gate.reason}
                          onClick={() => !isHere && gate.allowed && handleTravel(city, "walk")}
                        >
                          {isHere && <span className="city-dot" />}
                          {locked ? `${city} 🔒` : city}
                        </button>
                      );
                    })}
                  </div>
                  {((g.hasChopper && g.chopperHopsLeft > 0) || (g.hasWhip && g.whipHopsLeft > 0)) && (
                    <div className="fast-travel">
                      {CITIES.filter((c) => c !== g.location).map((city) => {
                        const gate = canTravelTo(g, city);
                        if (!gate.allowed && !gate.softPenalty) return null;
                        if (g.hasChopper && g.chopperHopsLeft > 0) {
                          if (!ADJACENT_CITIES[g.location]?.includes(city)) return null;
                          return (
                            <button
                              key={`c-${city}`}
                              type="button"
                              className="action-button small"
                              onClick={() => handleTravel(city, "chopper")}
                            >
                              Chopper → {city}
                            </button>
                          );
                        }
                        if (g.hasWhip && g.whipHopsLeft > 0) {
                          return (
                            <button
                              key={`w-${city}`}
                              type="button"
                              className="action-button small"
                              onClick={() => handleTravel(city, "whip")}
                            >
                              Whip → {city}
                            </button>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                  <p className="hint-text">Walk = +1 day · city prices differ · watch heat</p>
                  <button
                    type="button"
                    className="action-button sell"
                    style={{ width: "100%", marginTop: "0.75rem" }}
                    onClick={async () => {
                      if (confirm(`End run on day ${g.day}?`)) {
                        const r = endRunEarly(g);
                        await applyResult(r.state, r.messages);
                      }
                    }}
                  >
                    End Run Early
                  </button>
                </>
              )}

              {sheet === "stash" && (
                <>
                  {planted ? (
                    <>
                      <div className="client-row done">
                        <strong>
                          {planted.units} {displayName(planted.asset)}
                        </strong>{" "}
                        in {g.location}
                        <br />
                        Shield {planted.shieldDaysLeft}d · Value ${stashValue.toLocaleString()}
                      </div>
                      <button
                        type="button"
                        className="action-button sell"
                        style={{ width: "100%" }}
                        onClick={async () => {
                          const r = retrieveStash(g);
                          if (!r.blocked) {
                            await applyResult(r.state, r.messages);
                            setSheet(null);
                          } else pushMessages(r.messages);
                        }}
                      >
                        Retrieve Stash
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="hint-text" style={{ marginBottom: "0.75rem" }}>
                        Plant product here for yield + raid shield. Open Buy, pick product, hit Plant.
                      </p>
                      <button type="button" className="action-button" style={{ width: "100%" }} onClick={() => openMarket("buy")}>
                        Open Market to Plant
                      </button>
                    </>
                  )}
                  {!g.payToEarnBoost && (
                    <button
                      type="button"
                      className="action-button ghost"
                      style={{ width: "100%", marginTop: "0.5rem" }}
                      onClick={async () => {
                        await saveGame(enablePayToEarn(g));
                        pushMessages([
                          {
                            type: "street",
                            title: "Pay-to-Earn",
                            text: "1.5× yield + extended shield. Week 2: TON deposit.",
                          },
                        ]);
                      }}
                    >
                      Sim Pay-to-Earn Boost
                    </button>
                  )}
                  <div className="progress-strip">
                    <div className={`progress-card ${g.rank === "corner_boy" || g.rank === "runner" ? "active" : ""}`}>
                      <strong>Day 1</strong>
                      Broke
                    </div>
                    <div className={`progress-card ${g.rank === "hustler" || g.rank === "kingpin" ? "active" : ""}`}>
                      <strong>Mid</strong>
                      Hustler
                    </div>
                    <div className={`progress-card ${g.rank === "trap_lord" || g.rank === "trap_god" ? "active" : ""}`}>
                      <strong>Late</strong>
                      Kingpin
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* 6-button dock */}
      <nav className="action-dock">
        <button
          type="button"
          className={`dock-btn ${sheet === "travel" ? "active" : ""}`}
          onClick={() => setSheet(sheet === "travel" ? null : "travel")}
        >
          <span className="dock-ico">↗</span>
          Travel
        </button>
        <button type="button" className="dock-btn primary" onClick={() => openMarket("buy")}>
          <span className="dock-ico">$</span>
          Buy
        </button>
        <button type="button" className="dock-btn primary" onClick={() => openMarket("sell")}>
          <span className="dock-ico">✦</span>
          Sell
        </button>
        <button
          type="button"
          className={`dock-btn ${sheet === "stash" ? "active" : ""}`}
          onClick={() => setSheet(sheet === "stash" ? null : "stash")}
        >
          <span className="dock-ico">🌱</span>
          Stash
        </button>
        <button
          type="button"
          className={`dock-btn ${overlay === "phone" ? "active" : ""}`}
          onClick={() => {
            setSheet(null);
            setOverlay("phone");
          }}
        >
          <span className="dock-ico">📱</span>
          Phone
        </button>
        <button
          type="button"
          className={`dock-btn ${overlay === "inventory" ? "active" : ""}`}
          onClick={() => {
            setSheet(null);
            setOverlay(overlay === "inventory" ? null : "inventory");
          }}
        >
          <span className="dock-ico">🎒</span>
          Inventory
        </button>
      </nav>
    </div>
  );
}
