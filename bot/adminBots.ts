/**
 * Trap War multi-bot stack — 2–3 admin bots for channel + community chat.
 *
 * Roles:
 *  1. MAIN      — Mini App, invites, /start /play (BOT_TOKEN)
 *  2. COMMUNITY — welcomes, rules, links in the player chat (COMMUNITY_BOT_TOKEN)
 *  3. GUARD     — light mod tools, anti-spam helpers (GUARD_BOT_TOKEN)
 *
 * Create each bot in @BotFather, then put tokens in .env.
 * Add ALL of them as administrators in the channel and community group.
 */

export type BotRoleId = "main" | "community" | "guard";

export interface AdminBotDef {
  role: BotRoleId;
  /** Display name for logs + /adminbots */
  label: string;
  /** Short job description */
  job: string;
  tokenEnv: string;
  usernameEnv: string;
  /** Suggested @BotFather username */
  suggestedUsername: string;
  /** Rights to enable when promoting in Telegram UI */
  adminRights: string[];
}

export const ADMIN_BOT_DEFS: AdminBotDef[] = [
  {
    role: "main",
    label: "Play / Game bot",
    job: "Mini App · invites · /start /play · player economy",
    tokenEnv: "BOT_TOKEN",
    usernameEnv: "BOT_USERNAME",
    suggestedUsername: "TrapWarAppBot",
    adminRights: [
      "Invite users via link",
      "Pin messages",
      "Manage topics (if forum)",
      "Post messages (channel)",
    ],
  },
  {
    role: "community",
    label: "Community / Welcome bot",
    job: "Welcome new members · /rules · /links · keep chat warm",
    tokenEnv: "COMMUNITY_BOT_TOKEN",
    usernameEnv: "COMMUNITY_BOT_USERNAME",
    suggestedUsername: "TrapWarChatBot",
    adminRights: [
      "Delete messages",
      "Pin messages",
      "Invite users via link",
      "Manage video chats (optional)",
    ],
  },
  {
    role: "guard",
    label: "Guard / Mod bot",
    job: "Light mod tools · anti-spam · human-admin helpers",
    tokenEnv: "GUARD_BOT_TOKEN",
    usernameEnv: "GUARD_BOT_USERNAME",
    suggestedUsername: "TrapWarGuardBot",
    adminRights: [
      "Delete messages",
      "Ban users",
      "Restrict members",
      "Invite users via link",
    ],
  },
];

export interface ResolvedAdminBot {
  role: BotRoleId;
  label: string;
  job: string;
  token: string;
  username: string;
  suggestedUsername: string;
  adminRights: string[];
  configured: boolean;
}

function cleanUser(u: string): string {
  return u.replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "");
}

/** Resolve which admin bots have tokens in env (never log tokens). */
export function resolveAdminBots(): ResolvedAdminBot[] {
  return ADMIN_BOT_DEFS.map((d) => {
    const token = (process.env[d.tokenEnv] || "").trim();
    const username = cleanUser(
      process.env[d.usernameEnv] || (token ? d.suggestedUsername : "")
    );
    return {
      role: d.role,
      label: d.label,
      job: d.job,
      token,
      username,
      suggestedUsername: d.suggestedUsername,
      adminRights: d.adminRights,
      configured: Boolean(token && token.includes(":")),
    };
  });
}

export function configuredAdminBots(): ResolvedAdminBot[] {
  return resolveAdminBots().filter((b) => b.configured);
}

export function adminBotUsernames(): string[] {
  return configuredAdminBots()
    .map((b) => b.username)
    .filter(Boolean);
}

/** HTML blurb for /adminbots and setup messages */
export function adminBotsStatusHtml(): string {
  // Lazy import-safe names (personas are human-facing)
  const human: Record<string, string> = {
    main: "Stacks",
    community: "Kayla",
    guard: "Big Lou",
  };
  const all = resolveAdminBots();
  const lines = all.map((b, i) => {
    const at = b.username ? `@${b.username}` : `@${b.suggestedUsername}`;
    const who = human[b.role] || b.label;
    const state = b.configured ? "✅ token set" : "⬜ create in BotFather + add token";
    return (
      `<b>${i + 1}. ${who}</b> <i>(${b.label})</i>\n` +
      `   ${at} · ${b.job}\n` +
      `   ${state}`
    );
  });
  const n = all.filter((b) => b.configured).length;
  return (
    "👥 <b>Who runs the door</b> (2–3 human-style admin bots)\n\n" +
    lines.join("\n\n") +
    `\n\n<b>Configured:</b> ${n}/${all.length}\n` +
    "Display names + pics: <code>npm run bot:personas</code>\n" +
    "Add each as <b>admin</b> in channel + community."
  );
}

export function parseAdminIds(): Set<number> {
  return new Set(
    (process.env.ADMIN_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => parseInt(s, 10))
      .filter((n) => Number.isFinite(n) && n > 0)
  );
}

export function isHumanAdmin(userId?: number): boolean {
  if (!userId) return false;
  const ids = parseAdminIds();
  if (ids.size === 0) return true; // early launch: open
  return ids.has(userId);
}

export function hubLinks(): { play?: string; channel?: string; community?: string } {
  const bot = cleanUser(process.env.BOT_USERNAME || "TrapWarAppBot");
  const channel = (process.env.CHANNEL_URL || "").replace(/\/$/, "");
  const community = (process.env.COMMUNITY_URL || "").replace(/\/$/, "");
  return {
    play: bot ? `https://t.me/${bot}` : undefined,
    channel: channel || undefined,
    community: community || undefined,
  };
}

export function isLiveTelegramUrl(url: string): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  if (!u.includes("t.me/")) return false;
  return (
    !u.includes("your_") &&
    !u.includes("yourchannel") &&
    !u.includes("yourcommunity") &&
    !u.includes("example") &&
    !u.includes("placeholder")
  );
}
