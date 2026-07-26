"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// bot/public-api-entry.ts
var public_api_entry_exports = {};
__export(public_api_entry_exports, {
  handlePublicApi: () => handlePublicApi
});
module.exports = __toCommonJS(public_api_entry_exports);

// bot/activity.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);

// bot/paths.ts
var import_node_path = __toESM(require("node:path"), 1);
function dataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (process.env.VERCEL) return import_node_path.default.join("/tmp", "trapwar-data");
  return import_node_path.default.join(process.cwd(), "data");
}

// bot/activity.ts
var DATA_DIR = dataDir();
var FILE = import_node_path2.default.join(DATA_DIR, "activity.json");
var MAX = 80;
function ensure() {
  if (!import_node_fs.default.existsSync(DATA_DIR)) import_node_fs.default.mkdirSync(DATA_DIR, { recursive: true });
  if (!import_node_fs.default.existsSync(FILE)) import_node_fs.default.writeFileSync(FILE, "[]", "utf8");
}
function readAll() {
  ensure();
  try {
    const raw = import_node_fs.default.readFileSync(FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeAll(items) {
  ensure();
  import_node_fs.default.writeFileSync(FILE, JSON.stringify(items.slice(0, MAX), null, 2), "utf8");
}
function listActivity(limit = 30) {
  return readAll().slice(0, Math.min(80, Math.max(1, limit)));
}
function pushActivity(input) {
  const item = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind: input.kind,
    text: input.text.slice(0, 200),
    at: Date.now(),
    playerId: input.playerId,
    actorName: input.actorName?.slice(0, 32),
    username: input.username?.replace(/^@/, "").slice(0, 32),
    firstSeen: input.firstSeen
  };
  const next = [item, ...readAll()].slice(0, MAX);
  writeAll(next);
  return item;
}

// bot/users.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);

// bot/security.ts
var import_crypto = __toESM(require("crypto"), 1);
var MAX_NAME_LEN = 64;
var RATE_WINDOW_MS = 6e4;
var RATE_MAX = 30;
var rateBuckets = /* @__PURE__ */ new Map();
function isValidTelegramId(id) {
  return typeof id === "number" && Number.isInteger(id) && id > 0 && id < Number.MAX_SAFE_INTEGER;
}
function sanitizeName(input) {
  if (!input || typeof input !== "string") return void 0;
  const cleaned = input.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, MAX_NAME_LEN);
  return cleaned || void 0;
}
function inviteCodeForUser(telegramId) {
  if (!isValidTelegramId(telegramId)) {
    throw new Error("Invalid telegram id");
  }
  return `TRAP-${telegramId}`;
}
function rateLimit(key, max = RATE_MAX, windowMs = RATE_WINDOW_MS) {
  const now = Date.now();
  const prev = rateBuckets.get(key) || [];
  const fresh = prev.filter((t) => now - t < windowMs);
  if (fresh.length >= max) {
    rateBuckets.set(key, fresh);
    return false;
  }
  fresh.push(now);
  rateBuckets.set(key, fresh);
  return true;
}
function validateWebAppInitData(initData, botToken, maxAgeSec = 86400) {
  if (!initData || !botToken) {
    return { ok: false, reason: "missing_init_data" };
  }
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "missing_hash" };
  params.delete("hash");
  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");
  const secretKey = import_crypto.default.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = import_crypto.default.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  try {
    const a = Buffer.from(calculated, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length || !import_crypto.default.timingSafeEqual(a, b)) {
      return { ok: false, reason: "bad_signature" };
    }
  } catch {
    return { ok: false, reason: "bad_signature" };
  }
  const authDate = parseInt(params.get("auth_date") || "0", 10);
  if (!authDate || Date.now() / 1e3 - authDate > maxAgeSec) {
    return { ok: false, reason: "expired" };
  }
  let userId = 0;
  let username;
  let firstName;
  try {
    const userRaw = params.get("user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (!isValidTelegramId(user.id)) return { ok: false, reason: "bad_user" };
      userId = user.id;
      username = sanitizeName(user.username);
      firstName = sanitizeName(user.first_name);
    }
  } catch {
    return { ok: false, reason: "bad_user_json" };
  }
  if (!userId) return { ok: false, reason: "no_user" };
  const startParam = params.get("start_param") || void 0;
  return { ok: true, userId, username, firstName, startParam };
}

