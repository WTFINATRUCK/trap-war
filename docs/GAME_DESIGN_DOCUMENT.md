# Trap Wars Current Game Design Document

Status: M1 implementation extraction
Source revision: `trap-war` at `6b3592b7275e691eb2bcc4cc288af390db6c0b6d`
Extraction date: 2026-08-11

## 1. Purpose

This document describes what the current `trap-war` code actually does before proposing V2 changes. It is a behavioral baseline, not a claim that every behavior is intentional or balanced.

Classification labels:

- **IMPLEMENTED**: reachable working logic exists in the primary prototype.
- **PARTIALLY IMPLEMENTED**: some state or behavior exists, but it is incomplete, contradictory, UI-only, or not authoritative.
- **DESIGNED BUT NOT IMPLEMENTED**: represented in copy, constants, props, or preview UI without a complete working system.
- **LEGACY**: found in `trap-wars` or an older save format, not current direction.
- **V2 CANDIDATE**: worth carrying forward conceptually after explicit redesign and tests.

## 2. Product premise

The implemented game is a mobile 30-day street-market trading run. The player buys products, travels among six Los Angeles areas, sells into city price differences, plants product in city stashes, earns simulated yield, survives raids and robberies, completes client requirements, and climbs ranks. Financial concepts are first expressed through street language and later connected to ideas such as reserves, yield, volatility, liquidity, and diversification.

Current distribution is a Telegram Mini App. Current play is explicitly marked as free, simulated, and not real money.

Classification: **IMPLEMENTED**, **V2 CANDIDATE**.

## 3. Core run loop

1. Start on day 1 in Compton with cash, protected reserves, three actions, and randomized local prices.
2. Buy product or gear using one action.
3. Sell product using one action and auto-lock part of gross inflow in protected reserves.
4. Plant or retrieve product using one action.
5. Travel on foot to end the day or use limited transport hops to move without advancing the day.
6. On day advance, refresh prices, accrue yield, resolve robbery, resolve police raid, and roll an encounter.
7. Complete client requirements to unlock cities and gifts.
8. Increase total value, diversity, and planted-city coverage to rank up.
9. Reach terminal day 30 or end the run early; final value becomes the run score.

Classification: **IMPLEMENTED**, **V2 CANDIDATE**.

## 4. Initial state and all run fields

### 4.1 Initial values

| Field | Initial value | Classification |
| --- | ---: | --- |
| Day | 1 | **IMPLEMENTED** |
| Location | Compton | **IMPLEMENTED** |
| Cash | `$500` | **IMPLEMENTED** |
| Protected reserves | `$40` | **IMPLEMENTED** |
| Actions | 3 | **IMPLEMENTED** |
| Bag/coat capacity | 100 units | **IMPLEMENTED** |
| Global stash capacity | 100 units | **IMPLEMENTED** |
| Rank | Corner Boy | **IMPLEMENTED** |
| Unlocked cities | Compton, Inglewood | **IMPLEMENTED** |
| Stick count | 0, maximum 3 | **IMPLEMENTED** |
| Chopper/Whip | Not owned | **IMPLEMENTED** |
| Fight-backs used | 0, maximum 2 | **IMPLEMENTED** |
| Pay-to-earn simulation | Off | **IMPLEMENTED** as simulation only |

### 4.2 Persisted per-run state

The full `GameState` is persisted:

- Time and place: `day`, `location`, `actionsLeft`, `gameOver`.
- Economy: `cash`, `protectedReserves`, `inventory`, `plantedStashes`, `prices`, `priceHaircuts`, `coatSpace`, `finalScore`, `rank`.
- Gear: `stickCount`, `hasChopper`, `chopperHopsLeft`, `hasWhip`, `whipHopsLeft`.
- Access: `unlockedCities`, `longBeachSneakUsed`.
- Clients: Pearl, Ray, and Dispatcher progress plus `dispatcherGiftClaimed`.
- Boosts and temporary effects: `payToEarnBoost`, `extendedShieldPending`, `plugIntel`, `tempPriceBoost`.
- Risk: `fightBacksUsed`, `nextDayActionPenalty`, `pendingFightBack`.
- Yield/completion statistics: `totalYieldAccrued`, `grossYieldLastDay`, `totalProtectedAtCompletion`.
- Presentation flags: `encounterLog`, `firstSkimShown`, `firstPlantShown`.

Classification: **IMPLEMENTED**, but client-controlled and therefore not authoritative.

## 5. Time, actions, and run completion

### 5.1 Actions

- Each normal day begins with 3 actions.
- Buying, selling, planting, retrieving, gifting, Chopper travel, and Whip travel consume one action.
- When a buy, sell, plant, retrieve, or gift consumes the third action, the day advances automatically.
- Chopper and Whip travel can reduce actions to zero without automatically advancing the day.
- Walking advances the day and does not require an available action.
- A failed fight-back can impose one lost action on the following day.
- A player with zero actions cannot use Chopper or Whip, despite one warning message suggesting transport as an option. Walking remains available.

