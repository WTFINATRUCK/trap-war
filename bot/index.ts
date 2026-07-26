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
  howToPlayShort,
  howToPlayText,
} from "./messages";

const token = process.env.BOT_TOKEN?.trim();
const webAppUrl = (process.env.WEBAPP_URL || "").replace(/\/$/, "");
const channelUrl = (process.env.CHANNEL_URL || "").replace(/\/$/, "");
const channelId = process.env.CHANNEL_ID?.trim();
const requireChannel = process.env.REQUIRE_CHANNEL === "true";
const botUsername = (process.env.BOT_USERNAME || "TrapWarAppBot").replace(/^@/, "");

if (!token) {
  console.error("Missing BOT_TOKEN. Copy .env.example → .env");
  process.exit(1);
}

if (!webAppUrl || !webAppUrl.startsWith("https://")) {
  console.warn("⚠ WEBAPP_URL should be public HTTPS for Mini Apps.");
}

const bot = new Telegraf(token);

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

  if (userId && payload) {
    const refCode = parseRefPayload(payload);
    if (refCode) {
      const ok = attributeReferral(userId, refCode);
      if (ok) {
        await ctx.reply(
          "🤝 *Crew linked!* You're riding with a referrer.\n" +
            "Their *invite counter* just went up. Everybody Eats when you hustle.",
          { parse_mode: "Markdown" }
        );
      }
    }
  }

  if (userId) codeForUser(userId);

  if (requireChannel && channelId && userId) {
    const inCh = await isInChannel(userId);
    if (inCh === false) {
      await ctx.reply(
        "📢 *Join the Trap War channel first*, then hit Play.",
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            ...(channelUrl ? [[Markup.button.url("Join Channel", channelUrl)]] : []),
            [Markup.button.callback("✅ I joined — check", "check_channel")],
          ]),
        }
      );
      return;
    }
  }

  await ctx.reply(WELCOME, {
    parse_mode: "Markdown",
    ...mainKeyboard(payload, userId),
  });

  // Short guide blurb right after welcome
  await ctx.reply(howToPlayShort(), {
    parse_mode: "Markdown",
    ...guideKeyboard(),
  });

  if (userId) {
    const link = inviteLink(botUsername, userId);
    const stats = crewStats(userId);
    await ctx.reply(
      `🔗 *Your invite*\n\n` +
        `📊 *Invites: ${stats.total}*\n\n` +
        `\`${link}\`\n\n` +
        `Share it — counter goes up for *your* account when they join.\n` +
        `/crew for full list · Roadmap → /soon`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.url("📤 Share to Telegram", shareUrl(link))],
          ...(webAppUrl.startsWith("https://")
            ? [[Markup.button.webApp("▶️ Play Trap War", playUrl(payload))]]
            : []),
        ]),
      }
    );
  }
});

bot.command("play", async (ctx) => {
  if (!webAppUrl.startsWith("https://")) {
    await ctx.reply("Mini App URL not configured. Set WEBAPP_URL (HTTPS).");
    return;
  }
  await ctx.reply(
    "▶️ *Open the hustle*\n\nNew to the game? Read /guide first.",
    {
      parse_mode: "Markdown",
      ...mainKeyboard(undefined, ctx.from?.id),
    }
  );
});

bot.command("guide", async (ctx) => {
  await ctx.reply(howToPlayText(), {
    parse_mode: "Markdown",
    ...guideKeyboard(),
  });
});

bot.command("soon", async (ctx) => {
  await ctx.reply(comingSoonText(), {
    parse_mode: "Markdown",
    ...soonKeyboard(),
  });
});

bot.command("roadmap", async (ctx) => {
  await ctx.reply(comingSoonText(), {
    parse_mode: "Markdown",
    ...soonKeyboard(),
  });
});

bot.command("invite", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const link = inviteLink(botUsername, userId);
  const stats = crewStats(userId);
  await ctx.reply(
    `🔗 *Your Trap War invite*\n\n` +
      `📊 *Invites: ${stats.total}*\n` +
      `(accounts that joined with your link)\n\n` +
      `\`${link}\`\n\n` +
      `Code: \`${stats.code}\`\n\n` +
      `Anyone who opens this link is linked to *your* account. Everybody Eats.`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.url("📤 Share invite", shareUrl(link))],
        ...(webAppUrl.startsWith("https://")
          ? [[Markup.button.webApp("▶️ Play Trap War", playUrl())]]
          : []),
        ...(channelUrl && !channelUrl.includes("your_")
          ? [[Markup.button.url("📢 Channel", channelUrl)]]
          : []),
      ]),
    }
  );
});

