/**
 * One-shot: register menu button + command list.
 * Usage: npx tsx bot/setup-menu.ts
 */
import "dotenv/config";
import { Telegraf } from "telegraf";

const token = process.env.BOT_TOKEN?.trim();
const webAppUrl = (
  process.env.WEBAPP_URL ||
  process.env.VITE_WEBAPP_URL ||
  "https://www.trap-war.com"
).replace(/\/$/, "");

if (!token) {
  console.error("BOT_TOKEN missing");
  process.exit(1);
}

const bot = new Telegraf(token);

async function main() {
  const me = await bot.telegram.getMe();

  if (webAppUrl.startsWith("https://")) {
    await bot.telegram.setChatMenuButton({
      menuButton: {
        type: "web_app",
        text: "Play Trap War",
        web_app: { url: webAppUrl },
      },
    });
    console.log(`Menu button → Play Trap War (${webAppUrl})`);
  } else {
    await bot.telegram.setChatMenuButton({
      menuButton: { type: "commands" },
    });
    console.log("Menu button → Commands list");
  }

  await bot.telegram.setMyCommands([
    { command: "start", description: "Welcome + Play button" },
    { command: "play", description: "Open the Mini App" },
    { command: "guide", description: "How to play" },
    { command: "help", description: "All commands" },
    { command: "invite", description: "Your invite link" },
    { command: "crew", description: "Crew / invites list" },
    { command: "stats", description: "Players online" },
    { command: "channel", description: "Official channel" },
    { command: "community", description: "Community chat" },
    { command: "vault", description: "Vault info" },
    { command: "soon", description: "Roadmap" },
  ]);

  console.log(`OK @${me.username}`);
  console.log("Type / in chat for command list · Menu button opens game");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
