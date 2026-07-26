import { getReferralLink, getReferralStats } from "@/lib/referral";
import type { CloudSave } from "@/types/cloudSave";

interface CrewPanelProps {
  telegramId: number;
  cloudSave: CloudSave | null;
}

export default function CrewPanel({ telegramId, cloudSave }: CrewPanelProps) {
  const stats = getReferralStats(telegramId, cloudSave);
  const link = getReferralLink(stats.referralCode);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      alert("Crew link copied!");
    } catch {
      prompt("Copy your crew link:", link);
    }
  };

  return (
    <>
      <h2>Everybody Eats</h2>
      <p className="boost-idle">
        0.3% daily drip on crew yield + 5% bonus at day 30. Payouts queue until week 2.
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

      <p className="stat-label" style={{ marginTop: "0.5rem" }}>
        Your crew link
      </p>
      <div className="ref-link-box">{link}</div>
      <button type="button" className="action-button" onClick={copyLink} style={{ width: "100%" }}>
        Copy Link
      </button>

      {stats.referredBy && (
        <p className="boost-idle" style={{ marginTop: "1rem", textAlign: "center" }}>
          Referred by crew #{stats.referredBy}
        </p>
      )}
    </>
  );
}