// bot/users.ts
var DATA_DIR2 = dataDir();
var FILE2 = import_path.default.join(DATA_DIR2, "users.json");
var ONLINE_WINDOW_MS = 5 * 60 * 1e3;
var ACTIVE_24H_MS = 24 * 60 * 60 * 1e3;
var ACTIVE_7D_MS = 7 * 24 * 60 * 60 * 1e3;
function empty() {
  return { users: {} };
}
function loadUsers() {
  try {
    if (!import_fs.default.existsSync(FILE2)) return empty();
    const raw = JSON.parse(import_fs.default.readFileSync(FILE2, "utf8"));
    return { users: raw.users || {} };
  } catch {
    return empty();
  }
}
function saveUsers(store) {
  if (!import_fs.default.existsSync(DATA_DIR2)) {
    import_fs.default.mkdirSync(DATA_DIR2, { recursive: true, mode: 448 });
  }
  const tmp = `${FILE2}.${process.pid}.tmp`;
  import_fs.default.writeFileSync(tmp, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 384 });
  import_fs.default.renameSync(tmp, FILE2);
}
function touchUser(input) {
  if (!isValidTelegramId(input.id)) return null;
  const store = loadUsers();
  const key = String(input.id);
  const now = Date.now();
  const existing = store.users[key];
  if (existing) {
    const idle = now - existing.lastSeen;
    const isReturning = idle >= ACTIVE_24H_MS;
    existing.lastSeen = now;
    existing.hits = (existing.hits || 0) + 1;
    if (input.username) existing.username = sanitizeName(input.username);
    if (input.firstName) existing.firstName = sanitizeName(input.firstName);
    store.users[key] = existing;
    saveUsers(store);
    return { user: existing, isNew: false, isReturning };
  }
  const user = {
    id: key,
    username: sanitizeName(input.username),
    firstName: sanitizeName(input.firstName),
    firstSeen: now,
    lastSeen: now,
    hits: 1
  };
  store.users[key] = user;
  saveUsers(store);
  return { user, isNew: true, isReturning: false };
}
function getUserStats(now = Date.now()) {
  const store = loadUsers();
  const list = Object.values(store.users);
  const startOfDay = /* @__PURE__ */ new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dayStart = startOfDay.getTime();
  let onlineNow = 0;
  let active24h = 0;
  let active7d = 0;
  let newToday = 0;
  for (const u of list) {
    const idle = now - u.lastSeen;
    if (idle <= ONLINE_WINDOW_MS) onlineNow++;
    if (idle <= ACTIVE_24H_MS) active24h++;
    if (idle <= ACTIVE_7D_MS) active7d++;
    if (u.firstSeen >= dayStart) newToday++;
  }
  return {
    totalUsers: list.length,
    onlineNow,
    active24h,
    active7d,
    newToday,
    onlineWindowMin: Math.round(ONLINE_WINDOW_MS / 6e4)
  };
}
function getUserById(id) {
  const key = String(id).trim();
  if (!key) return null;
  const store = loadUsers();
  return store.users[key] || null;
}
function getPublicPlayerCard(id) {
  const u = getUserById(id);
  if (!u) return null;
  if (u.banned) {
    return {
      id: u.id,
      streetName: streetNameFromId(u.id),
      firstSeen: u.firstSeen,
      lastSeen: u.lastSeen,
      hits: u.hits,
      banned: true
    };
  }
  const allow = u.allowTelegramContact !== false;
  return {
    id: u.id,
    streetName: streetNameFromId(u.id),
    firstName: u.firstName,
    username: allow && u.username ? u.username : void 0,
    firstSeen: u.firstSeen,
    lastSeen: u.lastSeen,
    hits: u.hits,
    banned: false
  };
}
function streetNameFromId(id) {
  const FIRST = [
    "Big Lou",
    "Lil Kev",
    "Ghost",
    "Stacks",
    "Rook",
    "Trina",
    "Dez",
    "Ice",
    "Mando",
    "Kilo",
    "Sosa",
    "Rico",
    "Blaze",
    "Nino",
    "Asha",
    "Flex",
    "Juke",
    "Pepe",
    "Viper",
    "Cali"
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = h * 31 + id.charCodeAt(i) >>> 0;
  return FIRST[h % FIRST.length];
}

// bot/referrals.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
var DATA_DIR3 = dataDir();
var FILE3 = import_path2.default.join(DATA_DIR3, "referrals.json");
function empty2() {
  return { byCode: {}, byUser: {}, codes: {} };
}
function loadReferrals() {
  try {
    if (!import_fs2.default.existsSync(FILE3)) return empty2();
    const raw = JSON.parse(import_fs2.default.readFileSync(FILE3, "utf8"));
    const store = { ...empty2(), ...raw };
    for (const [code, list] of Object.entries(store.byCode)) {
      if (!Array.isArray(list)) {
        store.byCode[code] = [];
        continue;
      }
      store.byCode[code] = list.map((item) => {
        if (typeof item === "string") {
          return { userId: item, at: Date.now(), source: "telegram_start" };
        }
        return {
          userId: String(item.userId),
          username: sanitizeName(item.username),
          firstName: sanitizeName(item.firstName),
          at: Number(item.at) || Date.now(),
          source: "telegram_start"
        };
      });
    }
    return store;
  } catch {
    return empty2();
  }
}
function saveReferrals(store) {
  if (!import_fs2.default.existsSync(DATA_DIR3)) {
    import_fs2.default.mkdirSync(DATA_DIR3, { recursive: true, mode: 448 });
  }
  const tmp = `${FILE3}.${process.pid}.tmp`;
  import_fs2.default.writeFileSync(tmp, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 384 });
  import_fs2.default.renameSync(tmp, FILE3);
}
function generateCode(telegramId) {
  return inviteCodeForUser(telegramId);
}
function codeForUser(telegramId) {
  if (!isValidTelegramId(telegramId)) {
    throw new Error("invalid_telegram_id");
  }
  const store = loadReferrals();
  const key = String(telegramId);
  const code = generateCode(telegramId);
  if (store.codes[key] !== code) {
    const old = store.codes[key];
    store.codes[key] = code;
    if (old && old !== code && store.byCode[old]) {
      const merged = [...store.byCode[code] || [], ...store.byCode[old]];
      const seen = /* @__PURE__ */ new Set();
      store.byCode[code] = merged.filter((r) => {
        if (seen.has(r.userId)) return false;
        seen.add(r.userId);
        return true;
      });
    }
    saveReferrals(store);
  }
  return code;
}
function crewStats(telegramId) {
  if (!isValidTelegramId(telegramId)) {
    return { code: "", total: 0, invites: [] };
  }
  const store = loadReferrals();
  const code = codeForUser(telegramId);
  const invites = store.byCode[code] || [];
  return { code, total: invites.length, invites };
}
function getInviteCountForUser(telegramId) {
  return crewStats(telegramId).total;
}

