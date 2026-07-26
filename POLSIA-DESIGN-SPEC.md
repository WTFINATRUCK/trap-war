# TRAP WAR — Polsia AI Design & Code Spec

> **Instructions for Polsia:** Replicate this look, feel, layout, copy, and component structure **exactly**. This is a Telegram Mini App — mobile-first, monospace cyberpunk terminal aesthetic. Do NOT use rounded modern SaaS UI, gradients, sans-serif fonts, or card-heavy layouts. The reference implementation lives at `C:\Users\rjfle\trap-war-telegram\`.

---

## 1. VISUAL IDENTITY (LOCKED)

| Token | Value | Usage |
|-------|-------|-------|
| `--main-bg` | `#0a0a0a` | Page background |
| `--container-bg` | `#1a1a1a` | Panels, modals |
| `--border-color` | `#333` | All borders |
| `--text-color` | `#e0e0e0` | Body text |
| `--accent-color` | `#00ffff` | Cyan — titles, stats, primary buttons, glow |
| `--accent-hover` | `#00cccc` | Button hover |
| `--danger-color` | `#ff4136` | Fight-back modals, errors |
| `--warning-color` | `#ff851b` | Sell buttons, rank, alerts |
| `--success-color` | `#2ecc40` | Cash, buy log, plant buttons |

**Font:** `'Courier New', Courier, monospace` — everywhere, no exceptions.

**Aesthetic:** Retro cyberpunk terminal. Dark panels, cyan glow (`text-shadow`, `box-shadow`), dashed section headers, table-based data layout. Feels like a hacked DOS trading terminal inside Telegram.

**Glow rules:**
- `#game-container`: `box-shadow: 0 0 15px var(--accent-color)`
- Start screen / modals: `box-shadow: 0 0 25px var(--accent-color)`
- Header h1: `text-shadow: 0 0 5px var(--accent-color)`
- Loading screen: `text-shadow: 0 0 8px var(--accent-color)`

---

## 2. APP SHELL LAYOUT

```
telegram-shell
└── app (centered, min-height 100vh, padding 1rem)
    └── #game-container (max-width 1200px, border 2px, cyan glow)
        ├── header → h1 "TRAP WAR"
        ├── user-tag → "{name} · Telegram" or "· Dev"
        ├── app-nav → [HUSTLE] [CREW] [VAULT]  (tab bar, cyan underline on active)
        └── tab content
            ├── HUSTLE → TrapWarGame (full game UI below)
            ├── CREW → CrewPanel (side-panel)
            └── VAULT → VaultPanel (side-panel)
```

**Tab bar:** Full-width flex, dark `#222` background, active tab = cyan text + cyan bottom border + glow.

**Loading states (exact copy):**
- `LOADING TRAP WAR…`
- `SYNCING YOUR STASH…`

**No-user state:**
- Title: `TRAP WAR`
- Body: `Open from Telegram, or add ?tg=12345 for local dev.`

---

## 3. GAME SCREEN LAYOUT (HUSTLE TAB)

Top to bottom, always in this order:

```
1. stats-bar (7 stats, flex wrap)
2. gear-line (conditional — Stick/Chopper/Whip)
3. plug-intel banner (conditional)
4. stash-banner (conditional — green tint)
5. payboost-bar OR payboost-active banner
6. main-content (two columns on desktop, stacked on mobile)
   ├── market-inventory (60% width)
   │   ├── panel: Street Market (table)
   │   ├── panel: Your Bag (table)
   │   └── panel: Client Board (list)
   └── actions (40% width, left border)
       ├── panel: Travel (2-col city grid)
       └── panel: Run Actions
7. log-panel: "Word on the Street" (200px scrollable black box)
```

**Mobile (<768px):** `main-content` stacks vertically; `actions` loses left border, gets top border.

---

## 4. STATS BAR (EXACT LABELS)

| Label | Value style | Notes |
|-------|-------------|-------|
| Day: | cyan | `{day} / 30` |
| Acts: | cyan | `●●○` dots (3 max, filled=remaining) |
| Location: | cyan | City name |
| Cash: | green `.stat-value.success` | `$X,XXX` |
| Protected: | cyan | Vault reserves |
| Rank: | orange `.stat-value.warning` | Corner Boy → Trap God |
| Net: | cyan | Total portfolio value |

---

## 5. BUTTON SYSTEM

| Class | Color | Use |
|-------|-------|-----|
| `.action-button` | Cyan bg, black text | Buy, Continue, New Run, Travel |
| `.action-button.sell` | Orange `#ff851b` | Sell, Retrieve stash, End Run, Fight back |
| `.action-button.plant` | Green `#2ecc40` | Plant stash |
| `.action-button.intel` | Blue `#0074d9` | Plug intel |
| `.action-button.small` | Same colors, smaller | Table row actions |
| `.action-button:disabled` | Gray `#555` | Locked cities |
| `.action-button.current` | `#333` bg, cyan text | Current city |
| `.action-button.locked` | `#222` bg, `#555` text | Locked city + 🔒 |
| `.action-button.soft-lock` | `#2a2210` bg, orange text | Sneak-access city |

