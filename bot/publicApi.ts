/**
 * Shared public HTTP handlers for local secure API + Vercel serverless.
 * Keep free of Telegraf so activity/player routes stay light.
 */
import { listActivity, pushActivity, type ActivityKind } from "./activity.js";
import { getPublicPlayerCard, getUserStats, touchUser } from "./users.js";
import { rateLimit, validateWebAppInitData } from "./security.js";
import { crewStats, getInviteCountForUser } from "./referrals.js";

const ALLOWED_KINDS: ActivityKind[] = [
  "buy",
  "sell",
  "travel",
  "raid",
  "rob",
  "plant",
  "stash",
  "new_player",
  "return",
  "rank",
  "vault",
  "heat",
  "day",
];

export type JsonResult = { status: number; body: unknown };

function ipFrom(headers: Record<string, string | string[] | undefined>): string {
  const xf = headers["x-forwarded-for"];
  if (typeof xf === "string" && xf) return xf.split(",")[0]!.trim();
  if (Array.isArray(xf) && xf[0]) return xf[0].split(",")[0]!.trim();
  return "x";
}

export function handlePublicApi(input: {
  method: string;
  pathname: string;
  searchParams: URLSearchParams;
  headers: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown>;
  botToken?: string;
}): JsonResult {
  const method = input.method.toUpperCase();
  const path = input.pathname.replace(/\/$/, "") || "/";
  const ip = ipFrom(input.headers);

  if (method === "GET" && (path === "/health" || path === "/api/health")) {
    return { status: 200, body: { ok: true, service: "trapwar-api" } };
  }

  if (method === "GET" && path === "/api/stats") {
    if (!rateLimit(`api-stats:${ip}`, 30, 60_000)) {
      return { status: 429, body: { ok: false, error: "rate_limited" } };
    }
    const s = getUserStats();
    return {
      status: 200,
      body: {
        ok: true,
        totalUsers: s.totalUsers,
        onlineNow: s.onlineNow,
        active24h: s.active24h,
        active7d: s.active7d,
        newToday: s.newToday,
        onlineWindowMin: s.onlineWindowMin,
      },
    };
  }

  if (method === "GET" && path === "/api/activity") {
    if (!rateLimit(`api-activity-r:${ip}`, 90, 60_000)) {
      return { status: 429, body: { ok: false, error: "rate_limited" } };
    }
    const limit = parseInt(input.searchParams.get("limit") || "30", 10);
    return {
      status: 200,
      body: { ok: true, items: listActivity(Number.isFinite(limit) ? limit : 30) },
    };
  }

  if (method === "POST" && path === "/api/activity") {
    if (!rateLimit(`api-activity-w:${ip}`, 40, 60_000)) {
      return { status: 429, body: { ok: false, error: "rate_limited" } };
    }
    const body = input.body || {};
    const kind = typeof body.kind === "string" ? body.kind : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const playerId = typeof body.playerId === "string" ? body.playerId.slice(0, 32) : undefined;
    const actorName =
      typeof body.actorName === "string" ? body.actorName.slice(0, 32) : undefined;
    const username =
      typeof body.username === "string"
        ? body.username.replace(/^@/, "").slice(0, 32)
        : undefined;
    if (!ALLOWED_KINDS.includes(kind as ActivityKind) || text.length < 4 || text.length > 200) {
      return { status: 400, body: { ok: false, error: "invalid_activity" } };
    }
    const item = pushActivity({
      kind: kind as ActivityKind,
      text: text.replace(/[<>]/g, ""),
      playerId,
      actorName,
      username,
    });
    return { status: 200, body: { ok: true, item } };
  }

  if (method === "GET" && path === "/api/player") {
    if (!rateLimit(`api-player:${ip}`, 90, 60_000)) {
      return { status: 429, body: { ok: false, error: "rate_limited" } };
    }
    const id = (input.searchParams.get("id") || "").trim();
    if (!id || id.length > 32) {
      return { status: 400, body: { ok: false, error: "bad_id" } };
    }
    const player = getPublicPlayerCard(id);
    if (!player) {
      return { status: 404, body: { ok: false, error: "not_found" } };
    }
    return { status: 200, body: { ok: true, player } };
  }

  if (method === "POST" && path === "/api/me" && input.botToken) {
    if (!rateLimit(`api:${ip}`, 60, 60_000)) {
      return { status: 429, body: { ok: false, error: "rate_limited" } };
    }
    const initData = typeof input.body?.initData === "string" ? input.body.initData : "";
    const validated = validateWebAppInitData(initData, input.botToken);
    if (!validated.ok) {
      return { status: 401, body: { ok: false, error: validated.reason } };
    }
    touchUser({
      id: validated.userId,
      username: validated.username,
      firstName: validated.firstName,
    });
    const stats = crewStats(validated.userId);
    const platform = getUserStats();
    return {
      status: 200,
      body: {
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
      },
    };
  }

  if (method === "GET" && path === "/api/invites/count" && input.botToken) {
    if (!rateLimit(`api:${ip}`, 60, 60_000)) {
      return { status: 429, body: { ok: false, error: "rate_limited" } };
    }
    const initData = input.searchParams.get("initData") || "";
    const validated = validateWebAppInitData(initData, input.botToken);
    if (!validated.ok) {
      return { status: 401, body: { ok: false, error: validated.reason } };
    }
    return {
      status: 200,
      body: {
        ok: true,
        inviteCount: getInviteCountForUser(validated.userId),
        referralCode: crewStats(validated.userId).code,
      },
    };
  }

  return { status: 404, body: { ok: false, error: "not_found" } };
}
