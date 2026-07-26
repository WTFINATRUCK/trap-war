/**
 * Trap War Telegram Bot — Mini App + invites + guides
 *
 * Env (.env): BOT_TOKEN, WEBAPP_URL, CHANNEL_URL, BOT_USERNAME, ...
 * Run: npm run bot
 */

import "dotenv/config";
import { Telegraf, Markup } from "telegraf";
import {
  attributeReferral,
  codeForUser,
  crewStats,
  inviteLink,
  parseRefPayload,
} from "./referrals";
import {
  WELCOME,
  comingSoonText,
  helpMenuText,
  howToPlayPart1,
  howToPlayPart2,
  howToPlayPlainParts,
  howToPlayShort,
} from "./messages";
import {
  formatStatsHtml,
  getRecentUsers,
  getUserStats,
  touchUser,
} from "./users";
import type { Context } from "telegraf";

const token = process.env.BOT_TOKEN?.trim();
const webAppUrl = (process.env.WEBAPP_URL || "").replace(/\/$/, "");
const channelUrl = (process.env.CHANNEL_URL || "").replace(/\/$/, "");
const channelId = process.env.CHANNEL_ID?.trim();
const requireChannel = process.env.REQUIRE_CHANNEL === "true";
const botUsername = (process.env.BOT_USERNAME || "TrapWarAppBot").replace(/^@/, "");
/** Comma-separated Telegram user IDs who can see full /stats admin list */
const adminIds = new Set(
  (process.env.ADMIN_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
);

if (!token) {
  console.error("Missing BOT_TOKEN. Copy .env.example → .env");
  process.exit(1);
}

if (!webAppUrl || !webAppUrl.startsWith("https://")) {
  console.warn("⚠ WEBAPP_URL should be public HTTPS for Mini Apps.");
}

const bot = new Telegraf(token);

// Track every interaction → total users + online (last 5 min)
bot.use(async (ctx, next) => {
  try {
    const from = ctx.from;
    if (from?.id) {
      touchUser({
        id: from.id,
        username: from.username,
        firstName: from.first_name,
      });
    }
  } catch {
    /* never block handlers */
  }
  return next();
});

function isAdmin(userId?: number): boolean {
  if (!userId) return false;
  // If no ADMIN_IDS configured, allow /stats counts for everyone (early launch)
  if (adminIds.size === 0) return true;
  return adminIds.has(userId);
}

/** HTML first; plain text fallback if Telegram rejects formatting */
async function safeReply(
  ctx: Context,
  text: string,
  extra: Record<string, unknown> = {}
): Promise<void> {
  try {
    await ctx.reply(text, { ...extra, parse_mode: "HTML" });
  } catch (err) {
    console.warn("HTML reply failed, plain text:", err);
    const plain = text
      .replace(/<\/?b>/gi, "")
      .replace(/<\/?i>/gi, "")
      .replace(/<\/?code>/gi, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    await ctx.reply(plain, extra);
  }
}

async function sendGuide(ctx: Context): Promise<void> {
  try {
    await safeReply(ctx, howToPlayPart1(), guideKeyboard());
    await safeReply(ctx, howToPlayPart2(), guideKeyboard());
  } catch (err) {
    console.error("sendGuide failed:", err);
    const parts = howToPlayPlainParts();
    for (const p of parts) {
      await ctx.reply(p, guideKeyboard());
    }
  }
}

function playUrl(startPayload?: string): string {
  const base = webAppUrl || "https://example.com";
  if (!startPayload) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}tgWebAppStartParam=${encodeURIComponent(startPayload)}`;
}

function shareUrl(invite: string): string {
  const text = encodeURIComponent(
    "Join me on TRAP WAR — 30-day street hustle. Everybody Eats 🤝"
  );
  return `https://t.me/share/url?url=${encodeURIComponent(invite)}&text=${text}`;
}

function mainKeyboard(startPayload?: string, userId?: number) {
  const rows: (
    | ReturnType<typeof Markup.button.webApp>
    | ReturnType<typeof Markup.button.url>
    | ReturnType<typeof Markup.button.callback>
  )[][] = [];

  if (webAppUrl.startsWith("https://")) {
    rows.push([Markup.button.webApp("▶️ Play Trap War", playUrl(startPayload))]);
  }

  if (channelUrl && !channelUrl.includes("your_") && !channelUrl.includes("YourChannel")) {
    rows.push([Markup.button.url("📢 Join the Channel", channelUrl)]);
  }

  rows.push([
    Markup.button.callback("📖 How to Play", "guide_info"),
    Markup.button.callback("🚀 Coming Soon", "soon_info"),
  ]);

  if (userId) {
    const invite = inviteLink(botUsername, userId);
    rows.push([
      Markup.button.url("📤 Share invite", shareUrl(invite)),
      Markup.button.callback("🔗 My invite", "my_invite"),
    ]);
  } else {
    rows.push([Markup.button.callback("🤝 Crew / Invite", "crew_info")]);
  }

  rows.push([Markup.button.callback("❓ Commands", "help_info")]);

  return Markup.inlineKeyboard(rows);
}

function guideKeyboard() {
  return Markup.inlineKeyboard([
    ...(webAppUrl.startsWith("https://")
      ? [[Markup.button.webApp("▶️ Play Trap War", playUrl())]]
      : []),
    [
      Markup.button.callback("🚀 Coming Soon", "soon_info"),
      Markup.button.callback("❓ Commands", "help_info"),
    ],
  ]);
}

function soonKeyboard() {
  return Markup.inlineKeyboard([
    ...(webAppUrl.startsWith("https://")
      ? [[Markup.button.webApp("▶️ Play Now", playUrl())]]
      : []),
    [
      Markup.button.callback("📖 How to Play", "guide_info"),
      Markup.button.callback("🔗 Invite", "my_invite"),
    ],
  ]);
}

async function isInChannel(userId: number): Promise<boolean | "unknown"> {
  if (!channelId) return "unknown";
  try {
    const member = await bot.telegram.getChatMember(channelId, userId);
    return ["creator", "administrator", "member", "restricted"].includes(member.status);
  } catch {
    return "unknown";
  }
}

bot.start(async (ctx) => {
  const payload = ctx.startPayload || undefined;
  const userId = ctx.from?.id;

  // INVITE-ONLY: attribute solely from Telegram deep link ?start=ref_TRAP-{id}
  // (ctx.startPayload is set only by official invite links, not free chat text)
  if (userId && payload) {
    const refCode = parseRefPayload(payload);
    if (refCode) {
      const result = attributeReferral(userId, refCode, {
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
      });
      if (result.ok) {
        await safeReply(
          ctx,
          "🤝 <b>Crew linked via invite link!</b>\n" +
            `Their invite counter is now <b>${result.total}</b>.\n` +
            "Everybody Eats when you hustle."
        );
      } else if (result.reason === "self_invite") {
        await safeReply(ctx, "You can't invite yourself.");
      } else if (result.reason === "already_attributed") {
        // Silent — already in a crew
      } else if (result.reason === "invalid_invite_code") {
        await safeReply(ctx, "That invite link is invalid. Ask your friend for a fresh /invite link.");
      }
    }
  }

  if (userId) codeForUser(userId);

  if (requireChannel && channelId && userId) {
    const inCh = await isInChannel(userId);
    if (inCh === false) {
      await safeReply(
        ctx,
        "📢 <b>Join the Trap War channel first</b>, then hit Play.",
        Markup.inlineKeyboard([
          ...(channelUrl ? [[Markup.button.url("Join Channel", channelUrl)]] : []),
          [Markup.button.callback("✅ I joined — check", "check_channel")],
        ])
      );
      return;
    }
  }

  await safeReply(ctx, WELCOME, mainKeyboard(payload, userId));
  await safeReply(ctx, howToPlayShort(), guideKeyboard());

  if (userId) {
    const link = inviteLink(botUsername, userId);
    const stats = crewStats(userId);
    await safeReply(
      ctx,
      `🔗 <b>Your invite</b>\n\n` +
        `📊 <b>Invites: ${stats.total}</b>\n\n` +
        `<code>${link}</code>\n\n` +
        `Share it — counter goes up for <b>your</b> account when they join.\n` +
        `/crew for full list · Roadmap → /soon`,
      Markup.inlineKeyboard([
        [Markup.button.url("📤 Share to Telegram", shareUrl(link))],
        ...(webAppUrl.startsWith("https://")
          ? [[Markup.button.webApp("▶️ Play Trap War", playUrl(payload))]]
          : []),
      ])
    );
  }
});

bot.command("play", async (ctx) => {
  if (!webAppUrl.startsWith("https://")) {
    await ctx.reply("Mini App URL not configured. Set WEBAPP_URL (HTTPS).");
    return;
  }
  await safeReply(
    ctx,
    "▶️ <b>Open the hustle</b>\n\nNew to the game? Send /guide first.",
    mainKeyboard(undefined, ctx.from?.id)
  );
});

bot.command("guide", async (ctx) => {
  try {
    await ctx.reply("📖 Sending the full how-to-play guide…");
  } catch {
    /* ignore */
  }
  await sendGuide(ctx);
});

bot.command("soon", async (ctx) => {
  await safeReply(ctx, comingSoonText(), soonKeyboard());
});

bot.command("roadmap", async (ctx) => {
  await safeReply(ctx, comingSoonText(), soonKeyboard());
});

bot.command("invite", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const link = inviteLink(botUsername, userId);
  const stats = crewStats(userId);
  await safeReply(
    ctx,
    `🔗 <b>Your Trap War invite</b>\n\n` +
      `📊 <b>Invites: ${stats.total}</b>\n` +
      `(accounts that joined with your link)\n\n` +
      `<code>${link}</code>\n\n` +
      `Code: <code>${stats.code}</code>\n\n` +
      `Anyone who opens this link is linked to <b>your</b> account. Everybody Eats.`,
    Markup.inlineKeyboard([
      [Markup.button.url("📤 Share invite", shareUrl(link))],
      ...(webAppUrl.startsWith("https://")
        ? [[Markup.button.webApp("▶️ Play Trap War", playUrl())]]
        : []),
      ...(channelUrl && !channelUrl.includes("your_")
        ? [[Markup.button.url("📢 Channel", channelUrl)]]
        : []),
    ])
  );
});

