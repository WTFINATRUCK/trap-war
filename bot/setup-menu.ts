/**
 * One-shot: set menu button to Commands list + register bot commands.
 * Usage: npx tsx bot/setup-menu.ts
 */
import "dotenv/config";
import { Telegraf } from "telegraf";

const token = process.env.BOT_TOKEN?.trim();

if (!token) {
  console.error("BOT_TOKEN missing");
  process.exit(1);
}

const bot = new Telegraf(token);

async function main() {
  const me = await bot.telegram.getMe();

  // Open slash-command menu (not Mini App)
  await bot.telegram.setChatMenuButton({
    menuButton: { type: "commands" },
  });

  await bot.telegram.setMyCommands([
    { command: "start", description: "Play Trap War" },
    { command: "play", description: "Open Mini App" },
    { command: "guide", description: "How to play (in-game)" },
    { command: "soon", description: "Coming soon / roadmap" },
    { command: "invite", description: "Your invite link" },
      { command: "crew", description: "Crew stats + invite" },
      { command: "stats", description: "Total users & online now" },
      { command: "channel", description: "Official channel" },
      { command: "vault", description: "Protected vault" },
      { command: "help", description: "Commands menu" },
    ]);

  console.log(`OK @${me.username}`);
  console.log("Menu button → Commands list (/start /play /guide /soon …)");
  console.log(`Open: https://t.me/${me.username}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