Classification: **IMPLEMENTED**, **V2 CANDIDATE** with consistency fixes.

### 5.2 Thirty-day structure

- `MAX_DAYS` is 30.
- The run begins at day 1.
- Advancing from day 29 enters day 30, runs the daily resolution pipeline, and immediately ends the game.
- The player therefore receives normal action phases on days 1 through 29; day 30 is a terminal resolution state, not another three-action day.
- Calling advance while already on day 30 also ends the game.

Classification: **IMPLEMENTED**. The day-30 semantics need an explicit V2 product decision.

### 5.3 End conditions

- There is no bankruptcy, debt, health, arrest, or death game-over condition.
- Zero cash does not end the run.
- The run ends automatically at day 30 or manually through `End run early`.
- Early ending uses the same valuation function and sets `gameOver`.
- Only a terminal state at day 30 increments `runsCompleted`.
- `bestRunScore` can be updated by either a full completion or an early ending.

Classification: automatic and early end are **IMPLEMENTED**; death/failure is **DESIGNED BUT NOT IMPLEMENTED** for V2 consideration.

## 6. Cities and travel

### 6.1 City differences

| City | Cheap bias (`-15%`) | Expensive bias (`+15%`) | Access rule |
| --- | --- | --- | --- |
| Compton | Molly, The Stick | Weed | Starting city |
| Inglewood | The Plug, Weed | Molly | Initially unlocked |
| Long Beach | Coke, The Whip | Meth | Ms. Pearl unlock; one pre-unlock sneak allowed |
| South Central | Meth, The Chopper | Coke | Uncle Ray unlock |
| Watts | The Stick, Molly | The Whip | Uncle Ray unlock |
| East LA | Weed, Coke | The Plug | Dispatcher unlock |

City differences are price biases only. There are no implemented city-specific NPC schedules, geometry, local reputation, enforcement profiles, demand depth, inventory limits, or narrative state.

Classification: price differences are **IMPLEMENTED**; rich city identity is **DESIGNED BUT NOT IMPLEMENTED**, **V2 CANDIDATE**.

### 6.2 Adjacency

| Origin | Adjacent cities |
| --- | --- |
| Compton | Inglewood, Watts |
| Inglewood | Compton, Long Beach |
| Long Beach | Inglewood, South Central |
| South Central | Long Beach, Watts, East LA |
| Watts | Compton, South Central, East LA |
| East LA | South Central, Watts |

Adjacency restricts Chopper travel only. Walking and Whip travel can reach any allowed city.

### 6.3 Travel modes

| Mode | Day cost | Action cost | Reach | Uses |
| --- | --- | --- | --- | --- |
| Walk | Advances one day | No explicit action requirement | Any allowed city | Unlimited |
| Chopper | No day advance | 1 action | Adjacent allowed city | 5 hops per purchase/gift |
| Whip | No day advance | 1 action | Any allowed city | 3 hops per purchase/gift |

Each successful travel mode produces one destination price reroll. Chopper and Whip reroll immediately; walking changes location and receives its reroll through day advancement.

The Long Beach sneak sets `longBeachSneakUsed` and displays a warning that prices and raid risk are worse. No price or raid modifier is actually applied. Only one sneak is allowed before Ms. Pearl completion.

Classification: travel is **IMPLEMENTED**; the sneak penalty is **PARTIALLY IMPLEMENTED**.

## 7. Products and gear

### 7.1 Current balance table

| Asset | Category | Base random range | Daily yield | Stored volatility | Available | Gameplay role |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Weed | Core | `$40-$79` | `0.25%` | `0.05` | Day 1 | Low-risk, slow-yield product |
| Coke | Core | `$120-$219` | `0.50%` | `0.25` | Day 1 | Balanced product |
| Molly | Core | `$80-$199` | `1.00%` | `0.60` | Day 1 | Volatile, higher-risk product |
| Meth | Core | `$200-$449` | `1.75%` | `0.90` | Day 5 | Highest-yield, highest-risk product |
| The Stick | Weapon | `$350-$499` | 0 | `0.15` | Day 1 | Reduces risk; enables fight-back; max 3 |
| The Chopper | Transport | `$800-$1,199` | 0 | `0.10` | Day 3 | 5 same-day adjacent hops |
| The Whip | Transport | `$1,500-$2,199` | 0 | `0.12` | Day 5 | 3 same-day cross-city hops |
| The Plug | Utility | `$250-$399` | 0 | `0.08` | Day 5 | Consumed to generate sell-location intel |

The upper bounds are exclusive because price generation uses `Math.floor(random * (max-min) + min)`.

The stored `volatility` values are not used by price generation, raids, robbery, encounters, or any other engine calculation. Risk differences are hard-coded separately for Molly and Meth.

