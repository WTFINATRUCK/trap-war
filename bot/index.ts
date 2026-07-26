/**
 * Trap War Telegram Bot — Mini App + Channel access
 *
 * Env (.env):
 *   BOT_TOKEN          — from @BotFather
 *   WEBAPP_URL         — https://your-mini-app.vercel.app (HTTPS required)
 *   CHANNEL_URL        — https://t.me/your_channel (public)
 *   CHANNEL_ID         — optional -100… id if you require join (bot must be admin)
 *   REQUIRE_CHANNEL    — "true" to gate /start play behind channel join
 *   BOT_USERNAME       — TrapWarBot (without @)
 *
 * Run: npm run bot
 */

import "dotenv/config";
import { Telegraf, Markup } from "telegraf";

const token = process.env.BOT_TOKEN?.trim();
const webAppUrl = (process.env.WEBAPP_URL || "").replace(/\/$/, "");
const channelUrl = (process.env.CHANNEL_URL || "").replace(/\/$/, "");
const channelId = process.env.CHANNEL_ID?.trim(); // e.g. -1001234567890
const requireChannel = process.env.REQUIRE_CHANNEL === "true";
const botUsername = (process.env.BOT_USERNAME || "TrapWarBot").replace(/^@/, "");

if (!token) {
  console.error("Missing BOT_TOKEN. Copy .env.example → .env and paste token from @BotFather");
  process.exit(1);
}

if (!webAppUrl || !webAppUrl.startsWith("https://")) {
  console.warn(
    "⚠ WEBAPP_URL should be a public HTTPS URL (Telegram Mini Apps reject http://localhost)."
  );
}

const bot = new Telegraf(token);

function playUrl(startPayload?: string): string {
  const base = webAppUrl || "https://example.com";
  if (!startPayload) return base;
  // Telegram passes startapp / startattach params into the Mini App
  const sep = base.includes("?") ? "&" : "?";
  if (startPayload.startsWith("ref_")) {
    return `${base}${sep}tgWebAppStartParam=${encodeURIComponent(startPayload)}`;
  }
  return `${base}${sep}tgWebAppStartParam=${encodeURIComponent(startPayload)}`;
}

function mainKeyboard(startPayload?: string) {
  const rows: ReturnType<typeof Markup.button.webApp>[][] = [];

  if (webAppUrl.startsWith("https://")) {
    rows.push([Markup.button.webApp("▶️ Play Trap War", playUrl(startPayload))]);
  }

  if (channelUrl) {
    rows.push([Markup.button.url("📢 Join the Channel", channelUrl)]);
  }

  rows.push([
    Markup.button.callback("🤝 Crew / Invite", "crew_info"),
    Markup.button.callback("❓ Help", "help_info"),
  ]);

  return Markup.inlineKeyboard(rows);
}

async function isInChannel(userId: number): Promise<boolean | "unknown"> {
  if (!channelId) return "unknown";
  try {
    const member = await bot.telegram.getChatMember(channelId, userId);
    const ok = ["creator", "administrator", "member", "restricted"].includes(member.status);
    return ok;
  } catch {
    return "unknown";
  }
}

const WELCOME =
  "🎮 *TRAP WAR*\n\n" +
  "30-day street hustle. Buy low. Travel. Sell high. Plant stashes. Rank up.\n\n" +
  "🔒 8% of every win locks to your vault.\n" +
  "🤝 *Everybody Eats* — crew gets paid when you hustle.\n\n" +
  "Tap *Play Trap War* to open the Mini App.";

bot.start(async (ctx) => {
  const payload = ctx.startPayload || undefined;
  const userId = ctx.from?.id;

  if (requireChannel && channelId && userId) {
    const inCh = await isInChannel(userId);
    if (inCh === false) {
      await ctx.reply(
        "📢 *Join the Trap War channel first*, then hit Play.\n\n" +
          "Word on the street drops there — drops, NFT rush, crew calls.",
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
    ...mainKeyboard(payload),
  });
});

bot.command("play", async (ctx) => {
  if (!webAppUrl.startsWith("https://")) {
    await ctx.reply("Mini App URL not configured yet. Set WEBAPP_URL in bot .env (HTTPS).");
    return;
  }
  await ctx.reply("Open the hustle:", mainKeyboard(ctx.startPayload || undefined));
});

bot.command("channel", async (ctx) => {
  if (!channelUrl) {
    await ctx.reply("Channel link not set. Add CHANNEL_URL to .env (e.g. https://t.me/TrapWarOfficial).");
    return;
  }
  await ctx.reply(
    "📢 *Trap War Channel*\n\nUpdates, Word on the Street, NFT drops.",
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([[Markup.button.url("Open Channel", channelUrl)]]),
    }
  );
});

