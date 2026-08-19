import { createHash } from "node:crypto";
import {
  calculateWealth,
  DEFAULT_ECONOMY_CONTENT,
  executeCommand,
  V2_VERSIONS,
  type DomainEvent,
  type EconomyCommand,
  type EconomyState,
  type ForecastState,
} from "../src/index.js";
import { AGENTS, type AgentName, type SimulationAgent } from "./agents.js";

export interface FullDistribution {
  min: number;
  p1: number;
  p5: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
  mean: number;
  standardDeviation: number;
}

export interface EventFrequencySeverity {
  opportunities: number;
  events: number;
  probabilityPerOpportunity: number;
  runsWithZero: number;
  runsWithOne: number;
  runsWithTwo: number;
  runsWithThreeOrMore: number;
  lossPerEvent: FullDistribution;
  lossPerAffectedRun: FullDistribution;
  lossAsFinalNetWorth: FullDistribution;
  dayDistribution: Record<string, number>;
  cityDistribution: Record<string, number>;
}

export interface CityAnalysis {
  visitRate: number;
  averageEntryDay: number;
  averageStayDaysPerEntry: number;
  tradesPerRun: number;
  realizedTradeProfitPerRun: number;
  robberiesPerRun: number;
  raidsPerRun: number;
  stashActionsPerRun: number;
  clientObjectiveIds: string[];
}

export interface AssetAnalysis {
  purchaseRunRate: number;
  saleRunRate: number;
  purchaseTransactionsPerRun: number;
  saleTransactionsPerRun: number;
  averagePurchasedUnits: number;
  averageSoldUnits: number;
  realizedReturnMean: number;
  realizedReturnStandardDeviation: number;
  averageContributionWinningRuns: number;
  averageContributionLosingRuns: number;
  activityByCity: Record<string, number>;
}

export interface PacingAnalysis {
  day: number;
  netWorth: FullDistribution;
  bankruptcyRate: number;
  rankDistribution: Record<string, number>;
  meanRobberies: number;
  meanRaids: number;
  meanCityMovements: number;
  meanClientsCompleted: number;
}

export interface AgentCalibrationReport {
  agent: AgentName;
  runs: number;
  netWorth: FullDistribution;
  gameScore: FullDistribution;
  liquidCash: FullDistribution;
  inventoryValue: FullDistribution;
  stashValue: FullDistribution;
  gearValue: FullDistribution;
  yieldContribution: FullDistribution;
  bankruptcyRate: number;
  positiveRunRate: number;
  recovery: {
    lowCapitalDay10Rate: number;
    positiveRecoveryRate: number;
  };
  completionRate: number;
  averageFinalDay: number;
  firstBankruptcyDay: FullDistribution;
  rankDistribution: Record<string, number>;
  clientCompletionRate: Record<string, number>;
  clientCompletionDay: Record<string, FullDistribution>;
  robbery: EventFrequencySeverity;
  raid: EventFrequencySeverity;
  tradesPerRun: number;
  cityUsage: Record<string, CityAnalysis>;
  assetUsage: Record<string, AssetAnalysis>;
  actions: {
    meanConsumed: number;
    byCategoryPerRun: Record<string, number>;
    commandCategoryPerRun: Record<string, number>;
    meanUnusedAtEndDay: number;
    endDayPerRun: number;
    rejectedPolicyCommandRate: number;
    rejectionCodes: Record<string, number>;
  };
  pacing: PacingAnalysis[];
  snowballCorrelation: Record<"day5" | "day10" | "day15", number>;
  maximumDrawdown: FullDistribution;
  forecasts: {
    generatedPerRun: number;
    realizationRate: number;
    ageDays: FullDistribution;
    absolutePercentError: FullDistribution;
    directionAccuracyRate: number;
    profitableRate: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
    expectedMovement: number;
    predictedUpExpectedMovement: number;
    predictedDownExpectedMovement: number;
    highConfidenceExpectedMovement: number;
    directionAccuracyByConfidence: Record<"low" | "medium" | "high", number>;
    profitableRateByConfidence: Record<"low" | "medium" | "high", number>;
  };
  sourcesAndSinks: {
    startingCapital: number;
    yieldSourcePerRun: number;
    clientRewardSourcePerRun: number;
    marketTradeRevaluationGainPerRun: number;
    robberySinkPerRun: number;
    raidSinkPerRun: number;
    marketTradeRevaluationLossPerRun: number;
    reconciliationErrorPerRun: number;
  };
  performance: {
    durationMs: number;
    runsPerSecond: number;
    commandsPerSecond: number;
    engineCommands: number;
    peakRssMb: number;
  };
}

interface ForecastObservation {
  forecast: ForecastState;
  generationPrice: number;
  realized: boolean;
}

interface AssetTrace {
  purchased: boolean;
  sold: boolean;
  purchaseTransactions: number;
  saleTransactions: number;
  purchasedUnits: number;
  soldUnits: number;
  realizedReturns: number[];
  realizedProfit: number;
  costUnits: number;
  costTotal: number;
  activityByCity: Record<string, number>;
}

