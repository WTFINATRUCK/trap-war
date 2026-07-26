/** In-Telegram copy: how to play + what's coming soon */

export const WELCOME =
  "🎮 *TRAP WAR*\n\n" +
  "30-day street hustle across the city.\n" +
  "Buy low · Travel · Sell high · Plant stashes · Rank up.\n\n" +
  "🔒 *8%* of every win auto-locks to your vault.\n" +
  "🤝 *Everybody Eats* — share invites, earn on crew hustle.\n\n" +
  "Tap *Play Trap War* to open the game.\n" +
  "Need the rules? → /guide\n" +
  "What's next? → /soon";

export function howToPlayText(): string {
  return (
    "📖 *HOW TO PLAY — IN GAME*\n\n" +
    "*1. Open the Mini App*\n" +
    "Tap *Play Trap War* or the *Play* menu button.\n\n" +
    "*2. Start a run*\n" +
    "Hit *New Run*. You start with cash in *Compton*. You have *30 days*.\n\n" +
    "*3. Bottom dock (6 buttons)*\n" +
    "• *Travel* — move to another city (walk costs a day)\n" +
    "• *Buy* — cop product into your bag\n" +
    "• *Sell* — cash out product in this city\n" +
    "• *Stash* — see planted product + retrieve\n" +
    "• *Phone* — Market, Clients, Messages, News\n" +
    "• *Inventory* — bag, gear, cash stack\n\n" +
    "*4. Core loop*\n" +
    "`Get Info → Buy Low → Travel → Sell High → Plant → Rank Up`\n\n" +
    "*5. Actions*\n" +
    "You get *3 actions per day*. Buy, sell, plant, travel, etc. count.\n" +
    "4th action ends the day — prices shift, heat moves, yield hits.\n\n" +
    "*6. Product*\n" +
    "Weed · Cocaine · Molly · Crystal (+ gear: Stick, Chopper, Whip, Plug)\n" +
    "Prices change by *city*. Check *Phone → Market* for % moves.\n\n" +
    "*7. Plant / Stash*\n" +
    "Buy product first (Hold must be above 0), set qty, hit *Plant*.\n" +
    "Product leaves your bag → protected *stash* on that block.\n" +
    "Stash earns yield + raid shield. Retrieve later from *Stash*.\n\n" +
    "*8. Cities & clients*\n" +
    "Unlock blocks by completing *Client* jobs (Phone → Clients).\n" +
    "Ms. Pearl · Uncle Ray · The Dispatcher.\n\n" +
    "*9. Risk*\n" +
    "*Heat* rises with loud bags / hot product.\n" +
    "Robberies & raids can hit — Stick + stash shield help.\n\n" +
    "*10. Tabs*\n" +
    "• *HUSTLE* — main game\n" +
    "• *CREW* — invite links · Everybody Eats\n" +
    "• *VAULT* — locked reserves · NFT preview · pay-to-earn\n\n" +
    "*Goal*\n" +
    "Build net worth. Survive 30 days. Climb Corner Boy → Trap God.\n" +
    "*Run the city.*\n\n" +
    "Coming soon → /soon"
  );
}

export function comingSoonText(): string {
  return (
    "🚀 *COMING SOON*\n\n" +
    "*Week 2 — Money on-chain*\n" +
    "• TON Connect wallet\n" +
    "• Real *Pay-to-Earn* ($10+ TON / USDT Jetton)\n" +
    "• 1.5× yield + longer raid shield for depositors\n" +
    "• Referral *payouts* settled on-chain\n\n" +
    "*Founder NFT*\n" +
    "• One-tap Founder mint (gas sponsored)\n" +
    "• Dynamic PFP — evolves with rank / vault / run\n" +
    "• Gold chain, Trap War pendant, status flex\n\n" +
    "*Channel & culture*\n" +
    "• Official Word on the Street channel\n" +
    "• Drops, raids, leaderboard moments\n" +
    "• NFT rush announcements\n\n" +
    "*Season 2+ — Deeper DeFi*\n" +
    "• Base + Aerodrome real LP mapping\n" +
    "• Live yields tied to on-chain positions\n" +
    "• More cities, products, events\n" +
    "• Leaderboards & crew wars\n\n" +
    "*Live right now*\n" +
    "Full 30-day hustle · stash · clients · invites · vault sim\n\n" +
    "Play → *Play Trap War*\n" +
    "Rules → /guide\n" +
    "Invite → /invite"
  );
}

export function helpMenuText(): string {
  return (
    "❓ *TRAP WAR — MENU*\n\n" +
    "*Commands*\n" +
    "/start — Welcome + Play\n" +
    "/play — Open Mini App\n" +
    "/guide — How to play (full)\n" +
    "/soon — What's coming next\n" +
    "/invite — Your invite link\n" +
    "/crew — Crew stats + invite\n" +
    "/channel — Official channel\n" +
    "/vault — Protected reserves\n" +
    "/help — This menu\n\n" +
    "*Quick tips*\n" +
    "• 3 actions/day — don't waste 'em\n" +
    "• Prices differ by city — travel to flip\n" +
    "• Plant stash for yield + shield\n" +
    "• Share /invite — Everybody Eats\n\n" +
    "Full guide → /guide · Roadmap → /soon"
  );
}

/** Shorter guide for callback (Telegram message limit safety) */
export function howToPlayShort(): string {
  return (
    "📖 *QUICK GUIDE*\n\n" +
    "1. *Play Trap War* → New Run\n" +
    "2. *Buy* product when cheap\n" +
    "3. *Travel* to a better price city\n" +
    "4. *Sell* high\n" +
    "5. *Plant* stash for yield + shield\n" +
    "6. Use *Phone* for Market + Clients\n" +
    "7. 3 actions/day · 30 days total\n" +
    "8. *CREW* tab → share invite\n" +
    "9. *VAULT* = 8% locked forever\n\n" +
    "Rank: Corner Boy → Trap God\n\n" +
    "Full rules → /guide\n" +
    "Coming soon → /soon"
  );
}
