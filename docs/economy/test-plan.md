# Trap Wars V2 Economy Preservation Test Plan

Status: M4 pre-extraction test specification
Date: 2026-08-11
Primary behavior source: `trap-war` at `6b3592b7275e691eb2bcc4cc288af390db6c0b6d`

## 1. Purpose

This plan defines how M5 will reproduce, measure, and intentionally diverge from the current economy without rewriting it during M4. It turns the existing Telegram prototype into executable behavior evidence.

The plan has four goals:

1. Preserve known current behavior in characterization tests.
2. Expose accidental behavior and balance coupling before extraction.
3. Define expected V2 corrections before code changes.
4. Prove deterministic/replayable outcomes for the new server-capable engine.

No test implementation, engine rewrite, package migration, balance change, Unity code, or contract work is authorized by this document.

## 2. Behavior labels

Every scenario involving an identified defect or ambiguity carries both labels:

- **`LEGACY_BEHAVIOR`**: the observed result from the current `trap-war` implementation. Characterization tests lock this evidence even when it is undesirable.
- **`V2_EXPECTED_BEHAVIOR`**: the reviewed intended result for a new ruleset. It is not silently substituted into legacy parity tests.

Test result categories:

- `PARITY_REQUIRED`: new engine must match the legacy fixture for the selected compatibility ruleset.
- `INTENTIONAL_DIVERGENCE`: V2 differs and links to a decision record plus V2 expectation.
- `PRODUCT_DECISION_REQUIRED`: evidence is locked, but the expected V2 rule remains unapproved.
- `LEGACY_ONLY`: historical referral/UI/save behavior is tested for understanding but not ported as authoritative logic.

## 3. Source boundary

Primary executable sources:

- `src/lib/game/constants.ts`
- `src/lib/game/types.ts`
- `src/lib/game/engine.ts`
- `src/lib/game/referralDrip.ts`
- `src/lib/referral.ts`
- `src/components/TrapWarGame.tsx` for UI-owned side effects and reachability
- `src/hooks/useCloudSave.ts` for career/completion persistence effects

Historical `trap-wars` formulas are excluded from parity. They may become separate research scenarios only after explicit approval.

## 4. Test architecture

### 4.1 Characterization harness

M5 should add tests beside the current engine without moving current files. A candidate layout:

```text
tests/
  legacy-economy/
    fixtures/
    helpers/
    initial-state.test.ts
    actions.test.ts
    travel.test.ts
    stash.test.ts
    trading.test.ts
    yield.test.ts
    robbery.test.ts
    raids.test.ts
    clients.test.ts
    ranks.test.ts
    completion.test.ts
    plug.test.ts
    referrals.test.ts
  v2-economy-contract/
    parity/
    expected/
    properties/
    replay/
```

The exact test runner is selected at M5. A TypeScript runner with isolated module execution, fake timers, property testing support, and clean `Math.random` stubbing is preferred.

### 4.2 State fixtures

Create fixture builders rather than giant copied JSON objects:

```ts
stateFixture({
  day: 5,
  location: "Watts",
  cash: 10_000,
  prices: { Weed: 60, Coke: 180, Molly: 120, Meth: 350 },
  inventory: { Meth: 20 }
});
```

Rules:

- Begin with `createInitialState()` unless testing migration or malformed historical state.
- Deep-clone the input because current helpers mutate some nested objects.
- Freeze expected input where practical to detect accidental mutation.
- Compare full state for golden transitions and focused fields for probability branches.
- Normalize only genuinely unstable presentation fields; never normalize money, quantities, day, actions, rank, or event result.

### 4.3 Legacy random tape

The current engine reads `Math.random()` directly. Characterization tests may replace it at the test boundary with a finite ordered tape:

```ts
withRandomTape([0.0, 0.5, 0.99], () => {
  // invoke current engine
});
```

Requirements:

- Restore the original function after every test, including failures.
- Fail when the engine consumes more or fewer draws than expected.
- Run random-tape tests serially or in isolated workers so global stubbing cannot leak.
- Name each draw or capture a draw trace to reveal hidden ordering.
- Use this only to characterize legacy behavior. It is not the V2 random design.

### 4.4 Golden transition record

Each core scenario records:

```text
scenario_id
source_revision
classification
input_state
command/action
random_tape and draw labels
expected_output_state
expected_messages
expected_side_effects
known_behavior_labels
```

Golden files are human-reviewable, stable, and updated only with an intentional decision.

## 5. Version fields under test

Every V2 run and replay fixture eventually includes:

- `economy_version`: executable transition semantics.
- `content_version`: IDs and authored definitions available to the run.
- `balance_version`: numeric ranges, rates, capacities, and weights.
- `random_strategy_version`: PRNG algorithm, derivation, stream, and evidence format.

Legacy fixtures use a synthetic metadata header such as:

```json
{
  "economy_version": "legacy-telegram-engine.1",
  "content_version": "legacy-telegram-content.1",
  "balance_version": "legacy-telegram-balance.1",
  "random_strategy_version": "legacy-math-random-tape.1"
}
```

These fields describe the fixture; they are not injected into the current `GameState` during M4.

## 6. Reference constants and formulas

Tests must assert the baseline rather than importing every expected value from the same constants under test.

### 6.1 Initial values