interface CityTrace {
  visited: boolean;
  entryDays: number[];
  completedDays: number;
  trades: number;
  realizedTradeProfit: number;
  robberies: number;
  raids: number;
  stashActions: number;
}

interface Checkpoint {
  netWorth: number;
  bankrupt: boolean;
  rankId: string;
  robberies: number;
  raids: number;
  cityMovements: number;
  clientsCompleted: number;
}

interface RunTrace {
  state: EconomyState;
  netWorth: number;
  gameScore: number;
  firstBankruptcyDay?: number;
  robberyLosses: number[];
  robberyDays: number[];
  robberyCities: string[];
  raidLosses: number[];
  raidDays: number[];
  raidCities: string[];
  opportunities: number;
  commandCounts: Record<string, number>;
  actionCounts: Record<string, number>;
  unusedActions: number[];
  rejectedPolicyCommands: number;
  rejectionCodes: Record<string, number>;
  engineCommands: number;
  city: Record<string, CityTrace>;
  assets: Record<string, AssetTrace>;
  clientCompletionDays: Record<string, number>;
  highestRankId: string;
  checkpoints: Record<number, Checkpoint>;
  maximumDrawdown: number;
  forecastsGenerated: number;
  forecastAges: number[];
  forecastErrors: number[];
  forecastProfitable: number;
  forecastDirectionCorrect: number;
  forecastFalsePositive: number;
  forecastFalseNegative: number;
  forecastExpectedMovements: number[];
  forecastPredictedUpMovements: number[];
  forecastPredictedDownMovements: number[];
  forecastHighConfidenceMovements: number[];
  forecastConfidenceOutcomes: Record<"low" | "medium" | "high", { total: number; correct: number; profitable: number }>;
  forecastRealized: number;
  yieldSource: number;
  clientRewardSource: number;
  marketGain: number;
  marketLoss: number;
  robberySink: number;
  raidSink: number;
  reconciliationError: number;
}

const STARTING_VALUE =
  DEFAULT_ECONOMY_CONTENT.startingCash + DEFAULT_ECONOMY_CONTENT.startingProtectedReserves;
const CHECKPOINT_DAYS = [5, 10, 15, 20, 25, 30];

function round(value: number, places = 4): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function pseudoRandom(seed: string): () => number {
  let value = createHash("sha256").update(seed).digest().readUInt32BE(0);
  return () => {
    value = (Math.imul(value, 1_664_525) + 1_013_904_223) >>> 0;
    return value / 0x1_0000_0000;
  };
}

function percentile(sorted: number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))] ?? 0;
}

export function fullDistribution(values: number[]): FullDistribution {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, values.length);
  return {
    min: sorted[0] ?? 0,
    p1: percentile(sorted, 0.01),
    p5: percentile(sorted, 0.05),
    p10: percentile(sorted, 0.1),
    p25: percentile(sorted, 0.25),
    median: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
    p90: percentile(sorted, 0.9),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: sorted.at(-1) ?? 0,
    mean: round(mean, 2),
    standardDeviation: round(Math.sqrt(variance), 2),
  };
}

function correlation(left: number[], right: number[]): number {
  if (left.length === 0 || left.length !== right.length) return 0;
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  let numerator = 0;
  let leftSquares = 0;
  let rightSquares = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index]! - leftMean;
    const rightDelta = right[index]! - rightMean;
    numerator += leftDelta * rightDelta;
    leftSquares += leftDelta ** 2;
    rightSquares += rightDelta ** 2;
  }
  return leftSquares === 0 || rightSquares === 0 ? 0 : round(numerator / Math.sqrt(leftSquares * rightSquares));
}

function counter(ids: string[]): Record<string, number> {
  return Object.fromEntries(ids.map((id) => [id, 0]));
}

function makeCityTrace(): Record<string, CityTrace> {
  return Object.fromEntries(Object.keys(DEFAULT_ECONOMY_CONTENT.locations).map((id) => [id, {
    visited: false,
    entryDays: [],
    completedDays: 0,
    trades: 0,
    realizedTradeProfit: 0,
    robberies: 0,
    raids: 0,
    stashActions: 0,
  }]));
}

function makeAssetTrace(): Record<string, AssetTrace> {
  return Object.fromEntries(Object.keys(DEFAULT_ECONOMY_CONTENT.assets).map((id) => [id, {
    purchased: false,
    sold: false,
    purchaseTransactions: 0,
    saleTransactions: 0,
    purchasedUnits: 0,
    soldUnits: 0,
    realizedReturns: [],
    realizedProfit: 0,
    costUnits: 0,
    costTotal: 0,
    activityByCity: counter(Object.keys(DEFAULT_ECONOMY_CONTENT.locations)),
  }]));
}

function raidValue(event: Extract<DomainEvent, { type: "RaidResolved" }>, prices: Record<string, number>): number {
  const losses = { ...event.carriedLost };
  for (const [assetId, quantity] of Object.entries(event.localStashLost)) {
    losses[assetId] = (losses[assetId] ?? 0) + quantity;
  }
  return Object.entries(losses).reduce(
    (total, [assetId, quantity]) => total + (prices[assetId] ?? 0) * quantity,
    0,
  );
}

