/**
 * Per-account invite counter (file-backed).
 * Source of truth when users join via t.me/Bot?start=ref_TRAP-{telegramId}
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const FILE = path.join(DATA_DIR, "referrals.json");

export interface InviteRecord {
  userId: string;
  username?: string;
  firstName?: string;
  at: number;
}

export interface ReferralStore {
  /** referrerCode → invited users */
  byCode: Record<string, InviteRecord[]>;
  /** referredUserId → referrerCode */
  byUser: Record<string, string>;
  /** telegramId → personal code (TRAP-{id}) */
  codes: Record<string, string>;
}

function empty(): ReferralStore {
  return { byCode: {}, byUser: {}, codes: {} };
}

export function loadReferrals(): ReferralStore {
  try {
    if (!fs.existsSync(FILE)) return empty();
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8")) as ReferralStore;
    const store = { ...empty(), ...raw };
    // Migrate old string[] entries to InviteRecord[]
    for (const [code, list] of Object.entries(store.byCode)) {
      if (!Array.isArray(list)) {
        store.byCode[code] = [];
        continue;
      }
      store.byCode[code] = list.map((item) => {
        if (typeof item === "string") {
          return { userId: item, at: Date.now() };
        }
        return item as InviteRecord;
      });
    }
    return store;
  } catch {
    return empty();
  }
}

export function saveReferrals(store: ReferralStore): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2), "utf8");
}

/** Deterministic reversible code for any telegram account */
export function generateCode(telegramId: number): string {
  return `TRAP-${telegramId}`;
}

export function telegramIdFromCode(code: string): number | null {
  const m = code.toUpperCase().replace(/^REF_/, "").match(/^TRAP-(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

export function codeForUser(telegramId: number): string {
  const store = loadReferrals();
  const key = String(telegramId);
  const code = generateCode(telegramId);
  if (store.codes[key] !== code) {
    // Prefer reversible code; keep old code mapping if it pointed here
    const old = store.codes[key];
    store.codes[key] = code;
    if (old && old !== code && store.byCode[old]) {
      store.byCode[code] = [...(store.byCode[code] || []), ...store.byCode[old]];
      // dedupe by userId
      const seen = new Set<string>();
      store.byCode[code] = store.byCode[code].filter((r) => {
        if (seen.has(r.userId)) return false;
        seen.add(r.userId);
        return true;
      });
    }
    saveReferrals(store);
  }
  return code;
}

export function parseRefPayload(payload?: string): string | null {
  if (!payload) return null;
  const raw = payload.trim();
  if (raw.toLowerCase().startsWith("ref_")) return raw.slice(4).toUpperCase();
  if (raw.toUpperCase().startsWith("TRAP-")) return raw.toUpperCase();
  return null;
}

export function attributeReferral(
  newUserId: number,
  referrerCode: string,
  meta?: { username?: string; firstName?: string }
): boolean {
  const code = referrerCode.toUpperCase().replace(/^REF_/, "");
  const store = loadReferrals();
  const uid = String(newUserId);

  if (store.byUser[uid]) return false;

  const ownerFromCode = telegramIdFromCode(code);
  const ownerFromMap = Object.entries(store.codes).find(([, c]) => c === code)?.[0];
  const ownerId = ownerFromCode ?? (ownerFromMap ? parseInt(ownerFromMap, 10) : null);

  if (ownerId !== null && ownerId === newUserId) return false;

  // Ensure owner has code registered
  if (ownerId !== null) {
    store.codes[String(ownerId)] = generateCode(ownerId);
  }

  const canonical = ownerId !== null ? generateCode(ownerId) : code;

  store.byUser[uid] = canonical;
  if (!store.byCode[canonical]) store.byCode[canonical] = [];
  if (!store.byCode[canonical].some((r) => r.userId === uid)) {
    store.byCode[canonical].push({
      userId: uid,
      username: meta?.username,
      firstName: meta?.firstName,
      at: Date.now(),
    });
  }
  saveReferrals(store);
  return true;
}

export function inviteLink(botUsername: string, telegramId: number): string {
  const code = codeForUser(telegramId);
  const user = botUsername.replace(/^@/, "");
  return `https://t.me/${user}?start=ref_${code}`;
}

export function crewStats(telegramId: number): {
  code: string;
  total: number;
  invites: InviteRecord[];
} {
  const store = loadReferrals();
  const code = codeForUser(telegramId);
  const invites = store.byCode[code] || [];
  return { code, total: invites.length, invites };
}