bot.command("channel", async (ctx) => {
  if (!channelUrl || channelUrl.includes("your_") || channelUrl.includes("YourChannel")) {
    await safeReply(
      ctx,
      "📢 <b>Channel coming soon</b>\n\n" +
        "Official Word on the Street channel for drops, NFT rush, and crew calls.\n\n" +
        "Follow /soon for the roadmap.",
      soonKeyboard()
    );
    return;
  }
  await safeReply(
    ctx,
    "📢 <b>Trap War Channel</b>\n\nUpdates, Word on the Street, NFT drops.\nJoin for news + crew calls.",
    Markup.inlineKeyboard([[Markup.button.url("Join Channel", channelUrl)]])
  );
});

bot.command("crew", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const link = inviteLink(botUsername, userId);
  const stats = crewStats(userId);
  const list =
    stats.invites.length === 0
      ? "<i>No invites yet — share your link.</i>"
      : stats.invites
          .slice(-10)
          .reverse()
          .map((r, i) => {
            const name = (r.firstName || r.username || r.userId)
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            return `${i + 1}. ${name}`;
          })
          .join("\n") +
        (stats.total > 10 ? `\n<i>…+${stats.total - 10} more</i>` : "");

  await safeReply(
    ctx,
    "🤝 <b>Everybody Eats</b>\n\n" +
      `📊 <b>Your invite count: ${stats.total}</b>\n\n` +
      `Your link:\n<code>${link}</code>\n\n` +
      `Code: <code>${stats.code}</code>\n\n` +
      `<b>Recent joins</b>\n${list}\n\n` +
      "Earn <b>0.3%</b> daily on crew yield + <b>5%</b> when they finish a run.\n" +
      "In-game: Mini App → CREW tab.",
    Markup.inlineKeyboard([
      [Markup.button.url("📤 Share invite", shareUrl(link))],
      ...(webAppUrl.startsWith("https://")
        ? [[Markup.button.webApp("▶️ Play Trap War", playUrl())]]
        : []),
    ])
  );
});

