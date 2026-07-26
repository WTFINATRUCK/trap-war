# Trap War — fully live (no laptop)

## Final URLs (use these)

| What | URL |
|------|-----|
| **Game (recommended)** | **https://www.trap-war.com** |
| Game backup | https://trap-war-telegram.vercel.app |
| Apex https://trap-war.com | Fix Cloudflare `@` CNAME first (SSL error until then) |
| Bot webhook (auto) | https://trap-war-telegram.vercel.app/api/telegram |
| Bot | https://t.me/TrapWarAppBot |

## Independent of laptop?

| Piece | Host | Laptop off? |
|-------|------|-------------|
| Mini App | Vercel | **Yes** |
| Bot replies | Vercel webhook | **Yes** |

Do **not** run `npm run bot` on your laptop while the webhook is set (conflicts).

## Menu button vs commands

| Control | What it does |
|---------|----------------|
| **Menu button** (bottom left) | **Play Trap War** → opens Mini App at WEBAPP_URL |
| **Type `/` in chat** | Clean command list |

### Commands list

- `/start` — Welcome + Play  
- `/play` — Open Mini App  
- `/guide` — How to play  
- `/help` — All commands  
- `/invite` — Invite link  
- `/crew` — Crew stats  
- `/stats` — Online players  
- `/channel` — Channel  
- `/community` — Community  
- `/vault` — Vault  
- `/soon` — Roadmap  

## Menu Button URL (BotFather)

```
https://www.trap-war.com
```

(Already set via API. Confirm in BotFather if needed.)

## Env (Vercel Production — already set)

- `BOT_TOKEN`
- `WEBAPP_URL=https://www.trap-war.com`
- `VITE_WEBAPP_URL=https://www.trap-war.com`
- `WEBHOOK_URL=https://trap-war-telegram.vercel.app`
- `WEBHOOK_SECRET` / `SETUP_SECRET`

## Apex domain fix (optional but recommended)

Cloudflare → trap-war.com → DNS:

| Type | Name | Target | Proxy |
|------|------|--------|--------|
| CNAME | `@` | `1dbe9f448e0e942a.vercel-dns-017.com` | **DNS only** |
| CNAME | `www` | `1dbe9f448e0e942a.vercel-dns-017.com` | **DNS only** |

`www` already works. Fix `@` to clear SSL errors on bare trap-war.com.

## Re-register webhook (if bot stops replying)

```
https://trap-war-telegram.vercel.app/api/setup-webhook?key=YOUR_SETUP_SECRET
```
