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