function removeCost(trace: AssetTrace, quantity: number): number {
  if (trace.costUnits <= 0 || quantity <= 0) return 0;
  const removedUnits = Math.min(quantity, trace.costUnits);
  const cost = trace.costTotal * (removedUnits / trace.costUnits);
  trace.costUnits -= removedUnits;
  trace.costTotal -= cost;
  return cost;
}

function snapshot(state: EconomyState): Checkpoint {
  const wealth = calculateWealth(state, DEFAULT_ECONOMY_CONTENT);
  return {
    netWorth: wealth.netWorth,
    bankrupt: wealth.netWorth <= wealth.vaultValue,
    rankId: state.rankId,
    robberies: state.stats.robberiesTriggered,
    raids: state.stats.raidsTriggered,
    cityMovements: Object.values(state.stats.cityVisits).reduce((sum, value) => sum + value, 0) - 1,
    clientsCompleted: Object.values(state.clients).filter((client) => client.completed).length,
  };
}

function observeForecasts(
  active: ForecastObservation[],
  locationId: string,
  day: number,
  prices: Record<string, number>,
  trace: RunTrace,
): void {
  for (const observation of active) {
    if (observation.realized || observation.forecast.locationId !== locationId) continue;
    if (day <= observation.forecast.generatedDay || day > observation.forecast.expiresDay) continue;
    observation.realized = true;
    const actual = prices[observation.forecast.assetId] ?? observation.generationPrice;
    const predictedDelta = observation.forecast.predictedPrice - observation.generationPrice;
    const actualDelta = actual - observation.generationPrice;
    trace.forecastRealized += 1;
    trace.forecastAges.push(day - observation.forecast.generatedDay);
    trace.forecastErrors.push(Math.abs(actual - observation.forecast.predictedPrice) / Math.max(1, actual));
    if (predictedDelta > 0 && actualDelta > 0) trace.forecastProfitable += 1;
    const profitable = predictedDelta > 0 && actualDelta > 0;
    const correct = (predictedDelta > 0 && actualDelta > 0) || (predictedDelta <= 0 && actualDelta <= 0);
    if (correct) {
      trace.forecastDirectionCorrect += 1;
    }
    if (predictedDelta > 0 && actualDelta <= 0) trace.forecastFalsePositive += 1;
    if (predictedDelta <= 0 && actualDelta > 0) trace.forecastFalseNegative += 1;
    trace.forecastExpectedMovements.push(actualDelta);
    if (predictedDelta > 0) trace.forecastPredictedUpMovements.push(actualDelta);
    else trace.forecastPredictedDownMovements.push(actualDelta);
    if (observation.forecast.confidenceBps >= 7_500) trace.forecastHighConfidenceMovements.push(actualDelta);
    const confidence = observation.forecast.confidenceBps >= 7_500 ? "high" : observation.forecast.confidenceBps >= 6_500 ? "medium" : "low";
    trace.forecastConfidenceOutcomes[confidence].total += 1;
    if (correct) trace.forecastConfidenceOutcomes[confidence].correct += 1;
    if (profitable) trace.forecastConfidenceOutcomes[confidence].profitable += 1;
  }
}

