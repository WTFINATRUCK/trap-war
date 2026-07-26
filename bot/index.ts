/**
 * Trap War Telegram Bot — Week 1 stub
 *
 * Setup:
 * 1. Create bot via @BotFather
 * 2. Set BOT_TOKEN and WEBAPP_URL in .env
 * 3. npm run bot
 * 4. In @BotFather: /setmenubutton → Web App URL
 */

import { Telegraf, Markup } from "telegraf";

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL || "https://your-app.vercel.app";

if (!token) {
  console.error("Missing BOT_TOKEN. Copy .env.example to .env");
  process.exit(1);
}

const bot = new Telegraf(token);

bot.start(async (ctx) => {
  const payload = ctx.startPayload;
  const refSuffix = payload?.startsWith("ref_") ? `?tgWebAppStartParam=${payload}` : "";
  const url = `${webAppUrl}${refSuffix}`;

  await ctx.reply(
    "🎮 *Trap War* — 30-day liquidity hustle.\n\n" +
      "Learn DeFi through street smarts. Plant stashes, dodge raids, build your crew.\n\n" +
      "Everybody Eats. 🔒 8% of every win stays in your vault.",
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([Markup.button.webApp("▶️ Start Hustling", url)]),
    }
  );
});

bot.command("crew", async (ctx) => {
  const userId = ctx.from?.id;
  await ctx.reply(
    `🤝 *Your Crew*\n\n` +
      `Share your link from the game's Crew tab.\n` +
      `Referral format: \`t.me/${ctx.botInfo?.username}?start=ref_TRAP-XXXX\`\n\n` +
      `Your Telegram ID: \`${userId}\``,
    { parse_mode: "Markdown" }
  );
});

bot.command("vault", async (ctx) => {
  await ctx.reply(
    "🔒 Open the game → Vault tab to see protected reserves.\n\n" +
      "Pay-to-earn (TON / USDT Jetton) unlocks in week 2.",
    Markup.inlineKeyboard([Markup.button.webApp("Open Trap War", webAppUrl)])
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "*How to hustle*\n\n" +
      "• 3 actions/day — buy, sell, plant\n" +
      "• 4th action ends the day\n" +
      "• Plant stashes for yield + raid shield\n" +
      "• Complete client orders to unlock cities\n" +
      "• Rank up: Corner Boy → Trap God\n\n" +
      "/start — Play\n/crew — Referral info\n/vault — Reserves",
    { parse_mode: "Markdown" }
  );
});

bot.launch().then(() => {
  console.log("Trap War bot running…");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));