import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateWealth,
  cloneState,
  DEFAULT_ECONOMY_CONTENT,
  executeCommand,
  type EconomyState,
} from "../src/index.js";

function started(seed: string): EconomyState {
  const result = executeCommand(undefined, { type: "StartRun", commandId: "start", expectedStateVersion: 0, runId: seed }, { runSeed: seed });
  assert.equal(result.status, "accepted");
  return result.state;
}

test("buy and sell account for the configured spread without unexplained value changes", () => {
  let state = started("conservation");
  const before = calculateWealth(state, DEFAULT_ECONOMY_CONTENT).netWorth;
  const marketValue = state.prices.weed * 2;
  const buyCost = Math.ceil(marketValue * (10_000 + DEFAULT_ECONOMY_CONTENT.tradeSpreadBps) / 10_000);
  const sellGross = Math.floor(marketValue * (10_000 - DEFAULT_ECONOMY_CONTENT.tradeSpreadBps) / 10_000);
  const buy = executeCommand(state, { type: "BuyAsset", commandId: "buy", expectedStateVersion: state.stateVersion, assetId: "weed", quantity: 2 }, { runSeed: "conservation" });
  assert.equal(buy.status, "accepted");
  state = buy.state;
  assert.equal(calculateWealth(state, DEFAULT_ECONOMY_CONTENT).netWorth, before - (buyCost - marketValue));
  const sell = executeCommand(state, { type: "SellAsset", commandId: "sell", expectedStateVersion: state.stateVersion, assetId: "weed", quantity: 2 }, { runSeed: "conservation" });
  assert.equal(sell.status, "accepted");
  assert.equal(calculateWealth(sell.state, DEFAULT_ECONOMY_CONTENT).netWorth, before - (buyCost - marketValue) - (marketValue - sellGross));
});

test("stash transfers conserve units and wealth", () => {
  let state = started("stash-conservation");
  state.inventory.weed = 10;
  const before = calculateWealth(state, DEFAULT_ECONOMY_CONTENT).netWorth;
  const result = executeCommand(state, { type: "DepositStash", commandId: "stash", expectedStateVersion: state.stateVersion, assetId: "weed", quantity: 6 }, { runSeed: "stash-conservation" });
  assert.equal(result.status, "accepted");
  assert.equal(result.state.inventory.weed + result.state.stashes.compton.weed!.quantity, 10);
  assert.equal(calculateWealth(result.state, DEFAULT_ECONOMY_CONTENT).netWorth, before);
});

test("yield preserves legacy carried/stash math and reserve skim", () => {
  const state = started("yield-reference");
  state.day = 5;
  state.prices.meth = 400;
  state.inventory.meth = 10;
  state.stashes.compton.meth = { quantity: 10, depositedDay: 1, shieldDaysRemaining: 3 };
  const result = executeCommand(state, { type: "EndDay", commandId: "yield-day", expectedStateVersion: state.stateVersion }, { runSeed: "yield-reference" });
  assert.equal(result.status, "accepted");
  const accrued = result.events.find((event) => event.type === "YieldAccrued");
  assert.ok(accrued && accrued.type === "YieldAccrued");
  assert.deepEqual(
    { gross: accrued.gross, skim: accrued.skim, net: accrued.net },
    { gross: 157, skim: 12, net: 145 },
  );
});

test("robbery outcomes are explicit sinks and can never mint cash or inventory", () => {
  let observed = false;
  for (let index = 0; index < 1_000 && !observed; index += 1) {
    const seed = `robbery-${index}`;
    const state = started(seed);
    state.cash = 10_000;
    state.inventory.weed = 50;
    const before = cloneState(state);
    const result = executeCommand(state, { type: "EndDay", commandId: "end", expectedStateVersion: state.stateVersion }, { runSeed: seed });
    assert.equal(result.status, "accepted");
    const robbery = result.events.find((event) => event.type === "RobberyResolved");
    if (!robbery || robbery.type !== "RobberyResolved") continue;
    observed = true;
    assert.ok(robbery.cashLost >= 0);
    assert.ok(robbery.totalValueLost >= robbery.cashLost);
    assert.ok(result.state.cash <= before.cash + result.state.stats.yieldAccrued);
    for (const [assetId, lost] of Object.entries(robbery.inventoryLost)) {
      assert.ok(lost > 0);
      assert.ok((result.state.inventory[assetId] ?? 0) <= (before.inventory[assetId] ?? 0));
    }
  }
  assert.equal(observed, true, "expected deterministic seed search to observe a robbery");
});

test("standard raid cannot touch remote stashes", () => {
  let observed = false;
  for (let index = 0; index < 2_000 && !observed; index += 1) {
    const seed = `raid-${index}`;
    const state = started(seed);
    state.inventory.weed = 20;
    state.stashes.compton.coke = { quantity: 20, depositedDay: 1, shieldDaysRemaining: 0 };
    state.stashes.inglewood.coke = { quantity: 20, depositedDay: 1, shieldDaysRemaining: 0 };
    const result = executeCommand(state, { type: "EndDay", commandId: "end", expectedStateVersion: state.stateVersion }, { runSeed: seed });
    assert.equal(result.status, "accepted");
    if (!result.events.some((event) => event.type === "RaidResolved")) continue;
    observed = true;
    assert.equal(result.state.stashes.inglewood.coke!.quantity, 20);
    assert.ok((result.state.stashes.compton.coke?.quantity ?? 0) <= 20);
  }
  assert.equal(observed, true, "expected deterministic seed search to observe a raid");
});

test("random command sequences preserve nonnegative balances and capacity", () => {
  for (let run = 0; run < 100; run += 1) {
    const seed = `property-${run}`;
    let state = started(seed);
    for (let step = 0; step < 100 && state.status === "active"; step += 1) {
      const assetIds = ["weed", "coke", "molly", "meth"];
      const assetId = assetIds[(run + step) % assetIds.length]!;
      const command = state.actionsRemaining === 0 || step % 4 === 3
        ? { type: "EndDay" as const, commandId: `c-${step}`, expectedStateVersion: state.stateVersion }
        : state.inventory[assetId] > 0 && step % 2 === 1
          ? { type: "SellAsset" as const, commandId: `c-${step}`, expectedStateVersion: state.stateVersion, assetId, quantity: 1 }
          : { type: "BuyAsset" as const, commandId: `c-${step}`, expectedStateVersion: state.stateVersion, assetId, quantity: 1 };
      const result = executeCommand(state, command, { runSeed: seed });
      if (result.status === "accepted") state = result.state;
      assert.ok(state.cash >= 0);
      assert.ok(state.protectedReserves >= 0);
      assert.ok(Object.values(state.inventory).every((quantity) => quantity >= 0));
      assert.ok(Object.values(state.inventory).reduce((sum, quantity) => sum + quantity, 0) <= state.inventoryCapacity);
    }
  }
});