function simulateRun(agent: SimulationAgent, runIndex: number): RunTrace {
  const runSeed = `m5.6-calibration:${agent.name}:${runIndex}`;
  const started = executeCommand(undefined, {
    type: "StartRun",
    commandId: `${agent.name}:${runIndex}:start`,
    expectedStateVersion: 0,
    runId: `${agent.name}-${runIndex}`,
  }, { runSeed });
  if (started.status !== "accepted") throw new Error(`Unable to start run: ${started.code}`);

  let state = started.state;
  let peakWealth = calculateWealth(state, DEFAULT_ECONOMY_CONTENT).netWorth;
  const random = pseudoRandom(`${runSeed}:agent-policy`);
  const activeForecasts: ForecastObservation[] = [];
  const trace: RunTrace = {
    state,
    netWorth: 0,
    gameScore: 0,
    robberyLosses: [],
    robberyDays: [],
    robberyCities: [],
    raidLosses: [],
    raidDays: [],
    raidCities: [],
    opportunities: 0,
    commandCounts: {},
    actionCounts: {},
    unusedActions: [],
    rejectedPolicyCommands: 0,
    rejectionCodes: {},
    engineCommands: 1,
    city: makeCityTrace(),
    assets: makeAssetTrace(),
    clientCompletionDays: {},
    highestRankId: state.rankId,
    checkpoints: {},
    maximumDrawdown: 0,
    forecastsGenerated: 0,
    forecastAges: [],
    forecastErrors: [],
    forecastProfitable: 0,
    forecastDirectionCorrect: 0,
    forecastFalsePositive: 0,
    forecastFalseNegative: 0,
    forecastExpectedMovements: [],
    forecastPredictedUpMovements: [],
    forecastPredictedDownMovements: [],
    forecastHighConfidenceMovements: [],
    forecastConfidenceOutcomes: {
      low: { total: 0, correct: 0, profitable: 0 },
      medium: { total: 0, correct: 0, profitable: 0 },
      high: { total: 0, correct: 0, profitable: 0 },
    },
    forecastRealized: 0,
    yieldSource: 0,
    clientRewardSource: 0,
    marketGain: 0,
    marketLoss: 0,
    robberySink: 0,
    raidSink: 0,
    reconciliationError: 0,
  };
  trace.city[state.locationId]!.visited = true;
  trace.city[state.locationId]!.entryDays.push(1);

  for (let step = 0; step < 250 && state.status === "active"; step += 1) {
    const before = state;
    const beforeWealth = calculateWealth(before, DEFAULT_ECONOMY_CONTENT).netWorth;
    const commandId = `${agent.name}:${runIndex}:${step}`;
    let requested = agent.decide(state, commandId, random);
    let result = executeCommand(state, requested, { runSeed });
    trace.engineCommands += 1;
    if (result.status === "rejected") {
      trace.rejectedPolicyCommands += 1;
      trace.rejectionCodes[result.code] = (trace.rejectionCodes[result.code] ?? 0) + 1;
      requested = { type: "EndDay", commandId: `${commandId}:fallback`, expectedStateVersion: state.stateVersion };
      result = executeCommand(state, requested, { runSeed });
      trace.engineCommands += 1;
    }
    if (result.status !== "accepted") throw new Error(`${agent.name} stalled on run ${runIndex}: ${result.code}`);

    state = result.state;
    trace.commandCounts[requested.type] = (trace.commandCounts[requested.type] ?? 0) + 1;
    if (requested.type === "EndDay") trace.unusedActions.push(before.actionsRemaining);

    if (requested.type === "BuyAsset") {
      const asset = trace.assets[requested.assetId]!;
      const cost = (before.prices[requested.assetId] ?? 0) * requested.quantity;
      asset.purchased = true;
      asset.purchaseTransactions += 1;
      asset.purchasedUnits += requested.quantity;
      asset.costUnits += requested.quantity;
      asset.costTotal += cost;
      asset.activityByCity[before.locationId] += 1;
    }
    if (requested.type === "SellAsset") {
      const asset = trace.assets[requested.assetId]!;
      const revenue = result.events.reduce((total, event) => {
        if (event.type === "CashChanged" && event.reason === "sale") return total + event.amount;
        if (event.type === "ProtectedReservesChanged" && event.reason === "sale_skim") return total + event.amount;
        return total;
      }, 0);
      const cost = removeCost(asset, requested.quantity);
      const profit = revenue - cost;
      asset.sold = true;
      asset.saleTransactions += 1;
      asset.soldUnits += requested.quantity;
      asset.realizedProfit += profit;
      asset.realizedReturns.push(cost > 0 ? profit / cost : 0);
      asset.activityByCity[before.locationId] += 1;
      trace.city[before.locationId]!.trades += 1;
      trace.city[before.locationId]!.realizedTradeProfit += profit;
    }
    if (requested.type === "BuyAsset") trace.city[before.locationId]!.trades += 1;
    if (requested.type === "DepositStash" || requested.type === "WithdrawStash") {
      trace.city[before.locationId]!.stashActions += 1;
    }

    let eventLocation = before.locationId;
    let eventDay = before.day;
    let eventPrices = before.prices;
    let knownDelta = 0;
    for (const event of result.events) {
      if (event.type === "ActionConsumed") {
        trace.actionCounts[event.action] = (trace.actionCounts[event.action] ?? 0) + 1;
      } else if (event.type === "TravelCompleted") {
        eventLocation = event.toLocationId;
        trace.city[eventLocation]!.visited = true;
        trace.city[eventLocation]!.entryDays.push(eventDay);
      } else if (event.type === "DayAdvanced") {
        eventDay = event.day;
      } else if (event.type === "PricesUpdated") {
        eventPrices = event.prices;
        observeForecasts(activeForecasts, eventLocation, eventDay, event.prices, trace);
      } else if (event.type === "YieldAccrued") {
        trace.yieldSource += event.gross;
        knownDelta += event.gross;
      } else if (event.type === "RobberyResolved") {
        trace.robberyLosses.push(event.totalValueLost);
        trace.robberyDays.push(eventDay);
        trace.robberyCities.push(eventLocation);
        trace.city[eventLocation]!.robberies += 1;
        trace.robberySink += event.totalValueLost;
        knownDelta -= event.totalValueLost;
        for (const [assetId, quantity] of Object.entries(event.inventoryLost)) removeCost(trace.assets[assetId]!, quantity);
      } else if (event.type === "RaidResolved") {
        const loss = raidValue(event, eventPrices);
        trace.raidLosses.push(loss);
        trace.raidDays.push(eventDay);
        trace.raidCities.push(event.locationId);
        trace.city[event.locationId]!.raids += 1;
        trace.raidSink += loss;
        knownDelta -= loss;
        for (const [assetId, quantity] of Object.entries(event.carriedLost)) removeCost(trace.assets[assetId]!, quantity);
        for (const [assetId, quantity] of Object.entries(event.localStashLost)) removeCost(trace.assets[assetId]!, quantity);
      } else if (event.type === "DayCompleted") {
        trace.opportunities += 1;
        trace.city[eventLocation]!.completedDays += 1;
      } else if (event.type === "ClientCompleted") {
        trace.clientCompletionDays[event.clientId] = eventDay;
      } else if (event.type === "ClientProgressed") {
        trace.commandCounts.ClientObjectiveProgress = (trace.commandCounts.ClientObjectiveProgress ?? 0) + 1;
      } else if (event.type === "GearChanged" && event.reason === "client_reward") {
        const definition = DEFAULT_ECONOMY_CONTENT.assets[event.assetId]!;
        const reward = Math.floor(
          ((state.prices[event.assetId] ?? definition.minPrice) * event.quantity * (definition.gearValuationBps ?? 0) * event.conditionBps) /
            100_000_000,
        );
        trace.clientRewardSource += reward;
        knownDelta += reward;
      } else if (event.type === "ForecastGenerated") {
        trace.forecastsGenerated += 1;
        activeForecasts.push({
          forecast: event.forecast,
          generationPrice: before.prices[event.forecast.assetId] ?? 0,
          realized: false,
        });
      }
    }

    const afterWealth = calculateWealth(state, DEFAULT_ECONOMY_CONTENT).netWorth;
    const currentRankIndex = DEFAULT_ECONOMY_CONTENT.ranks.findIndex((rank) => rank.id === state.rankId);
    const highestRankIndex = DEFAULT_ECONOMY_CONTENT.ranks.findIndex((rank) => rank.id === trace.highestRankId);
    if (currentRankIndex > highestRankIndex) trace.highestRankId = state.rankId;
    const residual = afterWealth - beforeWealth - knownDelta;
    if (residual >= 0) trace.marketGain += residual;
    else trace.marketLoss += -residual;
    peakWealth = Math.max(peakWealth, afterWealth);
    trace.maximumDrawdown = Math.max(trace.maximumDrawdown, peakWealth - afterWealth);
    if (trace.firstBankruptcyDay === undefined && afterWealth <= state.protectedReserves) trace.firstBankruptcyDay = state.day;

    for (const day of CHECKPOINT_DAYS) {
      if (!trace.checkpoints[day] && (state.day > day || (state.status === "completed" && state.day === day))) {
        trace.checkpoints[day] = snapshot(state);
      }
    }
  }

  if (state.status !== "completed") throw new Error(`${agent.name} exceeded simulation command budget`);
  const wealth = state.finalWealth ?? calculateWealth(state, DEFAULT_ECONOMY_CONTENT);
  trace.state = state;
  trace.netWorth = wealth.netWorth;
  trace.gameScore = state.finalScore?.gameScore ?? wealth.netWorth;
  trace.reconciliationError =
    wealth.netWorth -
    (STARTING_VALUE + trace.yieldSource + trace.clientRewardSource + trace.marketGain - trace.robberySink - trace.raidSink - trace.marketLoss);
  // The completed trace never executes another command; retaining its command ledger only inflates calibration memory.
  trace.state.processedCommands = {};
  return trace;
}

