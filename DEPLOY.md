# Deploy Trap War (Vercel + domain + BotFather)

## Correct GitHub repo

| | |
|--|--|
| **Repo** | **https://github.com/WTFINATRUCK/trap-war** |
| **Name on GitHub** | `trap-war` (Trap War — not “Track Wars”) |
| **Local folder** | `C:\Users\rjfle\trap-war-telegram` |

If Vercel shows something else, link **this** repository only.

---

## What runs without your laptop

| Piece | Hosted where? | Laptop needed? |
|--------|----------------|----------------|
| **Game (Mini App)** | Vercel (HTTPS) | **No** after deploy |
| **Telegram bot** | Needs a host (Railway / Render / Fly) | **Yes** if bot only runs on your PC |

The **game website** can live fully on Vercel.  
The **bot** (`npm run bot`) is a separate process — if it’s only on your laptop, `/start` and the Play button stop when the laptop is off.  
Use a free always-on host for the bot after the Mini App is live (see bottom).

---

## 1) Deploy the game on Vercel (dashboard)

You said you’re already logged into Vercel and connected GitHub.

1. Open **https://vercel.com/dashboard**
2. **Add New… → Project**
3. Import **`WTFINATRUCK/trap-war`**
4. Settings (leave defaults if already filled):
   - **Framework:** Vite  
   - **Build Command:** `npm run build`  
   - **Output Directory:** `dist`  
   - **Root Directory:** `.` (repo root)
5. **Environment Variables** (Production) — add:

| Name | Value |
|------|--------|
| `VITE_BOT_USERNAME` | `TrapWarAppBot` |
| `VITE_WEBAPP_URL` | `https://YOUR-PROJECT.vercel.app` (update after first deploy, then again after custom domain) |
| `VITE_CHANNEL_URL` | your channel link, e.g. `https://t.me/TrapWarOfficial` |
| `VITE_COMMUNITY_URL` | your chat link (or leave empty) |

6. Click **Deploy**
7. Wait until status is **Ready**
8. Open the deployment → copy the URL  
   Example shape: **`https://trap-war-xxxx.vercel.app`**

That is your **live Vercel URL**. Bookmark it. Test in a normal browser first, then Telegram.

### Redeploy after code changes

Push to `main` on GitHub → Vercel rebuilds automatically if the project is linked.

---

## 2) Connect TrappyWar.com

1. Vercel project → **Settings → Domains**
2. Add: **`trappywar.com`** and **`www.trappywar.com`**
3. Vercel shows DNS records. At your domain registrar (where you bought TrappyWar.com), set:

**Option A — recommended (if Vercel shows these):**

| Type | Name | Value |
|------|------|--------|
| **A** | `@` | `76.76.21.21` |
| **CNAME** | `www` | `cname.vercel-dns.com` |

(Use exactly what Vercel displays if it differs.)

4. Wait 5–60 minutes for DNS
5. Vercel domain status becomes **Valid**
6. Live game: **https://trappywar.com**

Then update Vercel env:

- `VITE_WEBAPP_URL` = `https://trappywar.com`  
- Redeploy once (Deployments → … → Redeploy)

*(TrappyWork.com is optional — same steps if you want a second domain.)*

---

## 3) BotFather — point Mini App at the live URL

1. Open Telegram → **@BotFather**
2. `/mybots` → **@TrapWarAppBot** (your bot)
3. **Bot Settings → Menu Button**  
   - Configure menu button → **Edit menu button URL**  
   - Set to: **`https://trappywar.com`**  
     (or `https://YOUR-PROJECT.vercel.app` until domain works)
4. **Bot Settings → Domain** (if present)  
   - Add `trappywar.com` (and vercel.app host if asked)
5. Optional: create a command button with the same HTTPS URL

On your **server** where the bot runs (not only laptop), set in `.env`:

```env
WEBAPP_URL=https://trappywar.com
VITE_WEBAPP_URL=https://trappywar.com
BOT_USERNAME=TrapWarAppBot
```

Restart the bot process after changing env.

---

## 4) When does it work without your laptop?

| Action | Laptop off? |
|--------|-------------|
| Open **https://trappywar.com** in browser | ✅ Yes |
| Open Mini App **if** Telegram already has the HTTPS menu URL | ✅ Yes for the **game** |
| Bot replies `/start`, `/play`, invite links | ❌ No — until bot is hosted 24/7 |

**Minimum for “friends can play with laptop closed”:**

1. Mini App on Vercel (or domain) ✅  
2. BotFather menu URL = that HTTPS URL ✅  
3. Bot running on Railway/Render/Fly (or similar) ⚠️ still required for bot commands  

---

## 5) Host the bot 24/7 (short path)

1. Create free project on [Railway](https://railway.app) or [Render](https://render.com)
2. Connect same GitHub repo `WTFINATRUCK/trap-war`
3. Start command: `npm install && npx tsx bot/index.ts`  
   (or `npm run bot`)
4. Set env vars: `BOT_TOKEN`, `WEBAPP_URL=https://trappywar.com`, `BOT_USERNAME=TrapWarAppBot`, etc.
5. Keep service **running** (not sleep-only free tier if possible)

Then **game + bot** both work with your laptop closed.

---

## Quick checklist

- [ ] Vercel project = **trap-war** (WTFINATRUCK/trap-war)
- [ ] Deploy **Ready** → copy `https://….vercel.app`
- [ ] Domain **trappywar.com** → Valid on Vercel
- [ ] BotFather Menu Button URL = `https://trappywar.com`
- [ ] `.env` WEBAPP_URL same HTTPS URL
- [ ] Bot process on a cloud host (not only laptop)
