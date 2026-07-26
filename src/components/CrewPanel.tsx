import { useState } from "react";
import { getReferralStats } from "@/lib/referral";
import { BOT_USERNAME, CHANNEL_URL, telegramShareLink } from "@/config/telegram";
import type { CloudSave } from "@/types/cloudSave";

interface CrewPanelProps {
  telegramId: number;
  cloudSave: CloudSave | null;
}

export default function CrewPanel({ telegramId, cloudSave }: CrewPanelProps) {
  const stats = getReferralStats(telegramId, cloudSave);
  const link = stats.inviteLink;
  const shareHref = telegramShareLink(link);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copy your invite link:", link);
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Trap War",
          text: "Join my crew on TRAP WAR — Everybody Eats 🤝",
          url: link,
        });
        return;
      } catch {
        /* fall through */
      }
    }
    window.open(shareHref, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <h2>Everybody Eats</h2>
      <p className="boost-idle">
        Share your invite. You earn 0.3% daily on crew yield + 5% when they finish day 30.
      </p>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Total Crew</div>
          <div className="value">{stats.totalReferrals}</div>
        </div>
        <div className="stat-card">
          <div className="label">Active</div>
          <div className="value green">{stats.activeReferrals}</div>
        </div>
        <div className="stat-card">
          <div className="label">Earned</div>
          <div className="value gold">${stats.totalEarnings.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Pending</div>
          <div className="value">${stats.pendingDrip.toFixed(2)}</div>
        </div>
      </div>

      <p className="stat-label" style={{ marginTop: "0.75rem" }}>
        Your invite link
      </p>
      <div className="ref-link-box">{link}</div>
      <p className="boost-idle" style={{ marginBottom: "0.5rem" }}>
        Code: <strong style={{ color: "var(--purple)" }}>{stats.referralCode}</strong>
      </p>

      <button type="button" className="action-button" onClick={copyLink} style={{ width: "100%" }}>
        {copied ? "✓ Copied" : "Copy Invite Link"}
      </button>

      <button
        type="button"
        className="action-button"
        onClick={shareNative}
        style={{ width: "100%", marginTop: "0.5rem", background: "linear-gradient(180deg,#34d399,#059669)" }}
      >
        📤 Share Invite
      </button>

      <a
        className="action-button ghost"
        href={shareHref}
        target="_blank"
        rel="noreferrer"
        style={{
          width: "100%",
          marginTop: "0.5rem",
          display: "block",
          textAlign: "center",
          textDecoration: "none",
          boxSizing: "border-box",
        }}
      >
        Share via Telegram
      </a>

      <a
        className="action-button ghost"
        href={CHANNEL_URL}
        target="_blank"
        rel="noreferrer"
        style={{
          width: "100%",
          marginTop: "0.5rem",
          display: "block",
          textAlign: "center",
          textDecoration: "none",
          boxSizing: "border-box",
        }}
      >
        📢 Join Trap War Channel
      </a>

      <p className="boost-idle" style={{ marginTop: "1rem", fontSize: "0.72rem" }}>
        Link opens @{BOT_USERNAME} and tags them to your crew.
        Also works from bot command /invite.
      </p>

      {stats.referredBy && (
        <p className="boost-idle" style={{ marginTop: "0.5rem", textAlign: "center" }}>
          You joined via crew {stats.referredBy}
        </p>
      )}
    </>
  );
}