| Value | Baseline |
| --- | ---: |
| Starting day | 1 |
| Starting location | Compton |
| Starting cash | `$500` |
| Starting protected reserves | `$40` |
| Actions per day | 3 |
| Bag capacity | 100 |
| Global stash capacity | 100 |
| Base stash shield | 3 days |
| Boosted stash shield | 5 days |
| Default reserve skim | 8% |
| Maximum Stick count | 3 |
| Chopper hops | 5 |
| Whip hops | 3 |
| Maximum fight-backs | 2 |

### 6.2 Cash inflow

```text
skim = floor(gross * skim_rate)
cash_after = cash_before + gross - skim
protected_after = protected_before + skim
```

Rates: default `8%`, Kingpin `7%`, Trap God `6%`.

### 6.3 Final score

```text
floor(cash
    + protected reserves
    + current sell value of inventory
    + current sell value of all stash piles)
```

Legacy gear booleans and Stick count are omitted.

### 6.4 Yield

```text
yield_multiplier = 1 + rank_yield_bonus + pay_to_earn_bonus
bag_yield = sell_price * units * daily_yield * yield_multiplier
stash_yield = sell_price * units * daily_yield * yield_multiplier * 1.25
gross_yield = floor(sum bag_yield + sum stash_yield)
```

### 6.5 Rank score

```text
rank_score = current_total_value
           + core_asset_diversity * 2,000
           + stash_city_credits * 3,000
```

Actual diversity and planted-city minimums also apply.

## 7. Required characterization matrix

### 7.1 Initial state and price initialization

| ID | Scenario | Expected legacy assertion | Category |
| --- | --- | --- | --- |
| `INIT-001` | Create state with all-zero random draws | Day 1, Compton, `$500`, `$40`, 3 actions, empty inventory/stashes, Corner Boy, Compton/Inglewood unlocked | `PARITY_REQUIRED` |
| `INIT-002` | Compton all-zero price tape | Weed `46`, Coke `120`, Molly `68`, Meth `200`, Stick `297`, Chopper `800`, Whip `1500`, Plug `250` after city biases | `PARITY_REQUIRED` |
| `INIT-003` | All draws approach 1 | Every price stays below exclusive max before bias and floors after bias | `PARITY_REQUIRED` |
| `INIT-004` | Migrate old asset names | Clean Cash -> Weed, Blue Chips -> Coke, Meme Bags -> Molly, Leverage Plays -> Meth | `PARITY_REQUIRED` |
| `INIT-005` | Migrate old single-pile stash | Produces current city -> asset -> pile shape with defaulted day/shield | `PARITY_REQUIRED` |

### 7.2 Protected reserves and inflows

| ID | Scenario | Expected legacy assertion | Category |
| --- | --- | --- | --- |
| `CASH-001` | Default rank, gross `$100` | `$92` cash increase, `$8` reserve increase | `PARITY_REQUIRED` |
| `CASH-002` | Kingpin, gross `$100` | `$93` cash increase, `$7` reserve increase | `PARITY_REQUIRED` |
| `CASH-003` | Trap God, gross `$100` | `$94` cash increase, `$6` reserve increase | `PARITY_REQUIRED` |
| `CASH-004` | Gross with fractional skim | Skim floors to whole simulated dollar | `PARITY_REQUIRED` |
| `CASH-005` | Buy asset | Cash decreases by full raw price; protected reserves unchanged | `PARITY_REQUIRED` |

Invariants:

- For normal inflow, `(cash_delta + protected_delta) == gross`.
- Skim is never negative or greater than gross for valid rates.
- Protected reserves do not fund purchases.

### 7.3 Action consumption

| ID | Scenario | Expected legacy assertion | Category |
| --- | --- | --- | --- |
| `ACT-001` | First valid buy/sell/plant/retrieve/gift | Actions `3 -> 2` | `PARITY_REQUIRED` |
| `ACT-002` | Second valid normal action | Actions `2 -> 1` | `PARITY_REQUIRED` |
| `ACT-003` | Third valid normal action | Actions `1 -> 0`, then automatic day advance | `PARITY_REQUIRED` |
| `ACT-004` | Invalid amount/funds/capacity/ownership | Action is blocked and count unchanged | `PARITY_REQUIRED` |
| `ACT-005` | Chopper/Whip uses last action | Actions become 0 without automatic day advance | `LEGACY_BEHAVIOR`, `PRODUCT_DECISION_REQUIRED` |
| `ACT-006` | Walk with 0 actions | Walk succeeds and advances day | `LEGACY_BEHAVIOR`, `PRODUCT_DECISION_REQUIRED` |
| `ACT-007` | Fight-back accepted | Next day starts with one fewer action | `PARITY_REQUIRED` |

### 7.4 City gates and travel