function rates(values: string[], total: number): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).map(([key, count]) => [key, round(count / total)]));
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function eventAnalysis(
  traces: RunTrace[],
  type: "robbery" | "raid",
): EventFrequencySeverity {
  const losses = traces.flatMap((trace) => type === "robbery" ? trace.robberyLosses : trace.raidLosses);
  const perRun = traces.map((trace) => (type === "robbery" ? trace.robberyLosses : trace.raidLosses).reduce((sum, value) => sum + value, 0));
  const counts = traces.map((trace) => type === "robbery" ? trace.robberyLosses.length : trace.raidLosses.length);
  const days = traces.flatMap((trace) => type === "robbery" ? trace.robberyDays : trace.raidDays).map(String);
  const cities = traces.flatMap((trace) => type === "robbery" ? trace.robberyCities : trace.raidCities);
  const opportunities = traces.reduce((sum, trace) => sum + trace.opportunities, 0);
  return {
    opportunities,
    events: losses.length,
    probabilityPerOpportunity: round(losses.length / Math.max(1, opportunities)),
    runsWithZero: round(counts.filter((count) => count === 0).length / traces.length),
    runsWithOne: round(counts.filter((count) => count === 1).length / traces.length),
    runsWithTwo: round(counts.filter((count) => count === 2).length / traces.length),
    runsWithThreeOrMore: round(counts.filter((count) => count >= 3).length / traces.length),
    lossPerEvent: fullDistribution(losses),
    lossPerAffectedRun: fullDistribution(perRun.filter((value) => value > 0)),
    lossAsFinalNetWorth: fullDistribution(perRun.map((value, index) => value / Math.max(1, traces[index]!.netWorth))),
    dayDistribution: rates(days, Math.max(1, losses.length)),
    cityDistribution: rates(cities, Math.max(1, losses.length)),
  };
}

