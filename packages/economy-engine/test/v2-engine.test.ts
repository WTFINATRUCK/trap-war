import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateWealth,
  cloneState,
  DEFAULT_ECONOMY_CONTENT,
  executeCommand,
  getLegalActions,
  reduceEvents,
  type EconomyCommand,
  type EconomyState,
} from "../src/index.js";

const context = { runSeed: "test-server-secret-seed" };

function start(commandId = "start"): EconomyState {
  const result = executeCommand(undefined, {
    type: "StartRun",
    commandId,
    expectedStateVersion: 0,
    runId: "run-test",
  }, context);
  assert.equal(result.status, "accepted");
  return result.state;
}

function withVersion<T extends Omit<EconomyCommand, "expectedStateVersion">>(
  state: EconomyState,
  command: T,
): EconomyCommand {
  return { ...command, expectedStateVersion: state.stateVersion } as EconomyCommand;
}

test("same seed and command produce byte-equivalent events and state", () => {
  const left = executeCommand(undefined, { type: "StartRun", commandId: "start-deterministic", expectedStateVersion: 0, runId: "run" }, context);
  const right = executeCommand(undefined, { type: "StartRun", commandId: "start-deterministic", expectedStateVersion: 0, runId: "run" }, context);
  assert.equal(left.status, "accepted");
  assert.equal(right.status, "accepted");
  assert.deepEqual(left.events, right.events);
  assert.deepEqual(left.randomEvidence, right.randomEvidence);
  assert.deepEqual(left.state, right.state);
});

test("event replay reproduces authoritative state", () => {
  const result = executeCommand(undefined, { type: "StartRun", commandId: "start-replay", expectedStateVersion: 0, runId: "run" }, context);
  assert.equal(result.status, "accepted");
  assert.deepEqual(reduceEvents(undefined, result.events), result.state);
});

test("idempotent retries do not reapply events and payload conflicts reject", () => {
  const state = start("start-idempotency");
  const command = withVersion(state, { type: "BuyAsset", commandId: "buy-once", assetId: "weed", quantity: 1 });
  const first = executeCommand(state, command, context);
  assert.equal(first.status, "accepted");
  const duplicate = executeCommand(first.state, command, context);
  assert.equal(duplicate.status, "accepted");
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.events.length, 0);
  assert.equal(duplicate.state.inventory.weed, 1);

  const conflict = executeCommand(first.state, {
    type: "BuyAsset",
    commandId: "buy-once",
    expectedStateVersion: state.stateVersion,
    assetId: "weed",
    quantity: 2,
  }, context);
  assert.equal(conflict.status, "rejected");
  assert.equal(conflict.code, "IDEMPOTENCY_CONFLICT");
});

test("stale writes return a structured rejection and legal actions", () => {
  const state = start("start-stale");
  const result = executeCommand(state, { type: "EndDay", commandId: "stale", expectedStateVersion: 0 }, context);
  assert.equal(result.status, "rejected");
  assert.equal(result.code, "STALE_STATE_VERSION");
  assert.ok(result.legalActions.some((action) => action.type === "EndDay"));
});

test("remote stash withdrawal is rejected with WRONG_CITY", () => {
  const state = start("start-stash");
  state.stashes.inglewood.weed = { quantity: 5, depositedDay: 1, shieldDaysRemaining: 2 };
  const result = executeCommand(state, withVersion(state, {
    type: "WithdrawStash",
    commandId: "remote-withdraw",
    locationId: "inglewood",
    assetId: "weed",
    quantity: 1,
  }), context);
  assert.equal(result.status, "rejected");
  assert.equal(result.code, "WRONG_CITY");
});

test("gear is property value, separate from liquid cash and inventory", () => {
  const state = start("start-gear");
  state.gear.whip = { quantity: 1, conditionBps: 8_000, usesRemaining: 2 };
  state.prices.whip = 2_000;
  const wealth = calculateWealth(state, DEFAULT_ECONOMY_CONTENT);
  assert.equal(wealth.gearPropertyValue, 1_120);
  assert.equal(wealth.liquidCash, state.cash);
  assert.equal(wealth.inventoryMarketValue, 0);
  assert.equal(wealth.netWorth, state.cash + state.protectedReserves + 1_120);
});

test("utility gear also contributes property value", () => {
  const state = start("start-utility-gear");
  state.gear.plug = { quantity: 1, conditionBps: 10_000 };
  state.prices.plug = 300;
  assert.equal(calculateWealth(state, DEFAULT_ECONOMY_CONTENT).gearPropertyValue, 150);
});

test("Plug forecasts are deterministic, imperfect metadata rather than guarantees", () => {
  const state = start("start-forecast");
  state.day = 5;
  state.gear.plug = { quantity: 1, conditionBps: 10_000 };
  const command = withVersion(state, { type: "UsePlug", commandId: "forecast", assetId: "coke", locationId: "watts" });
  const left = executeCommand(state, command, context);
  const right = executeCommand(cloneState(state), command, context);
  assert.equal(left.status, "accepted");
  assert.equal(right.status, "accepted");
  assert.deepEqual(left.state.forecasts, right.state.forecasts);
  assert.ok(left.state.forecasts[0]!.confidenceBps < 10_000);
  assert.ok(left.state.forecasts[0]!.expiresDay > state.day);
  assert.ok(["up", "down"].includes(left.state.forecasts[0]!.direction));
  assert.ok(["low", "medium", "high"].includes(left.state.forecasts[0]!.magnitudeBand));
  assert.ok(left.state.forecasts[0]!.referencePrice > 0);
  assert.ok(left.state.forecasts[0]!.horizonDays >= 1);
  assert.ok(left.state.forecasts[0]!.randomDecisionIds.length >= 3);
});

