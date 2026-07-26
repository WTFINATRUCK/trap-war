/**
 * User registry — total users + active/online tracking.
 * Touched on every bot interaction (middleware).
 */
import fs from "fs";
import path from "path";
import { isValidTelegramId, sanitizeName } from "./security.js";
import { dataDir } from "./paths.js";

const DATA_DIR = dataDir();
const FILE = path.join(DATA_DIR, "users.json");

/** Consider "online" if active within this window */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
export const ACTIVE_24H_MS = 24 * 60 * 60 * 1000;
export const ACTIVE_7D_MS = 7 * 24 * 60 * 60 * 1000;

export interface UserRecord {
  id: string;
  username?: string;
  firstName?: string;
  firstSeen: number;
  lastSeen: number;
  /** Message / callback count (rough engagement) */
  hits: number;
}

export interface UserStore {
  users: Record<string, UserRecord>;
}

function empty(): UserStore {
  return { users: {} };
}

export function loadUsers(): UserStore {
  try {
    if (!fs.existsSync(FILE)) return empty();
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8")) as UserStore;
    return { users: raw.users || {} };
  } catch {
    return empty();
  }
}

function saveUsers(store: UserStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
  const tmp = `${FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, FILE);
}

export interface TouchResult {
  user: UserRecord;
  /** First time we ever saw this Telegram id */
  isNew: boolean;
  /** Was idle 24h+ before this hit (returning player) */
  isReturning: boolean;
}

/** Record activity for a Telegram user (call on every update). */
export function touchUser(input: {
  id: number;
  username?: string;
  firstName?: string;
}): TouchResult | null {
  if (!isValidTelegramId(input.id)) return null;

  const store = loadUsers();
  const key = String(input.id);
  const now = Date.now();
  const existing = store.users[key];

  if (existing) {
    const idle = now - existing.lastSeen;
    const isReturning = idle >= ACTIVE_24H_MS;
    existing.lastSeen = now;
    existing.hits = (existing.hits || 0) + 1;
    if (input.username) existing.username = sanitizeName(input.username);
    if (input.firstName) existing.firstName = sanitizeName(input.firstName);
    store.users[key] = existing;
    saveUsers(store);
    return { user: existing, isNew: false, isReturning };
  }

  const user: UserRecord = {
    id: key,
    username: sanitizeName(input.username),
    firstName: sanitizeName(input.firstName),
    firstSeen: now,
    lastSeen: now,
    hits: 1,
  };
  store.users[key] = user;
  saveUsers(store);
  return { user, isNew: true, isReturning: false };
}

export interface UserStats {
  totalUsers: number;
  onlineNow: number;
  active24h: number;
  active7d: number;
  newToday: number;
  onlineWindowMin: number;
}

export function getUserStats(now = Date.now()): UserStats {
  const store = loadUsers();
  const list = Object.values(store.users);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dayStart = startOfDay.getTime();

  let onlineNow = 0;
  let active24h = 0;
  let active7d = 0;
  let newToday = 0;

  for (const u of list) {
    const idle = now - u.lastSeen;
    if (idle <= ONLINE_WINDOW_MS) onlineNow++;
    if (idle <= ACTIVE_24H_MS) active24h++;
    if (idle <= ACTIVE_7D_MS) active7d++;
    if (u.firstSeen >= dayStart) newToday++;
  }

  return {
    totalUsers: list.length,
    onlineNow,
    active24h,
    active7d,
    newToday,
    onlineWindowMin: Math.round(ONLINE_WINDOW_MS / 60000),
  };
}

/** Recent users for admin (no sensitive tokens — public TG profile fields only). */
export function getRecentUsers(limit = 15): UserRecord[] {
  const store = loadUsers();
  return Object.values(store.users)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, Math.min(50, Math.max(1, limit)));
}

export function formatStatsHtml(stats: UserStats, recent?: UserRecord[]): string {
  let text =
    "📊 <b>TRAP WAR — LIVE STATS</b>\n\n" +
    `👥 <b>Total users:</b> ${stats.totalUsers}\n` +
    `🟢 <b>Online now:</b> ${stats.onlineNow} <i>(last ${stats.onlineWindowMin} min)</i>\n` +
    `⚡ <b>Active 24h:</b> ${stats.active24h}\n` +
    `📅 <b>Active 7d:</b> ${stats.active7d}\n` +
    `✨ <b>New today:</b> ${stats.newToday}\n`;

  if (recent && recent.length > 0) {
    const now = Date.now();
    text += "\n<b>Recent activity</b>\n";
    text += recent
      .slice(0, 12)
      .map((u, i) => {
        const name = (u.firstName || u.username || u.id)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        const ago = formatAgo(now - u.lastSeen);
        const online = now - u.lastSeen <= ONLINE_WINDOW_MS ? " 🟢" : "";
        return `${i + 1}. ${name}${online} · ${ago}`;
      })
      .join("\n");
  }

  text += "\n\n<i>Online = messaged the bot in the last few minutes.</i>";
  return text;
}

function formatAgo(ms: number): string {
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}
