import { useEffect, useMemo, useState } from "react";
import type { GameState } from "@/lib/game/types";
import { RANKS } from "@/lib/game/constants";
import { API_BASE } from "@/config/telegram";
import {
  type ActivityItem,
  fetchPublicPlayer,
  kindLabel,
  profileStatsFor,
  resolveActor,
  sendInGameMessage,
  type StreetProfileStats,
} from "@/lib/game/activityFeed";

type BoardView = "messages" | "detail" | "profile";

interface ActivityBoardProps {
  game: GameState;
  feed: ActivityItem[];
  selfStreetName: string;
  selfUsername?: string;
  selfFirstSeen?: number;
  /** Optional activity to focus when opened from a bubble */
  focusId?: string | null;
  onClose: () => void;
  onOpenPhoneMessages?: () => void;
}

function timeAgo(at: number): string {
  const s = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function ActivityBoard({
  game,
  feed,
  selfStreetName,
  selfUsername,
  selfFirstSeen,
  focusId,
  onClose,
  onOpenPhoneMessages,
}: ActivityBoardProps) {
  const initial = (focusId ? feed.find((f) => f.id === focusId) : null) ?? null;
  /** From rail bubble → land on profile so player info is immediate */
  const [view, setView] = useState<BoardView>(initial ? "profile" : "messages");
  const [selected, setSelected] = useState<ActivityItem | null>(initial);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [remoteBoost, setRemoteBoost] = useState<{
    username?: string;
    firstSeen?: number;
  } | null>(null);

  const youStats = useMemo(() => {
    const bagHeat = Math.min(
      99,
      (game.inventory["Meth"] || 0) * 4 +
        (game.inventory["Molly"] || 0) * 3 +
        (game.inventory["Coke"] || 0) * 1
    );
    return {
      rank: RANKS.find((r) => r.id === game.rank)?.name ?? "Corner Boy",
      city: game.location,
      day: game.day,
      heat: bagHeat,
      cash: game.cash,
      firstSeen: selfFirstSeen,
      username: selfUsername,
    };
  }, [game, selfFirstSeen, selfUsername]);

  const actor = selected ? resolveActor(selected, selfStreetName) : null;
  const baseProfile = actor ? profileStatsFor(actor, youStats) : null;

  const profile: StreetProfileStats | null = useMemo(() => {
    if (!baseProfile || !actor) return null;
    if (actor.kind === "you") return baseProfile;
    if (!remoteBoost) return baseProfile;
    return {
      ...baseProfile,
      memberFor:
        remoteBoost.firstSeen != null
          ? profileStatsFor(
              { ...actor, firstSeen: remoteBoost.firstSeen },
              youStats,
            ).memberFor
          : baseProfile.memberFor,
      telegramUsername: remoteBoost.username || baseProfile.telegramUsername,
      allowTelegram: Boolean(remoteBoost.username || baseProfile.telegramUsername),
    };
  }, [baseProfile, actor, remoteBoost, youStats]);

  useEffect(() => {
    setRemoteBoost(null);
    setComposeOpen(false);
    setComposeText("");
    setToast(null);
    if (!actor?.playerId || actor.kind === "you" || actor.kind === "npc") return;
    let cancelled = false;
    void fetchPublicPlayer(API_BASE, actor.playerId).then((p) => {
      if (cancelled || !p) return;
      setRemoteBoost({
        username: p.username,
        firstSeen: p.firstSeen,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [actor?.playerId, actor?.kind, selected?.id]);

  const openDetail = (item: ActivityItem) => {
    setSelected(item);
    setView("detail");
  };

  const openProfile = (item?: ActivityItem) => {
    if (item) setSelected(item);
    setView("profile");
  };

  const title =
    view === "messages" ? "Street Wire" : view === "detail" ? "Activity" : "Profile";

  const onSendInGame = () => {
    if (!actor || !composeText.trim()) return;
    sendInGameMessage({
      toName: actor.name,
      toPlayerId: actor.playerId,
      fromName: selfStreetName,
      text: composeText.trim(),
    });
    setToast(`Street note left for ${actor.name}. They’ll see it when phone DMs go live.`);
    setComposeText("");
    setComposeOpen(false);
  };

  const tgHref =
    profile?.telegramUsername
      ? `https://t.me/${profile.telegramUsername.replace(/^@/, "")}`
      : null;

  return (
    <div className="activity-board" role="dialog" aria-label="Street activity board">
      <div className="overlay-dim" onClick={onClose} />
      <div className="activity-board-panel">
        <div className="panel-header ab-header">
          {view !== "messages" ? (
            <button
              type="button"
              className="ab-back"
              onClick={() => setView(view === "profile" && selected ? "detail" : "messages")}
              aria-label="Back"
            >
              ‹
            </button>
          ) : (
            <span className="ab-back-spacer" />
          )}
          <h2>{title}</h2>
          <button type="button" className="panel-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ab-tabs">
          <button
            type="button"
            className={view === "messages" || view === "detail" ? "active" : ""}
            onClick={() => setView("messages")}
          >
            Messages
          </button>
          <button
            type="button"
            className={view === "profile" ? "active" : ""}
            disabled={!selected}
            onClick={() => selected && openProfile(selected)}
          >
            Profile
          </button>
        </div>

        <div className="ab-body panel-body">
          {view === "messages" && (
            <>
              <p className="ab-hint">
                Live buys, sells, raids, moves & ranks. Tap any line for their street card.
              </p>
              <div className="ab-list">
                {feed.length === 0 && (
                  <div className="ab-empty">Wire quiet. Make a move — it shows here.</div>
                )}
                {feed.map((item) => {
                  const a = resolveActor(item, selfStreetName);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`ab-row kind-${item.kind}${item.local ? " local" : ""}`}
                      onClick={() => openProfile(item)}
                    >
                      <div className="ab-row-top">
                        <span className={`ab-badge kind-${a.kind}`}>{a.badge}</span>
                        <span className="ab-kind">{kindLabel(item.kind)}</span>
                        <span className="ab-time">{timeAgo(item.at)}</span>
                      </div>
                      <div className="ab-row-name">{a.name}</div>
                      <div className="ab-row-text">{item.text}</div>
                    </button>
                  );
                })}
              </div>
              {onOpenPhoneMessages && (
                <button type="button" className="action-button ab-phone-btn" onClick={onOpenPhoneMessages}>
                  Open Trap Phone messages
                </button>
              )}
            </>
          )}

          {view === "detail" && selected && actor && (
            <div className="ab-detail">
              <div className={`ab-detail-card kind-${selected.kind}`}>
                <div className="ab-detail-meta">
                  <span className={`ab-badge kind-${actor.kind}`}>{actor.badge}</span>
                  <span className="ab-kind">{kindLabel(selected.kind)}</span>
                  <span className="ab-time">{timeAgo(selected.at)} ago</span>
                </div>
                <h3 className="ab-detail-name">{actor.name}</h3>
                <p className="ab-detail-sub">{actor.subtitle}</p>
                <p className="ab-detail-text">{selected.text}</p>
              </div>

              {actor.kind === "npc" && actor.npc && (
                <div className="ab-npc-banner">
                  <strong>NPC activity</strong>
                  <span>
                    This was {actor.npc.name} ({actor.npc.role}) — a story contact, not a real player
                    account.
                  </span>
                </div>
              )}

              {actor.kind === "you" && (
                <div className="ab-you-banner">
                  <strong>Your move</strong>
                  <span>This activity is from your current run.</span>
                </div>
              )}

              <div className="ab-detail-actions">
                <button type="button" className="action-button" onClick={() => openProfile(selected)}>
                  View profile
                </button>
                <button type="button" className="action-button secondary" onClick={() => setView("messages")}>
                  All messages
                </button>
              </div>
            </div>
          )}

          {view === "profile" && actor && profile && (
            <div className="ab-profile">
              <div className="ab-profile-hero">
                <div className="ab-avatar">{actor.name.slice(0, 1).toUpperCase()}</div>
                <div>
                  <h3>{actor.name}</h3>
                  <span className={`ab-badge kind-${actor.kind}`}>{actor.badge}</span>
                  <p className="ab-member-since">{profile.memberFor}</p>
                  <p className="ab-profile-sub">{actor.subtitle}</p>
                </div>
              </div>

              {actor.kind === "npc" && actor.npc ? (
                <div className="ab-npc-banner solid">
                  <strong>Non-player character</strong>
                  <span>{actor.npc.bio}</span>
                </div>
              ) : (
                <div className="ab-stats-grid">
                  <div className="ab-stat">
                    <span className="ab-stat-label">Rank</span>
                    <span className="ab-stat-value">{profile.rank}</span>
                  </div>
                  <div className="ab-stat">
                    <span className="ab-stat-label">City</span>
                    <span className="ab-stat-value">{profile.city}</span>
                  </div>
                  <div className="ab-stat">
                    <span className="ab-stat-label">Day</span>
                    <span className="ab-stat-value">{profile.day || "—"}</span>
                  </div>
                  <div className="ab-stat">
                    <span className="ab-stat-label">Heat</span>
                    <span className="ab-stat-value">{profile.heat}</span>
                  </div>
                  <div className="ab-stat">
                    <span className="ab-stat-label">Hustles</span>
                    <span className="ab-stat-value">{profile.hustles || "—"}</span>
                  </div>
                  <div className="ab-stat">
                    <span className="ab-stat-label">Rep</span>
                    <span className="ab-stat-value">{profile.rep}</span>
                  </div>
                  <div className="ab-stat wide">
                    <span className="ab-stat-label">
                      {actor.kind === "you" ? "Cash on hand" : "Cash (public est.)"}
                    </span>
                    <span className="ab-stat-value cash">
                      {actor.kind === "you"
                        ? `$${youStats.cash.toLocaleString()}`
                        : `~$${(Math.round(profile.cash / 100) * 100).toLocaleString()}`}
                    </span>
                  </div>
                </div>
              )}

              {actor.kind === "npc" && actor.npc && (
                <div className="ab-stats-grid npc-meta">
                  <div className="ab-stat">
                    <span className="ab-stat-label">Role</span>
                    <span className="ab-stat-value">{actor.npc.role}</span>
                  </div>
                  <div className="ab-stat">
                    <span className="ab-stat-label">Turf</span>
                    <span className="ab-stat-value">{actor.npc.city || "City-wide"}</span>
                  </div>
                </div>
              )}

              <p className="ab-profile-note">{profile.note}</p>

              {selected && (
                <div className="ab-last-move">
                  <div className="ab-stat-label">Last wire line</div>
                  <div className="ab-row-text">{selected.text}</div>
                </div>
              )}

              {actor.kind !== "you" && (
                <div className="ab-profile-actions">
                  {tgHref ? (
                    <a
                      className="action-button"
                      href={tgHref}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: "none", textAlign: "center" }}
                    >
                      Message on Telegram
                    </a>
                  ) : (
                    <button type="button" className="action-button secondary" disabled>
                      Telegram DMs locked (no public @)
                    </button>
                  )}

                  {profile.allowInGameMsg && (
                    <button
                      type="button"
                      className="action-button secondary"
                      onClick={() => {
                        setComposeOpen((v) => !v);
                        setToast(null);
                      }}
                    >
                      {composeOpen ? "Cancel note" : "Send in-game message"}
                    </button>
                  )}

                  {composeOpen && (
                    <div className="ab-compose">
                      <label htmlFor="ab-msg">Street note to {actor.name}</label>
                      <textarea
                        id="ab-msg"
                        maxLength={280}
                        value={composeText}
                        onChange={(e) => setComposeText(e.target.value)}
                        placeholder="Keep it short — tips, flex, or peace…"
                      />
                      <div className="ab-compose-row">
                        <button
                          type="button"
                          className="action-button"
                          disabled={!composeText.trim()}
                          onClick={onSendInGame}
                        >
                          Send note
                        </button>
                      </div>
                    </div>
                  )}

                  {toast && <div className="ab-msg-toast">{toast}</div>}

                  <p className="ab-trade-soon">
                    Soon: buy / sell product with other hustlers from this card. Not live yet —
                    cash & bags stay on your run.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
