/**
 * GET /api/setup-webhook?key=SETUP_SECRET
 * Points Telegram at this deployment's /api/telegram
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const botMod = require("./bot-bundle.cjs") as {
  setupWebhook: (base: string) => Promise<void>;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const key = String(req.query.key || "");
  const expected = process.env.SETUP_SECRET?.trim() || process.env.WEBHOOK_SECRET?.trim();
  if (!expected || key !== expected) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  try {
    const host =
      process.env.WEBHOOK_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "https://trap-war-telegram.vercel.app");
    await botMod.setupWebhook(host.replace(/\/$/, ""));
    res.status(200).json({
      ok: true,
      webhook: `${host.replace(/\/$/, "")}/api/telegram`,
      webapp: process.env.WEBAPP_URL,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
}
