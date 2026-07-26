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
  /** Soft ban — bot refuses play / commands */
  banned?: boolean;
  banReason?: string;
  bannedAt?: number;
  /** Public @ on street cards (default true when username known) */
  allowTelegramContact?: boolean;
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

export function getUserById(id: string | number): UserRecord | null {
  const key = String(id).trim();
  if (!key) return null;
  const store = loadUsers();
  return store.users[key] || null;
}

/** Lookup by numeric id or @username (case-insensitive). */
export function findUser(query: string): UserRecord | null {
  const q = query.trim().replace(/^@/, "");
  if (!q) return null;
  const byId = getUserById(q);
  if (byId) return byId;
  const store = loadUsers();
  const lower = q.toLowerCase();
  return (
    Object.values(store.users).find((u) => (u.username || "").toLowerCase() === lower) || null
  );
}

export function listPlayersAdmin(limit = 40): UserRecord[] {
  const store = loadUsers();
  return Object.values(store.users)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, Math.min(100, Math.max(1, limit)));
}

export function isBanned(id: string | number): boolean {
  const u = getUserById(id);
  return Boolean(u?.banned);
}

export function banUser(id: string | number, reason?: string): UserRecord | null {
  const store = loadUsers();
  const key = String(id).trim();
  const u = store.users[key];
  if (!u) return null;
  u.banned = true;
  u.banReason = (reason || "banned").slice(0, 120);
  u.bannedAt = Date.now();
  store.users[key] = u;
  saveUsers(store);
  return u;
}

export function unbanUser(id: string | number): UserRecord | null {
  const store = loadUsers();
  const key = String(id).trim();
  const u = store.users[key];
  if (!u) return null;
  u.banned = false;
  u.banReason = undefined;
  u.bannedAt = undefined;
  store.users[key] = u;
  saveUsers(store);
  return u;
}

export function countBanned(): number {
  return Object.values(loadUsers().users).filter((u) => u.banned).length;
}

/** Public street card — no ban details beyond blocked, no private tokens. */
export function getPublicPlayerCard(id: string | number): {
  id: string;
  streetName: string;
  firstName?: string;
  username?: string;
  firstSeen: number;
  lastSeen: number;
  hits: number;
  banned: boolean;
} | null {
  const u = getUserById(id);
  if (!u) return null;
  if (u.banned) {
    return {
      id: u.id,
      streetName: streetNameFromId(u.id),
      firstSeen: u.firstSeen,
      lastSeen: u.lastSeen,
      hits: u.hits,
      banned: true,
    };
  }
  const allow = u.allowTelegramContact !== false;
  return {
    id: u.id,
    streetName: streetNameFromId(u.id),
    firstName: u.firstName,
    username: allow && u.username ? u.username : undefined,
    firstSeen: u.firstSeen,
    lastSeen: u.lastSeen,
    hits: u.hits,
    banned: false,
  };
}

