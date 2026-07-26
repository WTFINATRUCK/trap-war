import fs from "node:fs";
import path from "node:path";
import { dataDir } from "./paths.js";

const DATA_DIR = dataDir();
const FILE = path.join(DATA_DIR, "activity.json");
const MAX = 80;

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

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  text: string;
  at: number;
  playerId?: string;
}

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "[]", "utf8");
}

function readAll(): ActivityItem[] {
  ensure();
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    const parsed = JSON.parse(raw) as ActivityItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: ActivityItem[]) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(items.slice(0, MAX), null, 2), "utf8");
}

export function listActivity(limit = 30): ActivityItem[] {
  return readAll().slice(0, Math.min(80, Math.max(1, limit)));
}

export function pushActivity(input: {
  kind: ActivityKind;
  text: string;
  playerId?: string;
}): ActivityItem {
  const item: ActivityItem = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind: input.kind,
    text: input.text.slice(0, 200),
    at: Date.now(),
    playerId: input.playerId,
  };
  const next = [item, ...readAll()].slice(0, MAX);
  writeAll(next);
  return item;
}