bot.command("vault", async (ctx) => {
  await safeReply(
    ctx,
    "🔒 <b>Protected Vault</b>\n\n" +
      "<b>8%</b> of every win auto-locks — untouchable gas stash.\n\n" +
      "Open the app → <b>VAULT</b> tab for:\n" +
      "• Locked reserves\n" +
      "• Founder NFT preview\n" +
      "• Pay-to-Earn boost (sim now · real TON week 2)\n\n" +
      "Roadmap → /soon",
    mainKeyboard(undefined, ctx.from?.id)
  );
});

bot.command("help", async (ctx) => {
  await safeReply(ctx, helpMenuText(), mainKeyboard(undefined, ctx.from?.id));
});

bot.command("stats", async (ctx) => {
  const userId = ctx.from?.id;
  const stats = getUserStats();
  const showList = isAdmin(userId);
  const recent = showList ? getRecentUsers(12) : undefined;
  await safeReply(ctx, formatStatsHtml(stats, recent));
});

bot.command("users", async (ctx) => {
  // Alias of /stats
  const userId = ctx.from?.id;
  const stats = getUserStats();
  const recent = isAdmin(userId) ? getRecentUsers(12) : undefined;
  await safeReply(ctx, formatStatsHtml(stats, recent));
});

bot.action("help_info", async (ctx) => {
  await ctx.answerCbQuery().catch(() => undefined);
  await safeReply(ctx, helpMenuText(), mainKeyboard(undefined, ctx.from?.id));
});

