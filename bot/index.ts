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
import { pushActivity } from "./activity";
import {
  adminBotsStatusHtml,
  configuredAdminBots,
  isHumanAdmin,
  isLiveTelegramUrl,
} from "./adminBots";
import type { Context } from "telegraf";

const token = process.env.BOT_TOKEN?.trim();
/** Prefer www — apex trap-war.com SSL often broken until Cloudflare CNAME is fixed */
const webAppUrl = (
  process.env.WEBAPP_URL ||
  process.env.VITE_WEBAPP_URL ||
  "https://www.trap-war.com"
).replace(/\/$/, "");
const channelUrl = (process.env.CHANNEL_URL || "").replace(/\/$/, "");
const channelId = process.env.CHANNEL_ID?.trim();
const communityUrl = (process.env.COMMUNITY_URL || "").replace(/\/$/, "");
const requireChannel = process.env.REQUIRE_CHANNEL === "true";
const botUsername = (process.env.BOT_USERNAME || "TrapWarAppBot").replace(/^@/, "");
/** Public HTTPS base for Telegram webhook (usually the Vercel project URL) */
const webhookBase = (
  process.env.WEBHOOK_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  webAppUrl
)
  .replace(/\/$/, "")
  .replace(/^http:\/\//, "https://");
const webhookSecret = (process.env.WEBHOOK_SECRET || "").trim();

if (!token) {
  console.error("Missing BOT_TOKEN. Copy .env.example → .env");
  // Don't exit on Vercel import — handler will 500 if missing
  if (!process.env.VERCEL) process.exit(1);
}

if (!webAppUrl || !webAppUrl.startsWith("https://")) {
  console.warn("⚠ WEBAPP_URL should be public HTTPS for Mini Apps.");
}

export const bot = new Telegraf(token || "0:missing");

// Track every interaction → total users + online (last 5 min)
// New / returning players land on the street activity wire
bot.use(async (ctx, next) => {
  try {
    const from = ctx.from;
    if (from?.id) {
      const hit = touchUser({
        id: from.id,
        username: from.username,
        firstName: from.first_name,
      });
      if (hit) {
        const label =
          (hit.user.firstName && hit.user.firstName.slice(0, 16)) ||
          (hit.user.username && `@${hit.user.username.slice(0, 14)}`) ||
          `Player ${String(from.id).slice(-4)}`;
        if (hit.isNew) {
          pushActivity({
            kind: "new_player",
            text: `${label} just linked up · new blood on the block`,
            playerId: String(from.id),
          });
        } else if (hit.isReturning) {
          pushActivity({
            kind: "return",
            text: `${label} back on the set · returning player`,
            playerId: String(from.id),
          });
        }
      }
    }
  } catch {
    /* never block handlers */
  }
  return next();
});

function isAdmin(userId?: number): boolean {
  return isHumanAdmin(userId);
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

  const hubRow: (
    | ReturnType<typeof Markup.button.url>
  )[] = [];
  if (isLiveTelegramUrl(communityUrl)) {
    hubRow.push(Markup.button.url("💬 Community Chat", communityUrl));
  }
  if (isLiveTelegramUrl(channelUrl)) {
    hubRow.push(Markup.button.url("📢 Channel", channelUrl));
  }
  if (hubRow.length) rows.push(hubRow);

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
      ...(isLiveTelegramUrl(communityUrl)
        ? [[Markup.button.url("💬 Community", communityUrl)]]
        : []),
      ...(isLiveTelegramUrl(channelUrl)
        ? [[Markup.button.url("📢 Channel", channelUrl)]]
        : []),
    ])
  );
});

bot.command("channel", async (ctx) => {
  if (!isLiveTelegramUrl(channelUrl)) {
    await safeReply(
      ctx,
      "📢 <b>Channel coming soon</b>\n\n" +
        "Official Word on the Street channel for drops, NFT rush, and crew calls.\n\n" +
        "Owner: create the channel in Telegram, set CHANNEL_URL, restart the bot.\n" +
        "See COMMUNITY_SETUP.md\n\n" +
        "Player chat → /community",
      soonKeyboard()
    );
    return;
  }
  const rows: ReturnType<typeof Markup.button.url>[][] = [
    [Markup.button.url("Join Channel", channelUrl)],
  ];
  if (isLiveTelegramUrl(communityUrl)) {
    rows.push([Markup.button.url("💬 Community Chat", communityUrl)]);
  }
  await safeReply(
    ctx,
    "📢 <b>Trap War Channel</b>\n\n" +
      "Announcements · Word on the Street · drops.\n" +
      "Want to talk with players? → /community",
    Markup.inlineKeyboard(rows)
  );
});