Classification: assets, ranges, availability, and gear are **IMPLEMENTED**; the volatility model is **PARTIALLY IMPLEMENTED**, **V2 CANDIDATE**.

### 7.2 Inventory capacity

- Bag capacity is 100 units.
- Core products and The Plug count toward bag capacity.
- The Stick is stored in `stickCount` and does not consume bag capacity.
- Chopper and Whip are booleans with hop counters and do not consume bag capacity.
- Only one Chopper and one Whip can be owned.
- Buying an unavailable asset, exceeding cash, exceeding capacity, or exceeding Stick maximum is blocked without consuming an action.

Classification: **IMPLEMENTED**, **V2 CANDIDATE**.

## 8. Pricing and trading

### 8.1 Price generation

For each asset whenever prices are generated:

```text
raw = floor(random * (maxPrice - minPrice) + minPrice)
if city marks asset cheap: raw = floor(raw * 0.85)
if city marks asset expensive: raw = floor(raw * 1.15)
```

Every asset is rerolled independently. No prior price, supply, demand, volume, player action, or stored volatility affects the next roll.

Classification: **IMPLEMENTED**, but not deterministic or market-like; **V2 CANDIDATE** only as a baseline scenario generator.

### 8.2 Buy price

- Buying uses the raw `state.prices[asset]`.
- Buy price does not apply raid haircuts, quick-flip boosts, or rank bonuses.
- There is no spread, fee, slippage, depth, or partial fill.
- Successful buying reduces cash and consumes one action.

Classification: **IMPLEMENTED**, **V2 CANDIDATE** with a deeper market model.

### 8.3 Sell price precedence

For core products, sell price is resolved in this order:

1. Active raid haircut: `max(5, floor(base * (1 - haircutPercent)))`.
2. Otherwise active quick-flip boost: `floor(base * multiplier)`; current multiplier is `1.3`.
3. Otherwise Hustler Coke bonus: `floor(base * 1.1)`.
4. Otherwise base price.

Because the checks return early, an active haircut suppresses both a quick-flip boost and rank sell bonus; a quick-flip boost suppresses the rank bonus.

The Stick, Chopper, and Whip sell at raw state price and bypass `getSellPrice`. The Plug is stored in inventory and uses the normal inventory sell path.

Classification: **IMPLEMENTED**, with precedence requiring intentional V2 tests.

### 8.4 Cash inflow and protected skim

Most gross inflows use:

```text
skim = floor(gross * rankSkimRate)
cash += gross - skim
protectedReserves += skim
```

Skim rates:

- Default, Corner Boy, Runner, Hustler, and Trap Lord: `8%`.
- Kingpin: `7%`.
- Trap God: `6%`.

The system starts with `$40` already protected. Protected reserves cannot be spent or withdrawn during a run but do count toward final value.

Classification: **IMPLEMENTED** as simulated accounting, **V2 CANDIDATE**. It is not an onchain vault.

### 8.5 The Plug intel

- Using The Plug normally consumes one unit and stores an asset/city recommendation in `plugIntel`.
- The engine generates a fresh random price sheet for every city, scans those temporary rolls, and reports the highest core-product price found.
- Those temporary prices are not persisted and do not necessarily match prices the player will receive after traveling.
- The access check also permits use when the player owns a Chopper but holds no Plug; in that case nothing is consumed.
- Intel does not expire by day in its stored state, though a later use replaces it.

Classification: **PARTIALLY IMPLEMENTED**, **V2 CANDIDATE** as a source-based rumor or market-intelligence system rather than a guaranteed forecast.

## 9. Stashes

- Only core products can be planted.
- Planting costs `$0` and requires at least one whole unit.
- Global stash capacity is 100 units across every city and product.
- Each city can hold multiple product piles; planting the same product stacks into its existing pile.
- Planting moves units from bag to current-city stash and consumes one action.
- A newly created pile receives a 3-day shield, or a 5-day shield when the simulated pay-to-earn extended shield is pending.
- Adding to an existing pile does not refresh its shield.
- Shield counters decrement before daily raid resolution.
- Any shield on the current city's stashes reduces robbery and raid chances; a raid that still triggers while a shield remains is fully blocked.
- Stashed units earn a `1.25x` yield multiplier.
- Retrieval moves product back into the bag and consumes one action.
- The engine allows retrieval from a specified city without checking that the player is currently in that city. The current UI can therefore support remote retrieval.
- `MIN_PLANT_VALUE` exists as zero and is not used.

Classification: **IMPLEMENTED**, **V2 CANDIDATE**. Remote retrieval and shield semantics require explicit V2 decisions.

## 10. Yield

At each day advance:

