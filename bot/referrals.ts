/**
 * Per-account invite ledger (file-backed).
 *
 * INVITE-ONLY: attribution ONLY via Telegram deep link
 *   https://t.me/Bot?start=ref_TRAP-{telegramId}
 *
 * No free-form codes. No self-invite. One referrer per account forever.
 */
import fs from "fs";
import path from "path";
import {
  inviteCodeForUser,
  isValidTelegramId,
  rateLimit,
  sanitizeName,
  telegramIdFromInviteCode,
} from "./security.js";
import { dataDir } from "./paths.js";

const DATA_DIR = dataDir();
const FILE = path.join(DATA_DIR, "referrals.json");
const MAX_INVITES_PER_ACCOUNT = 10_000;

export interface InviteRecord {
  userId: string;
  username?: string;
  firstName?: string;
  at: number;
  /** Always telegram_start — invite link only */
  source: "telegram_start";
}

export interface ReferralStore {
  byCode: Record<string, InviteRecord[]>;
  byUser: Record<string, string>;
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
    for (const [code, list] of Object.entries(store.byCode)) {
      if (!Array.isArray(list)) {
        store.byCode[code] = [];
        continue;
      }
      store.byCode[code] = list.map((item) => {
        if (typeof item === "string") {
          return { userId: item, at: Date.now(), source: "telegram_start" as const };
        }
        return {
          userId: String((item as InviteRecord).userId),
          username: sanitizeName((item as InviteRecord).username),
          firstName: sanitizeName((item as InviteRecord).firstName),
          at: Number((item as InviteRecord).at) || Date.now(),
          source: "telegram_start" as const,
        };
      });
    }
    return store;
  } catch {
    return empty();
  }
}

/** Atomic write — avoid corrupt JSON on crash */
export function saveReferrals(store: ReferralStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
  const tmp = `${FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, FILE);
}

export function generateCode(telegramId: number): string {
  return inviteCodeForUser(telegramId);
}

export function telegramIdFromCode(code: string): number | null {
  return telegramIdFromInviteCode(code);
}

export function codeForUser(telegramId: number): string {
  if (!isValidTelegramId(telegramId)) {
    throw new Error("invalid_telegram_id");
  }
  const store = loadReferrals();
  const key = String(telegramId);
  const code = generateCode(telegramId);
  if (store.codes[key] !== code) {
    const old = store.codes[key];
    store.codes[key] = code;
    if (old && old !== code && store.byCode[old]) {
      const merged = [...(store.byCode[code] || []), ...store.byCode[old]];
      const seen = new Set<string>();
      store.byCode[code] = merged.filter((r) => {
        if (seen.has(r.userId)) return false;
        seen.add(r.userId);
        return true;
      });
    }
    saveReferrals(store);
  }
  return code;
}

/**
 * Invite-link only. Payload must be exactly: ref_TRAP-{telegramId}
 * (from Telegram start deep link — not free-form chat text).
 */
export function parseRefPayload(payload?: string): string | null {
  if (!payload || typeof payload !== "string") return null;
  const raw = payload.trim();
  // Require ref_ prefix (official invite link format)
  const m = raw.match(/^ref_(TRAP-\d+)$/i);
  if (!m) return null;
  const code = m[1].toUpperCase();
  if (!telegramIdFromInviteCode(code)) return null;
  return code;
}

export type AttributeResult =
  | { ok: true; referrerId: number; total: number }
  | { ok: false; reason: string };

/**
 * Attribute invite. ONLY valid invite-link codes.
 * - One referrer per account (permanent)
 * - No self-invite
 * - Rate limited per IP/user
 */
export function attributeReferral(
  newUserId: number,
  referrerCode: string,
  meta?: { username?: string; firstName?: string }
): AttributeResult {
  if (!isValidTelegramId(newUserId)) {
    return { ok: false, reason: "invalid_user" };
  }

  // Rate limit attribution attempts per user
  if (!rateLimit(`attr:${newUserId}`, 5, 60_000)) {
    return { ok: false, reason: "rate_limited" };
  }

  // Must be TRAP-{id} only (invite link form after stripping ref_)
  const code = referrerCode.toUpperCase().replace(/^REF_/, "");
  const ownerId = telegramIdFromInviteCode(code);
  if (!ownerId) {
    return { ok: false, reason: "invalid_invite_code" };
  }

  if (ownerId === newUserId) {
    return { ok: false, reason: "self_invite" };
  }

  const store = loadReferrals();
  const uid = String(newUserId);

  // Already attributed — cannot re-assign
  if (store.byUser[uid]) {
    return { ok: false, reason: "already_attributed" };
  }

  const canonical = generateCode(ownerId);
  store.codes[String(ownerId)] = canonical;

  // Cap list size (DoS guard)
  const list = store.byCode[canonical] || [];
  if (list.length >= MAX_INVITES_PER_ACCOUNT) {
    return { ok: false, reason: "referrer_cap" };
  }

  if (list.some((r) => r.userId === uid)) {
    store.byUser[uid] = canonical;
    saveReferrals(store);
    return { ok: false, reason: "already_listed" };
  }

  store.byUser[uid] = canonical;
  store.byCode[canonical] = [
    ...list,
    {
      userId: uid,
      username: sanitizeName(meta?.username),
      firstName: sanitizeName(meta?.firstName),
      at: Date.now(),
      source: "telegram_start",
    },
  ];
  saveReferrals(store);

  return { ok: true, referrerId: ownerId, total: store.byCode[canonical].length };
}

export function inviteLink(botUsername: string, telegramId: number): string {
  const code = codeForUser(telegramId);
  const user = botUsername.replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "");
  return `https://t.me/${user}?start=ref_${code}`;
}

export function crewStats(telegramId: number): {
  code: string;
  total: number;
  invites: InviteRecord[];
} {
  if (!isValidTelegramId(telegramId)) {
    return { code: "", total: 0, invites: [] };
  }
  const store = loadReferrals();
  const code = codeForUser(telegramId);
  const invites = store.byCode[code] || [];
  return { code, total: invites.length, invites };
}

/** Public read for authenticated Mini App (own account only) */
export function getInviteCountForUser(telegramId: number): number {
  return crewStats(telegramId).total;
}
