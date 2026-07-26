import { useState } from "react";
import { ASSETS, CLIENTS } from "@/lib/game/constants";
import type { GameState } from "@/lib/game/types";
import { getSellPrice } from "@/lib/game/engine";
import { CHANNEL_URL, COMMUNITY_URL, isLiveTelegramUrl } from "@/config/telegram";

export type PhoneView =
  | "home"
  | "messages"
  | "chat"
  | "market"
  | "clients"
  | "travel"
  | "news"
  | "contacts"
  | "upgrades"
  | "gang"
  | "settings";

interface TrapPhoneProps {
  game: GameState;
  streetMessages: { from: string; text: string; hot?: boolean }[];
  onClose: () => void;
  onOpenTravel: () => void;
  onAcceptClient?: (id: string) => void;
  /** Open straight to Messages when coming from Street Wire */
  initialView?: PhoneView;
}

const CONTACTS = [
  { id: "pnut", name: "P-Nut", preview: "Word is Molly moving in Watts…" },
  { id: "bigl", name: "Big Lou", preview: "You got scale? Need a flip." },
  { id: "kayla", name: "Kayla", preview: "Compton quiet tonight. Stack up." },
  { id: "ray", name: "Uncle Ray", preview: "Plant the bag. Own the block." },
  { id: "pearl", name: "Ms. Pearl", preview: "Stable work pays. Don't sleep." },
  { id: "disp", name: "Dispatcher", preview: "Hot product, hot heat. Move smart." },
];

const APPS: { id: PhoneView; icon: string; name: string }[] = [
  { id: "messages", icon: "💬", name: "Messages" },
  { id: "market", icon: "📈", name: "Market" },
  { id: "clients", icon: "📋", name: "Clients" },
  { id: "travel", icon: "🚗", name: "Travel" },
  { id: "news", icon: "📰", name: "News" },
  { id: "contacts", icon: "👤", name: "Contacts" },
  { id: "upgrades", icon: "⭐", name: "Upgrades" },
  { id: "gang", icon: "🏴", name: "Gang" },
  { id: "settings", icon: "⚙️", name: "Settings" },
];

function displayName(name: string): string {
  if (name === "Coke") return "Cocaine";
  if (name === "Meth") return "Crystal";
  if (name === "The Stick") return "Glock 19";
  return name;
}

