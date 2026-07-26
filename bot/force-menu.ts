/**
 * Force Menu Button = commands + re-register command list.
 * Run anytime: npx tsx bot/force-menu.ts
 */
import "dotenv/config";

const token = process.env.BOT_TOKEN?.trim();
if (!token) {
  console.error("BOT_TOKEN missing");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${token}`;

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
];

async function tg(method: string, body?: unknown) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = (await res.json()) as { ok: boolean; result?: unknown; description?: string };
  if (!j.ok) throw new Error(`${method}: ${j.description || "fail"}`);
  return j.result;
}

async function main() {
  // 1) Explicitly kill any web_app menu button
  await tg("setChatMenuButton", {
    menu_button: { type: "commands" },
  });
  console.log("✓ setChatMenuButton → commands");

  // 2) Commands list (default + all private chats scope)
  await tg("setMyCommands", { commands: COMMANDS });
  await tg("setMyCommands", {
    commands: COMMANDS,
    scope: { type: "default" },
  });
  await tg("setMyCommands", {
    commands: COMMANDS,
    scope: { type: "all_private_chats" },
  });
  console.log(`✓ setMyCommands ×3 (${COMMANDS.length} cmds)`);

  const menu = await tg("getChatMenuButton");
  const cmds = (await tg("getMyCommands")) as { command: string }[];
  console.log("VERIFY menu:", JSON.stringify(menu));
  console.log(
    "VERIFY cmds:",
    cmds.map((c) => "/" + c.command).join(", ")
  );

  const me = (await tg("getMe")) as { username?: string };
  console.log(`OK @${me.username}`);
  console.log("If Telegram UI still shows old Menu: force-quit the app and reopen the bot.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
