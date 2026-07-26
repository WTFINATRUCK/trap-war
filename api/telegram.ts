/**
 * Vercel serverless Telegram webhook — bot stays online without your laptop.
 * POST https://YOUR-DEPLOY.vercel.app/api/telegram
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = {
  maxDuration: 30,
  api: { bodyParser: true },
};

let ready: Promise<void> | null = null;

async function getBot() {
  // Dynamic import so local `npm run bot` stays independent
  const mod = await import("../bot/index.js");
  return mod;
}

async function ensureReady() {
  if (!ready) {
    ready = (async () => {
      const { bot, configureBotPresentation } = await getBot();
      // Warm presentation once per cold start
      try {
        await configureBotPresentation();
      } catch (e) {
        console.warn("configureBotPresentation:", e);
      }
      return bot;
    })().then(() => undefined);
  }
  await ready;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET" || req.method === "HEAD") {
    res.status(200).send("Trap War bot webhook OK");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const secret = process.env.WEBHOOK_SECRET?.trim();
  if (secret) {
    const header = req.headers["x-telegram-bot-api-secret-token"];
    if (header !== secret) {
      res.status(401).json({ ok: false, error: "bad_secret" });
      return;
    }
  }

  try {
    await ensureReady();
    const { bot } = await getBot();
    await bot.handleUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("telegram webhook error:", e);
    res.status(200).json({ ok: false }); // Telegram retries on non-200; avoid loops on bugs
  }
}