async function replyCommunity(ctx: Context) {
  if (!isLiveTelegramUrl(communityUrl)) {
    await safeReply(
      ctx,
      "💬 <b>Community chat — almost live</b>\n\n" +
        "This is where hustlers talk, flex ranks, and share tips.\n\n" +
        "<b>Owner setup (2 min)</b>\n" +
        "1. Telegram → New Group → name it <b>Trap War Community</b>\n" +
        "2. Make it <b>Public</b> (or create invite link)\n" +
        "3. Add <b>@" +
        botUsername +
        "</b> as admin\n" +
        "4. Optional: Channel → Discussion → link this group\n" +
        "5. Run <code>.\\scripts\\set-community.ps1 -CommunityUrl \"https://t.me/...\"</code>\n" +
        "6. Restart bot\n\n" +
        "Full guide: COMMUNITY_SETUP.md in the repo.\n" +
        "Announcements channel → /channel",
      isLiveTelegramUrl(channelUrl)
        ? Markup.inlineKeyboard([[Markup.button.url("📢 Channel", channelUrl)]])
        : undefined
    );
    return;
  }
  const rows: ReturnType<typeof Markup.button.url>[][] = [
    [Markup.button.url("💬 Join Community Chat", communityUrl)],
  ];
  if (isLiveTelegramUrl(channelUrl)) {
    rows.push([Markup.button.url("📢 Channel (news)", channelUrl)]);
  }
  if (webAppUrl.startsWith("https://")) {
    rows.push([Markup.button.webApp("▶️ Play Trap War", playUrl())]);
  }
  await safeReply(
    ctx,
    "💬 <b>Trap War Community</b>\n\n" +
      "Player chat — tips, flexes, crew talk.\n" +
      "Keep it street-fiction. No scams.\n\n" +
      "News & drops live on the channel → /channel",
    Markup.inlineKeyboard(rows)
  );
}

bot.command("community", replyCommunity);
bot.command("chat", replyCommunity);

bot.command("adminbots", async (ctx) => {
  const n = configuredAdminBots().length;
  await safeReply(
    ctx,
    adminBotsStatusHtml() +
      (n < 2
        ? "\n\n💡 Run <code>npm run bot:all</code> after adding COMMUNITY_BOT_TOKEN + GUARD_BOT_TOKEN."
        : `\n\n✅ ${n} bots ready — use <code>npm run bot:all</code> to keep them online.`)
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
  console.log(`  CHANNEL_URL: ${channelUrl || "(not set)"}${isLiveTelegramUrl(channelUrl) ? "" : " ⚠ set real link"}`);
  console.log(
    `  COMMUNITY_URL: ${communityUrl || "(not set)"}${isLiveTelegramUrl(communityUrl) ? "" : " ⚠ create group + set-community.ps1"}`
  );
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

  await configureBotPresentation();

  bot.catch((err, ctx) => {
    console.error("Bot error on", ctx.updateType, err);
    ctx.reply("Something glitched. Try /guide or /help again.").catch(() => undefined);
  });

  const useWebhook =
    process.env.BOT_MODE === "webhook" ||
    Boolean(process.env.VERCEL) ||
    process.env.USE_WEBHOOK === "true";

  if (useWebhook) {
    // Webhook mode is handled by /api/telegram on Vercel — do not long-poll here
    console.log("  Mode: webhook (configure via /api/telegram + setWebhook)");
    console.log(`  Mini App: ${webAppUrl}`);
    console.log("  Invites: ONLY via t.me/Bot?start=ref_TRAP-{id}");
    return;
  }

  // Secure local API (initData HMAC) — bind localhost only (dev)
  const apiPort = parseInt(process.env.API_PORT || "8787", 10);
  if (Number.isFinite(apiPort) && apiPort > 0 && token) {
    try {
      const { startSecureApi } = await import("./api");
      startSecureApi(token, apiPort);
    } catch (e) {
      console.warn("  Secure API not started:", e);
    }
  }

  // Drop any leftover webhook so local polling works
  try {
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
  } catch {
    /* ignore */
  }

  bot.launch({ dropPendingUpdates: true });
  console.log("  Polling for updates…");
  console.log(`  Mini App: ${webAppUrl}`);
  console.log("  Invites: ONLY via t.me/Bot?start=ref_TRAP-{id}");
}

/** Menu button = Play game · slash commands = full list */
export async function configureBotPresentation(): Promise<void> {
  try {
    if (webAppUrl.startsWith("https://")) {
      await bot.telegram.setChatMenuButton({
        menuButton: {
          type: "web_app",
          text: "Play Trap War",
          web_app: { url: playUrl() },
        },
      });
      console.log(`  Menu button → Play Trap War (${webAppUrl})`);
    } else {
      await bot.telegram.setChatMenuButton({
        menuButton: { type: "commands" },
      });
      console.log("  Menu button → Commands (set HTTPS WEBAPP_URL for Play)");
    }
  } catch (e) {
    console.warn("  Could not set menu button:", e);
  }

  try {
    // Shown when user types /  (clean command list)
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
    console.log("  Commands list registered (type / in chat)");
  } catch {
    /* optional */
  }
}

/** Register Telegram webhook for serverless (Vercel) */
export async function setupWebhook(publicBaseUrl: string): Promise<void> {
  const base = publicBaseUrl.replace(/\/$/, "").replace(/^http:\/\//, "https://");
  const url = `${base}/api/telegram`;
  await bot.telegram.setWebhook(url, {
    drop_pending_updates: true,
    secret_token: webhookSecret || undefined,
  });
  console.log(`  Webhook set → ${url}`);
  await configureBotPresentation();
}

// Only long-poll when run as `npm run bot` (not when imported by Vercel api/)
const isDirectRun =
  typeof process.argv[1] === "string" &&
  (process.argv[1].includes("bot/index") || process.argv[1].includes("bot\\index"));

if (isDirectRun && !process.env.VERCEL) {
  boot().catch((e) => {
    console.error("Bot failed to start:", e);
    process.exit(1);
  });

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
