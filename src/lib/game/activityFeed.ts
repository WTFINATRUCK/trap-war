/** Live "street wire" activity feed — local plays + city pulse + optional bot API. */

export type ActivityKind =
  | "buy"
  | "sell"
  | "travel"
  | "raid"
  | "rob"
  | "plant"
  | "stash"
  | "new_player"
  | "return"
  | "rank"
  | "vault"
  | "heat"
  | "day";

export type ActorKind = "you" | "npc" | "player" | "street";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  text: string;
  at: number;
  /** true = this device's player */
  local?: boolean;
  /** Display handle for the actor (e.g. Kayla, Ghost, You) */
  actorName?: string;
  actorKind?: ActorKind;
  playerId?: string;
  /** Public Telegram @ without @ — only when player allows contact */
  username?: string;
  /** First-seen timestamp (ms) when known from registry */
  firstSeen?: number;
}

/** Named NPCs in Trap Phone / street lore — not real players */
export interface StreetNpc {
  id: string;
  name: string;
  role: string;
  bio: string;
  city?: string;
}

export const STREET_NPCS: StreetNpc[] = [
  {
    id: "pnut",
    name: "P-Nut",
    role: "Street intel",
    bio: "Moves word between blocks. Not a player — NPC contact on your Trap Phone.",
    city: "Watts",
  },
  {
    id: "bigl",
    name: "Big Lou",
    role: "Flip broker",
    bio: "Always hunting scale. NPC — texts tips, doesn't hold a real run.",
    city: "Compton",
  },
  {
    id: "kayla",
    name: "Kayla",
    role: "Block lookout",
    bio: "Keeps eyes on quiet nights. NPC contact — activity with Kayla is story, not multiplayer.",
    city: "Compton",
  },
  {
    id: "ray",
    name: "Uncle Ray",
    role: "Mentor",
    bio: "Plant the bag, own the block. NPC who unlocks South Central & Watts.",
    city: "South Central",
  },
  {
    id: "pearl",
    name: "Ms. Pearl",
    role: "Stable work",
    bio: "Long Beach gatekeeper. NPC — clears soft locks, not a ranked player.",
    city: "Long Beach",
  },
  {
    id: "disp",
    name: "Dispatcher",
    role: "Hot runs",
    bio: "Hands out loud product and heat. NPC client, not a human hustler.",
  },
];

export interface ResolvedActor {
  kind: ActorKind;
  name: string;
  npc?: StreetNpc;
  playerId?: string;
  username?: string;
  firstSeen?: number;
  /** Short badge for UI */
  badge: string;
  subtitle: string;
}

export interface StreetProfileStats {
  rank: string;
  city: string;
  day: number;
  heat: number;
  hustles: number;
  rep: number;
  /** Approximate cash shown on public card (blurred for others) */
  cash: number;
  /** Human "in the game" label */
  memberFor: string;
  note: string;
  /** Open t.me/username when set */
  telegramUsername?: string;
  allowTelegram: boolean;
  allowInGameMsg: boolean;
}

