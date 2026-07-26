/**
 * GET /api/player?id= — public street card for activity profiles.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const mod = require("./public-api-bundle.cjs");

export default async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const url = new URL(req.url || "/api/player", "https://localhost");

  try {
    const result = mod.handlePublicApi({
      method: "GET",
      pathname: "/api/player",
      searchParams: url.searchParams,
      headers: req.headers || {},
      botToken: process.env.BOT_TOKEN,
    });
    res.status(result.status).json(result.body);
  } catch (e) {
    console.error("player api error:", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
}
