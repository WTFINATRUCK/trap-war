import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceDay,
  calculateTotalValue,
  createInitialState,
  retrieveStash,
  usePlug,
} from "../../../src/lib/game/engine.js";

test("legacy starts with the documented day, money, action, and city values", () => {
  const state = createInitialState();
  assert.equal(state.day, 1);
  assert.equal(state.cash, 500);
  assert.equal(state.protectedReserves, 40);
  assert.equal(state.actionsLeft, 3);
  assert.equal(state.location, "Compton");
});

test("legacy permits retrieving a remote city stash", () => {
  const state = createInitialState();
  state.location = "Compton";
  state.plantedStashes.Inglewood = {
    Weed: { asset: "Weed", units: 5, plantedOnDay: 1, shieldDaysLeft: 0 },
  };
  const result = retrieveStash(state, "Inglewood", 2, "Weed");
  assert.equal(result.blocked, undefined);
  assert.equal(result.state.inventory.Weed, 2);
  assert.equal(result.state.plantedStashes.Inglewood?.Weed?.units, 3);
});

test("legacy final value omits separately-held weapon and transport gear", () => {
  const base = createInitialState();
  const geared = {
    ...base,
    stickCount: 3,
    hasChopper: true,
    chopperHopsLeft: 5,
    hasWhip: true,
    whipHopsLeft: 3,
  };
  assert.equal(calculateTotalValue(geared), calculateTotalValue(base));
});

test("legacy day 30 ends immediately when advanceDay is invoked", () => {
  const state = createInitialState();
  state.day = 30;
  const result = advanceDay(state);
  assert.equal(result.state.gameOver, true);
  assert.equal(result.state.day, 30);
});

test("legacy Plug is consumed and Chopper can substitute for it", () => {
  const plugState = createInitialState();
  plugState.inventory["The Plug"] = 1;
  const plugResult = usePlug(plugState);
  assert.equal(plugResult.state.inventory["The Plug"], undefined);
  assert.ok(plugResult.state.plugIntel);

  const chopperState = createInitialState();
  chopperState.hasChopper = true;
  const chopperResult = usePlug(chopperState);
  assert.equal(chopperResult.blocked, undefined);
  assert.ok(chopperResult.state.plugIntel);
});