| ID | Scenario | Expected legacy assertion | Category |
| --- | --- | --- | --- |
| `TRAVEL-001` | Start access | Compton and Inglewood allowed; current city rejected | `PARITY_REQUIRED` |
| `TRAVEL-002` | First pre-Pearl Long Beach trip | Allowed, sets `longBeachSneakUsed`, warning emitted | `PARITY_REQUIRED` |
| `TRAVEL-003` | Second pre-Pearl Long Beach attempt | Rejected | `PARITY_REQUIRED` |
| `TRAVEL-004` | Sneak penalty | Warning claims price/raid penalty but no modifier applies | `LEGACY_BEHAVIOR`, `V2_EXPECTED_BEHAVIOR` |
| `TRAVEL-005` | Walk to allowed city | Location changes, day advances, destination prices reroll once | `PARITY_REQUIRED` |
| `TRAVEL-006` | Chopper adjacent hop | Same day, one action and one hop consumed, prices rerolled | `PARITY_REQUIRED` |
| `TRAVEL-007` | Chopper non-adjacent | Rejected, no state cost | `PARITY_REQUIRED` |
| `TRAVEL-008` | Whip allowed city | Same day, one action and one hop consumed, any allowed city | `PARITY_REQUIRED` |
| `TRAVEL-009` | Depleted/missing transport | Rejected without action cost | `PARITY_REQUIRED` |
| `TRAVEL-010` | Client unlock gates | Pearl -> Long Beach; Ray -> South Central/Watts; Dispatcher -> East LA | `PARITY_REQUIRED` |

`V2_EXPECTED_BEHAVIOR` for `TRAVEL-004`: either apply a versioned, testable sneak modifier or remove the mechanical claim. Copy and behavior must agree.

### 7.5 Day advancement and terminal day

| ID | Scenario | Expected legacy assertion | Category |
| --- | --- | --- | --- |
| `DAY-001` | Normal advance | Increment day, restore actions, reroll prices, decay effects/shields, yield, robbery, raid, encounter, rank | `PARITY_REQUIRED` |
| `DAY-002` | Fight-back penalty | Next day actions `max(0, 3 - penalty)`, then penalty resets | `PARITY_REQUIRED` |
| `DAY-003` | Price haircut decay | Days decrement; remaining percent multiplies by `0.67`; expiry removes haircut | `PARITY_REQUIRED` |
| `DAY-004` | Temporary boost | Decrements/expires before new day's risk/event resolution | `PARITY_REQUIRED` |
| `DAY-005` | Shield decay | Every pile shield decrements before robbery/raid checks | `PARITY_REQUIRED` |
| `DAY-006` | Day 29 advance | Enters day 30, resolves day pipeline, immediately ends run | `LEGACY_BEHAVIOR`, `V2_EXPECTED_BEHAVIOR` |
| `DAY-007` | Advance while day >= 30 | Ends without another playable action phase | `PARITY_REQUIRED` for legacy fixture |

Proposed `V2_EXPECTED_BEHAVIOR` for `DAY-006`: day 30 is a playable day and completion occurs after its explicit resolution. Final decision requires product approval before M5 divergence implementation.

### 7.6 Stash deposit and withdrawal

| ID | Scenario | Expected legacy assertion | Category |
| --- | --- | --- | --- |
| `STASH-001` | Plant core product | Moves whole units bag -> current city pile, costs `$0`, consumes action | `PARITY_REQUIRED` |
| `STASH-002` | Plant gear | Rejected | `PARITY_REQUIRED` |
| `STASH-003` | First pile | 3-day shield; 5 days with pending simulated boost | `PARITY_REQUIRED` |
| `STASH-004` | Add same product | Units stack; original planted day/shield remain | `PARITY_REQUIRED` |
| `STASH-005` | Add second product in same city | Independent pile under same city | `PARITY_REQUIRED` |
| `STASH-006` | Global capacity 100 | 100 accepted, amount beyond remaining capacity rejected | `PARITY_REQUIRED` |
| `STASH-007` | Retrieve local full/partial | Moves units stash -> bag, consumes action, cleans empty pile/city | `PARITY_REQUIRED` |
| `STASH-008` | Retrieve with insufficient bag capacity | Rejected without mutation | `PARITY_REQUIRED` |
| `STASH-009` | Retrieve from another city | Succeeds without player being present | `LEGACY_BEHAVIOR`, `V2_EXPECTED_BEHAVIOR` |
| `STASH-010` | Multiple piles without asset parameter | Rejected with choose-product message | `PARITY_REQUIRED` |

Proposed `V2_EXPECTED_BEHAVIOR` for `STASH-009`: physical withdrawal requires presence in the stash location unless a separately priced/timed logistics action explicitly authorizes remote movement.

### 7.7 Purchasing and selling

| ID | Scenario | Expected legacy assertion | Category |
| --- | --- | --- | --- |
| `TRADE-001` | Buy core product | Uses raw state price, reduces cash, increases inventory, consumes action | `PARITY_REQUIRED` |
| `TRADE-002` | Buy before availability day | Rejected | `PARITY_REQUIRED` |
| `TRADE-003` | Buy beyond bag capacity | Rejected | `PARITY_REQUIRED` |
| `TRADE-004` | Buy Stick | Increases separate count, max 3, no bag space | `PARITY_REQUIRED` |
| `TRADE-005` | Buy Chopper/Whip | Sets ownership and default hops; duplicate ownership rejected | `PARITY_REQUIRED` |
| `TRADE-006` | Sell core product | Uses sell-price precedence, applies reserve skim, removes units | `PARITY_REQUIRED` |
| `TRADE-007` | Sell Stick/transport | Uses raw state price and reserve skim | `PARITY_REQUIRED` |
| `TRADE-008` | Sell with haircut + boost + Hustler bonus | Haircut wins; otherwise boost wins; otherwise rank bonus | `PARITY_REQUIRED` |
| `TRADE-009` | Sell Meth in Watts | Dispatcher cumulative progress increases by sold quantity | `PARITY_REQUIRED` |
| `TRADE-010` | Sell unavailable/unknown/unheld quantity | Rejected without action cost | `PARITY_REQUIRED` |

