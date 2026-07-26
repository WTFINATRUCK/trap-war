/**
 * Simple file-backed referral map so invites work even before Mini App opens.
 * Maps referredUserId → referrerCode (e.g. TRAP-1234ABCD)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const FILE = path.join(DATA_DIR, "referrals.json");

export interface ReferralStore {
  /** referrerCode → list of referred telegram user ids */
  byCode: Record<string, string[]>;
  /** referredUserId → referrerCode */
  byUser: Record<string, string>;
  /** telegramId → personal code */
  codes: Record<string, string>;
}

function empty(): ReferralStore {
  return { byCode: {}, byUser: {}, codes: {} };
}

export function loadReferrals(): ReferralStore {
  try {
    if (!fs.existsSync(FILE)) return empty();
    return { ...empty(), ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
  } catch {
    return empty();
  }
}

export function saveReferrals(store: ReferralStore): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2), "utf8");
}

export function codeForUser(telegramId: number): string {
  const store = loadReferrals();
  const key = String(telegramId);
  if (store.codes[key]) return store.codes[key];
  const id = key.padStart(8, "0");
  const code = `TRAP-${id.slice(0, 4)}${id.slice(-4)}`.toUpperCase();
  store.codes[key] = code;
  saveReferrals(store);
  return code;
}

export function parseRefPayload(payload?: string): string | null {
  if (!payload) return null;
  if (payload.startsWith("ref_")) return payload.slice(4).toUpperCase();
  if (payload.toUpperCase().startsWith("TRAP-")) return payload.toUpperCase();
  return null;
}

/** Register that `newUserId` was invited by `referrerCode`. Returns true if newly attributed. */
export function attributeReferral(newUserId: number, referrerCode: string): boolean {
  const code = referrerCode.toUpperCase().replace(/^REF_/, "");
  const store = loadReferrals();
  const uid = String(newUserId);

  // Don't overwrite existing attribution
  if (store.byUser[uid]) return false;

  // Don't self-refer (code maps back to same user)
  const ownerId = Object.entries(store.codes).find(([, c]) => c === code)?.[0];
  if (ownerId === uid) return false;

  store.byUser[uid] = code;
  if (!store.byCode[code]) store.byCode[code] = [];
  if (!store.byCode[code].includes(uid)) store.byCode[code].push(uid);
  saveReferrals(store);
  return true;
}

export function inviteLink(botUsername: string, telegramId: number): string {
  const code = codeForUser(telegramId);
  const user = botUsername.replace(/^@/, "");
  return `https://t.me/${user}?start=ref_${code}`;
}

export function crewStats(telegramId: number): { code: string; total: number } {
  const store = loadReferrals();
  const code = codeForUser(telegramId);
  return { code, total: (store.byCode[code] || []).length };
}