**Button shape:** `border-radius: 4px`, bold, monospace, no icons except emojis in labels.

---

## 6. STREET MARKET TABLE

**Panel title:** `Street Market`

**Columns:** Product | Price | Hold | Actions

**Each product row:**
```
{emoji} {name}
<div class="asset-tag">{defiLabel}</div>   ← gray 0.75rem subtitle
```

**Actions cell:** `[qty input 60px]` `[Buy]` `[Sell]` `[Plant]` (plant only on core, only if no stash here) `[Intel]` (Plug only)

**Footer:** `Bag: {units}/{coatSpace} — 3 actions/day, 4th ends day`

### Products (EXACT names — do not change)

| Name | Emoji | Subtitle (defiLabel) | Unlock |
|------|-------|---------------------|--------|
| Weed | 🌿 | Mids — slow flip, low heat | Day 1 |
| Coke | ❄️ | Fish scale — steady money | Day 1 |
| Molly | 💊 | Pressies — hot & volatile | Day 1 |
| Meth | 🧪 | Crystal — high risk, high reward | Day 5 |
| The Stick | 🔫 | Strap — insurance on the block | Day 1 |
| The Chopper | 🏍️ | Quick hops — adjacent blocks only | Day 3 |
| The Whip | 🚗 | Cross-town — limited hops per run | Day 5 |
| The Plug | 📱 | Intel — best sell spot today | Day 5 |

---

## 7. YOUR BAG TABLE

**Title:** `Your Bag`  
**Columns:** Product | Qty | Value  
**Empty state:** `Bag empty — cop something.`

---

## 8. CLIENT BOARD

**Title:** `Client Board`

| Client | Progress display | Done style |
|--------|-----------------|------------|
| Ms. Pearl 🪞 | `{n}/40 Weed` | `.client-row.done` green + ✓ |
| Uncle Ray 🔧 | `{n}/15 Coke, {n}/10 Molly` | green + ✓ |
| The Dispatcher 📡 | `{n}/20 Meth @ Watts` | green + ✓ |

---

## 9. TRAVEL PANEL

**Title:** `Travel`  
**Layout:** 2-column grid of city buttons  
**Cities:** Compton, Inglewood, Long Beach, South Central, Watts, East LA  
**Current city:** `• {city}` with `.current` style  
**Locked:** `{city} 🔒`  
**Fast travel row below** (if Chopper/Whip owned): small cyan buttons `Chopper → {city}` / `Whip → {city}`  
**Footer:** `Walk = +1 day`

---

## 10. CONDITIONAL BANNERS

**Gear line:** `Gear: Stick ×{n} Chopper ({hops}) Whip ({hops})`  
**Plug intel:** cyan banner — `Plug intel: sell {product} in {city}`  
**Stash:** green banner `#0d1f0d` — `STASH: {units} {product} — shield {n}d` + Retrieve button  
**Pay-to-earn active:** orange centered — `PAY-TO-EARN ACTIVE — 1.5× yield`  
**Pay-to-earn bar:** full-width button — `Sim Pay-to-Earn (TON week 2)`

---

## 11. MODALS

**Standard modal:** `.modal-overlay` (92% black) → `.modal-box` (cyan glow border)  
**Danger modal:** `.modal-box.danger` (red border + red glow)

| Trigger | Title | Buttons |
|---------|-------|---------|
| Street/event message | `{title}` from message | Continue |
| Robbery fight-back | THEY TESTED YOU | Let it go / Fight back |
| Dispatcher complete | DISPATCHER GIFT | Chopper / Whip |

---

## 12. WORD ON THE STREET LOG

**Title:** `Word on the Street`  
**Container:** 200px height, black bg, scrollable  
**Empty:** `Street log appears here…`

**Log colors:**
- `.log-buy` / success → green
- `.log-event` / warning → orange italic
- `.log-street` → cyan italic
- `.log-info` → `#ccc`

**Opening message:** `30 days on the block. $500 start — the vault eats 8% of every win.`

---

## 13. START & END SCREENS

**New game (no save):**
- Title: `TRAP WAR` (2.5rem, cyan glow)
- Subtitle: `30-day street hustle. Corner Boy → Trap God.`
- Button: `New Run`

**Game over:**
- Title: `RUN COMPLETE`
- Score: large green dollar amount
- `Protected: $X`
- Rank name
- Button: `Play Again`

---

## 14. CREW TAB (Everybody Eats)

**Title:** `Everybody Eats`  
**Subtitle:** `0.3% daily drip on crew yield + 5% bonus at day 30. Payouts queue until week 2.`

**Stat grid (2×2 cards, black bg):**
- Total Crew
- Active (green)
- Earned (gold/orange)
- Pending