bot.command("channel", async (ctx) => {
  if (!channelUrl || channelUrl.includes("your_") || channelUrl.includes("YourChannel")) {
    await ctx.reply(
      "📢 *Channel coming soon*\n\n" +
        "Official *Word on the Street* channel for drops, NFT rush, and crew calls.\n\n" +
        "We'll drop the link here when live. Follow /soon for the roadmap.",
      { parse_mode: "Markdown", ...soonKeyboard() }
    );
    return;
  }
  await ctx.reply(
    "📢 *Trap War Channel*\n\nUpdates, Word on the Street, NFT drops.\nJoin for news + crew calls.",
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([[Markup.button.url("Join Channel", channelUrl)]]),
    }
  );
});

bot.command("crew", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const link = inviteLink(botUsername, userId);
  const stats = crewStats(userId);
  const list =
    stats.invites.length === 0
      ? "_No invites yet — share your link._"
      : stats.invites
          .slice(-10)
          .reverse()
          .map((r, i) => {
            const name = r.firstName || r.username || r.userId;
            return `${i + 1}. ${name}`;
          })
          .join("\n") +
        (stats.total > 10 ? `\n_…+${stats.total - 10} more_` : "");

  await ctx.reply(
    "🤝 *Everybody Eats*\n\n" +
      `📊 *Your invite count: ${stats.total}*\n\n` +
      `Your link:\n\`${link}\`\n\n` +
      `Code: \`${stats.code}\`\n\n` +
      `*Recent joins*\n${list}\n\n` +
      "Earn *0.3%* daily on crew yield + *5%* when they finish a run.\n" +
      "In-game: Mini App → *CREW* tab.",
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.url("📤 Share invite", shareUrl(link))],
        ...(webAppUrl.startsWith("https://")
          ? [[Markup.button.webApp("▶️ Play Trap War", playUrl())]]
          : []),
      ]),
    }
  );
});

bot.command("vault", async (ctx) => {
  await ctx.reply(
    "🔒 *Protected Vault*\n\n" +
      "*8%* of every win auto-locks — untouchable gas stash.\n\n" +
      "Open the app → *VAULT* tab for:\n" +
      "• Locked reserves\n" +
      "• Founder NFT preview\n" +
      "• Pay-to-Earn boost (sim now · real TON week 2)\n\n" +
      "Roadmap → /soon",
    { parse_mode: "Markdown", ...mainKeyboard(undefined, ctx.from?.id) }
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(helpMenuText(), {
    parse_mode: "Markdown",
    ...mainKeyboard(undefined, ctx.from?.id),
  });
});

bot.action("help_info", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(helpMenuText(), {
    parse_mode: "Markdown",
    ...mainKeyboard(undefined, ctx.from?.id),
  });
});

bot.action("guide_info", async (ctx) => {
  await ctx.answerCbQuery();
  // Full guide can be long — send short first, then full
  await ctx.reply(howToPlayShort(), { parse_mode: "Markdown", ...guideKeyboard() });
  await ctx.reply(howToPlayText(), { parse_mode: "Markdown", ...guideKeyboard() });
});

bot.action("soon_info", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(comingSoonText(), { parse_mode: "Markdown", ...soonKeyboard() });
});

bot.action("crew_info", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const link = inviteLink(botUsername, userId);
  await ctx.reply(`🤝 *Your invite*\n\n\`${link}\`\n\nShare it — Everybody Eats.`, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([[Markup.button.url("📤 Share invite", shareUrl(link))]]),
  });
});

bot.action("my_invite", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const link = inviteLink(botUsername, userId);
  const stats = crewStats(userId);
  await ctx.reply(
    `🔗 *Invite link*\n\n📊 *Invites: ${stats.total}*\n\n\`${link}\`\n\nCode: \`${stats.code}\``,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([[Markup.button.url("📤 Share invite", shareUrl(link))]]),
    }
  );
});

bot.action("check_channel", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCbQuery("Can't read user");
  const inCh = await isInChannel(userId);
  if (inCh === true) {
    await ctx.answerCbQuery("You're in. Let's go.");
    await ctx.reply(WELCOME, { parse_mode: "Markdown", ...mainKeyboard(undefined, userId) });
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
    await ctx.reply(WELCOME, { parse_mode: "Markdown", ...mainKeyboard(undefined, userId) });
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
      { command: "channel", description: "Official channel" },
      { command: "vault", description: "Protected vault" },
      { command: "help", description: "Commands menu" },
    ]);
  } catch {
    /* optional */
  }

  bot.launch({ dropPendingUpdates: true });
  console.log("  Polling for updates…");
}

boot().catch((e) => {
  console.error("Bot failed to start:", e);
  process.exit(1);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