function streetNameFromId(id: string): string {
  const FIRST = [
    "Big Lou", "Lil Kev", "Ghost", "Stacks", "Rook", "Trina", "Dez", "Ice", "Mando", "Kilo",
    "Sosa", "Rico", "Blaze", "Nino", "Asha", "Flex", "Juke", "Pepe", "Viper", "Cali",
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return FIRST[h % FIRST.length]!;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatStatsHtml(stats: UserStats, recent?: UserRecord[]): string {
  let text =
    "📊 <b>TRAP WAR — LIVE STATS</b>\n\n" +
    `👥 <b>Total users:</b> ${stats.totalUsers}\n` +
    `🟢 <b>Online now:</b> ${stats.onlineNow} <i>(last ${stats.onlineWindowMin} min)</i>\n` +
    `⚡ <b>Active 24h:</b> ${stats.active24h}\n` +
    `📅 <b>Active 7d:</b> ${stats.active7d}\n` +
    `✨ <b>New today:</b> ${stats.newToday}\n` +
    `🚫 <b>Banned:</b> ${countBanned()}\n`;

  if (recent && recent.length > 0) {
    const now = Date.now();
    text += "\n<b>Recent activity</b>\n";
    text += recent
      .slice(0, 12)
      .map((u, i) => {
        const name = esc(u.firstName || (u.username ? `@${u.username}` : u.id));
        const ago = formatAgo(now - u.lastSeen);
        const online = now - u.lastSeen <= ONLINE_WINDOW_MS ? " 🟢" : "";
        const ban = u.banned ? " 🚫" : "";
        return `${i + 1}. ${name}${online}${ban} · <code>${u.id}</code> · ${ago}`;
      })
      .join("\n");
  }

  text += "\n\n<i>Online = messaged the bot in the last few minutes.</i>";
  return text;
}

export function formatAdminDashboardHtml(): string {
  const stats = getUserStats();
  const banned = countBanned();
  return (
    "🛠 <b>TRAP WAR — ADMIN</b>\n\n" +
    `👥 Total real players: <b>${stats.totalUsers}</b>\n` +
    `🟢 Online now: <b>${stats.onlineNow}</b>\n` +
    `⚡ Active 24h: <b>${stats.active24h}</b>\n` +
    `🚫 Banned: <b>${banned}</b>\n\n` +
    "<b>Commands</b>\n" +
    "/players — list players + ban flag\n" +
    "/player &lt;id|@user&gt; — one player card\n" +
    "/ban &lt;id&gt; [reason]\n" +
    "/unban &lt;id&gt;\n" +
    "/dm &lt;id&gt; &lt;message&gt; — bot DMs them\n" +
    "/thanks &lt;id&gt; — quick thanks message\n" +
    "/stats — live counts\n"
  );
}

export function formatPlayersListHtml(limit = 25): string {
  const list = listPlayersAdmin(limit);
  const now = Date.now();
  if (list.length === 0) {
    return "👥 <b>No players registered yet.</b>\nThey show up when they /start or open the Mini App.";
  }
  const lines = list.map((u, i) => {
    const name = esc(u.firstName || (u.username ? `@${u.username}` : "anon"));
    const un = u.username ? ` @${esc(u.username)}` : "";
    const ban = u.banned ? " 🚫BANNED" : "";
    const online = now - u.lastSeen <= ONLINE_WINDOW_MS ? " 🟢" : "";
    const days = Math.max(0, Math.floor((now - u.firstSeen) / 86_400_000));
    return (
      `${i + 1}. <b>${name}</b>${un}${online}${ban}\n` +
      `   id <code>${u.id}</code> · ${days}d · hits ${u.hits} · last ${formatAgo(now - u.lastSeen)}`
    );
  });
  return (
    `👥 <b>Players</b> (latest ${list.length})\n\n` +
    lines.join("\n\n") +
    "\n\nTap /player &lt;id&gt; · /dm &lt;id&gt; hi · /ban &lt;id&gt;"
  );
}

export function formatPlayerCardHtml(u: UserRecord): string {
  const now = Date.now();
  const days = Math.max(0, Math.floor((now - u.firstSeen) / 86_400_000));
  const name = esc(u.firstName || "—");
  const un = u.username ? `@${esc(u.username)}` : "(no @)";
  return (
    "🪪 <b>Player card</b>\n\n" +
    `Name: <b>${name}</b>\n` +
    `Username: ${un}\n` +
    `ID: <code>${u.id}</code>\n` +
    `Street: ${streetNameFromId(u.id)}\n` +
    `In game: <b>${days}</b> day(s) · first ${formatAgo(now - u.firstSeen)} ago\n` +
    `Last seen: ${formatAgo(now - u.lastSeen)}\n` +
    `Hits: ${u.hits}\n` +
    `Banned: <b>${u.banned ? "YES" : "no"}</b>` +
    (u.banned && u.banReason ? ` (${esc(u.banReason)})` : "") +
    "\n\n" +
    `/dm ${u.id} Thanks for playing Trap War 🙌\n` +
    (u.banned ? `/unban ${u.id}` : `/ban ${u.id} spam`)
  );
}

function formatAgo(ms: number): string {
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}