```text
yieldMultiplier = 1 + rankYieldBonus + (payToEarnBoost ? 0.5 : 0)

bagGross += sellPrice(asset) * units * dailyYield * yieldMultiplier
stashGross += sellPrice(asset) * units * dailyYield * yieldMultiplier * 1.25

grossYield = floor(bagGross + stashGross)
```

- Runner adds `5%` to the multiplier.
- Trap Lord adds `10%`.
- The simulated pay-to-earn boost adds `50%`.
- Yield is based on current sell price, including active haircuts/boosts/rank behavior.
- Gross yield is passed through the protected-reserve skim.
- `totalYieldAccrued` tracks gross yield, while `grossYieldLastDay` supports UI/referral side effects.

Classification: **IMPLEMENTED** simulation, **V2 CANDIDATE**. No real APY, deposit, token, or settlement exists.

## 11. Daily resolution order

When a day advances, the engine performs this exact order:

1. Increment day and restore actions, less fight-back penalty.
2. Reroll local prices.
3. Decrement/expire temporary price boost.
4. Decay raid haircuts by multiplying remaining percentage by `0.67`, or remove them on expiry.
5. Decrement all stash shields.
6. Accrue yield.
7. Resolve robbery.
8. Resolve police raid.
9. Roll random encounter.
10. Recompute rank.
11. Record gross yield for the day.
12. End the run if day 30 has been reached.

Classification: **IMPLEMENTED**. This order is a required characterization-test baseline.

## 12. Robberies and fight-back

### 12.1 Robbery chance

```text
chance = 12%
+ min(20%, floor-independent MollyUnits / 10 * 4%)
+ min(24%, MethUnits / 10 * 6%)
- 12% if holding at least one Stick
- 15% if current city has an active stash shield
+ 8% if cash >= $20,000
clamp to 5%-45%
```

Only bag inventory affects Molly/Meth risk. A triggered robbery has an additional `15%` chance to be narrated as deterred when a Stick is held.

### 12.2 Loss branches

- `55%`: remove `1%-3%` of cumulative yield from the `totalYieldAccrued` statistic; add `65%` of that amount to protected reserves and narrate the remainder as ecosystem value. Previously credited cash is not removed.
- Next `30%`: lose `8%-15%` of cash, with `40%` of the computed loss first taken from protected reserves when available and the remainder from cash.
- Final `15%`: lose 3-7 units of Molly or Meth from the bag if either is held.

The yield-loss branch can increase protected reserves while only reducing a statistic, which can inflate current total value. This is likely accidental and must not be silently preserved as a new economy rule.

### 12.3 Fight-back

- Offered only when there is a recorded loss, the player has a Stick, and fewer than 2 fight-backs have been used.
- Accepting always adds a one-action penalty to the next day.
- Success chance is `60%`.
- Success converts the recorded loss amount plus a `10%-25%` bonus into gross cash inflow through the normal protected skim, even when the original loss was product units.
- Failure with more than one Stick consumes one Stick.
- Failure with exactly one Stick removes it and may cause an extra 10% cash loss or up to 3 more product units.

Classification: robbery and fight-back are **IMPLEMENTED**, **V2 CANDIDATE** after unit and accounting corrections.

## 13. Police raids

### 13.1 Raid chance

```text
chance = 8%
+ min(25%, MollyUnits / 10 * 5%)
+ min(32%, MethUnits / 10 * 8%)
- 20% if current city has an active shield
- 8% if holding a Stick
cap at 15% when bag contains only Weed/Coke
clamp to 3%-50%
```

Only bag units increase chance. Product held in any stash can still be selected as the raid's target asset.

### 13.2 Raid result

- An active current-city shield fully blocks a raid that passes the chance roll.
- Target weighting is Weed `1`, Coke `2`, Molly `3`, Meth `4` among held bag or stashed product types.
- Weed haircut: `2%-5%` for 1 day.
- Coke haircut: `8%-15%` for 2 days.
- Molly haircut: `20%-35%` for 3 days.
- Meth haircut: `25%-40%` for 3 days plus confiscation of `10%-20%` of bag Meth, minimum 1.
- Haircuts are global per asset, not local to the raided city.
- No non-Meth stash or bag units are confiscated.

Classification: **IMPLEMENTED**, **V2 CANDIDATE** with clearer locality and enforcement rules.

## 14. Random encounters and Word on the Street

A random encounter is attempted after robbery and raid. It triggers `35%` of day advances. Conditional weights then select:

| Weight | Current effect | Classification |
| ---: | --- | --- |
| 35 | Generic message that prices may shift tomorrow; no prediction state | **PARTIALLY IMPLEMENTED** |
| 25 | Random core product gets `+30%` sell price for the current day | **IMPLEMENTED** |
| 15 | Add 2-4 random core units if bag capacity permits | **IMPLEMENTED** |
| 10 | Warning that someone is watching; no mechanical follow-up | **PARTIALLY IMPLEMENTED** |
| 5 | Add `$50-$149` gross through normal reserve skim | **IMPLEMENTED** simulation |
| 10 | No effect | **IMPLEMENTED** quiet result |