Properties for future V2 tests:

- Conservation of units across bag/stash/trade except explicit event loss/gift.
- No negative cash, inventory, or gear count after accepted commands.
- Same command ID applied twice produces one committed result.

### 7.8 Yield

| ID | Scenario | Expected legacy assertion | Category |
| --- | --- | --- | --- |
| `YIELD-001` | No yield-bearing assets | Gross 0, no inflow/message | `PARITY_REQUIRED` |
| `YIELD-002` | Bag-only product | Current sell price * units * asset rate, total floored | `PARITY_REQUIRED` |
| `YIELD-003` | Stash-only product | Same with `1.25x` stash multiplier | `PARITY_REQUIRED` |
| `YIELD-004` | Mixed products/bag/stashes | Sum floats first, floor once at end | `PARITY_REQUIRED` |
| `YIELD-005` | Runner | Add `0.05` to multiplier | `PARITY_REQUIRED` |
| `YIELD-006` | Trap Lord | Add `0.10` to multiplier | `PARITY_REQUIRED` |
| `YIELD-007` | Simulated pay-to-earn | Add `0.50` to multiplier | `LEGACY_ONLY`; real-value interpretation deferred |
| `YIELD-008` | Yield inflow | Gross updates `totalYieldAccrued`; skim updates cash/reserves; gross recorded last day | `PARITY_REQUIRED` |
| `YIELD-009` | Active haircut/boost | `getSellPrice` result feeds yield | `PARITY_REQUIRED` |

Reference fixture candidate: 10 Meth in bag plus 10 Meth stashed at sell price `$400`, Corner Boy, no boost. Bag yield `$70`, stash yield `$87.50`, gross floors to `$157`, skim `$12`, cash receives `$145`.

### 7.9 Robberies and fight-back

Test the chance function at minimum, clamp maximum, every additive/subtractive modifier, and boundaries.

| ID | Scenario | Expected legacy assertion | Category |
| --- | --- | --- | --- |
| `ROB-001` | Base chance | 12%, clamped minimum 5% after protection | `PARITY_REQUIRED` |
| `ROB-002` | Molly/Meth/cash risk | Correct additions and 45% maximum | `PARITY_REQUIRED` |
| `ROB-003` | Stick/shield modifiers | Correct reductions | `PARITY_REQUIRED` |
| `ROB-004` | Trigger + Stick deterrence | 15% secondary chance produces no loss | `PARITY_REQUIRED` |
| `ROB-005` | Yield-loss branch | Reduces cumulative yield statistic, adds 65% to reserves, does not remove prior cash | `LEGACY_BEHAVIOR`, `V2_EXPECTED_BEHAVIOR` |
| `ROB-006` | Cash-loss branch | 8%-15% computed loss split against reserves/cash as current code | `PARITY_REQUIRED` |
| `ROB-007` | Unit-loss branch | Removes 3-7 Molly/Meth bag units when held | `PARITY_REQUIRED` |
| `ROB-008` | Fight-back eligibility | Requires pending loss, Stick, and fewer than 2 uses | `PARITY_REQUIRED` |
| `ROB-009` | Fight-back success | 60%; recorded loss plus 10%-25% bonus converted to cash inflow | `LEGACY_BEHAVIOR`, `V2_EXPECTED_BEHAVIOR` for unit loss conversion |
| `ROB-010` | Fight-back failure | Stick loss/extra damage and next-day action penalty | `PARITY_REQUIRED` |

`V2_EXPECTED_BEHAVIOR`:

- A robbery reduces actual owned value exactly according to a typed loss unit; it cannot increase score by moving a statistic into reserves.
- Recovery preserves units: cash loss recovers cash; inventory loss recovers inventory or an explicitly priced settlement approved by rules.
- Source/sink accounting balances for every branch.

### 7.10 Police raids

| ID | Scenario | Expected legacy assertion | Category |
| --- | --- | --- | --- |
| `RAID-001` | Base and clamp chances | Base 8%, clamp 3%-50% | `PARITY_REQUIRED` |
| `RAID-002` | Molly/Meth risk | Correct unit-based additions and caps | `PARITY_REQUIRED` |
| `RAID-003` | Stick/shield | Correct chance reductions; active shield blocks triggered raid | `PARITY_REQUIRED` |
| `RAID-004` | Stable-only bag | Chance capped at 15% | `PARITY_REQUIRED` |
| `RAID-005` | Target weighting | Weed 1, Coke 2, Molly 3, Meth 4 among bag or stashed held types | `PARITY_REQUIRED` |
| `RAID-006` | Weed haircut | 2%-5%, 1 day | `PARITY_REQUIRED` |
| `RAID-007` | Coke haircut | 8%-15%, 2 days | `PARITY_REQUIRED` |
| `RAID-008` | Molly haircut | 20%-35%, 3 days | `PARITY_REQUIRED` |
| `RAID-009` | Meth haircut/confiscation | 25%-40%, 3 days, 10%-20% bag Meth minimum 1 | `PARITY_REQUIRED` |
| `RAID-010` | Stashed target locality | Any stash can make asset targetable; haircut is global | `LEGACY_BEHAVIOR`, `PRODUCT_DECISION_REQUIRED` |

V2 locality must be decided before extraction: whether a raid targets current location only, market-wide price state, physical stash units, or a combination.

### 7.11 Random encounters

