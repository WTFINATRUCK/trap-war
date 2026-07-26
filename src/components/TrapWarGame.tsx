import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ADJACENT_CITIES,
  ASSETS,
  CITIES,
  MAX_ACTIONS_PER_DAY,
  MAX_DAYS,
  RANKS,
  STASH_CAPACITY,
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
  totalStashUnits,
  stashSpaceLeft,
  listAllStashes,
  cityShieldDays,
} from "@/lib/game/engine";
import type { GameMessage, GameState } from "@/lib/game/types";
import { processCompletionBonus, processDailyReferralDrip } from "@/lib/game/referralDrip";
import {
  type ActivityItem,
  type ActivityKind,
  cityPulseEvents,
  fetchRemoteActivity,
  formatLocalBuy,
  formatLocalDay,
  formatLocalPlant,
  formatLocalRaid,
  formatLocalRank,
  formatLocalRob,
  formatLocalSell,
  formatLocalStash,
  formatLocalTravel,
  kindLabel,
  loadLocalActivity,
  mergeFeed,
  postRemoteActivity,
  pushLocalActivity,
  streetNameFromId,
} from "@/lib/game/activityFeed";
import { API_BASE } from "@/config/telegram";
import TrapPhone from "./TrapPhone";
import ActivityBoard from "./ActivityBoard";

