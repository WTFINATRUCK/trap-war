/** Public Telegram links used inside the Mini App (Vite injects VITE_* at build time). */

export const BOT_USERNAME = (import.meta.env.VITE_BOT_USERNAME as string | undefined)?.replace(
  /^@/,
  ""
) || "TrapWarAppBot";

/**
 * Official announcements channel. Empty until a real public channel exists
 * (t.me/TrapWarOfficial was a placeholder and showed “user not available”).
 */
export const CHANNEL_URL = (
  (import.meta.env.VITE_CHANNEL_URL as string | undefined) || ""
).replace(/\/$/, "");

/**
 * Player chat / community group (not the announcement channel).
 * Set VITE_COMMUNITY_URL after you create the Telegram group.
 */
export const COMMUNITY_URL = (
  (import.meta.env.VITE_COMMUNITY_URL as string | undefined) || ""
).replace(/\/$/, "");

/** True when a real public/invite link is configured (not a placeholder). */
export function isLiveTelegramUrl(url: string | undefined): boolean {
  if (!url) return false;
  const u = url.toLowerCase().trim();
  if (!u.startsWith("https://t.me/") && !u.startsWith("http://t.me/")) return false;
  // Invite links (+hash) are fine for private groups
  if (u.includes("t.me/+") || u.includes("joinchat/")) return true;
  return (
    !u.includes("your_") &&
    !u.includes("yourchannel") &&
    !u.includes("yourcommunity") &&
    !u.includes("example") &&
    !u.includes("placeholder") &&
    // Never treat empty username as live
    /t\.me\/[a-zA-Z][a-zA-Z0-9_]{3,}/.test(u)
  );
}

/**
 * Bot / street API base.
 * - Dev: local secure API (npm run bot → :8787)
 * - Prod: empty = same-origin `/api/*` on Vercel (www.trap-war.com)
 * Override with VITE_API_URL when API lives on another host.
 */
export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  (import.meta.env.DEV ? "http://127.0.0.1:8787" : "");

export const BOT_LINK = `https://t.me/${BOT_USERNAME}`;

export function botStartLink(payload?: string): string {
  if (!payload) return BOT_LINK;
  return `https://t.me/${BOT_USERNAME}?start=${encodeURIComponent(payload)}`;
}

/** Personal crew invite — opens bot with referral payload */
export function crewInviteLink(referralCode: string): string {
  const code = referralCode.replace(/^ref_/i, "").toUpperCase();
  return `https://t.me/${BOT_USERNAME}?start=ref_${code}`;
}

/** Telegram native share sheet */
export function telegramShareLink(inviteUrl: string, text?: string): string {
  const msg =
    text ||
    "Join me on TRAP WAR — 30-day street hustle. Everybody Eats 🤝";
  return `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(msg)}`;
}