| ID | Scenario | Expected legacy assertion | Category |
| --- | --- | --- | --- |
| `ENC-001` | Outer trigger | Encounter occurs on 35% of day advances | `PARITY_REQUIRED` |
| `ENC-002` | Hot-tip weight | 35/100, message only | `PARITY_REQUIRED` |
| `ENC-003` | Quick flip | 25/100, selected core product +30% for current period | `PARITY_REQUIRED` |
| `ENC-004` | Street gift | 15/100, 2-4 units if capacity permits | `PARITY_REQUIRED` |
| `ENC-005` | Rob setup | 10/100, warning only | `PARITY_REQUIRED` |
| `ENC-006` | AERO bonus | 5/100, `$50-$149` gross through skim | `LEGACY_ONLY` branding/value; arithmetic characterized |
| `ENC-007` | Quiet | 10/100, no state effect | `PARITY_REQUIRED` |
| `ENC-008` | Duplicate constant table | Engine-local weights, not exported `RANDOM_ENCOUNTERS`, determine result | `LEGACY_BEHAVIOR`, `V2_EXPECTED_BEHAVIOR` |

`V2_EXPECTED_BEHAVIOR` for `ENC-008`: one versioned data definition drives simulation and presentation; duplicate hard-coded tables fail validation.

### 7.12 Client progression

| ID | Scenario | Expected legacy assertion | Category |
| --- | --- | --- | --- |
| `CLIENT-001` | Plant 40 Weed in Compton | Pearl completes and Long Beach unlocks | `PARITY_REQUIRED` |
| `CLIENT-002` | Plant 15 Coke + 10 Molly in Inglewood | Ray completes, South Central/Watts unlock, one Stick granted | `PARITY_REQUIRED` |
| `CLIENT-003` | Sell 20 Meth in Watts | Dispatcher completes and East LA unlocks | `PARITY_REQUIRED` |
| `CLIENT-004` | Claim dispatcher Chopper/Whip | Selected transport and hops granted, claimed flag set | `PARITY_REQUIRED` |
| `CLIENT-005` | Declared unlock day | Day 5/12 declarations do not gate Ray/Dispatcher progress | `LEGACY_BEHAVIOR`, `PRODUCT_DECISION_REQUIRED` |
| `CLIENT-006` | Completion messages | Completion mutates state but some callers discard returned success messages | `LEGACY_BEHAVIOR`, `V2_EXPECTED_BEHAVIOR` |
| `CLIENT-007` | Gift helper | 70% unit progress, 20% marked value to reserves, 10% narrated ecosystem | `LEGACY_ONLY` until workflow/economy approved |

`V2_EXPECTED_BEHAVIOR` for `CLIENT-006`: completion emits one durable domain event and one presentation-safe result; reconnect can recover it without duplication.

### 7.13 Rank progression

Test every threshold immediately below, exactly at, and above its boundary while separately varying diversity and planted-city requirements.

| Rank | Threshold | Diversity | Planted cities | Benefit under test |
| --- | ---: | ---: | ---: | --- |
| Corner Boy | 0 | 0 | 0 | Base |
| Runner | 3,000 | 2 | 1 | +5% yield |
| Hustler | 10,000 | 3 | 2 | +10% Coke sell when precedence permits |
| Kingpin | 30,000 | 4 | 3 | 7% skim |
| Trap Lord | 80,000 | 4 | 4 | +10% yield |
| Trap God | 175,000 | 4 | 6 | 6% skim |

Cases:

- `RANK-001`: value alone is insufficient when diversity/cities fail.
- `RANK-002`: diversity counts core assets in bag or stashes, not gear.
- `RANK-003`: current-city bag with no stash adds 0.5 stash credit to score but not planted-city count.
- `RANK-004`: highest eligible rank wins.
- `RANK-005`: recomputation can demote if eligibility later falls; decide V2 policy.
- `RANK-006`: benefits affect subsequent calculations according to current update order.

### 7.14 Scoring, run completion, and gear omission

| ID | Scenario | Expected legacy assertion | Category |
| --- | --- | --- | --- |
| `SCORE-001` | Cash + reserves | Both included exactly | `PARITY_REQUIRED` |
| `SCORE-002` | Inventory + stashes | Current sell value included | `PARITY_REQUIRED` |
| `SCORE-003` | Active haircut/boost/rank | Current sell-price precedence affects score | `PARITY_REQUIRED` |
| `SCORE-004` | Stick/Chopper/Whip ownership | Omitted from score | `LEGACY_BEHAVIOR`, `V2_EXPECTED_BEHAVIOR` |
| `SCORE-005` | Plug inventory | Included because it is an inventory entry | `PARITY_REQUIRED` |
| `SCORE-006` | Early end | Same valuation, game over, protected-at-completion set | `PARITY_REQUIRED` |
| `SCORE-007` | Full completion | `runsCompleted` increments once; best score updates | `PARITY_REQUIRED` including UI/save side effect |
| `SCORE-008` | Early completion career | Does not increment full runs; can update best score | `PARITY_REQUIRED` |

Proposed `V2_EXPECTED_BEHAVIOR` for `SCORE-004`: every owned economic item has an explicit terminal valuation policy. Gear may use documented liquidation value, salvage value, or zero, but omission cannot result from storage shape.

### 7.15 The Plug forecasts