interface TrapWarGameProps {
  telegramId: number;
  initialGame: GameState | null;
  onSave: (game: GameState) => Promise<void>;
  onGameOver: (score: number) => void;
  /** Full 30-day runs completed (career) */
  runsCompleted?: number;
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

export default function TrapWarGame({
  telegramId,
  initialGame,
  onSave,
  onGameOver,
  runsCompleted = 0,
}: TrapWarGameProps) {
  const [gameState, setGameState] = useState<GameState | null>(initialGame);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showModal, setShowModal] = useState<GameMessage | null>(null);
  const [dispatcherGiftPending, setDispatcherGiftPending] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [marketMode, setMarketMode] = useState<"buy" | "sell">("buy");
  /** Selected destination in Travel sheet (confirm with bottom button) */
  const [travelTarget, setTravelTarget] = useState<CityId | null>(null);
  const [travelMode, setTravelMode] = useState<"walk" | "chopper" | "whip">("walk");
  const [streetFeed, setStreetFeed] = useState<ActivityItem[]>([]);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityFocusId, setActivityFocusId] = useState<string | null>(null);
  const [phoneInitialView, setPhoneInitialView] = useState<"home" | "messages">("home");
  /** Career 30-day finishes — synced from cloud, bumped instantly on full clear */
  const [careerRuns, setCareerRuns] = useState(runsCompleted);
  const streetWho = useMemo(() => streetNameFromId(String(telegramId)), [telegramId]);

  useEffect(() => {
    setCareerRuns(runsCompleted);
  }, [runsCompleted]);

  const openActivityBoard = (focusId?: string) => {
    setActivityFocusId(focusId ?? null);
    setActivityOpen(true);
  };

  const openTravelSheet = () => {
    setTravelTarget(null);
    setTravelMode("walk");
    setOverlay(null);
    setSheet("travel");
  };

  useEffect(() => {
    setGameState(initialGame);
  }, [initialGame]);

  const refreshStreetFeed = useCallback(async () => {
    const local = loadLocalActivity();
    const remote = await fetchRemoteActivity(API_BASE);
    const pulse = cityPulseEvents();
    setStreetFeed(mergeFeed(local, remote, pulse));
  }, []);

  useEffect(() => {
    void refreshStreetFeed();
    const id = window.setInterval(() => void refreshStreetFeed(), 12_000);
    return () => window.clearInterval(id);
  }, [refreshStreetFeed]);

  const emitStreet = useCallback(
    (kind: ActivityKind, text: string) => {
      pushLocalActivity({ kind, text });
      void postRemoteActivity(API_BASE, { kind, text, playerId: String(telegramId) });
      void refreshStreetFeed();
    },
    [telegramId, refreshStreetFeed]
  );

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
    // Surface success / warnings / street events so plant failures aren't silent
    const important = msgs.find(
      (m) => m.type === "street" || m.type === "event" || m.type === "warning" || m.type === "success" || m.title
    );
    if (important) setShowModal(important);
  };

  /** Log raids / robs / rank-ups from engine message side-effects */
  const logSideEffects = (prev: GameState | null, next: GameState, msgs: GameMessage[]) => {
    for (const m of msgs) {
      const title = (m.title || "").toLowerCase();
      const text = m.text || "";
      if (title.includes("robbery") || text.includes("Mugged for") || text.includes("Yield skimmed")) {
        const lost = Number((text.match(/\$([0-9,]+)/) || [])[1]?.replace(/,/g, "")) || 0;
        emitStreet("rob", formatLocalRob(streetWho, lost || 500));
      } else if (
        title.includes("raid") ||
        text.toLowerCase().includes("police raid") ||
        text.includes("🚔") ||
        text.toLowerCase().includes("raid shield")
      ) {
        emitStreet("raid", formatLocalRaid(streetWho, text.slice(0, 80)));
      }
    }
    if (prev && next.rank !== prev.rank) {
      const rankName = RANKS.find((r) => r.id === next.rank)?.name ?? next.rank;
      emitStreet("rank", formatLocalRank(streetWho, rankName));
    }
    if (prev && next.day > prev.day) {
      emitStreet("day", formatLocalDay(streetWho, next.day));
    }
  };

  const applyResult = async (state: GameState, msgs: GameMessage[]) => {
    const prev = gameState;
    const prevYield = prev?.grossYieldLastDay ?? 0;
    await saveGame(state);
    pushMessages(msgs);
    logSideEffects(prev, state, msgs);

    if (state.grossYieldLastDay > 0 && state.grossYieldLastDay !== prevYield) {
      processDailyReferralDrip(telegramId, state.grossYieldLastDay);
    }
    if (state.clientProgress.dispatcher.complete && !state.dispatcherGiftClaimed) {
      setDispatcherGiftPending(true);
    }
    if (state.gameOver) {
      if (!prev?.gameOver && state.day >= MAX_DAYS) {
        setCareerRuns((n) => n + 1);
      }
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
    const qty = quantities[name] || 1;
    const cashBefore = gameState.cash;
    const city = gameState.location;
    const result = buyAsset(gameState, name, qty);
    if (!result.blocked) {
      await applyResult(result.state, result.messages);
      const cost = Math.max(0, cashBefore - result.state.cash);
      emitStreet("buy", formatLocalBuy(streetWho, qty, displayName(name), city, cost));
    } else pushMessages(result.messages);
  };

  const handleSell = async (name: string) => {
    if (!gameState) return;
    const qty = quantities[name] || 1;
    const cashBefore = gameState.cash;
    const result = sellAsset(gameState, name, qty);
    if (!result.blocked) {
      await applyResult(result.state, result.messages);
      const revenue = Math.max(0, result.state.cash - cashBefore);
      emitStreet("sell", formatLocalSell(streetWho, qty, displayName(name), revenue));
    } else pushMessages(result.messages);
  };

  const handlePlant = async (name: string) => {
    if (!gameState) return;
    const held = gameState.inventory[name] || 0;
    if (held <= 0) {
      pushMessages([
        {
          type: "warning",
          title: "Can't Plant",
          text: `No ${displayName(name)} in your bag. Buy first, then plant into stash.`,
        },
      ]);
      return;
    }
    const qty = Math.min(quantities[name] || 1, held);
    const result = plantStash(gameState, name, qty);
    if (!result.blocked) {
      await applyResult(result.state, result.messages);
      emitStreet("plant", formatLocalPlant(streetWho, qty, displayName(name)));
      setSheet("stash");
    } else {
      pushMessages(result.messages);
    }
  };

  const handleRetrieve = async (city: CityId | undefined, units: number | undefined, asset: string) => {
    if (!gameState) return;
    const target = city ?? gameState.location;
    const pile = gameState.plantedStashes[target]?.[asset];
    const take = units === undefined ? pile?.units ?? 0 : units;
    const result = retrieveStash(gameState, city, units, asset);
    if (!result.blocked) {
      await applyResult(result.state, result.messages);
      emitStreet("stash", formatLocalStash(streetWho, take || 1, displayName(asset)));
    } else pushMessages(result.messages);
  };

  const handleTravel = async (city: CityId, mode: "walk" | "chopper" | "whip" = "walk") => {
    if (!gameState) return;
    const result = travel(gameState, city, mode);
    if (!result.blocked) {
      await applyResult(result.state, result.messages);
      emitStreet("travel", formatLocalTravel(streetWho, city));
      setTravelTarget(null);
      setTravelMode("walk");
      setSheet(null);
    } else pushMessages(result.messages);
  };

  const confirmTravel = async () => {
    if (!travelTarget || !gameState) {
      pushMessages([
        {
          type: "warning",
          title: "Pick a city",
          text: "Tap a city on the map, then hit Travel.",
        },
      ]);
      return;
    }
    await handleTravel(travelTarget, travelMode);
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
    if (streetFeed.length > 0) return streetFeed;
    return cityPulseEvents();
  }, [streetFeed]);

  // Seamless vertical loop: render list twice
  const scrollItems = useMemo(() => [...notifFeed, ...notifFeed], [notifFeed]);

  /** Trap Phone contact rail expects { from, text } */
  const phoneStreet = useMemo(
    () =>
      notifFeed.slice(0, 10).map((n) => ({
        from: n.local ? "You" : n.text.split(/\s+/)[0] || kindLabel(n.kind),
        text: n.text,
        hot: Boolean(n.local) || n.kind === "raid" || n.kind === "rob" || n.kind === "rank",
      })),
    [notifFeed]
  );

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
    const fullThirty = gameState.day >= MAX_DAYS;
    return (
      <section className="game-complete">
        <h2>{fullThirty ? "30-DAY RUN COMPLETE" : "RUN ENDED"}</h2>
        <p className="score">${gameState.finalScore.toLocaleString()}</p>
        <p>
          Protected: <span className="stat-value">${gameState.protectedReserves.toLocaleString()}</span>
        </p>
        <p className="log-info">{RANKS.find((r) => r.id === gameState.rank)?.name}</p>
        <p className="runs-stat">
          {fullThirty ? (
            <>
              30-day runs completed: <strong>{careerRuns}</strong>
            </>
          ) : (
            <>
              Day {gameState.day} end · 30-day runs completed: <strong>{careerRuns}</strong>
              <br />
              <span className="runs-stat-hint">Early ends don&apos;t count toward 30-day finishes.</span>
            </>
          )}
        </p>
        <button type="button" onClick={startNewGame} className="action-button" style={{ marginTop: "1rem" }}>
          Play Again
        </button>
      </section>
    );
  }

  const g = migrateSavedState(gameState);
  const rankName = RANKS.find((r) => r.id === g.rank)?.name ?? "Corner Boy";
  const hereMap = g.plantedStashes[g.location];
  const herePiles = hereMap ? Object.values(hereMap).filter((s) => s && s.units > 0) : [];
  const allStashes = listAllStashes(g);
  const hereShield = cityShieldDays(g, g.location);
  const stashUnits = totalStashUnits(g);
  const stashFree = stashSpaceLeft(g);
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

      {/* Street wire board — messages + player / NPC profiles */}
      {activityOpen && (
        <ActivityBoard
          key={activityFocusId ?? "feed"}
          game={g}
          feed={notifFeed}
          selfStreetName={streetWho}
          focusId={activityFocusId}
          onClose={() => {
            setActivityOpen(false);
            setActivityFocusId(null);
          }}
          onOpenPhoneMessages={() => {
            setActivityOpen(false);
            setActivityFocusId(null);
            setSheet(null);
            setPhoneInitialView("messages");
            setOverlay("phone");
          }}
        />
      )}

      {/* Trap Phone full screen */}
      {overlay === "phone" && (
        <TrapPhone
          key={phoneInitialView}
          game={g}
          streetMessages={phoneStreet}
          initialView={phoneInitialView}
          onClose={() => {
            setOverlay(null);
            setPhoneInitialView("home");
          }}
          onOpenTravel={() => {
            setOverlay(null);
            setPhoneInitialView("home");
            openTravelSheet();
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
                  <div className="inv-qty">{hereShield > 0 ? `${hereShield}d` : herePiles.length ? "On" : "—"}</div>
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

        {/* Live street wire — tap opens messages + player/NPC profiles */}
        <div className="notif-rail" aria-label="Live street activity">
          <button
            type="button"
            className="notif-rail-label"
            onClick={() => openActivityBoard()}
          >
            STREET WIRE
          </button>
          <div className="notif-tap-hint">Tap for messages</div>
          <div className="notif-viewport">
            <div
              className="notif-scroll"
              style={{ animationDuration: `${Math.max(18, notifFeed.length * 2.2)}s` }}
            >
              {scrollItems.map((n, i) => (
                <button
                  key={`${n.id}_${i}`}
                  type="button"
                  className={`notif-bubble kind-${n.kind}${n.local ? " local" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    openActivityBoard(n.id);
                  }}
                >
                  <div className="nb-from">{kindLabel(n.kind)}</div>
                  <div>{n.text}</div>
                </button>
              ))}
            </div>
          </div>
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
          <button
            type="button"
            className="meta-chip stash"
            style={{ cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit" }}
            onClick={() => setSheet("stash")}
          >
            <div className="mc-label">Stash · {stashUnits}/{STASH_CAPACITY}</div>
            <div className="mc-value">
              {herePiles.length > 0
                ? herePiles.length === 1
                  ? `${herePiles[0]!.units} ${displayName(herePiles[0]!.asset)} @ ${g.location}`
                  : `${herePiles.length} products here · ${herePiles.map((p) => displayName(p.asset)).join(" · ")}`
                : stashUnits > 0
                  ? `${allStashes.length} pile${allStashes.length > 1 ? "s" : ""} · $${allStashes
                      .reduce((s, { stash: st }) => s + getSellPrice(g, st.asset) * st.units, 0)
                      .toLocaleString()}`
                  : "None planted"}
            </div>
          </button>
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
              {sheet === "market" && (
                <div className="sheet-cash" title="Your cash on hand">
                  <span className="sheet-cash-ico">$</span>
                  <div>
                    <div className="sheet-cash-label">Cash</div>
                    <div className="sheet-cash-value">${g.cash.toLocaleString()}</div>
                  </div>
                </div>
              )}
              <button type="button" className="panel-close" onClick={() => setSheet(null)}>
                ×
              </button>
            </div>
            <div className="panel-body">
              {sheet === "market" && (
                <>
                  <div className="sheet-cash-bar" aria-live="polite">
                    <span>Your cash</span>
                    <strong>${g.cash.toLocaleString()}</strong>
                  </div>
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
                              {asset.category === "core" && (
                                <button
                                  type="button"
                                  className="action-button plant small"
                                  disabled={h <= 0}
                                  title={
                                    h <= 0
                                      ? "Buy product into your bag first"
                                      : `Plant ${quantities[asset.name] || 1} into stash (hold ${h})`
                                  }
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
                  <p className="hint-text">
                    Plant moves product from bag → stash (protected). Need hold &gt; 0. Stash free:{" "}
                    {stashFree}/{STASH_CAPACITY}
                  </p>
                </>
              )}

              {sheet === "travel" && (
                <>
                  <p className="hint-text" style={{ marginTop: 0 }}>
                    Tap a city, then hit <strong>Travel</strong> below. Walk costs a day · prices differ by block.
                  </p>
                  <div className="city-map">
                    {CITIES.map((city) => {
                      const gate = canTravelTo(g, city);
                      const isHere = city === g.location;
                      const canGo = gate.allowed || Boolean(gate.softPenalty);
                      const locked = !canGo;
                      const selected = travelTarget === city;
                      let cls = "city-chip";
                      if (isHere) cls += " current";
                      else if (locked) cls += " locked";
                      else if (gate.softPenalty) cls += " soft-lock";
                      if (selected) cls += " selected";
                      return (
                        <button
                          key={city}
                          type="button"
                          className={cls}
                          disabled={isHere || locked}
                          title={gate.reason || (isHere ? "You are here" : `Select ${city}`)}
                          onClick={() => {
                            if (isHere || locked) return;
                            setTravelTarget(city);
                            // Prefer walk unless they already picked a fast mode that can reach this city
                            if (travelMode === "chopper") {
                              const adj = ADJACENT_CITIES[g.location]?.includes(city);
                              if (!adj || !g.hasChopper || g.chopperHopsLeft <= 0) setTravelMode("walk");
                            }
                          }}
                        >
                          {isHere && <span className="city-dot" />}
                          {selected && !isHere ? "→ " : ""}
                          {locked ? `${city} 🔒` : city}
                        </button>
                      );
                    })}
                  </div>

                  {((g.hasChopper && g.chopperHopsLeft > 0) || (g.hasWhip && g.whipHopsLeft > 0)) && (
                    <div className="travel-mode-row">
                      <span className="travel-mode-label">How you move</span>
                      <div className="btn-row" style={{ flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className={`action-button small ${travelMode === "walk" ? "" : "ghost"}`}
                          onClick={() => setTravelMode("walk")}
                        >
                          Walk (+1 day)
                        </button>
                        {g.hasChopper && g.chopperHopsLeft > 0 && (
                          <button
                            type="button"
                            className={`action-button small ${travelMode === "chopper" ? "" : "ghost"}`}
                            onClick={() => setTravelMode("chopper")}
                            title="Adjacent cities only · same day"
                          >
                            Chopper ({g.chopperHopsLeft})
                          </button>
                        )}
                        {g.hasWhip && g.whipHopsLeft > 0 && (
                          <button
                            type="button"
                            className={`action-button small ${travelMode === "whip" ? "" : "ghost"}`}
                            onClick={() => setTravelMode("whip")}
                            title="Any unlocked city · same day"
                          >
                            Whip ({g.whipHopsLeft})
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {travelTarget && (
                    <p className="travel-dest-preview">
                      Destination: <strong>{travelTarget}</strong>
                      {travelMode === "walk" && " · walk (ends the day)"}
                      {travelMode === "chopper" && " · chopper hop"}
                      {travelMode === "whip" && " · whip hop"}
                      {canTravelTo(g, travelTarget).softPenalty && " · sneak (risky)"}
                    </p>
                  )}

                  <button
                    type="button"
                    className="action-button travel-confirm"
                    style={{ width: "100%", marginTop: "0.75rem" }}
                    disabled={!travelTarget}
                    onClick={() => void confirmTravel()}
                  >
                    {travelTarget ? `Travel to ${travelTarget}` : "Select a city to travel"}
                  </button>

                  <button
                    type="button"
                    className="travel-end-link"
                    onClick={async () => {
                      if (confirm(`End run on day ${g.day}? Your score locks in — this is not travel.`)) {
                        const r = endRunEarly(g);
                        await applyResult(r.state, r.messages);
                        setSheet(null);
                      }
                    }}
                  >
                    End run early (not travel)
                  </button>
                </>
              )}

              {sheet === "stash" && (
                <>
                  <div className="client-row" style={{ marginBottom: "0.75rem" }}>
                    <strong>Stash capacity</strong> {stashUnits}/{STASH_CAPACITY} units used · {stashFree} free
                    <br />
                    <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                      Plant multiple products on the same block (or across cities). Cap {STASH_CAPACITY} units total.
                    </span>
                  </div>

                  {allStashes.length === 0 ? (
                    <div className="bag-empty" style={{ marginBottom: "0.75rem" }}>
                      No product planted. Buy into your bag, set qty, hit Plant.
                    </div>
                  ) : (
                    <div className="inv-list" style={{ marginBottom: "0.85rem" }}>
                      {allStashes.map(({ city, stash }) => {
                        const value = getSellPrice(g, stash.asset) * stash.units;
                        const here = city === g.location;
                        return (
                          <div
                            key={`${city}-${stash.asset}`}
                            className="inv-row"
                            style={{ flexWrap: "wrap", gap: "0.5rem" }}
                          >
                            <div style={{ flex: 1, minWidth: "140px" }}>
                              <div className="inv-name">
                                {displayName(stash.asset)} ×{stash.units}
                                {here ? " · HERE" : ""}
                              </div>
                              <div className="inv-sub">
                                {city} · 🛡 {stash.shieldDaysLeft}d · ${value.toLocaleString()}
                              </div>
                            </div>
                            <div className="btn-row">
                              <button
                                type="button"
                                className="action-button sell small"
                                disabled={!here}
                                title={here ? "Take all of this product back to bag" : "Travel here to retrieve"}
                                onClick={() => handleRetrieve(city, undefined, stash.asset)}
                              >
                                {here ? "Retrieve all" : "Travel first"}
                              </button>
                              {here && stash.units > 1 && (
                                <button
                                  type="button"
                                  className="action-button ghost small"
                                  onClick={() => handleRetrieve(city, 1, stash.asset)}
                                >
                                  Take 1
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    type="button"
                    className="action-button"
                    style={{ width: "100%" }}
                    onClick={() => openMarket("buy")}
                  >
                    Open Market to Plant
                  </button>

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
          onClick={() => {
            if (sheet === "travel") setSheet(null);
            else openTravelSheet();
          }}
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
            setPhoneInitialView("home");
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
