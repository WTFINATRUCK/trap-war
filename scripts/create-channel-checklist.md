# Create Trap War official channel (60 seconds)

Telegram **bots cannot create channels** — only your account can. Do this once:

1. Open **Telegram Desktop** (already on your PC).
2. Menu (≡) → **New Channel**.
3. Name: **Trap War**
4. Description: `Official Trap War — street news, drops, Word on the Street. Play: t.me/TrapWarAppBot`
5. **Public Channel** → link: `TrapWarOfficial` (or any free public name)
6. Create → **Add Administrators** → add **@TrapWarAppBot** (post messages).
7. Copy the public link (e.g. `https://t.me/TrapWarOfficial`) and reply with it, **or** run:

```powershell
cd C:\Users\rjfle\trap-war-telegram
.\scripts\set-channel.ps1 -ChannelUrl "https://t.me/YOUR_PUBLIC_NAME"
npx vercel env add VITE_CHANNEL_URL production
# paste same URL
npx vercel env add CHANNEL_URL production
# paste same URL
npm run build
npx vercel --prod --yes
```

Until the channel exists, the site Join button is disabled / points only to a live URL.
