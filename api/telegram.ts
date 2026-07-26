/**
 * Vercel serverless Telegram webhook — no laptop required.
 * POST https://trap-war-telegram.vercel.app/api/telegram
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
// Bundled CommonJS bot (built in npm run build)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const botMod = require("./bot-bundle.cjs") as {
  bot: { handleUpdate: (u: unknown) => Promise<void> };
  configureBotPresentation: () => Promise<void>;
};

export const config = {
  maxDuration: 30,
};

let warmed = false;

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
    if (!warmed) {
      await botMod.configureBotPresentation();
      warmed = true;
    }
    await botMod.bot.handleUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("telegram webhook error:", e);
    res.status(200).json({ ok: false });
  }
}
