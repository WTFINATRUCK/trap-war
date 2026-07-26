/** In-Telegram copy: how to play + what's coming soon (HTML parse mode) */

export const WELCOME =
  "🎮 <b>TRAP WAR</b>\n\n" +
  "30-day street hustle across the city.\n" +
  "Buy low · Travel · Sell high · Plant stashes · Rank up.\n\n" +
  "🔒 <b>8%</b> of every win auto-locks to your vault.\n" +
  "🤝 <b>Everybody Eats</b> — share invites, earn on crew hustle.\n\n" +
  "Tap <b>Play Trap War</b> to open the game.\n" +
  "Need the rules? → /guide\n" +
  "What's next? → /soon";

/** Part 1 of full guide (under Telegram limits, safe HTML) */
export function howToPlayPart1(): string {
  return (
    "📖 <b>HOW TO PLAY — PART 1</b>\n\n" +
    "<b>1. Open the Mini App</b>\n" +
    "Tap <b>Play Trap War</b> (message button) or send /play.\n\n" +
    "<b>2. Start a run</b>\n" +
    "Hit <b>New Run</b>. You start with cash in Compton. You have 30 days.\n\n" +
    "<b>3. Bottom dock (6 buttons)</b>\n" +
    "• <b>Travel</b> — move city (walk costs a day)\n" +
    "• <b>Buy</b> — cop product into your bag\n" +
    "• <b>Sell</b> — cash out in this city\n" +
    "• <b>Stash</b> — planted product + retrieve\n" +
    "• <b>Phone</b> — Market, Clients, Messages\n" +
    "• <b>Inventory</b> — bag, gear, cash\n\n" +
    "<b>4. Core loop</b>\n" +
    "Get Info → Buy Low → Travel → Sell High → Plant → Rank Up\n\n" +
    "<b>5. Actions</b>\n" +
    "You get <b>3 actions per day</b>. Buy, sell, plant, travel count.\n" +
    "4th action ends the day — prices shift, heat moves, yield hits."
  );
}

/** Part 2 of full guide */
export function howToPlayPart2(): string {
  return (
    "📖 <b>HOW TO PLAY — PART 2</b>\n\n" +
    "<b>6. Product</b>\n" +
    "Weed · Cocaine · Molly · Crystal\n" +
    "Gear: Stick, Chopper, Whip, Plug\n" +
    "Prices change by city. Phone → Market for % moves.\n\n" +
    "<b>7. Plant / Stash</b>\n" +
    "Buy first (Hold above 0), set qty, hit Plant.\n" +
    "Product leaves bag → protected stash on that block.\n" +
    "Stash = yield + raid shield. Retrieve from Stash button.\n\n" +
    "<b>8. Cities and clients</b>\n" +
    "Unlock cities via Client jobs (Phone → Clients):\n" +
    "Ms. Pearl · Uncle Ray · The Dispatcher\n\n" +
    "<b>9. Risk</b>\n" +
    "Heat rises with hot product. Robberies and raids can hit.\n" +
    "Stick + stash shield help.\n\n" +
    "<b>10. Tabs</b>\n" +
    "• HUSTLE — main game\n" +
    "• CREW — invites · Everybody Eats\n" +
    "• VAULT — locked reserves · NFT · pay-to-earn\n\n" +
    "<b>Goal</b>\n" +
    "Survive 30 days. Climb Corner Boy → Trap God.\n" +
    "<b>Run the city.</b>\n\n" +
    "Coming soon → /soon"
  );
}

/** Full guide as plain parts (no parse mode) — ultimate fallback */
export function howToPlayPlainParts(): string[] {
  return [
    "HOW TO PLAY — PART 1\n\n" +
      "1. Open Mini App: Play Trap War button or /play\n" +
      "2. New Run — start in Compton, 30 days\n" +
      "3. Dock: Travel | Buy | Sell | Stash | Phone | Inventory\n" +
      "4. Loop: Buy Low → Travel → Sell High → Plant\n" +
      "5. 3 actions/day — 4th ends the day",
    "HOW TO PLAY — PART 2\n\n" +
      "6. Products: Weed, Cocaine, Molly, Crystal + gear\n" +
      "7. Plant: buy first, then Plant → stash (yield + shield)\n" +
      "8. Clients unlock cities (Phone → Clients)\n" +
      "9. Watch Heat — robberies/raids\n" +
      "10. Tabs: HUSTLE | CREW | VAULT\n\n" +
      "Goal: Trap God in 30 days. /soon for roadmap.",
  ];
}

export function comingSoonText(): string {
  return (
    "🚀 <b>COMING SOON</b>\n\n" +
    "<b>Week 2 — Money on-chain</b>\n" +
    "• TON Connect wallet\n" +
    "• Real Pay-to-Earn ($10+ TON / USDT)\n" +
    "• 1.5× yield + longer raid shield\n" +
    "• Referral payouts on-chain\n\n" +
    "<b>Founder NFT</b>\n" +
    "• One-tap mint (gas sponsored)\n" +
    "• Dynamic PFP — evolves with rank\n\n" +
    "<b>Channel and culture</b>\n" +
    "• Official Word on the Street channel\n" +
    "• Community chat — talk with other hustlers\n" +
    "• Drops, leaderboards, NFT rush\n\n" +
    "<b>Season 2+</b>\n" +
    "• Base + Aerodrome real LP\n" +
    "• More cities, events, crew wars\n\n" +
    "<b>Live now</b>\n" +
    "Full 30-day hustle · stash · clients · invites\n\n" +
    "Play → /play\n" +
    "Rules → /guide\n" +
    "Invite → /invite"
  );
}

export function helpMenuText(): string {
  return (
    "❓ <b>TRAP WAR — MENU</b>\n\n" +
    "<b>Commands</b>\n" +
    "/start — Welcome + Play\n" +
    "/play — Open Mini App\n" +
    "/guide — How to play\n" +
    "/soon — Coming soon / roadmap\n" +
    "/invite — Your invite link\n" +
    "/crew — Crew stats + invite\n" +
    "/stats — Total users & online now\n" +
    "/channel — Official channel (news)\n" +
    "/community — Player chat / hangout\n" +
    "/chat — Same as /community\n" +
    "/adminbots — 2–3 admin bot stack status\n" +
    "/vault — Protected reserves\n" +
    "/help — This menu\n\n" +
    "<b>Quick tips</b>\n" +
    "• 3 actions/day\n" +
    "• Prices differ by city — travel to flip\n" +
    "• Plant stash for yield + shield\n" +
    "• Share /invite — Everybody Eats\n" +
    "• Invites only count via your personal invite link\n\n" +
    "Full guide → /guide · Roadmap → /soon"
  );
}

export function howToPlayShort(): string {
  return (
    "📖 <b>QUICK GUIDE</b>\n\n" +
    "1. <b>Play Trap War</b> → New Run\n" +
    "2. <b>Buy</b> product when cheap\n" +
    "3. <b>Travel</b> to a better price city\n" +
    "4. <b>Sell</b> high\n" +
    "5. <b>Plant</b> stash for yield + shield\n" +
    "6. Use <b>Phone</b> for Market + Clients\n" +
    "7. 3 actions/day · 30 days total\n" +
    "8. <b>CREW</b> tab → share invite\n" +
    "9. <b>VAULT</b> = 8% locked forever\n\n" +
    "Rank: Corner Boy → Trap God\n\n" +
    "Full rules → /guide\n" +
    "Coming soon → /soon"
  );
}