test("trade spread creates explicit friction on a same-price round trip", () => {
  let state = start("start-spread");
  state.prices.weed = 50;
  const before = calculateWealth(state, DEFAULT_ECONOMY_CONTENT).netWorth;
  const buy = executeCommand(state, withVersion(state, { type: "BuyAsset", commandId: "spread-buy", assetId: "weed", quantity: 5 }), context);
  assert.equal(buy.status, "accepted");
  state = buy.state;
  const sell = executeCommand(state, withVersion(state, { type: "SellAsset", commandId: "spread-sell", assetId: "weed", quantity: 5 }), context);
  assert.equal(sell.status, "accepted");
  assert.ok(calculateWealth(sell.state, DEFAULT_ECONOMY_CONTENT).netWorth < before);
});

test("Dispatcher completion grants the documented V2 Whip reward", () => {
  const state = start("start-dispatcher-reward");
  state.day = 12;
  state.locationId = "watts";
  state.actionsRemaining = 1;
  state.clients.dispatcher!.accepted = true;
  state.inventory.meth = 12;
  const result = executeCommand(state, withVersion(state, { type: "SellAsset", commandId: "dispatcher-sale", assetId: "meth", quantity: 12 }), context);
  assert.equal(result.status, "accepted");
  assert.equal(result.state.clients.dispatcher!.completed, true);
  assert.equal(result.state.gear.whip?.quantity, 1);
  assert.equal(result.state.gear.whip?.usesRemaining, DEFAULT_ECONOMY_CONTENT.assets.whip!.travelUses);
});

test("carried value and volatile inventory raise event exposure", () => {
  let lowExposureRobberies = 0;
  let highExposureRobberies = 0;
  let lowExposureRaids = 0;
  let highExposureRaids = 0;
  for (let index = 0; index < 300; index += 1) {
    const low = start(`risk-low-${index}`);
    low.cash = 100;
    const high = cloneState(low);
    high.cash = 5_000;
    high.inventory.meth = 20;
    high.day = 5;
    const lowResult = executeCommand(low, withVersion(low, { type: "EndDay", commandId: `risk-day-${index}` }), { runSeed: `risk-${index}` });
    const highResult = executeCommand(high, withVersion(high, { type: "EndDay", commandId: `risk-day-${index}` }), { runSeed: `risk-${index}` });
    assert.equal(lowResult.status, "accepted");
    assert.equal(highResult.status, "accepted");
    lowExposureRobberies += lowResult.events.some((event) => event.type === "RobberyResolved") ? 1 : 0;
    highExposureRobberies += highResult.events.some((event) => event.type === "RobberyResolved") ? 1 : 0;
    lowExposureRaids += lowResult.events.some((event) => event.type === "RaidResolved") ? 1 : 0;
    highExposureRaids += highResult.events.some((event) => event.type === "RaidResolved") ? 1 : 0;
  }
  assert.ok(highExposureRobberies > lowExposureRobberies);
  assert.ok(highExposureRaids > lowExposureRaids);
});

test("day 30 is playable and settles without creating day 31", () => {
  const state = start("start-day30");
  state.day = 30;
  state.actionsRemaining = 1;
  const result = executeCommand(state, withVersion(state, { type: "BuyAsset", commandId: "last-action", assetId: "weed", quantity: 1 }), context);
  assert.equal(result.status, "accepted");
  assert.equal(result.state.status, "completed");
  assert.equal(result.state.day, 30);
  assert.equal(result.state.completionReason, "day_30_exhausted");
  assert.ok(result.events.some((event) => event.type === "DayCompleted"));
  assert.ok(!result.events.some((event) => event.type === "DayAdvanced"));
});

test("zero actions cannot soft-lock an active run", () => {
  const state = start("start-zero-actions");
  state.actionsRemaining = 0;
  const legal = getLegalActions(state, DEFAULT_ECONOMY_CONTENT);
  assert.deepEqual(legal.map((action) => action.type), ["EndDay", "EndRun"]);
  const result = executeCommand(state, withVersion(state, { type: "EndDay", commandId: "end-zero" }), context);
  assert.equal(result.status, "accepted");
  assert.equal(result.state.day, 2);
  assert.equal(result.state.actionsRemaining, 3);
});

test("walking and Whip retain cross-city range while Chopper stays adjacent", () => {
  const state = start("start-travel-range");
  state.unlockedLocationIds.push("east_la");
  state.gear.whip = { quantity: 1, conditionBps: 10_000, usesRemaining: 3 };
  state.gear.chopper = { quantity: 1, conditionBps: 10_000, usesRemaining: 5 };

  const walk = executeCommand(state, withVersion(state, { type: "Travel", commandId: "walk-far", destinationLocationId: "east_la", mode: "walk" }), context);
  assert.equal(walk.status, "accepted");
  assert.equal(walk.state.locationId, "east_la");

  const whip = executeCommand(state, withVersion(state, { type: "Travel", commandId: "whip-far", destinationLocationId: "east_la", mode: "whip" }), context);
  assert.equal(whip.status, "accepted");
  assert.equal(whip.state.day, state.day);

  const chopper = executeCommand(state, withVersion(state, { type: "Travel", commandId: "chopper-far", destinationLocationId: "east_la", mode: "chopper" }), context);
  assert.equal(chopper.status, "rejected");
  assert.equal(chopper.code, "INVALID_TRAVEL_ROUTE");
});