// bot/publicApi.ts
var ALLOWED_KINDS = [
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
  "day"
];
function ipFrom(headers) {
  const xf = headers["x-forwarded-for"];
  if (typeof xf === "string" && xf) return xf.split(",")[0].trim();
  if (Array.isArray(xf) && xf[0]) return xf[0].split(",")[0].trim();
  return "x";
}
function handlePublicApi(input) {
  const method = input.method.toUpperCase();
  const path5 = input.pathname.replace(/\/$/, "") || "/";
  const ip = ipFrom(input.headers);
  if (method === "GET" && (path5 === "/health" || path5 === "/api/health")) {
    return { status: 200, body: { ok: true, service: "trapwar-api" } };
  }
  if (method === "GET" && path5 === "/api/stats") {
    if (!rateLimit(`api-stats:${ip}`, 30, 6e4)) {
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
        onlineWindowMin: s.onlineWindowMin
      }
    };
  }
  if (method === "GET" && path5 === "/api/activity") {
    if (!rateLimit(`api-activity-r:${ip}`, 90, 6e4)) {
      return { status: 429, body: { ok: false, error: "rate_limited" } };
    }
    const limit = parseInt(input.searchParams.get("limit") || "30", 10);
    return {
      status: 200,
      body: { ok: true, items: listActivity(Number.isFinite(limit) ? limit : 30) }
    };
  }
  if (method === "POST" && path5 === "/api/activity") {
    if (!rateLimit(`api-activity-w:${ip}`, 40, 6e4)) {
      return { status: 429, body: { ok: false, error: "rate_limited" } };
    }
    const body = input.body || {};
    const kind = typeof body.kind === "string" ? body.kind : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const playerId = typeof body.playerId === "string" ? body.playerId.slice(0, 32) : void 0;
    const actorName = typeof body.actorName === "string" ? body.actorName.slice(0, 32) : void 0;
    const username = typeof body.username === "string" ? body.username.replace(/^@/, "").slice(0, 32) : void 0;
    if (!ALLOWED_KINDS.includes(kind) || text.length < 4 || text.length > 200) {
      return { status: 400, body: { ok: false, error: "invalid_activity" } };
    }
    const item = pushActivity({
      kind,
      text: text.replace(/[<>]/g, ""),
      playerId,
      actorName,
      username
    });
    return { status: 200, body: { ok: true, item } };
  }
  if (method === "GET" && path5 === "/api/player") {
    if (!rateLimit(`api-player:${ip}`, 90, 6e4)) {
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
  if (method === "POST" && path5 === "/api/me" && input.botToken) {
    if (!rateLimit(`api:${ip}`, 60, 6e4)) {
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
      firstName: validated.firstName
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
          at: i.at
        })),
        platform: {
          totalUsers: platform.totalUsers,
          onlineNow: platform.onlineNow,
          active24h: platform.active24h
        }
      }
    };
  }
  if (method === "GET" && path5 === "/api/invites/count" && input.botToken) {
    if (!rateLimit(`api:${ip}`, 60, 6e4)) {
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
        referralCode: crewStats(validated.userId).code
      }
    };
  }
  return { status: 404, body: { ok: false, error: "not_found" } };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handlePublicApi
});
