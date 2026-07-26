/**
 * One-shot: set BotFather-style menu button + commands via API.
 * Usage: npx tsx bot/setup-menu.ts
 */
import "dotenv/config";
import { Telegraf } from "telegraf";

const token = process.env.BOT_TOKEN?.trim();
const webAppUrl = (process.env.WEBAPP_URL || "").replace(/\/$/, "");

if (!token) {
  console.error("BOT_TOKEN missing");
  process.exit(1);
}
if (!webAppUrl.startsWith("https://")) {
  console.error("WEBAPP_URL must be HTTPS (deploy Mini App first)");
  process.exit(1);
}

const bot = new Telegraf(token);

async function main() {
  const me = await bot.telegram.getMe();
  await bot.telegram.setChatMenuButton({
    menuButton: {
      type: "web_app",
      text: "Play",
      web_app: { url: webAppUrl },
    },
  });
  await bot.telegram.setMyCommands([
    { command: "start", description: "Play Trap War" },
    { command: "play", description: "Open Mini App" },
    { command: "channel", description: "Official channel" },
    { command: "crew", description: "Crew / referrals" },
    { command: "vault", description: "Protected vault" },
    { command: "help", description: "How to play" },
  ]);
  console.log(`OK @${me.username}`);
  console.log(`Menu → Play → ${webAppUrl}`);
  console.log(`Open: https://t.me/${me.username}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