**Link box:** monospace, word-break, gray text  
**Button:** `Copy Link` (full width cyan)  
**Footer if referred:** `Referred by crew #{id}`

---

## 15. VAULT TAB

**Section 1 — Protected Vault**
- Big number: locked reserves
- `8% of every win auto-locks here. Your gas stash — untouchable.`
- Last Run Value card (if score > 0)

**Section 2 — Pay-to-Earn**
- Active: `SIM BOOST ACTIVE — 1.5× yield`
- Inactive: `Week 2: deposit $10+ in TON or USDT Jetton for 1.5× yield + extended raid shield.`
- Disabled button: `Connect TON Wallet (week 2)`

**Section 3 — Founder NFT**
- `Claim your 1-of-1 PFP after day 1 — gas sponsored. Week 2.`
- Progress bar (empty for now)

---

## 16. DO NOT CHANGE

- Monospace font (Courier New)
- Cyan `#00ffff` as primary accent
- Table-based market layout (not cards)
- Dark `#0a0a0a` / `#1a1a1a` backgrounds
- Product names: Weed, Coke, Molly, Meth (not DeFi names)
- Tab names: HUSTLE, CREW, VAULT (all caps)
- Street copy tone (see section 17)
- 3-action-day mechanic messaging
- Panel headers with dashed cyan underline

## 17. DO NOT USE

- Inter, Roboto, or system sans-serif
- Purple gradients, glassmorphism, neumorphism
- Rounded pill buttons
- Card grids for the market
- "Liquidity", "LP", "DeFi" in user-facing UI
- Bright white backgrounds
- Stock game UI / candy crush aesthetics

---

## 18. SOURCE FILES (give Polsia these paths)

| File | Purpose |
|------|---------|
| `src/styles/trapwars.css` | **Complete design system — 910 lines** |
| `src/App.tsx` | App shell, tabs, loading states |
| `src/components/TrapWarGame.tsx` | Full game UI layout |
| `src/components/CrewPanel.tsx` | Crew/referral tab |
| `src/components/VaultPanel.tsx` | Vault tab |
| `src/lib/game/constants.ts` | Products, cities, clients, ranks |
| `index.html` | Telegram WebApp script, viewport lock |

**Tech stack:** Vite + React 18 + TypeScript. CSS is plain (no Tailwind in components). `@twa-dev/sdk` for Telegram.

**Dev preview:** `npm run dev` → `http://localhost:5173/?tg=12345`

---

## 19. FULL CSS (copy-paste reference)

The entire stylesheet is in `src/styles/trapwars.css`. Key sections:

- `:root` tokens (lines 1–11)
- `#game-container` + header (248–269)
- `.stats-bar` (271–292)
- `.main-content` flex split (294–309)
- `.panel` + tables (311–342)
- `.action-button` variants (344–375)
- `.app-nav` tabs (614–643)
- Telegram extensions: stash, travel, modals, crew/vault (606–910)

**Import chain:** `src/index.css` → `@import "./styles/trapwars.css"`

---

## 20. REACT COMPONENT SKELETON (TrapWarGame return)

```tsx
<>
  {/* Modals: showModal, pendingFightBack, dispatcherGiftPending */}
  <section className="stats-bar">{/* 7 stats */}</section>
  {/* gear-line, plug-intel, stash-banner, payboost */}
  <main className="main-content">
    <div className="market-inventory">
      <div className="panel"><h2>Street Market</h2><table>...</table></div>
      <div className="panel"><h2>Your Bag</h2><table>...</table></div>
      <div className="panel"><h2>Client Board</h2>...</div>
    </div>
    <div className="actions">
      <div className="panel"><h2>Travel</h2><div className="travel-grid">...</div></div>
      <div className="panel"><h2>Run Actions</h2>...</div>
    </div>
  </main>
  <section className="log-panel panel">
    <h2>Word on the Street</h2>
    <div className="log-messages">...</div>
  </section>
</>
```

---

## 21. POLSIA PROMPT (paste this with the files above)

```
Build Trap War exactly per POLSIA-DESIGN-SPEC.md and the attached source files.

Requirements:
- Telegram Mini App, mobile-first
- Cyberpunk terminal aesthetic: Courier New, cyan #00ffff glow, dark panels
- Three tabs: HUSTLE / CREW / VAULT
- HUSTLE tab: stats bar → banners → Street Market table → Your Bag → Client Board → Travel → Word on the Street log
- Products: Weed, Coke, Molly, Meth + gear (Stick, Chopper, Whip, Plug)
- Use trapwars.css design tokens and class names exactly
- No sans-serif, no card UI, no DeFi jargon in the UI
- Match all copy strings verbatim from the spec

Reference codebase: trap-war-telegram (Vite + React + TypeScript)
```

---

*End of spec. Attach this file + `src/styles/trapwars.css` + `src/components/TrapWarGame.tsx` + `src/App.tsx` to Polsia.*