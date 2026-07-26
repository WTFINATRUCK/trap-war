/**
 * GET /api/setup-webhook?key=SETUP_SECRET
 */
const botMod = require("./bot-bundle.cjs");

module.exports = async function handler(req, res) {
  const key = String((req.query && req.query.key) || "");
  const expected = (process.env.SETUP_SECRET || process.env.WEBHOOK_SECRET || "").trim();
  if (!expected || key !== expected) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  try {
    const host =
      process.env.WEBHOOK_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL
        : "https://trap-war-telegram.vercel.app");
    const base = host.replace(/\/$/, "");
    await botMod.setupWebhook(base);
    res.status(200).json({
      ok: true,
      webhook: base + "/api/telegram",
      webapp: process.env.WEBAPP_URL,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      error: String(e && e.message ? e.message : e),
    });
  }
};