| ID | Scenario | Expected legacy assertion | Category |
| --- | --- | --- | --- |
| `PLUG-001` | Use with Plug | Consumes one Plug and stores recommended asset/city | `PARITY_REQUIRED` |
| `PLUG-002` | Forecast generation | Rolls 8 asset prices for each of 6 cities and selects temporary maximum | `LEGACY_BEHAVIOR`, `V2_EXPECTED_BEHAVIOR` |
| `PLUG-003` | Travel after forecast | Destination reroll need not match forecast | `LEGACY_BEHAVIOR`, `V2_EXPECTED_BEHAVIOR` |
| `PLUG-004` | No Plug but owns Chopper | Intel succeeds without consuming an item | `LEGACY_BEHAVIOR`, `V2_EXPECTED_BEHAVIOR` |
| `PLUG-005` | Stored intel | No explicit day expiry; later use replaces it | `LEGACY_BEHAVIOR`, `V2_EXPECTED_BEHAVIOR` |

`V2_EXPECTED_BEHAVIOR`: intel references an authoritative market snapshot/scenario, includes source, confidence and expiry, and cannot be unlocked by unrelated transport ownership. It may be uncertain, but uncertainty is modeled rather than caused by unrelated rerolls.

### 7.16 Referral effects

Referral tests run in an isolated DOM/storage harness and are marked `LEGACY_ONLY` unless server behavior is separately specified.

| ID | Scenario | Expected legacy assertion | Category |
| --- | --- | --- | --- |
| `REF-001` | Code generation/parsing | `TRAP-{telegramId}`, reject invalid/self IDs | `LEGACY_ONLY` |
| `REF-002` | Attribution | Start-param path sets one referrer and mirrored local ledger | `LEGACY_ONLY` |
| `REF-003` | Daily drip | 0.3% of referred player's gross daily yield added to referrer local pending/total | `LEGACY_BEHAVIOR`, `V2_EXPECTED_BEHAVIOR` |
| `REF-004` | Completion bonus | 5% of protected reserves added locally at game over, including early end | `LEGACY_BEHAVIOR`, `V2_EXPECTED_BEHAVIOR` |
| `REF-005` | Gift TVL helper | 1% helper exists but is not called | `LEGACY_ONLY` |
| `REF-006` | Duplicate processing | No server idempotency ledger protects client reward side effects | `LEGACY_BEHAVIOR`, `V2_EXPECTED_BEHAVIOR` |
| `REF-007` | Active referral display | Locally visible save with >= `$50` protected reserves | `LEGACY_ONLY` |

`V2_EXPECTED_BEHAVIOR`: attribution and any approved reward qualification are server-authoritative, fraud-reviewed, idempotent, versioned, and represented by durable ledger/domain events. No real-value referral rate is approved by this plan.

## 8. Intentional divergence register

| Decision ID | `LEGACY_BEHAVIOR` | Proposed `V2_EXPECTED_BEHAVIOR` | Status |
| --- | --- | --- | --- |
| `DIV-001` | Day 30 resolves and immediately ends before a normal action phase | Make day 30 playable, then explicitly resolve completion | Product approval required |
| `DIV-002` | Remote stash withdrawal has no location check | Require presence or explicit logistics mechanic | Proposed |
| `DIV-003` | Gear omission follows storage representation | Explicit terminal valuation policy for every owned item | Proposed |
| `DIV-004` | Plug forecasts temporary uncommitted random prices | Versioned authoritative intel with confidence and expiry | Proposed |
| `DIV-005` | Chopper can substitute for Plug | Require correct intel entitlement/item | Proposed |
| `DIV-006` | Robbery yield branch can increase owned value | Exact typed loss and balanced source/sink accounting | Proposed |
| `DIV-007` | Unit loss fight-back can recover dollar amount | Preserve loss/recovery unit or explicit conversion rule | Proposed |
| `DIV-008` | Client completion feedback can be discarded | Durable completion event with replayable presentation | Proposed |
| `DIV-009` | Long Beach warning has no penalty | Apply defined modifier or remove claim | Product approval required |
| `DIV-010` | Declared client unlock days are not enforced | Content data explicitly defines and enforces or omits day gate | Product approval required |
| `DIV-011` | Transport can consume last action without ending day | Define consistent zero-action transition | Product approval required |
| `DIV-012` | Referral effects are client localStorage calculations | Server-authoritative attribution/qualification; rates deferred | Proposed architecture |
| `DIV-013` | `Math.random()` determines economic results | Seeded/replayable server random source with evidence | Approved architecture |
| `DIV-014` | Duplicate encounter definitions can diverge | Single validated versioned content definition | Approved architecture |

Every implemented divergence gets:

- Decision owner and approval date.
- Old and new fixture IDs.
- First `economy_version`/`balance_version` carrying the change.
- Analytics impact and migration policy.
- Player-facing patch note if a live behavior changes.

## 9. V2 deterministic randomness strategy

### 9.1 Requirements

Authoritative random outcomes must support:

- Reproduction in tests and production replay.
- Debugging and dispute analysis.
- Anti-cheat and no client control.
- Balance simulation with stable seeds.
- Independent random streams so adding an audio/UI draw cannot change economy.
- Versioned algorithm changes.

### 9.2 Proposed model

At run creation, the server creates a cryptographically strong run seed and stores it encrypted or stores sufficient protected derivation material. The client receives no predictive seed.

For each authoritative random decision:

```text
decision_seed = KDF(
  run_seed,
  random_strategy_version,
  run_id,
  command_sequence,
  stream_name,
  decision_index
)
```

