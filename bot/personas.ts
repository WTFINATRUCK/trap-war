/**
 * Human-facing personas for Trap War admin bots.
 * Telegram @usernames still end in "bot" (BotFather rule) —
 * display names, bios, and avatars make them feel like people in chat.
 */
import type { BotRoleId } from "./adminBots";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface BotPersona {
  role: BotRoleId;
  /** What shows as the chat name (human) */
  displayName: string;
  /** Street first name used in message voice */
  firstName: string;
  /** Full bio under profile (Telegram setMyDescription, max ~512) */
  bio: string;
  /** Short blurb in chat list (setMyShortDescription, max ~120) */
  shortBio: string;
  /** Path to square profile image (png/jpg) */
  avatarFile: string;
  /** How this persona talks in group messages */
  voice: {
    welcome: (name: string) => string;
    rulesIntro: string;
    linksIntro: string;
    online: string;
    spamHit: (name: string) => string;
    floodWatch: string;
    sayPrefix: string;
  };
}

const assets = path.join(__dirname, "..", "assets", "bots");

export const BOT_PERSONAS: Record<BotRoleId, BotPersona> = {
  main: {
    role: "main",
    displayName: "Stacks",
    firstName: "Stacks",
    bio:
      "Running Trap War off my phone. 30-day hustle · invites · vault.\n" +
      "Tap Play if you tryna eat. Not support — I'm in the game.",
    shortBio: "Trap War · play the hustle",
    avatarFile: path.join(assets, "stacks.jpg"),
    voice: {
      welcome: (name) => `yo ${name} — you on the set now. hit Play when you ready.`,
      rulesIntro: "quick word from the block:",
      linksIntro: "official links — don't get got by fakes:",
      online: "Stacks online. Mini App live.",
      spamHit: (name) => `${name} chill with that spam.`,
      floodWatch: "lot of new faces — stay sharp.",
      sayPrefix: "",
    },
  },
  community: {
    role: "community",
    displayName: "Kayla",
    firstName: "Kayla",
    bio:
      "Compton nights. I keep the Trap War chat warm.\n" +
      "Welcomes · word on the street · links.\n" +
      "Play for real money moves is through Stacks (the game bot).",
    shortBio: "Community · word on the street",
    avatarFile: path.join(assets, "kayla.jpg"),
    voice: {
      welcome: (name) =>
        `hey ${name} 👋 you linked up.\n` +
        `this the Trap War hangout — tips, flexes, crew talk.\n` +
        `rules anytime → /rules · links → /links\n` +
        `go hustle with Stacks when you ready.`,
      rulesIntro: "alright real talk — house rules so nobody ruins the bag:",
      linksIntro: "save these — only official:",
      online: "Kayla in the chat. drop a 🔥 if you eating.",
      spamHit: (name) => `${name} nah we don't do that here.`,
      floodWatch: "chat getting loud with new blood — welcome y'all.",
      sayPrefix: "",
    },
  },
  guard: {
    role: "guard",
    displayName: "Big Lou",
    firstName: "Big Lou",
    bio:
      "I watch the door. No scams. No seed phrases. No fake airdrops.\n" +
      "Mods still run the block — I just clean the trash.",
    shortBio: "Security · keep the chat clean",
    avatarFile: path.join(assets, "bigl.jpg"),
    voice: {
      welcome: (name) => `${name} — you good. don't bring heat.`,
      rulesIntro: "listen up:",
      linksIntro: "only these links count:",
      online: "Big Lou on the door. act right.",
      spamHit: (name) =>
        `caught ${name} sliding spam. gone.\n` +
        `no wallets · no free TON scams · no seed phrases.`,
      floodWatch:
        "too many joins at once. mods stay sharp — might be a raid.",
      sayPrefix: "Lou: ",
    },
  },
};

export function personaFor(role: BotRoleId): BotPersona {
  return BOT_PERSONAS[role];
}
