import { useMemo, useState } from "react";
import type { GameState } from "@/lib/game/types";
import { RANKS } from "@/lib/game/constants";
import {
  type ActivityItem,
  kindLabel,
  profileStatsFor,
  resolveActor,
} from "@/lib/game/activityFeed";

type BoardView = "messages" | "detail" | "profile";

interface ActivityBoardProps {
  game: GameState;
  feed: ActivityItem[];
  selfStreetName: string;
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
  focusId,
  onClose,
  onOpenPhoneMessages,
}: ActivityBoardProps) {
  const initial = (focusId ? feed.find((f) => f.id === focusId) : null) ?? null;
  const [view, setView] = useState<BoardView>(initial ? "detail" : "messages");
  const [selected, setSelected] = useState<ActivityItem | null>(initial);

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
    };
  }, [game]);

  const actor = selected ? resolveActor(selected, selfStreetName) : null;
  const profile = actor ? profileStatsFor(actor, youStats) : null;

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
                Live buys, sells, raids, moves & ranks. Tap a line for details or open their profile.
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
                      onClick={() => openDetail(item)}
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
                    <span className="ab-stat-value">{actor.kind === "you" ? profile.heat : profile.heat}</span>
                  </div>
                  <div className="ab-stat">
                    <span className="ab-stat-label">Hustles</span>
                    <span className="ab-stat-value">{profile.hustles || "—"}</span>
                  </div>
                  <div className="ab-stat">
                    <span className="ab-stat-label">Rep</span>
                    <span className="ab-stat-value">{profile.rep}</span>
                  </div>
                  {actor.kind === "you" && (
                    <div className="ab-stat wide">
                      <span className="ab-stat-label">Cash on hand</span>
                      <span className="ab-stat-value cash">${youStats.cash.toLocaleString()}</span>
                    </div>
                  )}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
