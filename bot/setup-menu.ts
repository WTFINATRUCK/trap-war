/**
 * One-shot: register Menu Button as Commands + full command list.
 * Usage: npx tsx bot/setup-menu.ts
 *
 * Menu Button shows the slash-command menu (not a direct Mini App jump).
 * Players launch the game with /play or the Play Trap War inline button on /start.
 */
import "dotenv/config";
import { Telegraf } from "telegraf";

const token = process.env.BOT_TOKEN?.trim();

if (!token) {
  console.error("BOT_TOKEN missing");
  process.exit(1);
}

const bot = new Telegraf(token);

const COMMANDS = [
  { command: "play", description: "Play Trap War — open the game" },
  { command: "start", description: "Welcome + Play button" },
  { command: "guide", description: "How to play" },
  { command: "crew", description: "Crew / invites" },
  { command: "invite", description: "Your invite link" },
  { command: "soon", description: "Roadmap / coming soon" },
  { command: "help", description: "All commands" },
  { command: "stats", description: "Players online" },
  { command: "channel", description: "Official channel" },
  { command: "community", description: "Community chat" },
  { command: "chat", description: "Community chat (alias)" },
  { command: "vault", description: "Vault info" },
] as const;

async function main() {
  const me = await bot.telegram.getMe();

  await bot.telegram.setChatMenuButton({
    menuButton: { type: "commands" },
  });
  console.log("Menu button → Commands list (not Web App)");

  await bot.telegram.setMyCommands([...COMMANDS]);
  console.log(`Commands (${COMMANDS.length}):`);
  for (const c of COMMANDS) {
    console.log(`  /${c.command} — ${c.description}`);
  }

  console.log(`\nOK @${me.username}`);
  console.log("Open bot chat → Menu (☰) should list commands.");
  console.log("Play via /play or the Play Trap War button on /start.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