export default function TrapPhone({
  game,
  streetMessages,
  onClose,
  onOpenTravel,
  initialView = "home",
}: TrapPhoneProps) {
  const [view, setView] = useState<PhoneView>(initialView);
  const [chatId, setChatId] = useState<string | null>(null);

  const title =
    view === "home"
      ? "Trap Phone"
      : view === "chat"
        ? CONTACTS.find((c) => c.id === chatId)?.name ?? "Chat"
        : view.charAt(0).toUpperCase() + view.slice(1);

  const openApp = (id: PhoneView) => {
    if (id === "travel") {
      onOpenTravel();
      onClose();
      return;
    }
    setView(id);
  };

  const coreAssets = ASSETS.filter((a) => a.category === "core" && game.day >= a.availableFromDay);

  return (
    <div className="trap-phone">
      <div className="phone-frame">
        <div className="phone-status">
          <span>9:41</span>
          <span>⬤⬤⬤ 🔋</span>
        </div>

        <div className="phone-header">
          {view === "home" ? (
            <span style={{ width: 36 }} />
          ) : (
            <button
              type="button"
              className="phone-back"
              onClick={() => {
                if (view === "chat") {
                  setView("messages");
                  setChatId(null);
                } else setView("home");
              }}
              aria-label="Back"
            >
              ‹
            </button>
          )}
          <h2>{title}</h2>
          <button type="button" className="phone-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {view === "home" && (
          <>
            <div className="phone-home-label">TRAP PHONE</div>
            <div className="phone-grid">
              {APPS.map((app) => (
                <button key={app.id} type="button" className="phone-app" onClick={() => openApp(app.id)}>
                  <span className="pa-icon">{app.icon}</span>
                  <span className="pa-name">{app.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {view === "messages" && (
          <div className="phone-content">
            <div className="msg-list">
              {CONTACTS.map((c) => {
                const live = streetMessages.find((m) => m.from === c.name);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="msg-row"
                    onClick={() => {
                      setChatId(c.id);
                      setView("chat");
                    }}
                  >
                    <div className="msg-avatar">{c.name.slice(0, 1)}</div>
                    <div className="msg-body">
                      <div className="msg-name">{c.name}</div>
                      <div className="msg-preview">{live?.text ?? c.preview}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === "chat" && (
          <div className="phone-content">
            <div className="chat-view">
              <div className="chat-bubble them">
                {streetMessages.find((m) => m.from === CONTACTS.find((c) => c.id === chatId)?.name)?.text ??
                  CONTACTS.find((c) => c.id === chatId)?.preview}
              </div>
              <div className="chat-bubble them">
                Prices move by the hour. Buy low, move cities, sell high. Watch your heat.
              </div>
              <div className="chat-bubble me">On it. Running the block.</div>
            </div>
          </div>
        )}

        {view === "market" && (
          <div className="phone-content">
            {coreAssets.map((asset) => {
              const price = getSellPrice(game, asset.name);
              const mid = (asset.minPrice + asset.maxPrice) / 2;
              const chg = Math.round(((price - mid) / mid) * 100);
              return (
                <div key={asset.name} className="market-row">
                  <div>
                    <div className="mr-name">
                      {asset.emoji} {displayName(asset.name)}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{asset.defiLabel}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mr-price">${price}</div>
                    <div className={`mr-chg ${chg >= 0 ? "up" : "down"}`}>
                      {chg >= 0 ? "+" : ""}
                      {chg}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === "clients" && (
          <div className="phone-content">
            {CLIENTS.map((client) => {
              const prog = game.clientProgress[client.id];
              return (
                <div key={client.id} className={`client-row ${prog.complete ? "done" : ""}`}>
                  <div>
                    {client.emoji} <strong>{client.name}</strong>
                  </div>
                  <div style={{ marginTop: "0.35rem", fontSize: "0.75rem", color: "var(--muted)" }}>
                    {client.requirement}
                  </div>
                  <div style={{ marginTop: "0.25rem", fontSize: "0.72rem" }}>
                    Reward: {client.reward}
                    {prog.complete ? " · DONE ✓" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(view === "news" || view === "contacts" || view === "upgrades" || view === "gang" || view === "settings") && (
          <div className="phone-content">
            {view === "news" && (
              <>
                <div className="client-row">📡 Street wire: heat rising after big flips.</div>
                <div className="client-row">🌆 City prices shifting overnight — check Market.</div>
                <div className="client-row">🔒 Vault still untouchable. 8% locks every win.</div>
              </>
            )}
            {view === "contacts" &&
              CONTACTS.map((c) => (
                <div key={c.id} className="client-row">
                  <strong>{c.name}</strong> — {c.preview}
                </div>
              ))}
            {view === "upgrades" && (
              <>
                <div className="client-row">⚡ Pay-to-Earn: 1.5× yield + shield (TON week 2)</div>
                <div className="client-row">🎒 Bag capacity upgrades with rank</div>
                <div className="client-row">🔫 Stick / armor — cut robbery risk</div>
                <div className="client-row">🚗 Chopper & Whip — free travel hops</div>
              </>
            )}
            {view === "gang" && (
              <>
                <div className="client-row">
                  Everybody Eats referral — 0.3% daily drip on crew yield. Open CREW tab to share your link.
                </div>
                {isLiveTelegramUrl(COMMUNITY_URL) && (
                  <a
                    className="client-row"
                    href={COMMUNITY_URL}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "block", textDecoration: "none", color: "inherit" }}
                  >
                    💬 <strong>Community chat</strong> — talk with real players on Telegram
                  </a>
                )}
                <a
                  className="client-row"
                  href={CHANNEL_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "block", textDecoration: "none", color: "inherit" }}
                >
                  📢 <strong>Channel</strong> — Word on the Street & drops
                </a>
              </>
            )}
            {view === "settings" && (
              <div className="client-row">
                Trap War · Telegram Mini App · 30-day runs · Street audio on (mute on HUD 🔊)
              </div>
            )}
          </div>
        )}

        <div className="phone-dock">
          <button type="button" onClick={() => setView("home")}>
            Home
          </button>
          <button type="button" onClick={onClose}>
            Lock
          </button>
        </div>
      </div>
    </div>
  );
}
