/**
 * Launch all configured admin bots in one process.
 * Main (game) always required; Community + Guard start if tokens exist.
 *
 *   npm run bot:all
 */
import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configuredAdminBots, resolveAdminBots } from "./adminBots";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const ROLE_SCRIPT: Record<string, string> = {
  main: "bot/index.ts",
  community: "bot/communityBot.ts",
  guard: "bot/guardBot.ts",
};

const children: ChildProcess[] = [];

function start(role: string, script: string) {
  const child = spawn("npx", ["tsx", script], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  children.push(child);
  child.on("exit", (code) => {
    console.warn(`[${role}] exited code=${code}`);
  });
  console.log(`▶ started ${role} → ${script}`);
}

const all = resolveAdminBots();
const ready = configuredAdminBots();

console.log("🤖 Trap War multi-bot launcher");
console.log(`   Configured: ${ready.length}/${all.length}`);
for (const b of all) {
  console.log(
    `   ${b.configured ? "✅" : "⬜"} ${b.role.padEnd(10)} @${b.username || b.suggestedUsername} — ${b.label}`
  );
}

if (!ready.some((b) => b.role === "main")) {
  console.error("BOT_TOKEN (main game bot) is required.");
  process.exit(1);
}

for (const b of ready) {
  const script = ROLE_SCRIPT[b.role];
  if (script) start(b.role, script);
}

if (ready.length < 2) {
  console.warn("");
  console.warn("⚠ Only 1 bot token found. For a healthy community, create 2–3 admin bots:");
  console.warn("   1. BOT_TOKEN              → Play (you have this)");
  console.warn("   2. COMMUNITY_BOT_TOKEN    → Welcome / rules");
  console.warn("   3. GUARD_BOT_TOKEN        → Mod / anti-spam");
  console.warn("   See COMMUNITY_SETUP.md → Multi-bot admins");
}

function shutdown() {
  for (const c of children) {
    try {
      c.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
