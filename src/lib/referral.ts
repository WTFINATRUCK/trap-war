import type { CloudSave } from "@/types/cloudSave";
import { BOT_USERNAME, crewInviteLink } from "@/config/telegram";

const SAVE_PREFIX = "trapwar_ref_";
const LEDGER_KEY = "trapwar_invite_ledger_v1";

export interface ReferralData {
  referralCode: string;
  referredBy: string | null;
  referrals: string[];
  totalEarnings: number;
  pendingDrip: number;
  /** Explicit invite counter for this account */
  inviteCount: number;
}

/** Reversible: TRAP-{telegramId} */
export function generateReferralCode(telegramId: number): string {
  return `TRAP-${telegramId}`;
}

export function telegramIdFromCode(code: string): number | null {
  const m = code.toUpperCase().replace(/^REF_/, "").match(/^TRAP-(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

function loadLedger(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string[]>;
  } catch {
    return {};
  }
}

function saveLedger(ledger: Record<string, string[]>): void {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
  } catch {
    /* ignore */
  }
}

function bumpLedger(referrerId: number, newUserId: number): number {
  const ledger = loadLedger();
  const key = String(referrerId);
  if (!ledger[key]) ledger[key] = [];
  const id = String(newUserId);
  if (!ledger[key].includes(id)) ledger[key].push(id);
  saveLedger(ledger);
  return ledger[key].length;
}

export function getReferralData(telegramId: number): ReferralData {
  const key = `${SAVE_PREFIX}${telegramId}`;
  const stored = localStorage.getItem(key);
  const code = generateReferralCode(telegramId);

  if (stored) {
    const data = JSON.parse(stored) as ReferralData;
    // Migrate old codes to reversible form
    if (data.referralCode !== code) {
      data.referralCode = code;
    }
    if (typeof data.inviteCount !== "number") {
      data.inviteCount = data.referrals?.length ?? 0;
    }
    if (!Array.isArray(data.referrals)) data.referrals = [];
    // Merge ledger
    const ledger = loadLedger()[String(telegramId)] || [];
    for (const id of ledger) {
      if (!data.referrals.includes(id)) data.referrals.push(id);
    }
    data.inviteCount = Math.max(data.inviteCount, data.referrals.length, ledger.length);
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  }

  const ledger = loadLedger()[String(telegramId)] || [];
  const fresh: ReferralData = {
    referralCode: code,
    referredBy: null,
    referrals: [...ledger],
    totalEarnings: 0,
    pendingDrip: 0,
    inviteCount: ledger.length,
  };
  localStorage.setItem(key, JSON.stringify(fresh));
  return fresh;
}

export function saveReferralData(telegramId: number, data: ReferralData): void {
  data.inviteCount = Math.max(data.inviteCount ?? 0, data.referrals?.length ?? 0);
  localStorage.setItem(`${SAVE_PREFIX}${telegramId}`, JSON.stringify(data));
}

export function registerReferral(newUserId: number, referrerCode: string): boolean {
  const code = referrerCode.toUpperCase().replace(/^REF_/, "");
  const referrerId = telegramIdFromCode(code);

  if (referrerId === newUserId) return false;

  // Always bump global ledger for this referrer id when resolvable
  if (referrerId !== null) {
    bumpLedger(referrerId, newUserId);
  }

  // Update referrer's local data if present or create skeleton for counter
  if (referrerId !== null) {
    const referrerData = getReferralData(referrerId);
    if (!referrerData.referrals.includes(String(newUserId))) {
      referrerData.referrals.push(String(newUserId));
    }
    referrerData.inviteCount = Math.max(referrerData.inviteCount, referrerData.referrals.length);
    saveReferralData(referrerId, referrerData);
  } else {
    // Legacy non-reversible code: only mark invitee
    const newUserData = getReferralData(newUserId);
    if (!newUserData.referredBy) {
      newUserData.referredBy = code;
      saveReferralData(newUserId, newUserData);
      return true;
    }
    return false;
  }

  const newUserData = getReferralData(newUserId);
  if (newUserData.referredBy) return false;
  newUserData.referredBy = String(referrerId);
  saveReferralData(newUserId, newUserData);
  return true;
}

export function parseStartParam(startParam?: string | null): string | null {
  if (!startParam) return null;
  const raw = decodeURIComponent(String(startParam)).trim();
  if (raw.toLowerCase().startsWith("ref_")) return raw.slice(4).toUpperCase();
  if (raw.toUpperCase().startsWith("TRAP-")) return raw.toUpperCase();
  return null;
}

export function readInvitePayloadFromWindow(): string | null {
  if (typeof window === "undefined") return null;

  try {
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
  return null;
}

export function getReferralLink(referralCode: string, botUsername = BOT_USERNAME): string {
  void botUsername;
  return crewInviteLink(referralCode);
}

/** Sync invite counter into cloud save for this account */
export function applyInviteCountToCloudSave(cloud: CloudSave): CloudSave {
  const data = getReferralData(cloud.telegramId);
  const count = Math.max(data.inviteCount, data.referrals.length, cloud.inviteCount ?? 0);
  return {
    ...cloud,
    referralCode: data.referralCode,
    referredBy: cloud.referredBy ?? data.referredBy ?? undefined,
    inviteCount: count,
    invitedIds: data.referrals,
  };
}

export function getReferralStats(telegramId: number, cloudSave?: CloudSave | null) {
  const data = getReferralData(telegramId);
  const ledger = loadLedger()[String(telegramId)] || [];
  const cloudCount = cloudSave?.inviteCount ?? 0;
  const cloudIds = cloudSave?.invitedIds ?? [];

  const mergedIds = new Set<string>([...data.referrals, ...ledger, ...cloudIds]);
  const totalInvites = Math.max(data.inviteCount, mergedIds.size, cloudCount);

  // Persist merged counter for this account
  if (totalInvites !== data.inviteCount || mergedIds.size !== data.referrals.length) {
    data.referrals = Array.from(mergedIds);
    data.inviteCount = totalInvites;
    saveReferralData(telegramId, data);
  }

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
    totalReferrals: totalInvites,
    inviteCount: totalInvites,
    activeReferrals: activeReferrals.length,
    totalEarnings: data.totalEarnings,
    pendingDrip: data.pendingDrip + (cloudSave?.referralPending?.queuedDrip ?? 0),
    referralCode: data.referralCode,
    referredBy: data.referredBy ?? cloudSave?.referredBy ?? null,
    inviteLink: crewInviteLink(data.referralCode),
    invitedIds: data.referrals,
  };
}