`RANDOM_ENCOUNTERS` also exists as a constant table, but the engine duplicates its own encounter list rather than consuming that constant.

`Word on the Street` also appears as onboarding messages, first-skim education, first-stash education, Trap Phone content, Street Wire activity, Telegram channel copy, and synthetic city pulse. It is not one normalized rumor system with provenance, expiry, confidence, or market consequence.

Classification: **PARTIALLY IMPLEMENTED**, strong **V2 CANDIDATE**.

## 15. Clients and access progression

| Client | Declared unlock | Actual requirement | Reward | Implementation notes |
| --- | ---: | --- | --- | --- |
| Ms. Pearl | Day 1 | Plant at least 40 Weed in Compton | Unlock Long Beach | Progress tracks highest observed pile; gifting Weed can add 70% of units as progress |
| Uncle Ray | Day 5 | Plant at least 15 Coke and 10 Molly in Inglewood | Unlock South Central and Watts; gift one Stick | Declared day gate is not enforced |
| Dispatcher | Day 12 | Sell at least 20 Meth in Watts | Unlock East LA; choose Chopper or Whip | Declared day gate is not enforced; gift is a separate UI choice |

Client completion mutates progress, unlocks, and gifts. The completion helper returns success messages, but plant/sell/gift callers discard those returned messages. Unlocks work while some completion feedback can be missing.

`giftToClient` exists and converts 70% of gifted units into order progress, 20% of marked value into reserves, and narrates 10% as ecosystem value. It is not wired into the current game UI. The 1% referral TVL drip helper is also not called.

The Trap Phone exposes an unused `onAcceptClient` prop; there is no accept/decline contract or active quest journal.

Classification: core client gates are **IMPLEMENTED**; day gating, gifting workflow, and acceptance are **PARTIALLY IMPLEMENTED** or **DESIGNED BUT NOT IMPLEMENTED**; overall system is a **V2 CANDIDATE**.

## 16. Ranks

Rank eligibility uses a hidden rank score:

```text
rankScore = currentTotalValue
          + coreAssetDiversity * 2,000
          + stashCityCredits * 3,000
```

Each city with any stash gives 1 credit. The current city gives 0.5 credit when the player holds a core product there but has no stash. Eligibility also checks actual diversity and the number of keys in `plantedStashes`.

| Rank | Threshold | Diversity | Planted cities | Benefit |
| --- | ---: | ---: | ---: | --- |
| Corner Boy | 0 | 0 | 0 | Base rules |
| Runner | 3,000 | 2 | 1 | +5% yield multiplier |
| Hustler | 10,000 | 3 | 2 | +10% Coke sell price when no haircut/boost overrides it |
| Kingpin | 30,000 | 4 | 3 | Reserve skim drops to 7% |
| Trap Lord | 80,000 | 4 | 4 | +10% yield multiplier |
| Trap God | 175,000 | 4 | 6 | Reserve skim drops to 6% |

Ranks can only move upward in practice under normal play, but the computation itself returns the highest currently eligible rank and can demote if state value/diversity falls.

Classification: **IMPLEMENTED**, **V2 CANDIDATE**.

## 17. Scoring and progression

### 17.1 Final score

```text
finalScore = floor(
  cash
  + protectedReserves
  + current sell value of inventory
  + current sell value of all stashes
)
```

- Final score does not include rank diversity or stash-city bonuses.
- Stick count, Chopper ownership, Whip ownership, and unused transport hops are omitted from final value because they are not stored in `inventory`.
- The Plug is included because it is stored in inventory.
- Active haircut, quick-flip, or rank pricing can affect terminal valuation.
- No leaderboard submission is implemented in the primary game.

Classification: **IMPLEMENTED**, with omitted gear value and terminal price timing requiring V2 decisions.

### 17.2 Career statistics

- Full 30-day runs completed.
- Best final score across full and early endings.
- Last run score is held in App component memory for the current session.
- Invite count, referral pending/total earnings, and invited IDs.
- Current run's cumulative yield and protected reserve at completion.

There is no persistent XP, knowledge score, character level, property/lifestyle progression, skill tree, achievement ledger, or authoritative reputation.

Classification: career counters are **IMPLEMENTED** but client-controlled; broader progression is **DESIGNED BUT NOT IMPLEMENTED**, **V2 CANDIDATE**.

### 17.3 Heat and reputation

There is no `reputation` state or mechanic. The HUD derives a display-only heat percentage from day progress, bag units, Meth units, and Molly units. It does not directly feed raid or robbery formulas.

Classification: reputation is **DESIGNED BUT NOT IMPLEMENTED**; heat display is **PARTIALLY IMPLEMENTED**.

## 18. Crew and referrals