function cityAnalysis(traces: RunTrace[]): Record<string, CityAnalysis> {
  return Object.fromEntries(Object.keys(DEFAULT_ECONOMY_CONTENT.locations).map((locationId) => {
    const rows = traces.map((trace) => trace.city[locationId]!);
    const entries = rows.flatMap((row) => row.entryDays);
    const objectives = Object.values(DEFAULT_ECONOMY_CONTENT.clients).flatMap((client) =>
      client.objectives.filter((objective) => objective.locationId === locationId).map((objective) => `${client.id}:${objective.progressKey}`),
    );
    return [locationId, {
      visitRate: round(rows.filter((row) => row.visited).length / traces.length),
      averageEntryDay: round(mean(entries), 2),
      averageStayDaysPerEntry: round(rows.reduce((sum, row) => sum + row.completedDays, 0) / Math.max(1, entries.length), 2),
      tradesPerRun: round(rows.reduce((sum, row) => sum + row.trades, 0) / traces.length, 2),
      realizedTradeProfitPerRun: round(rows.reduce((sum, row) => sum + row.realizedTradeProfit, 0) / traces.length, 2),
      robberiesPerRun: round(rows.reduce((sum, row) => sum + row.robberies, 0) / traces.length, 2),
      raidsPerRun: round(rows.reduce((sum, row) => sum + row.raids, 0) / traces.length, 2),
      stashActionsPerRun: round(rows.reduce((sum, row) => sum + row.stashActions, 0) / traces.length, 2),
      clientObjectiveIds: objectives,
    } satisfies CityAnalysis];
  }));
}

function assetContribution(trace: RunTrace, assetId: string): number {
  const asset = trace.assets[assetId]!;
  const definition = DEFAULT_ECONOMY_CONTENT.assets[assetId]!;
  const carried = trace.state.inventory[assetId] ?? 0;
  const stashed = Object.values(trace.state.stashes).reduce((sum, stash) => sum + (stash[assetId]?.quantity ?? 0), 0);
  const marketValue = (trace.state.prices[assetId] ?? definition.minPrice) * (carried + stashed);
  const gear = trace.state.gear[assetId];
  const gearValue = gear
    ? Math.floor((trace.state.prices[assetId] ?? definition.minPrice) * gear.quantity * (definition.gearValuationBps ?? 0) * gear.conditionBps / 100_000_000)
    : 0;
  return asset.realizedProfit + marketValue + gearValue - asset.costTotal;
}

function assetAnalysis(traces: RunTrace[]): Record<string, AssetAnalysis> {
  return Object.fromEntries(Object.keys(DEFAULT_ECONOMY_CONTENT.assets).map((assetId) => {
    const rows = traces.map((trace) => trace.assets[assetId]!);
    const returns = rows.flatMap((row) => row.realizedReturns);
    const winning = traces.filter((trace) => trace.netWorth > STARTING_VALUE).map((trace) => assetContribution(trace, assetId));
    const losing = traces.filter((trace) => trace.netWorth <= STARTING_VALUE).map((trace) => assetContribution(trace, assetId));
    const returnDistribution = fullDistribution(returns);
    const cityActivity: Record<string, number> = {};
    for (const locationId of Object.keys(DEFAULT_ECONOMY_CONTENT.locations)) {
      cityActivity[locationId] = round(rows.reduce((sum, row) => sum + row.activityByCity[locationId]!, 0) / traces.length, 3);
    }
    return [assetId, {
      purchaseRunRate: round(rows.filter((row) => row.purchased).length / traces.length),
      saleRunRate: round(rows.filter((row) => row.sold).length / traces.length),
      purchaseTransactionsPerRun: round(rows.reduce((sum, row) => sum + row.purchaseTransactions, 0) / traces.length, 3),
      saleTransactionsPerRun: round(rows.reduce((sum, row) => sum + row.saleTransactions, 0) / traces.length, 3),
      averagePurchasedUnits: round(rows.reduce((sum, row) => sum + row.purchasedUnits, 0) / traces.length, 2),
      averageSoldUnits: round(rows.reduce((sum, row) => sum + row.soldUnits, 0) / traces.length, 2),
      realizedReturnMean: returnDistribution.mean,
      realizedReturnStandardDeviation: returnDistribution.standardDeviation,
      averageContributionWinningRuns: round(mean(winning), 2),
      averageContributionLosingRuns: round(mean(losing), 2),
      activityByCity: cityActivity,
    } satisfies AssetAnalysis];
  }));
}

function pacing(traces: RunTrace[]): PacingAnalysis[] {
  return CHECKPOINT_DAYS.map((day) => {
    const points = traces.map((trace) => trace.checkpoints[day]!).filter(Boolean);
    return {
      day,
      netWorth: fullDistribution(points.map((point) => point.netWorth)),
      bankruptcyRate: round(points.filter((point) => point.bankrupt).length / points.length),
      rankDistribution: rates(points.map((point) => point.rankId), points.length),
      meanRobberies: round(mean(points.map((point) => point.robberies)), 2),
      meanRaids: round(mean(points.map((point) => point.raids)), 2),
      meanCityMovements: round(mean(points.map((point) => point.cityMovements)), 2),
      meanClientsCompleted: round(mean(points.map((point) => point.clientsCompleted)), 2),
    };
  });
}

