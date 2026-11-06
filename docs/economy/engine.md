# Trap Wars V2 Economy Engine Architecture

Status: M5 implemented foundation
Date: 2026-08-11
Package: `packages/economy-engine`

## 1. Scope

M5 extracts an authoritative, headless TypeScript economy beside the current Telegram application. The legacy engine remains untouched and executable. The package contains no React, Telegram, Unity, database, wallet, chain, analytics destination, or production infrastructure dependency.

This milestone establishes the economy boundary; it does not make the current client authoritative, migrate repositories, deploy an API, or introduce real-value mechanics.

## 2. Package layout

```text
packages/economy-engine/
  src/
    commands.ts       public command/result contracts
    content.ts        authored IDs and balance definitions
    engine.ts         validation and command resolution
    events.ts         immutable domain-event contracts
    legal-actions.ts  deterministic action projection
    model.ts          versioned run state
    random.ts         server-seeded random streams and evidence
    reducer.ts        event-to-state transition logic
    scoring.ts        wealth and game-score calculations
    versions.ts       economy/content/balance/random versions
  test/
    legacy-characterization.test.ts
    v2-engine.test.ts
    invariants.test.ts
  simulation/
    agents.ts
    run.ts
    cli.ts
```

## 3. Authority boundary

The public transition is:

```text
executeCommand(authoritativeState, command, serverContext)
  -> validate state/version/idempotency/gates
  -> derive deterministic random decisions
  -> emit ordered domain events
  -> reduce events into resulting state
  -> commit one state-version increment
  -> return accepted or structured rejected result
```

Clients may request commands and render returned state/events. They may not supply prices, random outcomes, yields, losses, client completion, rank, wealth, or score. `runSeed` is server context and never part of a player command or persisted public state; only a one-way `randomSeedId` is stored.

## 4. Command model

Implemented commands:

- `StartRun`
- `BuyAsset`
- `SellAsset`
- `Travel`
- `DepositStash`
- `WithdrawStash`
- `AcceptClient`
- `UsePlug`
- `EndDay`
- `EndRun`

Every command has a caller-generated `commandId` and `expectedStateVersion`. Quantities are positive safe integers. Accepted commands increment state version exactly once. Rejected commands do not return or commit events.

## 5. Structured outcomes

Accepted results include authoritative state, resulting version, ordered events, random evidence, and a duplicate marker. Rejections include a stable reason code, human-readable message, optional field/rule details, authoritative state when one exists, and a legal-action projection.

Important codes include `STALE_STATE_VERSION`, `IDEMPOTENCY_CONFLICT`, `ACTION_REQUIRED`, `WRONG_CITY`, `CLIENT_UNAVAILABLE`, `LOCATION_LOCKED`, `GEAR_REQUIRED`, and capacity/funds/ownership failures.

## 6. Idempotency and concurrency

`processedCommands` records command fingerprint, original resulting version, and event IDs. A retry with the same ID and same normalized command returns `duplicate: true` without state mutation or random draws. Reusing an ID with different content returns `IDEMPOTENCY_CONFLICT`.

`expectedStateVersion` provides optimistic concurrency. The future API/database adapter must lock or compare-and-swap a run row, persist command/event/state/outbox records in one transaction, and retain the original full response independently of the compact state ledger.

## 7. Event model

Events are ordered, immutable records with deterministic IDs (`commandId:sequence`), command ID, sequence, and occurrence day. Categories cover:

- lifecycle and versioned run start/completion;
- prices, cash, protected reserves, inventory, stashes, and gear;
- actions and travel;
- yield, robbery, and raid resolution;
- day settlement and advancement;
- client acceptance/progress/completion and location unlocks;
- rank and forecast changes;
- command commitment.

The reducer is the only gameplay state-transition implementation. Replaying a command's returned events reproduces the returned state exactly.

## 8. Randomness

The strategy version is `hmac-sha256-streams.1`. Each draw derives from:

```text
HMAC-SHA256(runSeed,
  randomStrategyVersion | commandId | streamName | drawIndex)
```

Bounded integers use rejection sampling to avoid modulo bias. Evidence records decision ID, stream, draw index, raw 32-bit value, mapped value, and method. Named streams isolate decisions so adding a draw to one branch does not perturb unrelated branches. Same seed, command, rules, and state produce identical events and evidence.

This is deterministic server randomness, not player-verifiable fairness. A future fairness scheme would require a separately reviewed commitment/reveal or audit policy.

## 9. Accounting model

All current amounts are integer simulated dollars, units, or basis points. Net worth is explicit:

```text
liquid cash
+ carried inventory market value
+ stash market value
+ gear property value after valuation and condition haircuts
+ protected reserves
- liabilities
```

Game score is separate from net worth and adds only versioned progression bonuses. Purchases and physical stash transfers conserve value at the authoritative price. Sales split gross inflow between liquid cash and protected reserves. Robbery and raid outcomes identify nonnegative losses and never mint replacement value.

## 10. Approved V2 divergences

| Area | Legacy evidence | M5 V2 rule |
| --- | --- | --- |
| Terminal day | Day 30 ends on entry/advance | Day 30 is playable; its final action or explicit `EndDay` settles and completes without day 31 |
| Remote stash | Another city's stash can be retrieved remotely | Withdrawal requires presence in that stash location |
| Gear score | separately-held gear is omitted | gear is separately valued property, not liquid cash |
| Plug | consumable perfect best-city roll; Chopper substitutes | owned Plug creates expiring, imperfect, replayable forecast metadata |
| Clients | several day gates are declarations only | generic availability rules return structured unmet reasons |
| Raids | any stash can affect targeting | standard raid affects carried inventory and the active location's unshielded stash only |
| Zero actions | edge paths rely on travel/automatic behavior | `EndDay` and `EndRun` remain legal while active |
| Robbery | one branch can inflate wealth from a statistic | every robbery branch is an explicit source/sink-preserving loss |

## 11. Preserved mechanics

The extraction retains the current starting values, six authored locations, eight assets, price ranges and city biases, three-action day, 30-day run, bag and global stash capacities, stash shields, carried/stashed yield with the stash multiplier, rank score and eligibility gates, reserve skim, client objectives/unlocks, transport ranges and uses, asset availability days, and the concept of robbery/raid risk.

Exact risk formulas and all legacy random encounters are not parity-complete in M5. They are versioned V2 implementations and remain balance candidates, not claims of full legacy equivalence.

## 12. State and content versions

- Economy: `economy-v2.m5.1`
- Content: `content-legacy-extracted.1`
- Balance: `balance-legacy-extracted-v2-divergences.1`
- Random strategy: `hmac-sha256-streams.1`

Published runs pin all four. Any semantic, content, numeric, or draw-strategy change must update the corresponding version and simulation baseline.

## 13. M6 adapter contract

M6 may wrap this package only after M5 acceptance. The adapter must add runtime request validation, authenticated player/run ownership, transactional optimistic locking, durable idempotency responses, event/outbox persistence, redacted logs, and analytics mapping. It must not duplicate economy formulas in controllers, SQL, Unity, or analytics workers.

M6 must not begin until the unresolved M5 coverage and balance findings in `ECONOMY_SIMULATION.md` and `ECONOMY_TEST_PLAN.md` are reviewed.