The PRNG consumes from the derived stream. Stable stream names separate concerns such as:

- `market.price_generation`
- `risk.robbery_check`
- `risk.robbery_outcome`
- `risk.raid_check`
- `risk.raid_target`
- `encounter.selection`
- `loot.quantity`

### 9.3 Decision evidence

Record a `random_decision` entry or equivalent domain evidence:

```text
random_decision_id
run_id, command_id, command_sequence
random_strategy_version
stream_name, decision_index
seed_reference or encrypted derivation reference
draw_start, draw_count
input_range/weights hash
outcome_code
economy_version, content_version, balance_version
created_at
```

The replay tool loads the same versions, derives the same stream, validates draw count/weights, and reproduces the outcome. If seed secrecy matters during a run, a commitment hash may be published/stored at start and seed evidence revealed only to trusted replay tooling or after completion.

The exact PRNG/KDF algorithm is selected and frozen in M5. Changing it creates a new `random_strategy_version`; historical replays continue using the old implementation.

### 9.4 Authored slice scenarios

An authored market event can select a fixed scenario branch rather than pretend to be random. If bounded variation is used, that variation uses the same random interface and evidence. Scenario scripting, random selection, and player consequence remain distinguishable in domain events.

### 9.5 Random tests

- Golden known-answer vectors for the chosen PRNG/KDF.
- Same seed/context produces same sequence on every supported server runtime.
- Different stream names do not share sequence.
- Adding a draw to one stream does not alter another stream.
- Replay validates exact draw count and fails on accidental extra draws.
- Boundary mapping has no impossible outcome and documented bias handling.
- Weighted selection reaches every valid branch under known vectors.
- Distribution smoke tests over fixed seed sets detect large probability regressions without flaky random assertions.
- Client-provided seed/roll fields are rejected by API schemas.

## 10. Property and invariant tests

Beyond examples, the V2 engine should prove:

- Accepted trade conservation: cash/value delta follows price, fees, and explicit source/sink events.
- Inventory and stash quantities remain non-negative integers.
- Capacity is never exceeded after a committed command.
- Protected and spendable balances cannot be confused by type.
- Same command ID is idempotent under retries and concurrency.
- State version increases exactly once per committed command.
- Rejected command leaves authoritative economy state unchanged.
- Every balance change has a reason-coded domain event.
- Source/sink totals reconcile per run and economy version.
- Rank/progression changes satisfy versioned prerequisites.
- Random outcomes are replayable from recorded evidence.
- Historical run replay uses original economy/content/balance/random versions.

Property tests should generate bounded valid states and commands. Invalid-state fuzzing is separate and must verify explicit rejection rather than silently normalizing economic data.

## 11. Distribution and balance verification

Fixed-seed simulation suites run thousands of complete/partial runs to compare:

- Price distributions by city and asset.
- Yield distributions by product, rank, bag/stash mix, and boost.
- Robbery and raid incidence/severity.
- Encounter branch frequency.
- Rank timing and completion rates.
- Final score distribution and outliers.
- Source/sink totals and insolvency-like states.

Tests compare a checked-in statistical baseline with tolerances. They are deterministic because the seed corpus is fixed. A change outside tolerance requires a balance review and new `balance_version`, not a snapshot update without explanation.

## 12. Content compatibility tests

Before a content version can publish:

- Every referenced asset, city/location, NPC, mission, rumor, event, rank, reward, and education concept ID resolves.
- `VERTICAL_SLICE_CITY_TBD` can be replaced by another location definition without changing command/event types.
- Server-only fields do not leak into Unity bundles.
- Economy definitions needed by a run exist for its economy/balance versions.
- Removed content remains available to active historical runs or has an explicit migration.
- Dialogue/localization keys exist for required locales and accessibility metadata.
- Random weight tables are non-negative, total correctly, and hash into replay evidence.
- Content changes do not mutate immutable published bundles.

## 13. Side-effect and analytics contract tests

The V2 engine remains pure; API tests verify side effects:

- Committed command writes state, command record, domain events, and analytics outbox in one transaction.
- Rejected command writes no balance mutation and emits one reason-coded rejection event where policy permits.
- Duplicate command returns original result and does not duplicate outbox/domain records.
- Analytics delivery retry keeps the same event ID.
- Unity cannot submit `market.trade_completed`, `economy.balance_changed`, score, reward, or random outcome as authoritative telemetry.
- `player.activated` emits once at first accepted meaningful commitment.
- Run events contain economy/content/balance/random strategy versions.
- Referral qualification emits once under unique attribution/qualification constraints.

## 14. Test data and environment safety

- No production player save, Telegram ID, wallet address, bot token, or secret enters fixtures.
- Use synthetic IDs and deterministic seeds.
- Separate testnet chain fixtures from simulated economy fixtures.
- Mark employee/QA/simulation events so they are excluded from product KPIs.
- Test database resets target only a verified isolated database.
- Golden fixtures contain no raw environment values or absolute machine paths.

## 15. CI gates for M5 and later

Proposed gates:

1. Typecheck and lint.
2. Legacy characterization suite.
3. V2 unit/property suite.
4. Parity comparison for `PARITY_REQUIRED` cases.
5. Intentional divergence manifest validation.
6. Replay known-answer suite.
7. API idempotency/concurrency tests.
8. Content schema/reference validation.
9. Fixed-seed distribution regression suite, with a smaller PR suite and larger scheduled suite.
10. Analytics authority/schema contract tests.