### 18.1 Attribution

- Referral codes are `TRAP-{telegramId}`.
- Production attribution is intended to originate from Telegram `/start` deep links.
- Bot-side storage prevents self-referral and reassignment and records invite metadata.
- Client-side referral data mirrors attribution and counts in localStorage.
- An active referral is displayed when a locally visible referred save has at least `$50` protected reserves.

### 18.2 Reward calculations

- Daily referral drip: `0.3%` of a referred player's gross daily yield.
- Completion bonus: `5%` of the referred player's protected reserves at game over, including early end.
- Gift TVL drip helper: `1%` of a passed TVL amount, but it is unused.
- Amounts update the referrer's local `pendingDrip` and `totalEarnings`.
- There is no authoritative claim, payout, anti-replay ledger, or real asset transfer.
- The completion handler can be invoked whenever a terminal state is processed; it is not protected by a server idempotency key.

Classification: referral attribution is **PARTIALLY IMPLEMENTED**; reward calculation is an **IMPLEMENTED client simulation** and a **V2 CANDIDATE** only after legal/economic review and server authority.

## 19. Vault and pay-to-earn

### 19.1 Protected Vault

- Starts at `$40`.
- Receives the rank-dependent skim from sales, yield, some encounter bonuses, and successful fight-back recovery.
- Can lose value in the cash-robbery branch.
- Cannot be spent, withdrawn, or transferred.
- Counts toward final score.
- Vault UI explicitly labels it in-game only and not real money.

Classification: **IMPLEMENTED** simulation, **V2 CANDIDATE** as a savings/risk teaching mechanic. Onchain vault: **DESIGNED BUT NOT IMPLEMENTED**.

### 19.2 Simulated pay-to-earn

- A reachable button enables the boost with no deposit or wallet.
- Boost adds `+0.5` to the yield multiplier, producing the displayed `1.5x` base yield.
- It grants a pending 5-day shield for the next new stash pile instead of the normal 3 days.
- The Vault panel separately states wallet connect and real deposits are not live.

Classification: **IMPLEMENTED** simulation; real pay-to-earn is **DESIGNED BUT NOT IMPLEMENTED** and is not approved for the vertical-slice foundation.

### 19.3 Founder NFT

The Vault panel renders a visual preview and a derived `Yield Power` meter based on rank, vault size, and day. There is no mint, ownership, metadata, contract, or persistence of the preview state as an asset.

Classification: **DESIGNED BUT NOT IMPLEMENTED**, deferred.

## 20. Trap Phone

| App/view | Current behavior | Classification |
| --- | --- | --- |
| Messages/chat | Named contacts with static or latest matching street message | **PARTIALLY IMPLEMENTED** |
| Market | Displays current sell price and percent versus range midpoint | **IMPLEMENTED** read-only |
| Clients | Displays requirements, rewards, and completion | **IMPLEMENTED** read-only |
| Travel | Opens the main travel sheet | **IMPLEMENTED** |
| News | Static cards | **DESIGNED BUT NOT IMPLEMENTED** |
| Contacts | Static contact list | **PARTIALLY IMPLEMENTED** |
| Upgrades | Static/promotional copy, some of which describes unimplemented capacity progression | **DESIGNED BUT NOT IMPLEMENTED** |
| Gang | Referral/community/channel links | **PARTIALLY IMPLEMENTED** |
| Settings | Static product text; audio mute lives on the HUD | **DESIGNED BUT NOT IMPLEMENTED** |

The Trap Phone is a strong diegetic interface pattern for V2, but it needs data contracts, rumor provenance, quest state, contact progression, and accessibility behavior.

Classification: overall **PARTIALLY IMPLEMENTED**, strong **V2 CANDIDATE**.

## 21. Cloud save and persistent player data

### 21.1 Load precedence

1. Telegram CloudStorage `game_v1` when valid Telegram initialization data and CloudStorage are available.
2. Browser localStorage `trapwar_cloud_{telegramId}`.
3. New version-1 save.

Cloud operations fall back after 1.5 seconds. The selected save is mirrored locally. There is no timestamp conflict resolution between local and Telegram copies; Telegram wins when successfully read.

### 21.2 Career save fields

- Version, Telegram ID, username, first name.
- Referral code, referrer, invite count, invited IDs.
- Full current game state or null.
- Full runs completed and best run score.
- Queued referral drip.
- Optional wallet address.
- Last update timestamp.

Reset preserves referral identity/count and career run statistics while clearing current game progress.

Classification: **IMPLEMENTED**, but not authoritative. Save migration is a **V2 CANDIDATE** only for importing non-economic profile/history data.

## 22. Legacy mechanics from `trap-wars`

These are not current mechanics:

