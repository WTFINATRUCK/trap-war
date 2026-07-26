# Trap War — live bot + Mini App (no laptop)

## Final live URLs

| What | URL |
|------|-----|
| **Game (works now)** | **https://www.trap-war.com** |
| Game (backup) | https://trap-war-telegram.vercel.app |
| Apex trap-war.com | Fix Cloudflare CNAME first (SSL errors until then) |
| Bot webhook | https://trap-war-telegram.vercel.app/api/telegram |
| Bot chat | https://t.me/TrapWarAppBot |

## What runs where

| Piece | Host | Laptop needed? |
|-------|------|----------------|
| Mini App | Vercel | **No** |
| Bot | Vercel webhook `/api/telegram` | **No** (after webhook set) |

## Menu button vs commands

Telegram only allows **one** menu-button type:

| Control | Behavior |
|---------|----------|
| **Menu button** (bottom-left) | **Play Trap War** → opens Mini App |
| **Type `/`** in chat | Clean command list |

## Commands (type `/`)

- `/start` — Welcome + Play button  
- `/play` — Open Mini App  
- `/guide` — How to play  
- `/help` — All commands  
- `/invite` — Your invite link  
- `/crew` — Crew list  
- `/stats` — Players online  
- `/channel` — News channel  
- `/community` — Community chat  
- `/vault` — Vault info  
- `/soon` — Roadmap  

## BotFather (confirm)

1. @BotFather → your bot  
2. **Menu Button** → URL: `https://www.trap-war.com`  
3. Optional **Domain**: `www.trap-war.com` and `trap-war-telegram.vercel.app`  
4. Commands are set by the bot API automatically  

## Env vars (Vercel Production)

| Name | Value |
|------|--------|
| `BOT_TOKEN` | from BotFather |
| `WEBAPP_URL` | `https://www.trap-war.com` |
| `VITE_WEBAPP_URL` | `https://www.trap-war.com` |
| `VITE_BOT_USERNAME` | `TrapWarAppBot` |
| `WEBHOOK_URL` | `https://trap-war-telegram.vercel.app` |
| `WEBHOOK_SECRET` | long random string |
| `SETUP_SECRET` | same as WEBHOOK_SECRET (or separate) |
| `BOT_USERNAME` | `TrapWarAppBot` |

## Register webhook (once after deploy)

```
https://trap-war-telegram.vercel.app/api/setup-webhook?key=YOUR_SETUP_SECRET
```

Should return `{ "ok": true, "webhook": ".../api/telegram" }`.

## Local bot (dev only)

```bash
# Uses polling; deletes webhook first
npm run bot
```

Do **not** leave local polling running if webhook is active (conflicts).
