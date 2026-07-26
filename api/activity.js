/**
 * GET/POST /api/activity — street wire (same data dir as bot webhook on Vercel /tmp).
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const mod = require("./public-api-bundle.cjs");

function readBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === "object") {
      resolve(req.body);
      return;
    }
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8") || "{}";
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

export default async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const url = new URL(req.url || "/api/activity", "https://localhost");
  const body =
    req.method === "POST" || req.method === "PUT" ? await readBody(req) : undefined;

  try {
    const result = mod.handlePublicApi({
      method: req.method || "GET",
      pathname: "/api/activity",
      searchParams: url.searchParams,
      headers: req.headers || {},
      body,
      botToken: process.env.BOT_TOKEN,
    });
    res.status(result.status).json(result.body);
  } catch (e) {
    console.error("activity api error:", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
}