export function formatMemberFor(firstSeen?: number, fallbackDays?: number): string {
  if (firstSeen && firstSeen > 0) {
    const days = Math.max(0, Math.floor((Date.now() - firstSeen) / 86_400_000));
    if (days < 1) return "Joined today";
    if (days === 1) return "1 day on the block";
    if (days < 30) return `${days} days on the block`;
    const mo = Math.floor(days / 30);
    if (mo < 12) return `${mo} mo on the block`;
    return `${Math.floor(mo / 12)}+ yr on the block`;
  }
  if (fallbackDays != null && fallbackDays > 0) {
    return `~${fallbackDays} days active (est.)`;
  }
  return "New blood";
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Parse leading handle from wire text */
export function extractActorName(text: string): string {
  const you = text.match(/^You\s*\(([^)]+)\)/i);
  if (you?.[1]) return you[1].trim();
  if (/^You\b/i.test(text)) return "You";
  // "Raid hit Kayla's trap" / "Raid hit your trap"
  const raid = text.match(/^Raid hit (?:your trap \()?([^'’\s)]+)/i);
  if (raid?.[1] && raid[1].toLowerCase() !== "your") return raid[1].replace(/'s$/i, "");
  const first = text.split(/\s+/)[0] || "Unknown";
  // strip trailing punctuation
  return first.replace(/[:·,]+$/, "");
}

export function findNpc(name: string): StreetNpc | undefined {
  const n = name.trim().toLowerCase();
  return STREET_NPCS.find(
    (c) => c.name.toLowerCase() === n || c.name.toLowerCase().startsWith(n) || n.includes(c.name.toLowerCase())
  );
}

export function resolveActor(item: ActivityItem, selfStreetName?: string): ResolvedActor {
  if (item.local || item.actorKind === "you") {
    return {
      kind: "you",
      name: selfStreetName || item.actorName || "You",
      badge: "YOU",
      subtitle: "Your run · live stats",
      playerId: item.playerId,
      username: item.username,
      firstSeen: item.firstSeen,
    };
  }

  const name = item.actorName || extractActorName(item.text);
  if (item.actorKind === "npc" || findNpc(name)) {
    const npc = findNpc(name) || findNpc(item.actorName || "") || STREET_NPCS[0]!;
    return {
      kind: "npc",
      name: npc.name,
      npc,
      badge: "NPC",
      subtitle: `${npc.role} · not a real player`,
    };
  }

  if (item.actorKind === "player" || item.playerId) {
    return {
      kind: "player",
      name,
      playerId: item.playerId,
      username: item.username,
      firstSeen: item.firstSeen,
      badge: "PLAYER",
      subtitle: "Hustler on the wire",
    };
  }

  return {
    kind: "street",
    name,
    username: item.username,
    firstSeen: item.firstSeen,
    badge: "STREET",
    subtitle: "Street handle · board noise / unlinked",
  };
}

/** Profile card stats — real for "you", seeded for others */
export function profileStatsFor(
  actor: ResolvedActor,
  you?: {
    rank: string;
    city: string;
    day: number;
    heat: number;
    cash: number;
    firstSeen?: number;
    username?: string;
  },
): StreetProfileStats {
  if (actor.kind === "you" && you) {
    return {
      rank: you.rank,
      city: you.city,
      day: you.day,
      heat: you.heat,
      hustles: Math.max(1, you.day * 2),
      rep: Math.min(99, 10 + you.day * 3),
      cash: you.cash,
      memberFor: formatMemberFor(you.firstSeen ?? actor.firstSeen, you.day),
      note: "Live from your current run.",
      telegramUsername: you.username || actor.username,
      allowTelegram: Boolean(you.username || actor.username),
      allowInGameMsg: false,
    };
  }

  if (actor.kind === "npc" && actor.npc) {
    const h = hashStr(actor.npc.id);
    return {
      rank: "NPC Contact",
      city: actor.npc.city || "City-wide",
      day: 0,
      heat: 0,
      hustles: 0,
      rep: 50 + (h % 40),
      cash: 0,
      memberFor: "Story contact · always around",
      note: actor.npc.bio,
      allowTelegram: false,
      allowInGameMsg: true,
    };
  }

  const seed = actor.playerId || actor.name;
  const h = hashStr(seed);
  const rng = mulberry32(h ^ 0x51a2c);
  const day = 1 + Math.floor(rng() * 28);
  const hasUser = Boolean(actor.username);
  return {
    rank: RANKS[Math.floor(rng() * RANKS.length)]!,
    city: CITIES[Math.floor(rng() * CITIES.length)]!,
    day,
    heat: Math.floor(8 + rng() * 70),
    hustles: 3 + Math.floor(rng() * 40),
    rep: 5 + Math.floor(rng() * 90),
    cash: 500 + Math.floor(rng() * 80_000),
    memberFor: formatMemberFor(actor.firstSeen, day),
    note:
      actor.kind === "player"
        ? "Public street card (limited). Full vault stats stay private."
        : "Street card from the wire — may be city pulse, not a linked account.",
    telegramUsername: hasUser ? actor.username : undefined,
    allowTelegram: hasUser,
    allowInGameMsg: actor.kind === "player" || actor.kind === "street" || actor.kind === "npc",
  };
}

const INBOX_KEY = "trapwar_inbox_v1";

export interface InGameMessage {
  id: string;
  toName: string;
  toPlayerId?: string;
  fromName: string;
  text: string;
  at: number;
}

export function loadOutbox(): InGameMessage[] {
  try {
    const raw = localStorage.getItem(INBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InGameMessage[];
    return Array.isArray(parsed) ? parsed.slice(0, 40) : [];
  } catch {
    return [];
  }
}

export function sendInGameMessage(input: {
  toName: string;
  toPlayerId?: string;
  fromName: string;
  text: string;
}): InGameMessage {
  const msg: InGameMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    toName: input.toName,
    toPlayerId: input.toPlayerId,
    fromName: input.fromName,
    text: input.text.slice(0, 280),
    at: Date.now(),
  };
  const next = [msg, ...loadOutbox()].slice(0, 40);
  try {
    localStorage.setItem(INBOX_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return msg;
}

const LOCAL_KEY = "trapwar_activity_local_v1";
const MAX_LOCAL = 40;
const MAX_FEED = 28;

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
  "Cali",
];
const CITIES = [
  "Detroit",
  "Atlanta",
  "Chicago",
  "Miami",
  "Houston",
  "LA",
  "Philly",
  "Baltimore",
  "Memphis",
  "Cleveland",
];
const PRODS = ["Weed", "Cocaine", "Molly", "Crystal"];
const RANKS = ["Corner Boy", "Block Runner", "Trap Lieutenant", "Kingpin", "Street Legend"];

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

/** Stable street name from telegram / player id */
export function streetNameFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return FIRST[h % FIRST.length]!;
}

export function loadLocalActivity(): ActivityItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActivityItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_LOCAL) : [];
  } catch {
    return [];
  }
}

export function pushLocalActivity(item: Omit<ActivityItem, "id" | "at" | "local"> & { at?: number }): ActivityItem {
  const full: ActivityItem = {
    ...item,
    id: `loc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: item.at ?? Date.now(),
    local: true,
    actorKind: item.actorKind ?? "you",
    actorName: item.actorName ?? extractActorName(item.text),
  };
  const next = [full, ...loadLocalActivity()].slice(0, MAX_LOCAL);
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return full;
}

/** Deterministic city-wide pulse so every client sees the same "live" street for a minute. */
export function cityPulseEvents(now = Date.now()): ActivityItem[] {
  const bucket = Math.floor(now / 45_000); // refresh ~every 45s
  const rng = mulberry32(bucket ^ 0x7a3c9e);
  const count = 10 + Math.floor(rng() * 6);
  const out: ActivityItem[] = [];

  for (let i = 0; i < count; i++) {
    const rng2 = mulberry32(bucket * 10007 + i * 9973);
    const who = pick(rng2, FIRST);
    const city = pick(rng2, CITIES);
    const prod = pick(rng2, PRODS);
    const qty = 5 + Math.floor(rng2() * 80);
    const cash = 800 + Math.floor(rng2() * 45_000);
    const roll = rng2();
    let kind: ActivityKind;
    let text: string;

    if (roll < 0.22) {
      kind = "buy";
      text = `${who} copped ${qty}g ${prod} in ${city} · ${money(cash)}`;
    } else if (roll < 0.42) {
      kind = "sell";
      text = `${who} moved ${qty}g ${prod} · bagged ${money(cash)}`;
    } else if (roll < 0.54) {
      kind = "travel";
      text = `${who} slid into ${city}`;
    } else if (roll < 0.62) {
      kind = "raid";
      text = `Raid hit ${who}'s trap in ${city} · heat up`;
    } else if (roll < 0.7) {
      kind = "rob";
      text = `${who} got got in ${city} · ${money(cash * 0.15)} lifted`;
    } else if (roll < 0.78) {
      kind = "new_player";
      text = `${who} just linked up · new blood on the block`;
    } else if (roll < 0.86) {
      kind = "return";
      text = `${who} back on the set · day ${1 + Math.floor(rng2() * 28)}`;
    } else if (roll < 0.93) {
      kind = "rank";
      text = `${who} ranked up → ${pick(rng2, RANKS)}`;
    } else {
      kind = "heat";
      text = `${who}: heat ${Math.floor(10 + rng2() * 70)} in ${city} · stay sharp`;
    }

    const npcHit = findNpc(who);
    out.push({
      id: `pulse_${bucket}_${i}`,
      kind,
      text,
      at: now - i * 8_000 - Math.floor(rng2() * 20_000),
      local: false,
      actorName: who,
      actorKind: npcHit ? "npc" : "street",
    });
  }

  // Dedicated NPC story beats (e.g. "Kayla added 1 The Stick")
  const npcExtras = 3;
  for (let j = 0; j < npcExtras; j++) {
    const rng3 = mulberry32(bucket * 3331 + j * 17);
    const npc = pick(rng3, STREET_NPCS);
    const gear = pick(rng3, ["The Stick", "Chopper hop", "Whip key", "Plug line", "stash bag"]);
    const qty = 1 + Math.floor(rng3() * 3);
    const kinds: ActivityKind[] = ["buy", "sell", "heat", "travel"];
    const kind = kinds[Math.floor(rng3() * kinds.length)]!;
    let text: string;
    if (kind === "buy") text = `${npc.name} added ${qty} ${gear}`;
    else if (kind === "sell") text = `${npc.name} flipped ${qty}g ${pick(rng3, PRODS)} off the block`;
    else if (kind === "travel") text = `${npc.name} checked in from ${npc.city || pick(rng3, CITIES)}`;
    else text = `${npc.name}: heat rises with loud bags. Stay sharp.`;

    out.push({
      id: `pulse_npc_${bucket}_${j}`,
      kind,
      text,
      at: now - (count + j) * 9_000,
      local: false,
      actorName: npc.name,
      actorKind: "npc",
    });
  }

  return out;
}

export function mergeFeed(
  local: ActivityItem[],
  remote: ActivityItem[],
  pulse: ActivityItem[],
): ActivityItem[] {
  const map = new Map<string, ActivityItem>();
  for (const item of [...local, ...remote, ...pulse]) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()].sort((a, b) => b.at - a.at).slice(0, MAX_FEED);
}

