/**
 * ESM handler (package.json type:module) requiring CJS bot bundle.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const botMod = require("./bot-bundle.cjs");

let warmed = false;

export default async function handler(req, res) {
  if (req.method === "GET" || req.method === "HEAD") {
    res.status(200).send("Trap War bot webhook OK");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const secret = (process.env.WEBHOOK_SECRET || "").trim();
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
    res.status(200).json({
      ok: false,
      error: String(e && e.message ? e.message : e),
    });
  }
}