export function simulateAgentCalibration(agent: SimulationAgent, runs: number): AgentCalibrationReport {
  const startedAt = performance.now();
  let peakRss = process.memoryUsage().rss;
  const traces: RunTrace[] = [];
  for (let index = 0; index < runs; index += 1) {
    traces.push(simulateRun(agent, index));
    if (index % 100 === 0) peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }
  const durationMs = performance.now() - startedAt;
  const finalWealth = traces.map((trace) => calculateWealth(trace.state, DEFAULT_ECONOMY_CONTENT));
  const engineCommands = traces.reduce((sum, trace) => sum + trace.engineCommands, 0);
  const clientIds = Object.keys(DEFAULT_ECONOMY_CONTENT.clients);
  const clientCompletionRate = Object.fromEntries(clientIds.map((id) => [id, round(traces.filter((trace) => trace.state.clients[id]?.completed).length / runs)]));
  const clientCompletionDay = Object.fromEntries(clientIds.map((id) => [id, fullDistribution(traces.map((trace) => trace.clientCompletionDays[id]).filter((day): day is number => day !== undefined))]));
  const consumedActions = traces.map((trace) => trace.state.stats.actionsUsed);
  const actionCategories = new Set(traces.flatMap((trace) => Object.keys(trace.actionCounts)));
  const commandCategories = new Set(traces.flatMap((trace) => Object.keys(trace.commandCounts)));
  const finalValues = traces.map((trace) => trace.netWorth);
  const rankIds = traces.map((trace) => trace.highestRankId);
  const forecastRealized = traces.reduce((sum, trace) => sum + trace.forecastRealized, 0);
  const forecastsGenerated = traces.reduce((sum, trace) => sum + trace.forecastsGenerated, 0);
  const checkpoint = (day: number) => traces.map((trace) => trace.checkpoints[day]?.netWorth ?? trace.netWorth);
  const lowCapitalAtDay10 = traces.filter((trace) => (trace.checkpoints[10]?.netWorth ?? trace.netWorth) < STARTING_VALUE);
  const confidenceRates = (field: "correct" | "profitable") => Object.fromEntries(
    (["low", "medium", "high"] as const).map((band) => {
      const totals = traces.reduce((sum, trace) => sum + trace.forecastConfidenceOutcomes[band].total, 0);
      const outcomes = traces.reduce((sum, trace) => sum + trace.forecastConfidenceOutcomes[band][field], 0);
      return [band, round(outcomes / Math.max(1, totals))];
    }),
  ) as Record<"low" | "medium" | "high", number>;

  return {
    agent: agent.name,
    runs,
    netWorth: fullDistribution(finalValues),
    gameScore: fullDistribution(traces.map((trace) => trace.gameScore)),
    liquidCash: fullDistribution(finalWealth.map((wealth) => wealth.liquidCash)),
    inventoryValue: fullDistribution(finalWealth.map((wealth) => wealth.inventoryMarketValue)),
    stashValue: fullDistribution(finalWealth.map((wealth) => wealth.stashMarketValue)),
    gearValue: fullDistribution(finalWealth.map((wealth) => wealth.gearPropertyValue)),
    yieldContribution: fullDistribution(traces.map((trace) => trace.yieldSource)),
    bankruptcyRate: round(traces.filter((trace) => trace.netWorth <= trace.state.protectedReserves).length / runs),
    positiveRunRate: round(traces.filter((trace) => trace.netWorth > STARTING_VALUE).length / runs),
    recovery: {
      lowCapitalDay10Rate: round(lowCapitalAtDay10.length / runs),
      positiveRecoveryRate: round(lowCapitalAtDay10.filter((trace) => trace.netWorth > STARTING_VALUE).length / Math.max(1, lowCapitalAtDay10.length)),
    },
    completionRate: round(traces.filter((trace) => trace.state.status === "completed").length / runs),
    averageFinalDay: round(mean(traces.map((trace) => trace.state.day)), 2),
    firstBankruptcyDay: fullDistribution(traces.map((trace) => trace.firstBankruptcyDay).filter((day): day is number => day !== undefined)),
    rankDistribution: rates(rankIds, runs),
    clientCompletionRate,
    clientCompletionDay,
    robbery: eventAnalysis(traces, "robbery"),
    raid: eventAnalysis(traces, "raid"),
    tradesPerRun: round(mean(traces.map((trace) => (trace.commandCounts.BuyAsset ?? 0) + (trace.commandCounts.SellAsset ?? 0))), 2),
    cityUsage: cityAnalysis(traces),
    assetUsage: assetAnalysis(traces),
    actions: {
      meanConsumed: round(mean(consumedActions), 2),
      byCategoryPerRun: Object.fromEntries([...actionCategories].map((category) => [category, round(mean(traces.map((trace) => trace.actionCounts[category] ?? 0)), 3)])),
      commandCategoryPerRun: Object.fromEntries([...commandCategories].map((category) => [category, round(mean(traces.map((trace) => trace.commandCounts[category] ?? 0)), 3)])),
      meanUnusedAtEndDay: round(mean(traces.flatMap((trace) => trace.unusedActions)), 2),
      endDayPerRun: round(mean(traces.map((trace) => trace.commandCounts.EndDay ?? 0)), 2),
      rejectedPolicyCommandRate: round(traces.reduce((sum, trace) => sum + trace.rejectedPolicyCommands, 0) / engineCommands),
      rejectionCodes: Object.fromEntries(
        [...new Set(traces.flatMap((trace) => Object.keys(trace.rejectionCodes)))].map((code) => [
          code,
          traces.reduce((sum, trace) => sum + (trace.rejectionCodes[code] ?? 0), 0),
        ]),
      ),
    },
    pacing: pacing(traces),
    snowballCorrelation: {
      day5: correlation(checkpoint(5), finalValues),
      day10: correlation(checkpoint(10), finalValues),
      day15: correlation(checkpoint(15), finalValues),
    },
    maximumDrawdown: fullDistribution(traces.map((trace) => trace.maximumDrawdown)),
    forecasts: {
      generatedPerRun: round(forecastsGenerated / runs, 3),
      realizationRate: round(forecastRealized / Math.max(1, forecastsGenerated)),
      ageDays: fullDistribution(traces.flatMap((trace) => trace.forecastAges)),
      absolutePercentError: fullDistribution(traces.flatMap((trace) => trace.forecastErrors)),
      directionAccuracyRate: round(traces.reduce((sum, trace) => sum + trace.forecastDirectionCorrect, 0) / Math.max(1, forecastRealized)),
      profitableRate: round(traces.reduce((sum, trace) => sum + trace.forecastProfitable, 0) / Math.max(1, forecastRealized)),
      falsePositiveRate: round(traces.reduce((sum, trace) => sum + trace.forecastFalsePositive, 0) / Math.max(1, forecastRealized)),
      falseNegativeRate: round(traces.reduce((sum, trace) => sum + trace.forecastFalseNegative, 0) / Math.max(1, forecastRealized)),
      expectedMovement: round(mean(traces.flatMap((trace) => trace.forecastExpectedMovements)), 2),
      predictedUpExpectedMovement: round(mean(traces.flatMap((trace) => trace.forecastPredictedUpMovements)), 2),
      predictedDownExpectedMovement: round(mean(traces.flatMap((trace) => trace.forecastPredictedDownMovements)), 2),
      highConfidenceExpectedMovement: round(mean(traces.flatMap((trace) => trace.forecastHighConfidenceMovements)), 2),
      directionAccuracyByConfidence: confidenceRates("correct"),
      profitableRateByConfidence: confidenceRates("profitable"),
    },
    sourcesAndSinks: {
      startingCapital: STARTING_VALUE,
      yieldSourcePerRun: round(mean(traces.map((trace) => trace.yieldSource)), 2),
      clientRewardSourcePerRun: round(mean(traces.map((trace) => trace.clientRewardSource)), 2),
      marketTradeRevaluationGainPerRun: round(mean(traces.map((trace) => trace.marketGain)), 2),
      robberySinkPerRun: round(mean(traces.map((trace) => trace.robberySink)), 2),
      raidSinkPerRun: round(mean(traces.map((trace) => trace.raidSink)), 2),
      marketTradeRevaluationLossPerRun: round(mean(traces.map((trace) => trace.marketLoss)), 2),
      reconciliationErrorPerRun: round(mean(traces.map((trace) => trace.reconciliationError)), 6),
    },
    performance: {
      durationMs: round(durationMs, 2),
      runsPerSecond: round(runs / (durationMs / 1_000), 2),
      commandsPerSecond: round(engineCommands / (durationMs / 1_000), 2),
      engineCommands,
      peakRssMb: round(peakRss / 1_048_576, 2),
    },
  };
}

export interface CalibrationReport {
  generatedAt: string;
  versions: EconomyState["versions"];
  runsPerAgent: number;
  totalRuns: number;
  agents: AgentCalibrationReport[];
}

export function runCalibration(agentNames: AgentName[], runsPerAgent: number): CalibrationReport {
  if (!Number.isSafeInteger(runsPerAgent) || runsPerAgent <= 0) throw new Error("runsPerAgent must be a positive integer");
  const selected = agentNames.map((name) => {
    const agent = AGENTS.find((candidate) => candidate.name === name);
    if (!agent) throw new Error(`Unknown agent: ${name}`);
    return agent;
  });
  const reports = selected.map((agent) => simulateAgentCalibration(agent, runsPerAgent));
  return {
    generatedAt: new Date().toISOString(),
    versions: {
      ...V2_VERSIONS,
    },
    runsPerAgent,
    totalRuns: runsPerAgent * reports.length,
    agents: reports,
  };
}