/** Empty base = same-origin `/api/...` (production Vercel). */
function apiRoot(apiBase: string): string {
  return (apiBase || "").replace(/\/$/, "");
}

export async function fetchRemoteActivity(apiBase: string): Promise<ActivityItem[]> {
  try {
    const res = await fetch(`${apiRoot(apiBase)}/api/activity?limit=30`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { ok?: boolean; items?: ActivityItem[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

export async function postRemoteActivity(
  apiBase: string,
  item: {
    kind: ActivityKind;
    text: string;
    playerId?: string;
    actorName?: string;
    username?: string;
  },
): Promise<void> {
  try {
    await fetch(`${apiRoot(apiBase)}/api/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    /* offline / no bot API */
  }
}

export interface PublicPlayerCard {
  id: string;
  streetName?: string;
  firstName?: string;
  username?: string;
  firstSeen?: number;
  lastSeen?: number;
  hits?: number;
  banned?: boolean;
}

export async function fetchPublicPlayer(
  apiBase: string,
  playerId: string,
): Promise<PublicPlayerCard | null> {
  if (!playerId) return null;
  try {
    const res = await fetch(
      `${apiRoot(apiBase)}/api/player?id=${encodeURIComponent(playerId)}`,
      { signal: AbortSignal.timeout(2500) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; player?: PublicPlayerCard };
    return data.ok && data.player ? data.player : null;
  } catch {
    return null;
  }
}

/** Label for bubble header from kind */
export function kindLabel(kind: ActivityKind): string {
  switch (kind) {
    case "buy":
      return "BUY";
    case "sell":
      return "SELL";
    case "travel":
      return "MOVE";
    case "raid":
      return "RAID";
    case "rob":
      return "ROB";
    case "plant":
      return "PLANT";
    case "stash":
      return "STASH";
    case "new_player":
      return "NEW";
    case "return":
      return "BACK";
    case "rank":
      return "RANK";
    case "vault":
      return "VAULT";
    case "heat":
      return "HEAT";
    case "day":
      return "DAY";
    default:
      return "WIRE";
  }
}

export function formatLocalBuy(who: string, qty: number, product: string, city: string, cost: number): string {
  return `You (${who}) copped ${qty}g ${product} in ${city} · ${money(cost)}`;
}

export function formatLocalSell(who: string, qty: number, product: string, revenue: number, rank?: string): string {
  const base = `You (${who}) moved ${qty}g ${product} · bagged ${money(revenue)}`;
  return rank ? `${base} · ranked ${rank}` : base;
}

export function formatLocalTravel(who: string, city: string): string {
  return `You (${who}) slid into ${city}`;
}

export function formatLocalRaid(who: string, detail: string): string {
  return `Raid hit your trap (${who}) · ${detail}`;
}

export function formatLocalRob(who: string, lost: number): string {
  return `You (${who}) got got · ${money(lost)} lifted`;
}

export function formatLocalPlant(who: string, qty: number, product: string): string {
  return `You (${who}) planted ${qty}g ${product}`;
}

export function formatLocalStash(who: string, qty: number, product: string): string {
  return `You (${who}) pulled ${qty}g ${product} from stash`;
}

export function formatLocalRank(who: string, rank: string): string {
  return `You (${who}) ranked up → ${rank}`;
}

export function formatLocalDay(who: string, day: number): string {
  return `You (${who}) clocked day ${day}`;
}
