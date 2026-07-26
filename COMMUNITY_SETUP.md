# Trap War — Telegram community (player chat)

Bots **cannot** create a public group or channel for you. You create them in Telegram once (~3 min), then wire the links into Trap War. The app + bot already know how to open them.

## What you need

| Asset | Purpose | Example link |
|--------|---------|----------------|
| **Channel** | Announcements, drops, Word on the Street (one-way) | `https://t.me/TrapWarOfficial` |
| **Community group** | Players talk, trade tips, flex ranks (chat) | `https://t.me/TrapWarChat` or `https://t.me/+Invite…` |

Recommended public usernames (if free):

- Channel: `@TrapWarOfficial`
- Chat: `@TrapWarChat` or `@TrapWarCommunity`

## 1. Create the community group

**On phone (Telegram):**

1. Menu → **New Group**
2. Name: **Trap War Community** (or **Trap War Chat**)
3. Add at least one friend/yourself; create
4. Open group → **Edit** → **Group Type** → **Public**
5. Set link: `t.me/TrapWarChat` (or any free name)
6. **Permissions**: allow members to send messages
7. **Administrators** → **Add Admin** → search **@TrapWarAppBot** → add with at least:
   - Invite users
   - Delete messages (optional mod)
   - Pin messages (optional)

**Optional but best:** link chat to your channel

1. Open **channel** → Manage → **Discussion**
2. Pick **Trap War Community** as the discussion group  
   Channel posts get a comments thread; community lives under the brand.

## 2. Create the channel (if you don’t have one)

1. **New Channel** → name **Trap War** / **Trap War Official**
2. Public link: `t.me/TrapWarOfficial`
3. Add **@TrapWarAppBot** as admin (post messages optional)
4. Pin a welcome post (template below)

## 3. Wire links into Trap War

From the project folder:

```powershell
cd C:\Users\rjfle\trap-war-telegram

# Community chat (required for player chat buttons)
.\scripts\set-community.ps1 -CommunityUrl "https://t.me/YOUR_GROUP_LINK"

# Or set both at once:
.\scripts\set-community.ps1 `
  -CommunityUrl "https://t.me/TrapWarChat" `
  -ChannelUrl "https://t.me/TrapWarOfficial"
```

Restart the bot:

```powershell
npm run bot
```

Rebuild Mini App so in-game buttons use the real link:

```powershell
$env:GITHUB_PAGES = "true"
$env:VITE_BOT_USERNAME = "TrapWarAppBot"
$env:VITE_CHANNEL_URL = "https://t.me/TrapWarOfficial"   # your real channel
$env:VITE_COMMUNITY_URL = "https://t.me/TrapWarChat"     # your real chat
$env:VITE_WEBAPP_URL = "https://wtfinatruck.github.io/trap-war/"
npm run build
# deploy dist → gh-pages as usual
```

## 4. What players see after setup

| Place | Action |
|--------|--------|
| Bot | `/community` or `/chat` → Join chat button |
| Bot | `/channel` → Join channel |
| Bot start keyboard | 💬 Community + 📢 Channel |
| Mini App banner | Join chat + channel |
| CREW tab | Join Community Chat |
| Trap Phone → Gang | Community link |

## 5. Pin this in your channel

Copy-paste as a channel post, then **Pin**:

```
🔥 TRAP WAR — OFFICIAL LINKS

🎮 Play: https://t.me/TrapWarAppBot
💬 Community chat (talk with players): https://t.me/YOUR_CHAT
📢 This channel: announcements & drops

Rules: no scams, no real-world crime talk, keep it street-fiction.
Everybody Eats — share /invite from the bot.
```

## 6. Bot commands for community

- `/community` — join player chat  
- `/chat` — same as community  
- `/channel` — announcements channel  
- `/start` — keyboard includes both when URLs are set  

## Multi-bot admins (2–3 active bots)

A busy chat needs more than one bot. Trap War supports a **3-bot admin stack**:

| # | Role | Suggested @username | Env vars | npm script |
|---|------|---------------------|----------|------------|
| 1 | **Play / Game** | `@TrapWarAppBot` | `BOT_TOKEN`, `BOT_USERNAME` | `npm run bot` |
| 2 | **Community / Welcome** | `@TrapWarChatBot` | `COMMUNITY_BOT_TOKEN`, `COMMUNITY_BOT_USERNAME` | `npm run bot:community` |
| 3 | **Guard / Mod** | `@TrapWarGuardBot` | `GUARD_BOT_TOKEN`, `GUARD_BOT_USERNAME` | `npm run bot:guard` |

**Run all at once:**

```powershell
npm run bot:all
```

### Create bots in @BotFather

For bots **2** and **3** (you already have #1):

1. Open [@BotFather](https://t.me/BotFather) → `/newbot`
2. Name: `Trap War Chat` → username e.g. `TrapWarChatBot`
3. Copy the **token** into `.env` as `COMMUNITY_BOT_TOKEN=...`
4. Repeat for Guard: `TrapWarGuardBot` → `GUARD_BOT_TOKEN=...`
5. Optional: `/setprivacy` → **Disable** for Community + Guard so they can see group messages (needed for spam filter)

### Promote all 3 as admins

In **community group** and **channel** → Administrators → Add:

| Bot | Rights |
|-----|--------|
| Play bot | Invite, Pin, Post (channel) |
| Community bot | Delete, Pin, Invite |
| Guard bot | Delete, Ban, Restrict, Invite |

Your human account stays **owner**. `ADMIN_IDS` in `.env` is for human super-admins (e.g. `/purge` on Guard).

### What each bot does

- **Play → “Stacks”** — Mini App, invites, `/play`, `/community` links  
- **Community → “Kayla”** — greets joins, `/rules`, `/links`, human chat voice  
- **Guard → “Big Lou”** — scam filter, join-flood watch, `/purge` (owner)

### Human look (names + profile pics)

Bots can’t use a normal human @username (Telegram forces `…bot`), but they can look human in chat:

| Persona | Display name | Avatar | Job |
|---------|--------------|--------|-----|
| Main | **Stacks** | `assets/bots/stacks.jpg` | Play |
| Community | **Kayla** | `assets/bots/kayla.jpg` | Chat host |
| Guard | **Big Lou** | `assets/bots/bigl.jpg` | Security |

After tokens are in `.env`:

```powershell
npm run bot:personas
```

That sets display name, bio, short bio, and profile photo via Bot API.

Manual fallback (BotFather):

1. `/setname` → Stacks / Kayla / Big Lou  
2. `/setuserpic` → send the matching JPG from `assets/bots/`  
3. `/setabouttext` → paste bio from `bot/personas.ts`  
4. `/setdescription` → short bio  

They’ll still show a tiny “bot” badge — that’s Telegram. Name + face + street voice is what sells it.

### Status command

In any chat with the bots: `/adminbots` (Community or Guard) shows which tokens are configured.

## Checklist

- [ ] Public channel created + link in `CHANNEL_URL` / `VITE_CHANNEL_URL`
- [ ] Public (or invite) group created + link in `COMMUNITY_URL` / `VITE_COMMUNITY_URL`
- [ ] Play bot admin in channel + chat
- [ ] Community bot created + `COMMUNITY_BOT_TOKEN` + admin
- [ ] Guard bot created + `GUARD_BOT_TOKEN` + admin
- [ ] Privacy mode disabled for Community + Guard (BotFather)
- [ ] Discussion linked (channel → group) optional
- [ ] `npm run bot:all` running
- [ ] Mini App rebuilt + deployed
- [ ] Channel pin with both links
