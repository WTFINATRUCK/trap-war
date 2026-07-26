import type { CloudSave } from "@/types/cloudSave";

const SAVE_PREFIX = "trapwar_ref_";

export interface ReferralData {
  referralCode: string;
  referredBy: string | null;
  referrals: string[];
  totalEarnings: number;
  pendingDrip: number;
}

export function generateReferralCode(telegramId: number): string {
  const id = String(telegramId).padStart(8, "0");
  return `TRAP-${id.slice(0, 4)}${id.slice(-4)}`.toUpperCase();
}

export function getReferralData(telegramId: number): ReferralData {
  const key = `${SAVE_PREFIX}${telegramId}`;
  const stored = localStorage.getItem(key);
  if (stored) return JSON.parse(stored);

  const fresh: ReferralData = {
    referralCode: generateReferralCode(telegramId),
    referredBy: null,
    referrals: [],
    totalEarnings: 0,
    pendingDrip: 0,
  };
  localStorage.setItem(key, JSON.stringify(fresh));
  return fresh;
}

export function saveReferralData(telegramId: number, data: ReferralData): void {
  localStorage.setItem(`${SAVE_PREFIX}${telegramId}`, JSON.stringify(data));
}

export function registerReferral(newUserId: number, referrerCode: string): boolean {
  const allKeys = Object.keys(localStorage).filter((k) => k.startsWith(SAVE_PREFIX));
  let referrerId: number | null = null;

  for (const key of allKeys) {
    const id = parseInt(key.replace(SAVE_PREFIX, ""), 10);
    const data = getReferralData(id);
    if (data.referralCode === referrerCode.toUpperCase()) {
      referrerId = id;
      break;
    }
  }

  if (!referrerId || referrerId === newUserId) return false;

  const referrerData = getReferralData(referrerId);
  if (!referrerData.referrals.includes(String(newUserId))) {
    referrerData.referrals.push(String(newUserId));
    saveReferralData(referrerId, referrerData);
  }

  const newUserData = getReferralData(newUserId);
  if (!newUserData.referredBy) {
    newUserData.referredBy = String(referrerId);
    saveReferralData(newUserId, newUserData);
  }

  return true;
}

export function parseStartParam(startParam?: string): string | null {
  if (!startParam) return null;
  if (startParam.startsWith("ref_")) return startParam.replace("ref_", "").toUpperCase();
  if (startParam.startsWith("TRAP-")) return startParam.toUpperCase();
  return null;
}

export function getReferralLink(
  referralCode: string,
  botUsername = (typeof import.meta !== "undefined" &&
    (import.meta as { env?: { VITE_BOT_USERNAME?: string } }).env?.VITE_BOT_USERNAME) ||
    "TrapWarBot"
): string {
  const user = String(botUsername).replace(/^@/, "");
  return `https://t.me/${user}?start=ref_${referralCode}`;
}

export function getReferralStats(telegramId: number, cloudSave?: CloudSave | null) {
  const data = getReferralData(telegramId);
  const activeReferrals = data.referrals.filter((refId) => {
    const raw = localStorage.getItem(`trapwar_cloud_${refId}`);
    if (!raw) return false;
    try {
      const save = JSON.parse(raw) as CloudSave;
      return (save.game?.protectedReserves ?? 0) >= 50;
    } catch {
      return false;
    }
  });

  return {
    totalReferrals: data.referrals.length,
    activeReferrals: activeReferrals.length,
    totalEarnings: data.totalEarnings,
    pendingDrip: data.pendingDrip + (cloudSave?.referralPending?.queuedDrip ?? 0),
    referralCode: data.referralCode,
    referredBy: data.referredBy,
  };
}