- `$50,000` starting cash and six differently priced products.
- Wallet-address-keyed saves and wallet-gated entry.
- Rank thresholds based on auto-staked amounts with `1.1x-2.0x` sell multipliers.
- Ten percent forced staking on rank milestones.
- SOL/TRAP market multiplier from Jupiter and DexScreener.
- `0.5%` wallet referral rewards after a `$100` stake threshold.
- Solana token transfers, swaps, vault, leaderboard, and zone programs.
- Zone capture and onchain rank/score concepts.

Classification: **LEGACY**. Individual ideas may re-enter discovery, but no values or code are V2 defaults.

## 23. Consolidated classification matrix

| Mechanic | Current classification | V2 disposition |
| --- | --- | --- |
| Starting cash/reserves | **IMPLEMENTED** | Characterization baseline |
| Three-action day | **IMPLEMENTED** | Retain concept; normalize edge cases |
| 30-day run | **IMPLEMENTED** | Retain; decide whether day 30 is playable |
| Six cities and price bias | **IMPLEMENTED** | Expand one city deeply before all six |
| Travel and transport | **IMPLEMENTED** | Retain with physical traversal and server validation |
| Bag/stash capacity | **IMPLEMENTED** | Retain concept; decide remote retrieval |
| Products/gear | **IMPLEMENTED** | Content and balance review required |
| Volatility | **PARTIALLY IMPLEMENTED** | Build explicit market state model |
| Random events | **IMPLEMENTED/PARTIAL** | Convert to deterministic event cards/scenarios |
| Raids/robberies | **IMPLEMENTED** | Retain risk lesson; correct accounting and locality |
| Yield | **IMPLEMENTED** simulation | Retain teaching loop; no real yield claims |
| Clients | **IMPLEMENTED/PARTIAL** | Retain as narrative tutorial layer |
| Ranks | **IMPLEMENTED** | Retain concept; separate status from wallet value |
| Reputation | **DESIGNED BUT NOT IMPLEMENTED** | Add only with clear inputs and uses |
| Scoring/completion | **IMPLEMENTED** | Make authoritative and versioned |
| Crew/referrals | **PARTIALLY IMPLEMENTED** | Server attribution first; rewards deferred |
| Vault | **IMPLEMENTED** simulation | Retain savings mechanic; contracts deferred |
| Trap Phone | **PARTIALLY IMPLEMENTED** | Core diegetic interface |
| Word on the Street | **PARTIALLY IMPLEMENTED** | Core rumor/learning system |
| Cloud save | **IMPLEMENTED** client save | Replace with server source of truth |
| Wallet/NFT/token/contracts | **DESIGNED/LEGACY** | Base onboarding only in Stage 1 |

## 24. Major current design gaps

- No authoritative economy, deterministic replay, anti-cheat, or balance test suite.
- No formal market liquidity, slippage, supply, demand, order depth, or player impact.
- No persistent reputation, knowledge, character, property, or lifestyle progression.
- No failure state beyond time expiration or manual ending.
- No explicit tutorial state machine or measured learning outcomes.
- No normalized rumor system connecting source, confidence, expiry, and consequence.
- No clear separation between NPC, synthetic city pulse, and real-player economic events.
- No quest acceptance, dialogue state, or client relationship model.
- No accessibility specification, age/content policy, or platform compliance strategy.
- No economy telemetry or funnel measurement.
- No backend-owned referral, reward, leaderboard, or completion ledger.

## 25. Proposed V2 changes, clearly separated from current facts

1. Preserve the 30-day strategy identity, but make the vertical slice one authored day with a complete emotional arc.
2. Make rumors actionable but uncertain: source, confidence, expiry, affected market, and observed outcome.
3. Represent liquidity and volatility through player experience before revealing formal terms.
4. Move all meaningful economic commands to a deterministic, versioned server engine using integer/fixed-point values and injected seeded randomness.
5. Replace client saves with server-owned profiles, run snapshots, command logs, and replayable economy events.
6. Add reputation, access, knowledge, and lifestyle only when each has observable inputs, consequences, and telemetry.
7. Separate simulated game wealth from any future onchain identity or assets.
8. Make Base onboarding optional, low-friction, and post-value; use testnet only during the slice.
9. Keep the Trap Phone as a diegetic hub for rumors, contacts, market context, objectives, and education.
10. Treat all current balance values as test fixtures, not sacred final balance.

## 26. Required M5 characterization scenarios

At minimum, the extraction test suite must capture:

- Exact initial state and legacy save migration.
- City price bias at controlled random samples.
- Buy/sell capacity, action consumption, and forced day end.
- Reserve skim at 8%, 7%, and 6% with floor rounding.
- Rank eligibility across value, diversity, and planted-city boundaries.
- Stash stacking, capacity, shield creation/decay, and remote retrieval behavior.
- Pearl, Ray, and Dispatcher completion and city unlocks.
- Walk, Chopper, and Whip gates and hop depletion.
- Bag and stash yield at every yield-bonus rank and simulated boost.
- Every robbery and fight-back branch.
- Every raid target/haircut/confiscation branch.
- Every random encounter branch.
- Day-29 to day-30 completion and early ending.
- Final score treatment of inventory, stashes, and omitted gear.
- Referral drip and completion calculations as legacy simulation fixtures.

