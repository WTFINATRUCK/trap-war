/**
 * Minimal secure HTTP API next to the bot (local polling mode).
 * Env: API_PORT (default 8787), API_CORS_ORIGIN (optional, comma-separated)
 */
import http from "http";
import { redactSecrets } from "./security";
import { handlePublicApi } from "./publicApi";

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
      const body =
        req.method === "POST" || req.method === "PUT" ? await readJson(req) : undefined;
      const result = handlePublicApi({
        method: req.method || "GET",
        pathname: url.pathname,
        searchParams: url.searchParams,
        headers: req.headers as Record<string, string | string[] | undefined>,
        body,
        botToken,
      });
      json(res, result.status, result.body);
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
