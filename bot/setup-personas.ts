/**
 * Apply human display names, bios, and profile photos to admin bots.
 *
 *   npm run bot:personas
 *
 * Avatars: assets/bots/{stacks,kayla,bigl}.jpg
 * Telegram @usernames still end in "bot" — members see the human display name + photo.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Telegraf } from "telegraf";
import { resolveAdminBots, type BotRoleId } from "./adminBots";
import { personaFor } from "./personas";

/**
 * Bot API 7+ uses InputProfilePhotoStatic via curl-compatible multipart
 * (Node FormData doesn't match Telegram's JSON field handling).
 */
async function setProfilePhoto(token: string, filePath: string): Promise<void> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`missing file ${filePath}`);
  }

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  const metaPath = path.join(path.dirname(filePath), `._photo_meta_${process.pid}.json`);
  fs.writeFileSync(metaPath, JSON.stringify({ type: "static", photo: "attach://pic" }), "utf8");

  try {
    const url = `https://api.telegram.org/bot${token}/setMyProfilePhoto`;
    const { stdout } = await execFileAsync(
      "curl",
      [
        "-s",
        "-F",
        `photo=<${metaPath};type=application/json`,
        "-F",
        `pic=@${filePath};type=image/jpeg`,
        url,
      ],
      { windowsHide: true, maxBuffer: 2_000_000 }
    );
    const data = JSON.parse(stdout || "{}") as { ok?: boolean; description?: string };
    if (!data.ok) {
      throw new Error(data.description || "setMyProfilePhoto failed");
    }
  } finally {
    try {
      fs.unlinkSync(metaPath);
    } catch {
      /* ignore */
    }
  }
}

async function applyPersona(role: BotRoleId, token: string, handle: string) {
  const p = personaFor(role);
  const bot = new Telegraf(token);
  const me = await bot.telegram.getMe();
  const at = me.username ? `@${me.username}` : `@${handle}`;

  console.log(`\n→ ${role}: ${at}  →  “${p.displayName}”`);

  try {
    await bot.telegram.callApi("setMyName", { name: p.displayName });
    console.log(`  ✓ name: ${p.displayName}`);
  } catch (e) {
    console.warn(`  ✗ setMyName:`, (e as Error).message);
    console.warn(`    Fallback: @BotFather → /setname → ${p.displayName}`);
  }

  try {
    await bot.telegram.callApi("setMyShortDescription", {
      short_description: p.shortBio.slice(0, 120),
    });
    console.log(`  ✓ short bio: ${p.shortBio}`);
  } catch (e) {
    console.warn(`  ✗ setMyShortDescription:`, (e as Error).message);
  }

  try {
    await bot.telegram.callApi("setMyDescription", {
      description: p.bio.slice(0, 512),
    });
    console.log(`  ✓ full bio`);
  } catch (e) {
    console.warn(`  ✗ setMyDescription:`, (e as Error).message);
  }

  try {
    await setProfilePhoto(token, p.avatarFile);
    console.log(`  ✓ photo: ${path.basename(p.avatarFile)}`);
  } catch (e) {
    console.warn(`  ✗ setMyProfilePhoto:`, (e as Error).message);
    console.warn(`    Manual: @BotFather → /setuserpic → send ${p.avatarFile}`);
  }

  try {
    if (role === "community") {
      await bot.telegram.setMyCommands([
        { command: "rules", description: "Kayla's house rules" },
        { command: "links", description: "Official links only" },
        { command: "adminbots", description: "Stacks · Kayla · Lou" },
        { command: "help", description: "What Kayla does" },
      ]);
    } else if (role === "guard") {
      await bot.telegram.setMyCommands([
        { command: "status", description: "Lou's door check" },
        { command: "purge", description: "Delete a message (owner)" },
        { command: "adminbots", description: "Stacks · Kayla · Lou" },
        { command: "help", description: "What Lou does" },
      ]);
    }
    console.log(`  ✓ command menu`);
  } catch {
    /* optional */
  }

  console.log(`  Members see: ${p.displayName}  ·  handle ${at}`);
}

async function main() {
  const bots = resolveAdminBots().filter((b) => b.configured);
  if (!bots.length) {
    console.error("No bot tokens in .env");
    process.exit(1);
  }

  console.log("Applying human personas (name · bio · photo)…");
  console.log("Telegram forces @…bot usernames — display name + pic is what feels human.");

  for (const b of bots) {
    await applyPersona(b.role, b.token, b.username || b.suggestedUsername);
  }

  console.log("\n✅ Done. Open DM with each bot — check name + photo.");
  console.log("   Re-run anytime after swapping assets/bots/*.jpg");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
