/**
 * Guard bot — "Big Lou" persona.
 * Env: GUARD_BOT_TOKEN · Run: npm run bot:guard | bot:all
 * Apply face/name: npm run bot:personas
 */
import "dotenv/config";
import { Telegraf } from "telegraf";
import {
  adminBotsStatusHtml,
  isHumanAdmin,
  resolveAdminBots,
} from "./adminBots";
import { personaFor } from "./personas";

const def = resolveAdminBots().find((b) => b.role === "guard");
const token = def?.token || "";
const username = def?.username || "TrapWarGuardBot";
const lou = personaFor("guard");

if (!token) {
  console.error("Missing GUARD_BOT_TOKEN. Create bot in BotFather, add token, then npm run bot:personas");
  process.exit(1);
}

const bot = new Telegraf(token);

const joinBuckets = new Map<string, number[]>();
const SPAM_JOINS = 8;
const SPAM_WINDOW_MS = 60_000;

const SPAM_RE =
  /(free\s*ton|double\s*your|seed\s*phrase|private\s*key|connect\s*wallet\s*now|airdrop\s*claim\s*here|t\.me\/\+\w{20,})/i;

bot.start(async (ctx) => {
  await ctx.replyWithHTML(
    `it's <b>${lou.firstName}</b>.\n\n` +
      `I watch the Trap War door — scams get deleted, flood gets called out.\n` +
      `Promote me: <b>delete + ban + restrict</b>.\n\n` +
      `Kayla runs welcomes. Stacks runs the game. I clean the trash.\n` +
      `/status · /help`
  );
});

bot.command("adminbots", async (ctx) => {
  await ctx.replyWithHTML(
    "who runs the door:\n\n" +
      "• <b>Stacks</b> — play\n" +
      "• <b>Kayla</b> — chat\n" +
      "• <b>Big Lou</b> — me\n\n" +
      adminBotsStatusHtml()
  );
});

bot.command("status", async (ctx) => {
  const chat = ctx.chat;
  await ctx.replyWithHTML(
    `<b>${lou.firstName}</b> — door check\n\n` +
      `chat id: <code>${chat?.id}</code> (${chat?.type})\n` +
      `spam filter: on\n` +
      `join flood: ${SPAM_JOINS}+ in ${SPAM_WINDOW_MS / 1000}s\n\n` +
      `owner: reply to a message with /purge to erase it.`
  );
});

bot.command("help", async (ctx) => {
  await ctx.replyWithHTML(
    `<b>${lou.firstName}</b>\n\n` +
      `/status — door check\n` +
      `/purge — reply to kill a message (owner)\n` +
      `/adminbots — Stacks · Kayla · Lou\n` +
      `/help — this`
  );
});

bot.command("purge", async (ctx) => {
  if (!isHumanAdmin(ctx.from?.id)) {
    await ctx.reply("that's owner only.");
    return;
  }
  const reply = ctx.message.reply_to_message;
  if (!reply) {
    await ctx.reply("reply to the message you want gone, then /purge");
    return;
  }
  try {
    await ctx.deleteMessage(reply.message_id);
    try {
      await ctx.deleteMessage(ctx.message.message_id);
    } catch {
      /* ignore */
    }
  } catch {
    await ctx.reply("couldn't delete — give me Delete messages rights.");
  }
});

bot.on("new_chat_members", async (ctx) => {
  const chatId = String(ctx.chat?.id || "");
  if (!chatId) return;
  const now = Date.now();
  const bucket = (joinBuckets.get(chatId) || []).filter((t) => now - t < SPAM_WINDOW_MS);
  bucket.push(now);
  joinBuckets.set(chatId, bucket);

  if (bucket.length >= SPAM_JOINS) {
    await ctx.replyWithHTML(lou.voice.floodWatch);
    joinBuckets.set(chatId, []);
  }

  const me = ctx.botInfo?.id;
  const added = (ctx.message.new_chat_members || []).some((m) => m.id === me);
  if (added) {
    await ctx.replyWithHTML(
      `${lou.voice.online}\n\n` +
        `rights I need: delete · ban · restrict.\n` +
        `Kayla greets. I clean.`
    );
  }
});

bot.on("text", async (ctx) => {
  const text = ctx.message.text || "";
  if (!SPAM_RE.test(text)) return;
  if (isHumanAdmin(ctx.from?.id) && (process.env.ADMIN_IDS || "").trim()) return;

  try {
    await ctx.deleteMessage();
    const name = (ctx.from?.first_name || "somebody").replace(/[<>]/g, "");
    await ctx.replyWithHTML(lou.voice.spamHit(name));
  } catch {
    /* need delete permission */
  }
});

async function boot() {
  const me = await bot.telegram.getMe();
  console.log(`🛡 ${lou.displayName} (@${me.username || username}) online`);
  console.log("   Human persona · anti-spam · purge");
  await bot.telegram.setMyCommands([
    { command: "status", description: "Lou's door check" },
    { command: "purge", description: "Delete a message (owner)" },
    { command: "adminbots", description: "Stacks · Kayla · Lou" },
    { command: "help", description: "What Lou does" },
  ]);
  bot.launch({ dropPendingUpdates: true });
  console.log("   Polling…");
}

boot().catch((e) => {
  console.error("Guard bot failed:", e);
  process.exit(1);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