bot.action("guide_info", async (ctx) => {
  await ctx.answerCbQuery("Opening guide…").catch(() => undefined);
  await sendGuide(ctx);
});

bot.action("soon_info", async (ctx) => {
  await ctx.answerCbQuery().catch(() => undefined);
  await safeReply(ctx, comingSoonText(), soonKeyboard());
});

bot.action("crew_info", async (ctx) => {
  await ctx.answerCbQuery().catch(() => undefined);
  const userId = ctx.from?.id;
  if (!userId) return;
  const link = inviteLink(botUsername, userId);
  await safeReply(
    ctx,
    `🤝 <b>Your invite</b>\n\n<code>${link}</code>\n\nShare it — Everybody Eats.`,
    Markup.inlineKeyboard([[Markup.button.url("📤 Share invite", shareUrl(link))]])
  );
});

bot.action("my_invite", async (ctx) => {
  await ctx.answerCbQuery().catch(() => undefined);
  const userId = ctx.from?.id;
  if (!userId) return;
  const link = inviteLink(botUsername, userId);
  const stats = crewStats(userId);
  await safeReply(
    ctx,
    `🔗 <b>Invite link</b>\n\n📊 <b>Invites: ${stats.total}</b>\n\n<code>${link}</code>\n\nCode: <code>${stats.code}</code>`,
    Markup.inlineKeyboard([[Markup.button.url("📤 Share invite", shareUrl(link))]])
  );
});

bot.action("check_channel", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCbQuery("Can't read user");
  const inCh = await isInChannel(userId);
  if (inCh === true) {
    await ctx.answerCbQuery("You're in. Let's go.");
    await safeReply(ctx, WELCOME, mainKeyboard(undefined, userId));
  } else if (inCh === false) {
    await ctx.answerCbQuery("Not in the channel yet");
    await ctx.reply(
      "Still not seeing you in the channel. Join, then tap check again.",
      Markup.inlineKeyboard([
        ...(channelUrl ? [[Markup.button.url("Join Channel", channelUrl)]] : []),
        [Markup.button.callback("✅ Check again", "check_channel")],
      ])
    );
  } else {
    await ctx.answerCbQuery("Can't verify — open Play anyway");
    await safeReply(ctx, WELCOME, mainKeyboard(undefined, userId));
  }
});

async function boot() {
  const me = await bot.telegram.getMe();
  console.log(`Trap War bot online as @${me.username}`);
  console.log(`  WEBAPP_URL:  ${webAppUrl || "(not set)"}`);
  console.log(`  CHANNEL_URL: ${channelUrl || "(not set)"}`);
  console.log(`  Open: https://t.me/${me.username}`);

  try {
    await bot.telegram.setMyDescription(
      "TRAP WAR — 30-day street hustle Mini App. Buy low, travel, sell high, plant stashes. " +
        "Everybody Eats. Tap Play. /guide for rules · /soon for roadmap."
    );
    await bot.telegram.setMyShortDescription(
      "30-day street hustle. Play · /guide · /soon · /invite"
    );
  } catch {
    /* optional */
  }

  // Menu button opens the /commands list (not the Mini App)
  try {
    await bot.telegram.setChatMenuButton({
      menuButton: { type: "commands" },
    });
    console.log("  Menu button set → Commands list");
  } catch (e) {
    console.warn("  Could not set menu button:", e);
  }

  try {
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
  } catch {
    /* optional */
  }

  bot.catch((err, ctx) => {
    console.error("Bot error on", ctx.updateType, err);
    ctx.reply("Something glitched. Try /guide or /help again.").catch(() => undefined);
  });

  // Secure local API (initData HMAC) — bind localhost only
  const apiPort = parseInt(process.env.API_PORT || "8787", 10);
  if (Number.isFinite(apiPort) && apiPort > 0) {
    try {
      const { startSecureApi } = await import("./api");
      startSecureApi(token!, apiPort);
    } catch (e) {
      console.warn("  Secure API not started:", e);
    }
  }

  bot.launch({ dropPendingUpdates: true });
  console.log("  Polling for updates…");
  console.log("  Invites: ONLY via t.me/Bot?start=ref_TRAP-{id}");
}

boot().catch((e) => {
  console.error("Bot failed to start:", e);
  process.exit(1);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
