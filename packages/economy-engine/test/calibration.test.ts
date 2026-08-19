import assert from "node:assert/strict";
import test from "node:test";
import { AGENTS } from "../simulation/agents.js";
import { fullDistribution, simulateAgentCalibration } from "../simulation/calibration.js";
import { executeCommand } from "../src/index.js";

test("full calibration distribution includes required percentile bands", () => {
  const result = fullDistribution(Array.from({ length: 100 }, (_, index) => index + 1));
  assert.deepEqual(
    Object.keys(result),
    ["min", "p1", "p5", "p10", "p25", "median", "p75", "p90", "p95", "p99", "max", "mean", "standardDeviation"],
  );
  assert.equal(result.min, 1);
  assert.equal(result.median, 50);
  assert.equal(result.max, 100);
});

test("calibration traces reconcile value sources and sinks", () => {
  const agent = AGENTS.find((candidate) => candidate.name === "conservative");
  assert.ok(agent);
  const report = simulateAgentCalibration(agent, 3);
  assert.equal(report.runs, 3);
  assert.equal(report.completionRate, 1);
  assert.ok(Math.abs(report.sourcesAndSinks.reconciliationErrorPerRun) < 0.000001);
  assert.ok(report.robbery.opportunities > 0);
  assert.equal(report.pacing.length, 6);
});

test("client deposit progress uses a qualifying high-water mark and cannot be recycled", () => {
  const context = { runSeed: "client-recycling-characterization" };
  const started = executeCommand(undefined, {
    type: "StartRun",
    commandId: "start-client-recycling",
    expectedStateVersion: 0,
    runId: "client-recycling",
  }, context);
  assert.equal(started.status, "accepted");
  let state = started.state;
  state.clients.pearl!.accepted = true;
  state.inventory.weed = 15;

  const depositOne = executeCommand(state, { type: "DepositStash", commandId: "deposit-one", expectedStateVersion: state.stateVersion, assetId: "weed", quantity: 15 }, context);
  assert.equal(depositOne.status, "accepted");
  state = depositOne.state;
  const withdraw = executeCommand(state, { type: "WithdrawStash", commandId: "withdraw", expectedStateVersion: state.stateVersion, locationId: "compton", assetId: "weed", quantity: 15 }, context);
  assert.equal(withdraw.status, "accepted");
  state = withdraw.state;
  const depositTwo = executeCommand(state, { type: "DepositStash", commandId: "deposit-two", expectedStateVersion: state.stateVersion, assetId: "weed", quantity: 15 }, context);
  assert.equal(depositTwo.status, "accepted");
  assert.equal(depositTwo.state.clients.pearl!.completed, false);
  assert.equal(depositTwo.state.clients.pearl!.progress.weed_deposited, 15);
  assert.equal(depositTwo.state.stashes.compton!.weed!.quantity, 15);

  state = depositTwo.state;
  state.actionsRemaining = 1;
  state.inventory.weed = 15;
  const depositUnique = executeCommand(state, { type: "DepositStash", commandId: "deposit-unique", expectedStateVersion: state.stateVersion, assetId: "weed", quantity: 15 }, context);
  assert.equal(depositUnique.status, "accepted");
  assert.equal(depositUnique.state.clients.pearl!.completed, true);
  assert.equal(depositUnique.state.stashes.compton!.weed!.quantity, 30);
});
