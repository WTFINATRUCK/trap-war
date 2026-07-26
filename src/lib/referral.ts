import type { CloudSave } from "@/types/cloudSave";
import { BOT_USERNAME, crewInviteLink } from "@/config/telegram";

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
  const code = referrerCode.toUpperCase().replace(/^REF_/, "");
  const allKeys = Object.keys(localStorage).filter((k) => k.startsWith(SAVE_PREFIX));
  let referrerId: number | null = null;

  for (const key of allKeys) {
    const id = parseInt(key.replace(SAVE_PREFIX, ""), 10);
    const data = getReferralData(id);
    if (data.referralCode === code) {
      referrerId = id;
      break;
    }
  }

  // Fallback: code encodes telegram id as TRAP-XXXXYYYY from padded id
  if (!referrerId && code.startsWith("TRAP-") && code.length >= 9) {
    // Best-effort: still record referredBy as the code string
    const newUserData = getReferralData(newUserId);
    if (!newUserData.referredBy) {
      newUserData.referredBy = code;
      saveReferralData(newUserId, newUserData);
      return true;
    }
    return false;
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

/** Parse start_param / startapp / query payloads */
export function parseStartParam(startParam?: string | null): string | null {
  if (!startParam) return null;
  const raw = decodeURIComponent(String(startParam)).trim();
  if (raw.startsWith("ref_")) return raw.replace(/^ref_/i, "").toUpperCase();
  if (raw.toUpperCase().startsWith("TRAP-")) return raw.toUpperCase();
  return null;
}

/** Collect invite payload from Telegram Mini App + URL query */
export function readInvitePayloadFromWindow(): string | null {
  if (typeof window === "undefined") return null;

  try {
    // @twa-dev/sdk sets this when opened with startapp / start param
    const w = window as unknown as {
      Telegram?: { WebApp?: { initDataUnsafe?: { start_param?: string } } };
    };
    const fromTg = parseStartParam(w.Telegram?.WebApp?.initDataUnsafe?.start_param);
    if (fromTg) return fromTg;
  } catch {
    /* ignore */
  }

  const params = new URLSearchParams(window.location.search);
  for (const key of ["tgWebAppStartParam", "startapp", "startApp", "ref", "start"]) {
    const v = parseStartParam(params.get(key));
    if (v) return v;
  }

  // Hash style: #tgWebAppData=... rarely has start_param; skip
  return null;
}

export function getReferralLink(referralCode: string, botUsername = BOT_USERNAME): string {
  // Prefer shared helper so bot username stays consistent
  void botUsername;
  return crewInviteLink(referralCode);
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
    inviteLink: crewInviteLink(data.referralCode),
  };
}