## 27. M5 approved rule clarifications

The following decisions supersede earlier open wording for the V2 ruleset while leaving legacy evidence intact:

1. Day 30 is a playable day. Completion follows final-day settlement after the last action or deliberate `EndDay`; day 31 does not exist.
2. A physical stash belongs to its location. Withdrawal requires the player to return unless a future version adds an explicit logistics mechanic.
3. Gear contributes depreciated property value to net worth in a separate category; it is not liquid cash or carried product.
4. Plug information is imperfect, expiring, deterministic for replay, and never a guaranteed future price.
5. Client availability is evaluated by generic authored rules and exposes structured unmet requirements.
6. A standard raid is local: it may affect carried product and the active location's eligible stash, not remote stashes.
7. An active run with zero actions always exposes a valid `EndDay` path and may also be ended early.
8. Robbery resolution cannot create wealth. Every loss and recovery must identify a typed source and sink.

These rules are implemented in `packages/economy-engine` under `economy-v2.m5.1`. Numeric balance remains subject to simulation review.

## 28. M5.5 difficulty philosophy

Trap Wars should feel risky, strategic, recoverable, imperfectly predictable, information-driven, and asymmetric.

It should not feel arbitrary, mathematically predetermined, dominated by one simple strategy, or constantly punishing regardless of player choice. Events create uncertainty, but over repeated runs player decisions should matter more than pure randomness.

Design implications:

- A poor decision may create a real loss, but a single ordinary mistake should not normally make the remaining run meaningless.
- Safer strategies exchange upside for survival and consistency; risky strategies must offer a credible compensating upside rather than only greater punishment.
- Skilled market reading should outperform random action without becoming a rote range-check exploit.
- Information should provide a measurable edge when filtered intelligently while retaining false signals, expiry, and uncertainty.
- Early success may compound, but early checkpoints must not perfectly determine Day 30 outcomes.
- Client, liquidation, low-risk trading, and future recovery options should preserve agency without guaranteeing recovery.
- Rank, access, property, and wealth may reward different strategic identities; their requirements must be visible and causally understandable.

All numeric bands introduced by M5.5 are labeled `PROPOSED_BALANCE_TARGET` until reviewed. Calibration evidence does not authorize presentation, API, Unity, Base, token, or real-value changes.

## 29. M5.6 strategic diversity decisions

M5.6 adopts the following V2 balance rules under `economy-v2.m5.6`:

1. Core market trades have a 2% buy markup and 2% sell markdown. This creates transaction friction without a separate fee command or UI flow.
2. Ms. Pearl tests capital allocation: progress is the high-water quantity of 30 Weed simultaneously deployed in the Compton stash. Recycled units do not count twice.
3. Uncle Ray tests diversified allocation: deploy 6 Coke and 5 Molly in Inglewood after Pearl. Completion unlocks South Central/Watts and grants a Stick.
4. Dispatcher tests late-run scale and timing: sell 12 Meth in Watts after Ray. Completion unlocks East LA and automatically grants a Whip. The legacy choice between Chopper and Whip is intentionally replaced until an explicit reward-choice command is designed.
5. Plug forecasts model direction, magnitude band, confidence, source quality, source type, reference price, and a one- or two-day horizon. Confidence affects reliability; age weakens it. Forecasts can fail.
6. Robbery and raid exposure responds to city risk, carried value, asset mix, local unshielded stash, and Stick protection. Volatile products create greater loss severity.

City economic identities preserve all names and cultural content:

| City | V2 economic identity |
| --- | --- |
| Compton | Balanced starting market and capital-allocation teaching space |
| Inglewood | Active secondary market, local information premium, and diversification contract |
| Long Beach | Lower-risk logistics market with Coke/Whip advantage |
| South Central | Highest-risk, high-spread Meth/Chopper opportunity market |
| Watts | Client/progression hub with Molly/Stick relevance |
| East LA | Highest information quality and specialized Weed/Coke market |

Gear is strategic property, not passive score inflation: Stick manages event risk, Chopper supports adjacent same-day logistics, Whip supports late-run cross-city mobility, and Plug supports information-led trading.

A persistent `HEAT` state is not yet approved. Current risk inputs are compatible with future Heat, but visibility, decay, player controls, analytics, and event contracts require product review before implementation.

M5.6 evidence meets the Conservative median, Aggressive P90, Opportunist P99, Random stress, and city-visitation targets. It misses the proposed Aggressive downside and Information-Aware relative-median targets. Those remain `PROPOSED_BALANCE_TARGET` review items rather than hidden tuning debt.
