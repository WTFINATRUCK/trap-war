/**
 * Community bot — "Kayla" persona in player chat.
 * Env: COMMUNITY_BOT_TOKEN · Run: npm run bot:community | bot:all
 * Apply face/name: npm run bot:personas
 */
import "dotenv/config";
import { Telegraf, Markup } from "telegraf";
import {
  adminBotsStatusHtml,
  hubLinks,
  isHumanAdmin,
  isLiveTelegramUrl,
  resolveAdminBots,
} from "./adminBots";
import { personaFor } from "./personas";

const def = resolveAdminBots().find((b) => b.role === "community");
const token = def?.token || "";
const username = def?.username || "TrapWarChatBot";
const kayla = personaFor("community");

if (!token) {
  console.error("Missing COMMUNITY_BOT_TOKEN. Create bot in BotFather, add token, then npm run bot:personas");
  process.exit(1);
}

const bot = new Telegraf(token);
const links = hubLinks();

const RULES =
  `${kayla.voice.rulesIntro}\n\n` +
  "1. Street-<b>fiction</b> only — no real crime planning\n" +
  "2. No scams, phishing, or fake giveaways\n" +
  "3. No spam / mass links / wallet seed phrases\n" +
  "4. Respect crew — trash talk the game, not people\n" +
  "5. Official play only through <b>Stacks</b> (game bot)\n\n" +
  "Break rules → Lou (security) or the mods handle it.\n" +
  "— Kayla";

function linksHtml(): string {
  const rows: string[] = [`${kayla.voice.linksIntro}\n`];
  if (links.play) rows.push(`🎮 Stacks (play): ${links.play}`);
  if (isLiveTelegramUrl(links.community || "")) rows.push(`💬 Chat: ${links.community}`);
  if (isLiveTelegramUrl(links.channel || "")) rows.push(`📢 Channel: ${links.channel}`);
  rows.push("\nanybody sliding fake links — tell Lou.");
  return rows.join("\n");
}

function linksKeyboard() {
  const rows: ReturnType<typeof Markup.button.url>[][] = [];
  if (links.play) rows.push([Markup.button.url("🎮 Play with Stacks", links.play)]);
  if (isLiveTelegramUrl(links.community || "")) {
    rows.push([Markup.button.url("💬 Community", links.community!)]);
  }
  if (isLiveTelegramUrl(links.channel || "")) {
    rows.push([Markup.button.url("📢 Channel", links.channel!)]);
  }
  return rows.length ? Markup.inlineKeyboard(rows) : undefined;
}

bot.start(async (ctx) => {
  await ctx.replyWithHTML(
    `yo it's <b>${kayla.firstName}</b>.\n\n` +
      `I hold down the Trap War group chat — welcomes, rules, real links.\n` +
      `Add me as admin in the community (delete + pin + invite).\n\n` +
      `Wanna play? Talk to <b>Stacks</b> — that's the game bot.\n` +
      `/rules · /links`,
    linksKeyboard()
  );
});

bot.command("rules", async (ctx) => {
  await ctx.replyWithHTML(RULES);
});

bot.command("links", async (ctx) => {
  await ctx.replyWithHTML(linksHtml(), linksKeyboard());
});

bot.command("adminbots", async (ctx) => {
  await ctx.replyWithHTML(
    "who runs the door:\n\n" +
      "• <b>Stacks</b> — play / invites\n" +
      "• <b>Kayla</b> — me, the chat\n" +
      "• <b>Big Lou</b> — security\n\n" +
      adminBotsStatusHtml()
  );
});

bot.command("help", async (ctx) => {
  await ctx.replyWithHTML(
    `<b>${kayla.firstName}</b> — what I got\n\n` +
      `/rules — how we move in here\n` +
      `/links — official only\n` +
      `/adminbots — Stacks · Kayla · Lou\n` +
      `/help — this`
  );
});

bot.on("new_chat_members", async (ctx) => {
  const me = ctx.botInfo?.id;
  const members = ctx.message.new_chat_members || [];
  const humans = members.filter((m) => !m.is_bot || m.id === me);
  if (!humans.length) return;

  const onlySelf = humans.every((m) => m.id === me);
  if (onlySelf) {
    await ctx.replyWithHTML(
      `${kayla.voice.online}\n\n` +
        `promote me: delete + pin + invite.\n` +
        `bring <b>Big Lou</b> for the door · keep <b>Stacks</b> for play.\n` +
        `/rules · /links`
    );
    return;
  }

  for (const m of humans) {
    if (m.is_bot) continue;
    const name = (m.first_name || "fam").replace(/[<>]/g, "");
    await ctx.replyWithHTML(kayla.voice.welcome(name), linksKeyboard());
  }
});

bot.command("say", async (ctx) => {
  if (!isHumanAdmin(ctx.from?.id)) {
    await ctx.reply("nah that's for the owner.");
    return;
  }
  const text = (ctx.message as { text?: string }).text?.replace(/^\/say(@\w+)?\s*/i, "").trim();
  if (!text) {
    await ctx.reply("use: /say whatever you want me to drop");
    return;
  }
  await ctx.replyWithHTML(text.replace(/[<>]/g, ""));
});

async function boot() {
  const me = await bot.telegram.getMe();
  console.log(`💬 ${kayla.displayName} (@${me.username || username}) online`);
  console.log("   Human persona · welcome · rules · links");
  await bot.telegram.setMyCommands([
    { command: "rules", description: "Kayla's house rules" },
    { command: "links", description: "Official links only" },
    { command: "adminbots", description: "Stacks · Kayla · Lou" },
    { command: "help", description: "What Kayla does" },
  ]);
  bot.launch({ dropPendingUpdates: true });
  console.log("   Polling…");
}

boot().catch((e) => {
  console.error("Community bot failed:", e);
  process.exit(1);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
