/**
 * Minimal secure HTTP API next to the bot.
 * - Validates Telegram WebApp initData (HMAC)
 * - Users can only read THEIR own invite stats
 * - No public write of invites (attribution only via bot /start link)
 *
 * Env: API_PORT (default 8787), API_CORS_ORIGIN (optional, comma-separated)
 */
import http from "http";
import { validateWebAppInitData, rateLimit, redactSecrets } from "./security";
import { crewStats, getInviteCountForUser } from "./referrals";
import { getUserStats, touchUser } from "./users";

export function startSecureApi(botToken: string, port: number): http.Server {
  const corsOrigins = (process.env.API_CORS_ORIGIN || "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin || "";
    const allowOrigin =
      corsOrigins.includes("*") || corsOrigins.includes(origin) ? origin || "*" : corsOrigins[0] || "*";

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Access-Control-Allow-Origin", allowOrigin === "*" ? "*" : allowOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://127.0.0.1`);

    try {
      // Health (no secrets)
      if (req.method === "GET" && url.pathname === "/health") {
        json(res, 200, { ok: true, service: "trapwar-api" });
        return;
      }

      // Public aggregate counts only (no PII)
      if (req.method === "GET" && url.pathname === "/api/stats") {
        if (!rateLimit(`api-stats:${req.socket.remoteAddress || "x"}`, 30, 60_000)) {
          json(res, 429, { ok: false, error: "rate_limited" });
          return;
        }
        const s = getUserStats();
        json(res, 200, {
          ok: true,
          totalUsers: s.totalUsers,
          onlineNow: s.onlineNow,
          active24h: s.active24h,
          active7d: s.active7d,
          newToday: s.newToday,
          onlineWindowMin: s.onlineWindowMin,
        });
        return;
      }

      // POST /api/me  { initData: string }
      // Returns authenticated user + own invite counter only
      if (req.method === "POST" && url.pathname === "/api/me") {
        if (!rateLimit(`api:${req.socket.remoteAddress || "x"}`, 60, 60_000)) {
          json(res, 429, { ok: false, error: "rate_limited" });
          return;
        }

        const body = await readJson(req);
        const initData = typeof body.initData === "string" ? body.initData : "";
        const validated = validateWebAppInitData(initData, botToken);
        if (!validated.ok) {
          json(res, 401, { ok: false, error: validated.reason });
          return;
        }

        // Heartbeat: Mini App open counts as online activity
        touchUser({
          id: validated.userId,
          username: validated.username,
          firstName: validated.firstName,
        });

        const stats = crewStats(validated.userId);
        const platform = getUserStats();
        json(res, 200, {
          ok: true,
          userId: validated.userId,
          username: validated.username,
          firstName: validated.firstName,
          inviteCount: stats.total,
          referralCode: stats.code,
          invites: stats.invites.map((i) => ({
            userId: i.userId,
            firstName: i.firstName,
            at: i.at,
          })),
          platform: {
            totalUsers: platform.totalUsers,
            onlineNow: platform.onlineNow,
            active24h: platform.active24h,
          },
        });
        return;
      }

      // GET /api/invites/count?initData=...  (same auth, count only)
      if (req.method === "GET" && url.pathname === "/api/invites/count") {
        if (!rateLimit(`api:${req.socket.remoteAddress || "x"}`, 60, 60_000)) {
          json(res, 429, { ok: false, error: "rate_limited" });
          return;
        }
        const initData = url.searchParams.get("initData") || "";
        const validated = validateWebAppInitData(initData, botToken);
        if (!validated.ok) {
          json(res, 401, { ok: false, error: validated.reason });
          return;
        }
        json(res, 200, {
          ok: true,
          inviteCount: getInviteCountForUser(validated.userId),
          referralCode: crewStats(validated.userId).code,
        });
        return;
      }

      json(res, 404, { ok: false, error: "not_found" });
    } catch (e) {
      console.error("API error:", redactSecrets(String(e)));
      json(res, 500, { ok: false, error: "server_error" });
    }
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`  Secure API on http://127.0.0.1:${port} (bind localhost only)`);
  });

  return server;
}

function json(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readJson(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const MAX = 64_000;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX) {
        reject(new Error("body_too_large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8") || "{}";
        resolve(JSON.parse(raw) as Record<string, unknown>);
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}