bot.command("crew", async (ctx) => {
  const userId = ctx.from?.id;
  await ctx.reply(
    "🤝 *Everybody Eats*\n\n" +
      "1. Open the Mini App → *CREW* tab\n" +
      "2. Copy your crew link\n" +
      "3. Share it — you earn on their yield\n\n" +
      `Link format:\n\`https://t.me/${botUsername}?start=ref_TRAP-XXXX\`\n\n` +
      (userId ? `Your Telegram ID: \`${userId}\`` : ""),
    { parse_mode: "Markdown", ...mainKeyboard() }
  );
});

bot.command("vault", async (ctx) => {
  await ctx.reply(
    "🔒 *Protected Vault*\n\n8% of every win auto-locks. Open the app → *VAULT* tab.",
    { parse_mode: "Markdown", ...mainKeyboard() }
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(helpText(), { parse_mode: "Markdown", ...mainKeyboard() });
});

bot.action("help_info", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(helpText(), { parse_mode: "Markdown", ...mainKeyboard() });
});

bot.action("crew_info", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    "🤝 Open *Play Trap War* → CREW tab to copy your invite link.\n" +
      `Or share: https://t.me/${botUsername}?start=ref_YOURCODE`,
    { parse_mode: "Markdown", ...mainKeyboard() }
  );
});

bot.action("check_channel", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return ctx.answerCbQuery("Can't read user");
  const inCh = await isInChannel(userId);
  if (inCh === true) {
    await ctx.answerCbQuery("You're in. Let's go.");
    await ctx.reply(WELCOME, { parse_mode: "Markdown", ...mainKeyboard() });
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
    await ctx.reply(WELCOME, { parse_mode: "Markdown", ...mainKeyboard() });
  }
});

function helpText() {
  return (
    "*How to hustle*\n\n" +
    "• Open Mini App from *Play Trap War*\n" +
    "• 3 actions/day — buy, sell, plant, travel\n" +
    "• Plant stash for yield + raid shield\n" +
    "• Clients unlock cities\n" +
    "• Rank: Corner Boy → Trap God\n\n" +
    "/start — Welcome + Play\n" +
    "/play — Open Mini App\n" +
    "/channel — Official channel\n" +
    "/crew — Referral info\n" +
    "/vault — Reserves\n" +
    "/help — This message"
  );
}

async function boot() {
  const me = await bot.telegram.getMe();
  console.log(`Trap War bot online as @${me.username}`);
  console.log(`  WEBAPP_URL:  ${webAppUrl || "(not set)"}`);
  console.log(`  CHANNEL_URL: ${channelUrl || "(not set)"}`);
  console.log(`  REQUIRE_CHANNEL: ${requireChannel}`);
  console.log(`  Open: https://t.me/${me.username}`);

  // Menu button (bottom-left in chat) → Mini App
  if (webAppUrl.startsWith("https://")) {
    try {
      await bot.telegram.setChatMenuButton({
        menuButton: {
          type: "web_app",
          text: "Play",
          web_app: { url: webAppUrl },
        },
      });
      console.log("  Menu button set → Play (Mini App)");
    } catch (e) {
      console.warn("  Could not set menu button:", e);
    }
  }

  try {
    await bot.telegram.setMyCommands([
      { command: "start", description: "Play Trap War" },
      { command: "play", description: "Open Mini App" },
      { command: "channel", description: "Official channel" },
      { command: "crew", description: "Crew / referrals" },
      { command: "vault", description: "Protected vault" },
      { command: "help", description: "How to play" },
    ]);
  } catch {
    /* optional */
  }

  // launch() promise resolves only when the bot stops — do not await setup after it
  bot.launch({ dropPendingUpdates: true });
  console.log("  Polling for updates…");
}

boot().catch((e) => {
  console.error("Bot failed to start:", e);
  process.exit(1);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