A snapshot/golden update requires reviewer-visible reason and affected version. CI must not auto-accept new economic outputs.

## 16. M5 entry criteria

Do not begin extraction until architecture review confirms:

- This test matrix covers all required current mechanics.
- Random-tape characterization approach is acceptable and isolated.
- Known defects have `LEGACY_BEHAVIOR` evidence and reviewed or owned `V2_EXPECTED_BEHAVIOR`.
- Day 30, remote stash, gear valuation, Plug intel, client day gates, raid locality, and zero-action behavior have decisions or named owners/deadlines.
- Canonical version fields and deterministic random evidence are accepted.
- Economy/analytics event mapping is accepted.
- A test runner and property-test tool are selected without changing the current engine first.
- Existing `trap-war` remains intact while tests are added beside it.
- No repository migration, Unity implementation, contract deployment, real-value reward work, or production infrastructure change is included in M5 kickoff.

## 17. M5 exit evidence anticipated

M5 should eventually return:

- Passing legacy characterization tests.
- A standalone deterministic economy package with pure command execution.
- Parity report listing matched and intentionally changed scenarios.
- Replay proof for every authoritative random branch used by the slice.
- Distribution comparison against the legacy baseline.
- Versioned rules/content/balance/random fixtures.
- No unreviewed balance change.

## 18. M5 implementation status

Implemented under `packages/economy-engine`:

- 5 executable legacy characterization cases covering initial state, remote retrieval, omitted gear valuation, terminal-day behavior, and Plug/Chopper behavior.
- 11 focused V2 contract cases covering deterministic replay, event reduction, idempotency conflict handling, stale-state rejection, stash locality, gear and utility valuation, forecasts, playable day 30, zero-action escape, and transport range.
- 6 invariant/property-style cases covering trade conservation, stash conservation, reference yield accounting, robbery sinks, raid locality, and 10,000 bounded random-sequence steps across 100 runs.
- A five-agent deterministic simulation harness with configurable run count and distribution output.

Current test command:

```powershell
npm --prefix packages/economy-engine test
```

Current simulation command:

```powershell
npm --prefix packages/economy-engine run simulate -- --runs 1000 --output simulation/latest-report.json
```

The full M4 characterization matrix is intentionally not marked complete. Save migration, all legacy price tapes, every encounter branch, every rank/yield boundary, transport parity, referral calculations, and fight-back branches remain follow-up coverage before production authority. These gaps are technical debt and M6 entry review items, not silent parity claims.

## 19. M5.5 calibration validation

M5.5 adds:

- full P1/P5/P10/P25/median/P75/P90/P95/P99 distributions;
- positive-run, bankruptcy, completion, final-day, highest-rank, client, city, asset, action, yield, and final composition metrics;
- robbery/raid opportunities, count bands, event/run severity, loss-to-net-worth, day, and city metrics;
- forecast realization age, error, direction, false-positive/negative, and confidence-conditioned value;
- Day 5/10/15/20/25/30 pacing and Day 5/10/15 final-wealth correlation;
- exact source/sink reconciliation per run;
- per-policy command throughput, run throughput, duration, and peak RSS;
- seven dedicated test policies in addition to the five baseline policies;
- characterization coverage for the recyclable client-deposit defect.

Calibration commands:

```powershell
npm --prefix packages/economy-engine run calibrate -- --runs 10000 --agents random --output simulation/random.json --quiet
npm --prefix packages/economy-engine run combine -- --inputs simulation/random.json,simulation/conservative.json --output simulation/combined.json
```

Acceptance checks:

1. Every policy completes its requested seed count with pinned versions.
2. Every accepted trace reconciles starting value plus sources minus sinks to final net worth.
3. Purpose-built policies issue no rejected command fallback in their final corpus.
4. Reports include all required percentile fields and six pacing checkpoints.
5. Balance experiments use a new `balanceVersion`; M5.5 performed no parameter change.
6. Machine-readable report totals 102,500 runs and 12 unique policies.

The M5.5 suite adds three calibration tests, bringing the focused economy-engine suite to 25 passing tests.

M6 remains blocked on review of client-rule defects, forecast calibration, event targets, aggressive upside, recovery states, city utility, and proposed balance bands.

## 20. M5.6 balance-contract validation

M5.6 converts several M5.5 characterizations into executable contracts:

1. Pearl progress is a qualifying stash high-water mark; withdraw/redeposit of the same units cannot increase progress.
2. Buying and selling account exactly for the configured bid/ask spread.
3. Dispatcher completion grants the documented automatic V2 Whip reward and configured travel uses.
4. Forecast metadata includes reference price, direction, magnitude band, horizon, source type, source quality, and confidence.
5. High carried value and volatile inventory statistically produce greater robbery/raid exposure than a low-exposure state under matched deterministic seeds.
6. The final 100,000-run corpus has pinned M5.6 versions, 10,000 runs per policy, complete finite distributions, no fallbacks, and exact reconciliation.

The focused economy-engine suite now contains 28 passing tests. Statistical assertions compare matched deterministic cohorts and avoid exact outcome counts that would overfit a random-strategy implementation.

Required M6 regression ownership remains open for persistent Heat semantics, client reward-choice migration, richer city demand/liquidity, and API serialization of the expanded forecast contract.
