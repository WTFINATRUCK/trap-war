/**
 * Backend security helpers for Trap War bot.
 * - Telegram WebApp initData HMAC validation
 * - Input validation / sanitization
 * - Simple rate limiting
 */
import crypto from "crypto";

const MAX_NAME_LEN = 64;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;

/** In-memory rate limit: key → timestamps */
const rateBuckets = new Map<string, number[]>();

export function isValidTelegramId(id: unknown): id is number {
  return (
    typeof id === "number" &&
    Number.isInteger(id) &&
    id > 0 &&
    id < Number.MAX_SAFE_INTEGER
  );
}

export function sanitizeName(input?: string): string | undefined {
  if (!input || typeof input !== "string") return undefined;
  const cleaned = input.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, MAX_NAME_LEN);
  return cleaned || undefined;
}

/**
 * Official invite payload only:
 *   ref_TRAP-{telegramId}
 * Rejects free-form codes (no bare TRAP- without ref_ for attribution).
 */
export function parseInviteOnlyPayload(payload?: string): string | null {
  if (!payload || typeof payload !== "string") return null;
  const raw = payload.trim();
  // Must come from deep link: ?start=ref_TRAP-123
  const m = raw.match(/^ref_(TRAP-\d+)$/i);
  if (!m) return null;
  const code = m[1].toUpperCase();
  const id = telegramIdFromInviteCode(code);
  if (!isValidTelegramId(id)) return null;
  return code;
}

export function telegramIdFromInviteCode(code: string): number | null {
  const m = code.toUpperCase().match(/^TRAP-(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return isValidTelegramId(n) ? n : null;
}

export function inviteCodeForUser(telegramId: number): string {
  if (!isValidTelegramId(telegramId)) {
    throw new Error("Invalid telegram id");
  }
  return `TRAP-${telegramId}`;
}

/** Sliding-window rate limit. Returns true if allowed. */
export function rateLimit(key: string, max = RATE_MAX, windowMs = RATE_WINDOW_MS): boolean {
  const now = Date.now();
  const prev = rateBuckets.get(key) || [];
  const fresh = prev.filter((t) => now - t < windowMs);
  if (fresh.length >= max) {
    rateBuckets.set(key, fresh);
    return false;
  }
  fresh.push(now);
  rateBuckets.set(key, fresh);
  return true;
}

/**
 * Validate Telegram Mini App initData (HMAC-SHA-256).
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateWebAppInitData(
  initData: string,
  botToken: string,
  maxAgeSec = 86400
): { ok: true; userId: number; username?: string; firstName?: string; startParam?: string } | { ok: false; reason: string } {
  if (!initData || !botToken) {
    return { ok: false, reason: "missing_init_data" };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "missing_hash" };

  params.delete("hash");
  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  // timing-safe compare
  try {
    const a = Buffer.from(calculated, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, reason: "bad_signature" };
    }
  } catch {
    return { ok: false, reason: "bad_signature" };
  }

  const authDate = parseInt(params.get("auth_date") || "0", 10);
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSec) {
    return { ok: false, reason: "expired" };
  }

  let userId = 0;
  let username: string | undefined;
  let firstName: string | undefined;
  try {
    const userRaw = params.get("user");
    if (userRaw) {
      const user = JSON.parse(userRaw) as { id?: number; username?: string; first_name?: string };
      if (!isValidTelegramId(user.id)) return { ok: false, reason: "bad_user" };
      userId = user.id;
      username = sanitizeName(user.username);
      firstName = sanitizeName(user.first_name);
    }
  } catch {
    return { ok: false, reason: "bad_user_json" };
  }

  if (!userId) return { ok: false, reason: "no_user" };

  const startParam = params.get("start_param") || undefined;
  return { ok: true, userId, username, firstName, startParam };
}

/** Redact secrets from logs */
export function redactSecrets(msg: string): string {
  return msg.replace(/\d{6,}:[A-Za-z0-9_-]{20,}/g, "[REDACTED_BOT_TOKEN]");
}
