# Trap War

**Gamified street hustle that teaches DeFi** — 30-day city run as a Telegram Mini App (TON first; Base/Aerodrome later).

Players buy low, travel, sell high, plant stashes, dodge raids, and rank up from Corner Boy to Trap God. Under the hood: APY, reserves, IL-style heat, and “Everybody Eats” referrals.

## Live codebase

This repo is the **Telegram Mini App** (Vite + React + TypeScript) + **Telegraf bot**.

```bash
npm install
npm run dev
# open http://localhost:5173/?tg=12345
```

### Deploy (Vercel + domain — no laptop for the game)

Step-by-step: **[DEPLOY.md](./DEPLOY.md)**

- Correct repo: **https://github.com/WTFINATRUCK/trap-war**
- Mini App → Vercel + optional **trappywar.com**
- Bot still needs a 24/7 host (Railway/Render) — not only your PC

### Telegram channel + Mini App access

Full checklist: **[TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md)**

1. Create bot in **@BotFather** → copy `BOT_TOKEN`  
2. Create public **channel** → `CHANNEL_URL`  
3. Deploy Mini App to **HTTPS** (Vercel) → `WEBAPP_URL`  
4. Copy `.env.example` → `.env` and fill values  
5. `npm run bot:setup` then `npm run bot` (or host bot in the cloud)  
6. Open `t.me/YourBot` → **Play Trap War**

## Features shipped

- Full 30-day game engine (actions, cities, clients, ranks, robbery/raids)
- Premium mobile UI: West Coast hero, 6-button dock, Trap Phone, inventory overlay
- Street market products (Weed, Cocaine, Molly, Crystal) + gear
- Protected vault (8% auto-lock), pay-to-earn sim, Founder NFT showcase
- Everybody Eats referral drip + completion bonus
- Telegraf bot stub (`npm run bot`)

## Product direction

| Phase | Focus |
|-------|--------|
| Now | Telegram Mini App + bot |
| Week 2 | TON Connect, real deposits, Founder NFT mint |
| Later | Base / Aerodrome real LP |

## Design notes

- UI: dark premium street game, purple accents, cinematic sunset hero
- Specs: `POLSIA-DESIGN-SPEC.md`

## Contact

@wtfinatruck on X
