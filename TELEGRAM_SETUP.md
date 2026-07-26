# Trap War — Telegram Channel + Mini App Setup

You need three pieces:

1. **Bot** (entry point + Mini App button)  
2. **Channel** (announcements / Word on the Street) + **Community group** (player chat) — see `COMMUNITY_SETUP.md`  

3. **Hosted Mini App** (HTTPS URL of this game)

Telegram cannot open `http://localhost` as a Mini App for real users. Deploy first (or use a tunnel for testing).

---

## Step 1 — Create the bot (@BotFather)

1. Open Telegram → search **@BotFather**
2. Send `/newbot`
3. Name: `Trap War` (display name)
4. Username: e.g. `TrapWarBot` (must end in `bot`)
5. Copy the **HTTP API token**
6. Optional branding:
   - `/setdescription` → short pitch
   - `/setabouttext` → about
   - `/setuserpic` → logo

### Enable Mini App on the bot

Still in @BotFather:

```
/mybots → select Trap War → Bot Settings → Menu Button
→ Configure menu button → Edit menu button URL
→ paste your HTTPS Mini App URL (WEBAPP_URL)
```

Or after `.env` is set:

```bash
npm run bot:setup
```

That sets the **Play** menu button + command list via API.

---

## Step 2 — Create the channel

1. Telegram → New Channel  
2. Name: **Trap War** (or Trap War Official)  
3. **Public** channel → set link: `t.me/YourChannelName`  
4. Description: *30-day street hustle. Everybody Eats. Word on the Street.*  
5. Add **your bot as Admin** (post messages optional; required if you use join-gate):
   - Channel → Administrators → Add Admin → @YourBot  
   - Permissions: at least “Invite users” / read members if using `REQUIRE_CHANNEL`

Copy:

- `CHANNEL_URL` = `https://t.me/YourChannelName`
- Optional `CHANNEL_ID`: forward a channel post to @userinfobot or use a bot that shows chat id (`-100…`)

---

## Step 3 — Deploy the Mini App (HTTPS)

### Option A — Vercel (recommended)

```bash
cd trap-war-telegram
npm i -g vercel
vercel
# set production domain → that is WEBAPP_URL
```

### Option B — Cloudflare Pages / Netlify

Build command: `npm run build`  
Output: `dist`

### Option C — Local test tunnel (dev only)

```bash
npx cloudflared tunnel --url http://localhost:5173
# use the https://….trycloudflare.com URL as WEBAPP_URL temporarily
```

---

## Step 4 — Configure `.env`

```bash
copy .env.example .env
```

Edit `.env`:

```env
BOT_TOKEN=paste_from_botfather
BOT_USERNAME=TrapWarBot
WEBAPP_URL=https://your-deploy.vercel.app
CHANNEL_URL=https://t.me/YourChannelName

VITE_BOT_USERNAME=TrapWarBot
VITE_CHANNEL_URL=https://t.me/YourChannelName
VITE_WEBAPP_URL=https://your-deploy.vercel.app
```

Rebuild after changing `VITE_*` vars:

```bash
npm run build
# redeploy
```

---

## Step 5 — Run the bot

```bash
npm run bot
```

Keep this process running (or host on Railway / Render / a VPS).

Then open Telegram:

`https://t.me/YourBotUsername` → **Start** → **Play Trap War**

---

## In-game access paths

| Path | What users do |
|------|----------------|
| Bot menu **Play** | Opens Mini App full screen |
| `/start` | Welcome + Play + Join Channel |
| `/play` | Mini App button |
| `/channel` | Official channel link |
| In-app **Join Channel** strip | Opens `VITE_CHANNEL_URL` |
| Crew links | `t.me/Bot?start=ref_TRAP-XXXX` |

---

## Optional — require channel join before play

```env
CHANNEL_ID=-100xxxxxxxxxx
REQUIRE_CHANNEL=true
```

Bot must be **admin** on the channel. Users who aren’t members get “Join channel” first.

---

## Checklist

- [ ] Bot created in @BotFather  
- [ ] Mini App URL set (menu button HTTPS)  
- [ ] Channel public link live  
- [ ] Bot is channel admin (if gating)  
- [ ] Mini App deployed HTTPS  
- [ ] `.env` filled  
- [ ] `npm run bot` running  
- [ ] Test `/start` → Play opens game  
- [ ] Test channel button opens channel  

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| “Web app URL invalid” | Must be `https://`, not localhost |
| Blank Mini App | Open HTTPS deploy; check browser console; use `?tg=12345` only for local Vite |
| Menu button missing | `npm run bot:setup` or BotFather Menu Button |
| Bot doesn’t reply | `BOT_TOKEN` wrong or bot process not running |
| Join check always fails | Wrong `CHANNEL_ID` or bot not admin |

---

## Quick commands

```bash
npm run dev          # local UI (browser: ?tg=12345)
npm run build        # production Mini App
npm run bot          # Telegram bot
npm run bot:setup    # set menu button + commands
```
