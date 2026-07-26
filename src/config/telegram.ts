/** Public Telegram links used inside the Mini App (Vite injects VITE_* at build time). */

export const BOT_USERNAME = (import.meta.env.VITE_BOT_USERNAME as string | undefined)?.replace(
  /^@/,
  ""
) || "TrapWarAppBot";

export const CHANNEL_URL =
  (import.meta.env.VITE_CHANNEL_URL as string | undefined) || "https://t.me/TrapWarOfficial";

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
