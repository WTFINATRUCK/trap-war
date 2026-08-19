import {
  coreAssetIds,
  DEFAULT_ECONOMY_CONTENT,
  type AssetDefinition,
  type ClientDefinition,
  type ClientObjective,
  type EconomyContent,
} from "./content.js";
import {
  commandFingerprint,
  type CommandResult,
  type EconomyCommand,
  type RejectionCode,
  type RejectionDetail,
} from "./commands.js";
import { eventFactory, type DomainEvent, type DomainEventPayload } from "./events.js";
import { getLegalActions, inventoryUnits, totalStashUnits } from "./legal-actions.js";
import type { EconomyState } from "./model.js";
import { createRandomSource, randomSeedId, type RandomSource } from "./random.js";
import { reduceEvent } from "./reducer.js";
import { calculateScore, calculateWealth } from "./scoring.js";
import { V2_VERSIONS, type EconomyVersions } from "./versions.js";

export interface EconomyEngineContext {
  runSeed: string;
  content?: EconomyContent;
  versions?: EconomyVersions;
}

interface Resolution {
  state: EconomyState | undefined;
  events: DomainEvent[];
  emit: (event: DomainEventPayload) => void;
  random: RandomSource;
  content: EconomyContent;
  versions: EconomyVersions;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function reject(
  state: EconomyState | undefined,
  content: EconomyContent,
  code: RejectionCode,
  message: string,
  detail?: RejectionDetail,
): CommandResult {
  return {
    status: "rejected",
    code,
    message,
    ...(detail ? { detail } : {}),
    ...(state ? { state } : {}),
    legalActions: getLegalActions(state, content),
  };
}

function generatePrices(
  content: EconomyContent,
  random: RandomSource,
  stream: string,
  state?: EconomyState,
): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const asset of Object.values(content.assets)) {
    let price = random.int(`${stream}:asset:${asset.id}`, asset.minPrice, asset.maxPriceExclusive);
    const location = content.locations[stream.split(":").at(-1) ?? ""];
    if (location?.cheapAssetIds.includes(asset.id)) price = Math.max(1, Math.floor(price * 0.85));
    if (location?.expensiveAssetIds.includes(asset.id)) price = Math.floor(price * 1.15);

    const forecast = [...(state?.forecasts ?? [])].reverse().find(
      (candidate) =>
        candidate.assetId === asset.id &&
        candidate.locationId === location?.id &&
        state &&
        state.day > candidate.generatedDay &&
        state.day <= candidate.expiresDay,
    );
    if (forecast && state) {
      const agePenaltyBps = Math.max(0, state.day - forecast.generatedDay - 1) * 900;
      const reliabilityBps = clamp(forecast.confidenceBps - agePenaltyBps, 4_000, 9_200);
      const correct = random.chance(`${stream}:forecast:${forecast.forecastId}:reliable`, reliabilityBps);
      const direction = correct ? forecast.direction : forecast.direction === "up" ? "down" : "up";
      const predictedMagnitudeBps = Math.max(
        300,
        Math.floor(Math.abs(forecast.predictedPrice - forecast.referencePrice) * 10_000 / Math.max(1, forecast.referencePrice)),
      );
      const realizedMagnitudeBps = random.int(
        `${stream}:forecast:${forecast.forecastId}:magnitude`,
        Math.max(200, Math.floor(predictedMagnitudeBps * 0.55)),
        Math.max(201, Math.floor(predictedMagnitudeBps * 1.45) + 1),
      );
      price = Math.floor(forecast.referencePrice * (10_000 + (direction === "up" ? realizedMagnitudeBps : -realizedMagnitudeBps)) / 10_000);
      const minimum = Math.max(1, Math.floor(asset.minPrice * (location?.cheapAssetIds.includes(asset.id) ? 0.85 : 1)));
      const maximum = Math.floor((asset.maxPriceExclusive - 1) * (location?.expensiveAssetIds.includes(asset.id) ? 1.15 : 1));
      price = clamp(price, minimum, maximum);
    }
    prices[asset.id] = price;
  }
  return prices;
}

function requiredAction(state: EconomyState, content: EconomyContent): CommandResult | undefined {
  if (state.actionsRemaining > 0) return undefined;
  return reject(state, content, "ACTION_REQUIRED", "No actions remain; end the day to continue.", {
    field: "actionsRemaining",
    required: 1,
    actual: 0,
  });
}

function quantityError(state: EconomyState, content: EconomyContent, quantity: number): CommandResult | undefined {
  if (Number.isSafeInteger(quantity) && quantity > 0) return undefined;
  return reject(state, content, "INVALID_QUANTITY", "Quantity must be a positive whole number.", {
    field: "quantity",
    required: "positive integer",
    actual: String(quantity),
  });
}

function assetError(state: EconomyState, content: EconomyContent, assetId: string): CommandResult | undefined {
  const asset = content.assets[assetId];
  if (!asset) return reject(state, content, "UNKNOWN_ASSET", `Unknown asset: ${assetId}`);
  if (state.day < asset.availableFromDay) {
    return reject(state, content, "ASSET_NOT_AVAILABLE", `${asset.displayName} is not available yet.`, {
      field: "day",
      required: asset.availableFromDay,
      actual: state.day,
    });
  }
  return undefined;
}

function rankFor(state: EconomyState, content: EconomyContent): string {
  const wealth = calculateWealth(state, content).netWorth;
  const diversity = coreAssetIds(content).filter((id) => {
    if ((state.inventory[id] ?? 0) > 0) return true;
    return Object.values(state.stashes).some((stash) => (stash[id]?.quantity ?? 0) > 0);
  }).length;
  const stashedLocations = Object.values(state.stashes).filter((stash) => Object.keys(stash).length > 0).length;
  const rankScore = wealth + diversity * 2_000 + stashedLocations * 3_000;
  let selected = content.ranks[0]?.id ?? "corner_boy";
  for (const rank of content.ranks) {
    if (rankScore >= rank.threshold && diversity >= rank.diversityRequired && stashedLocations >= rank.stashedLocationsRequired) {
      selected = rank.id;
    }
  }
  return selected;
}

function maybeEmitRank(resolution: Resolution): void {
  if (!resolution.state) return;
  const rankId = rankFor(resolution.state, resolution.content);
  if (rankId !== resolution.state.rankId) resolution.emit({ type: "RankChanged", rankId });
}

function objectiveProgress(
  resolution: Resolution,
  objectiveType: ClientObjective["type"],
  assetId: string,
  quantity: number,
): void {
  const state = resolution.state;
  if (!state) return;
  for (const client of Object.values(resolution.content.clients)) {
    const progress = state.clients[client.id];
    if (!progress?.accepted || progress.completed) continue;
    for (const objective of client.objectives) {
      if (objective.type !== objectiveType || objective.locationId !== state.locationId || objective.assetId !== assetId) continue;
      const prior = progress.progress[objective.progressKey] ?? 0;
      const qualifyingTotal = objective.type === "deposit_asset"
        ? state.stashes[objective.locationId]?.[objective.assetId]?.quantity ?? 0
        : prior + quantity;
      const amount = Math.max(0, Math.min(objective.quantity, qualifyingTotal) - prior);
      if (amount > 0) resolution.emit({ type: "ClientProgressed", clientId: client.id, progressKey: objective.progressKey, amount });
    }
    maybeCompleteClient(resolution, client);
  }
}

function maybeCompleteClient(resolution: Resolution, client: ClientDefinition): void {
  const state = resolution.state;
  if (!state) return;
  const progress = state.clients[client.id];
  if (!progress?.accepted || progress.completed) return;
  const complete = client.objectives.every(
    (objective) => (progress.progress[objective.progressKey] ?? 0) >= objective.quantity,
  );
  if (!complete) return;
  if (client.gearRewardAssetId) {
    const reward = resolution.content.assets[client.gearRewardAssetId];
    resolution.emit({
      type: "GearChanged",
      assetId: client.gearRewardAssetId,
      quantity: 1,
      conditionBps: 10_000,
      ...(reward?.travelUses === undefined ? {} : { usesRemaining: reward.travelUses }),
      reason: "client_reward",
    });
  }
  resolution.emit({
    type: "ClientCompleted",
    clientId: client.id,
    unlockedLocationIds: client.unlockLocationIds,
    ...(client.gearRewardAssetId ? { rewardAssetId: client.gearRewardAssetId } : {}),
  });
}

function resolveBuy(command: Extract<EconomyCommand, { type: "BuyAsset" }>, resolution: Resolution): CommandResult | undefined {
  const state = resolution.state!;
  const gate = requiredAction(state, resolution.content) ?? quantityError(state, resolution.content, command.quantity) ?? assetError(state, resolution.content, command.assetId);
  if (gate) return gate;
  const asset = resolution.content.assets[command.assetId]!;
  const unitPrice = state.prices[command.assetId] ?? asset.minPrice;
  const cost = Math.ceil(unitPrice * command.quantity * (10_000 + resolution.content.tradeSpreadBps) / 10_000);
  if (state.cash < cost) return reject(state, resolution.content, "INSUFFICIENT_CASH", "Not enough liquid cash for this purchase.", { required: cost, actual: state.cash });

  if (asset.category === "core") {
    if (inventoryUnits(state) + command.quantity > state.inventoryCapacity) {
      return reject(state, resolution.content, "INVENTORY_CAPACITY_EXCEEDED", "Purchase exceeds carried inventory capacity.", { required: inventoryUnits(state) + command.quantity, actual: state.inventoryCapacity });
    }
  } else if (asset.maxOwned && (state.gear[asset.id]?.quantity ?? 0) + command.quantity > asset.maxOwned) {
    return reject(state, resolution.content, "MAX_OWNED", `Cannot own more than ${asset.maxOwned} ${asset.displayName}.`);
  }

  resolution.emit({ type: "CashChanged", amount: -cost, reason: "purchase" });
  if (asset.category === "core") resolution.emit({ type: "InventoryChanged", assetId: asset.id, quantity: command.quantity, reason: "purchase" });
  else resolution.emit({ type: "GearChanged", assetId: asset.id, quantity: command.quantity, conditionBps: 10_000, ...(asset.travelUses === undefined ? {} : { usesRemaining: asset.travelUses }), reason: "purchase" });
  resolution.emit({ type: "ActionConsumed", action: "buy" });
  maybeEmitRank(resolution);
  return undefined;
}

function resolveSell(command: Extract<EconomyCommand, { type: "SellAsset" }>, resolution: Resolution): CommandResult | undefined {
  const state = resolution.state!;
  const gate = requiredAction(state, resolution.content) ?? quantityError(state, resolution.content, command.quantity) ?? assetError(state, resolution.content, command.assetId);
  if (gate) return gate;
  if ((state.inventory[command.assetId] ?? 0) < command.quantity) return reject(state, resolution.content, "INSUFFICIENT_INVENTORY", "Not enough carried inventory to sell.", { required: command.quantity, actual: state.inventory[command.assetId] ?? 0 });
  const rank = resolution.content.ranks.find((entry) => entry.id === state.rankId);
  const bonusBps = rank?.sellBonusAssetId === command.assetId ? rank.sellBonusBps ?? 0 : 0;
  const gross = Math.floor(
    (state.prices[command.assetId] ?? resolution.content.assets[command.assetId]!.minPrice) *
    command.quantity *
    Math.max(0, 10_000 + bonusBps - resolution.content.tradeSpreadBps) /
    10_000,
  );
  const skim = Math.floor(gross * (rank?.skimRateBps ?? 0) / 10_000);
  resolution.emit({ type: "InventoryChanged", assetId: command.assetId, quantity: -command.quantity, reason: "sale" });
  resolution.emit({ type: "CashChanged", amount: gross - skim, reason: "sale" });
  if (skim > 0) resolution.emit({ type: "ProtectedReservesChanged", amount: skim, reason: "sale_skim" });
  resolution.emit({ type: "ActionConsumed", action: "sell" });
  objectiveProgress(resolution, "sell_asset", command.assetId, command.quantity);
  maybeEmitRank(resolution);
  return undefined;
}

function resolveStash(command: Extract<EconomyCommand, { type: "DepositStash" | "WithdrawStash" }>, resolution: Resolution): CommandResult | undefined {
  const state = resolution.state!;
  const gate = requiredAction(state, resolution.content) ?? quantityError(state, resolution.content, command.quantity) ?? assetError(state, resolution.content, command.assetId);
  if (gate) return gate;
  if (command.type === "DepositStash") {
    if ((state.inventory[command.assetId] ?? 0) < command.quantity) return reject(state, resolution.content, "INSUFFICIENT_INVENTORY", "Not enough carried inventory to deposit.");
    if (totalStashUnits(state) + command.quantity > resolution.content.stashCapacity) return reject(state, resolution.content, "STASH_CAPACITY_EXCEEDED", "Deposit exceeds total stash capacity.");
    resolution.emit({ type: "InventoryChanged", assetId: command.assetId, quantity: -command.quantity, reason: "stash" });
    resolution.emit({ type: "StashChanged", locationId: state.locationId, assetId: command.assetId, quantity: command.quantity, depositedDay: state.day, shieldDaysRemaining: resolution.content.baseStashShieldDays });
    resolution.emit({ type: "ActionConsumed", action: "stash" });
    objectiveProgress(resolution, "deposit_asset", command.assetId, command.quantity);
  } else {
    if (command.locationId !== state.locationId) return reject(state, resolution.content, "WRONG_CITY", "Remote stash withdrawal is not permitted; return to the stash location.", { required: command.locationId, actual: state.locationId });
    const available = state.stashes[command.locationId]?.[command.assetId]?.quantity ?? 0;
    if (available < command.quantity) return reject(state, resolution.content, "INSUFFICIENT_STASH", "Not enough inventory in this local stash.", { required: command.quantity, actual: available });
    if (inventoryUnits(state) + command.quantity > state.inventoryCapacity) return reject(state, resolution.content, "INVENTORY_CAPACITY_EXCEEDED", "Withdrawal exceeds carried inventory capacity.");
    resolution.emit({ type: "StashChanged", locationId: command.locationId, assetId: command.assetId, quantity: -command.quantity, depositedDay: state.day, shieldDaysRemaining: 0 });
    resolution.emit({ type: "InventoryChanged", assetId: command.assetId, quantity: command.quantity, reason: "withdrawal" });
    resolution.emit({ type: "ActionConsumed", action: "withdraw" });
  }
  maybeEmitRank(resolution);
  return undefined;
}

function carriedMarketValue(state: EconomyState, content: EconomyContent): number {
  return coreAssetIds(content).reduce(
    (total, assetId) => total + (state.inventory[assetId] ?? 0) * (state.prices[assetId] ?? content.assets[assetId]!.minPrice),
    0,
  );
}

function robberyChanceBps(state: EconomyState, content: EconomyContent): number {
  const location = content.locations[state.locationId]!;
  const exposedValue = state.cash + carriedMarketValue(state, content);
  const exposureBps = Math.min(1_100, Math.floor(Math.max(0, exposedValue - 400) / 4));
  const stickProtectionBps = (state.gear.stick?.quantity ?? 0) * 300;
  return clamp(location.robberyBaseChanceBps + exposureBps - stickProtectionBps, 100, 2_000);
}

function raidChanceBps(state: EconomyState, content: EconomyContent): number {
  const location = content.locations[state.locationId]!;
  const unitRiskBps = { weed: 2, coke: 8, molly: 16, meth: 28 } as const;
  let inventoryRiskBps = 0;
  for (const assetId of coreAssetIds(content)) {
    inventoryRiskBps += (state.inventory[assetId] ?? 0) * (unitRiskBps[assetId as keyof typeof unitRiskBps] ?? 5);
    const local = state.stashes[state.locationId]?.[assetId];
    if (local && local.shieldDaysRemaining <= 0) {
      inventoryRiskBps += Math.floor(local.quantity * (unitRiskBps[assetId as keyof typeof unitRiskBps] ?? 5) / 2);
    }
  }
  const stickProtectionBps = (state.gear.stick?.quantity ?? 0) * 100;
  return clamp(location.raidBaseChanceBps + Math.min(1_400, inventoryRiskBps) - stickProtectionBps, 100, 2_500);
}

function settleDay(resolution: Resolution, completionReason: "day_30_exhausted" | "day_30_ended" | undefined): void {
  const state = resolution.state!;
  const rank = resolution.content.ranks.find((entry) => entry.id === state.rankId) ?? resolution.content.ranks[0]!;
  let gross = 0;
  for (const assetId of coreAssetIds(resolution.content)) {
    const asset = resolution.content.assets[assetId]!;
    const quantity = state.inventory[assetId] ?? 0;
    const price = state.prices[assetId] ?? asset.minPrice;
    const yieldMultiplier = (10_000 + rank.yieldBonusBps) / 10_000;
    gross += quantity * price * asset.dailyYieldBps / 10_000 * yieldMultiplier;
  }
  for (const stash of Object.values(state.stashes)) {
    for (const [assetId, holding] of Object.entries(stash)) {
      const asset = resolution.content.assets[assetId];
      if (!asset || asset.category !== "core") continue;
      const price = state.prices[assetId] ?? asset.minPrice;
      const yieldMultiplier = (10_000 + rank.yieldBonusBps) / 10_000;
      gross += holding.quantity * (price ?? asset.minPrice) * asset.dailyYieldBps / 10_000 * yieldMultiplier * 1.25;
    }
  }
  gross = Math.floor(gross);
  const skim = Math.floor(gross * rank.skimRateBps / 10_000);
  const net = Math.max(0, gross - skim);
  if (net > 0) resolution.emit({ type: "CashChanged", amount: net, reason: "yield" });
  if (skim > 0) resolution.emit({ type: "ProtectedReservesChanged", amount: skim, reason: "yield_skim" });
  resolution.emit({ type: "YieldAccrued", gross, skim, net });

  const working = resolution.state!;
  const robberyChance = robberyChanceBps(working, resolution.content);
  if (resolution.random.chance(`day:${working.day}:robbery`, robberyChance)) {
    const lossBps = resolution.random.int(`day:${working.day}:robbery:cash_bps`, 1_000, 3_001);
    const protectionMultiplierBps = Math.max(2_500, 10_000 - (working.gear.stick?.quantity ?? 0) * 2_500);
    const cashLost = Math.min(working.cash, Math.floor(working.cash * lossBps * protectionMultiplierBps / 100_000_000));
    const carried = coreAssetIds(resolution.content).filter((id) => (working.inventory[id] ?? 0) > 0);
    const inventoryLost: Record<string, number> = {};
    let totalValueLost = cashLost;
    if (carried.length > 0) {
      const assetId = carried[resolution.random.int(`day:${working.day}:robbery:asset`, 0, carried.length)]!;
      const volatilityMultiplierBps = 10_000 + Math.floor(resolution.content.assets[assetId]!.volatilityBps / 2);
      const quantity = Math.max(1, Math.floor(
        (working.inventory[assetId] ?? 0) *
        resolution.random.int(`day:${working.day}:robbery:inventory_bps`, 1_000, 3_501) *
        protectionMultiplierBps /
        100_000_000 *
        volatilityMultiplierBps /
        10_000,
      ));
      inventoryLost[assetId] = quantity;
      totalValueLost += quantity * (working.prices[assetId] ?? resolution.content.assets[assetId]!.minPrice);
      resolution.emit({ type: "InventoryChanged", assetId, quantity: -quantity, reason: "robbery" });
    }
    if (cashLost > 0) resolution.emit({ type: "CashChanged", amount: -cashLost, reason: "robbery" });
    resolution.emit({ type: "RobberyResolved", cashLost, inventoryLost, totalValueLost });
  }

  const beforeRaid = resolution.state!;
  if (resolution.random.chance(`day:${beforeRaid.day}:raid`, raidChanceBps(beforeRaid, resolution.content))) {
    const carriedLost: Record<string, number> = {};
    const localStashLost: Record<string, number> = {};
    for (const assetId of coreAssetIds(resolution.content)) {
      const carriedQuantity = beforeRaid.inventory[assetId] ?? 0;
      if (carriedQuantity > 0) {
        const baseSeizureBps = { weed: 2_000, coke: 2_500, molly: 3_500, meth: 4_500 }[assetId] ?? 2_500;
        const seizureBps = Math.max(1_000, baseSeizureBps - (beforeRaid.gear.stick?.quantity ?? 0) * 500);
        const lost = Math.max(1, Math.floor(carriedQuantity * seizureBps / 10_000));
        carriedLost[assetId] = lost;
        resolution.emit({ type: "InventoryChanged", assetId, quantity: -lost, reason: "raid" });
      }
      const holding = beforeRaid.stashes[beforeRaid.locationId]?.[assetId];
      if (holding && holding.shieldDaysRemaining <= 0) localStashLost[assetId] = Math.max(1, Math.floor(holding.quantity * 0.25));
    }
    resolution.emit({ type: "RaidResolved", locationId: beforeRaid.locationId, carriedLost, localStashLost });
  }

  resolution.emit({ type: "StashShieldsTicked" });
  resolution.emit({ type: "DayCompleted", completedDay: state.day });
  maybeEmitRank(resolution);
  if (completionReason) {
    const finalState = resolution.state!;
    resolution.emit({ type: "RunCompleted", reason: completionReason, wealth: calculateWealth(finalState, resolution.content), score: calculateScore(finalState, resolution.content) });
  } else {
    const nextDay = state.day + 1;
    resolution.emit({ type: "DayAdvanced", day: nextDay, actions: resolution.content.actionsPerDay });
    resolution.emit({ type: "PricesUpdated", prices: generatePrices(resolution.content, resolution.random, `new_day:${nextDay}:${resolution.state!.locationId}`, resolution.state), reason: "new_day" });
  }
}

function resolveTravel(command: Extract<EconomyCommand, { type: "Travel" }>, resolution: Resolution): CommandResult | undefined {
  const state = resolution.state!;
  const gate = requiredAction(state, resolution.content);
  if (gate) return gate;
  const destination = resolution.content.locations[command.destinationLocationId];
  if (!destination) return reject(state, resolution.content, "UNKNOWN_LOCATION", `Unknown location: ${command.destinationLocationId}`);
  if (!state.unlockedLocationIds.includes(command.destinationLocationId)) return reject(state, resolution.content, "LOCATION_LOCKED", `${destination.displayName} is not unlocked.`);
  if (command.mode === "chopper" && !resolution.content.locations[state.locationId]?.adjacentLocationIds.includes(command.destinationLocationId)) {
    return reject(state, resolution.content, "INVALID_TRAVEL_ROUTE", "Chopper travel is limited to adjacent locations.");
  }
  if (command.mode !== "walk") {
    const asset = resolution.content.assets[command.mode] as AssetDefinition | undefined;
    const holding = state.gear[command.mode];
    if (!holding) return reject(state, resolution.content, "GEAR_REQUIRED", `${asset?.displayName ?? command.mode} is required for this travel mode.`);
    if ((holding.usesRemaining ?? 0) <= 0) return reject(state, resolution.content, "GEAR_EXHAUSTED", `${asset?.displayName ?? command.mode} has no travel uses remaining.`);
    resolution.emit({ type: "GearUsed", assetId: command.mode, uses: 1 });
    resolution.emit({ type: "ActionConsumed", action: "travel" });
  }
  resolution.emit({ type: "TravelCompleted", fromLocationId: state.locationId, toLocationId: command.destinationLocationId, mode: command.mode });
  resolution.emit({ type: "PricesUpdated", prices: generatePrices(resolution.content, resolution.random, `travel:${state.day}:${command.destinationLocationId}`, resolution.state), reason: "travel" });
  if (command.mode === "walk") settleDay(resolution, state.day === resolution.content.maxDays ? "day_30_ended" : undefined);
  return undefined;
}

function clientAvailability(state: EconomyState, client: ClientDefinition, content: EconomyContent): Array<{ code: string; message: string }> {
  const reasons: Array<{ code: string; message: string }> = [];
  const rules = client.availability;
  if (rules.minDay && state.day < rules.minDay) reasons.push({ code: "MIN_DAY", message: `Available on day ${rules.minDay}.` });
  if (rules.locationIds && !rules.locationIds.includes(state.locationId)) reasons.push({ code: "LOCATION", message: `Meet in ${rules.locationIds.map((id) => content.locations[id]?.displayName ?? id).join(", ")}.` });
  if (rules.minCash && state.cash < rules.minCash) reasons.push({ code: "MIN_CASH", message: `Requires ${rules.minCash} cash.` });
  if (rules.minRankId) {
    const current = content.ranks.findIndex((rank) => rank.id === state.rankId);
    const required = content.ranks.findIndex((rank) => rank.id === rules.minRankId);
    if (current < required) reasons.push({ code: "MIN_RANK", message: `Requires rank ${rules.minRankId}.` });
  }
  for (const clientId of rules.requiredClientIds ?? []) {
    if (!state.clients[clientId]?.completed) reasons.push({ code: "CLIENT_PREREQUISITE", message: `Complete ${content.clients[clientId]?.displayName ?? clientId} first.` });
  }
  for (const [assetId, quantity] of Object.entries(rules.requiredInventory ?? {})) {
    if ((state.inventory[assetId] ?? 0) < quantity) reasons.push({ code: "INVENTORY", message: `Carry ${quantity} ${content.assets[assetId]?.displayName ?? assetId}.` });
  }
  return reasons;
}

function resolveClient(command: Extract<EconomyCommand, { type: "AcceptClient" }>, resolution: Resolution): CommandResult | undefined {
  const state = resolution.state!;
  const client = resolution.content.clients[command.clientId];
  if (!client) return reject(state, resolution.content, "UNKNOWN_CLIENT", `Unknown client: ${command.clientId}`);
  const progress = state.clients[command.clientId];
  if (!progress) return reject(state, resolution.content, "UNKNOWN_CLIENT", `Client state is missing: ${command.clientId}`);
  if (progress.completed) return reject(state, resolution.content, "CLIENT_ALREADY_COMPLETED", `${client.displayName} is already complete.`);
  if (progress.accepted) return reject(state, resolution.content, "CLIENT_ALREADY_ACCEPTED", `${client.displayName} is already active.`);
  const reasons = clientAvailability(state, client, resolution.content);
  if (reasons.length > 0) return reject(state, resolution.content, "CLIENT_UNAVAILABLE", `${client.displayName} is not available.`, { reasons });
  resolution.emit({ type: "ClientAccepted", clientId: command.clientId });
  return undefined;
}

function resolvePlug(command: Extract<EconomyCommand, { type: "UsePlug" }>, resolution: Resolution): CommandResult | undefined {
  const state = resolution.state!;
  const gate = requiredAction(state, resolution.content) ?? assetError(state, resolution.content, command.assetId);
  if (gate) return gate;
  if (!resolution.content.locations[command.locationId]) return reject(state, resolution.content, "UNKNOWN_LOCATION", `Unknown location: ${command.locationId}`);
  if ((state.gear.plug?.quantity ?? 0) <= 0) return reject(state, resolution.content, "PLUG_REQUIRED", "The Plug is required to request a forecast.");
  const asset = resolution.content.assets[command.assetId]!;
  const location = resolution.content.locations[command.locationId]!;
  const referencePrice = state.prices[command.assetId] ?? asset.minPrice;
  const sourceType = command.locationId === "east_la"
    ? "street_wire"
    : command.locationId === state.locationId
      ? "local_contact"
      : "distant_source";
  const proximityBps = command.locationId === state.locationId ? 700 : -700;
  const sourceQualityBps = clamp(6_200 + location.informationQualityBps + proximityBps + state.reputation * 200, 4_500, 9_000);
  const sampledConfidenceBps = resolution.random.int(`forecast:${command.assetId}:${command.locationId}:confidence`, 5_200, 8_801);
  const confidenceBps = clamp(Math.floor((sampledConfidenceBps + sourceQualityBps) / 2), 5_000, 9_000);
  const direction = resolution.random.chance(`forecast:${command.assetId}:${command.locationId}:direction`, 5_000) ? "up" : "down";
  const baseMagnitudeBps = clamp(Math.floor(asset.volatilityBps / 4), 500, 2_500);
  const magnitudeBps = resolution.random.int(
    `forecast:${command.assetId}:${command.locationId}:magnitude`,
    Math.max(300, Math.floor(baseMagnitudeBps * 0.7)),
    Math.floor(baseMagnitudeBps * 1.3) + 1,
  );
  const horizonDays = resolution.random.chance(`forecast:${command.assetId}:${command.locationId}:horizon`, 7_500) ? 1 : 2;
  const predictedPrice = Math.max(1, Math.floor(referencePrice * (10_000 + (direction === "up" ? magnitudeBps : -magnitudeBps)) / 10_000));
  const magnitudeBand = magnitudeBps >= 1_600 ? "high" : magnitudeBps >= 800 ? "medium" : "low";
  const evidence = resolution.random.evidence();
  resolution.emit({
    type: "ForecastGenerated",
    forecast: {
      forecastId: `${command.commandId}:forecast`,
      generatedDay: state.day,
      expiresDay: Math.min(resolution.content.maxDays, state.day + horizonDays),
      horizonDays,
      assetId: command.assetId,
      locationId: command.locationId,
      referencePrice,
      predictedPrice,
      direction,
      magnitudeBand,
      sourceType,
      confidenceBps,
      sourceQualityBps,
      randomDecisionIds: evidence.map((item) => item.decisionId),
    },
  });
  resolution.emit({ type: "ActionConsumed", action: "plug" });
  return undefined;
}

function completeIfExhausted(resolution: Resolution): void {
  const state = resolution.state!;
  if (state.status === "active" && state.day === resolution.content.maxDays && state.actionsRemaining === 0) {
    settleDay(resolution, "day_30_exhausted");
  }
}

export function executeCommand(
  state: EconomyState | undefined,
  command: EconomyCommand,
  context: EconomyEngineContext,
): CommandResult {
  const content = context.content ?? DEFAULT_ECONOMY_CONTENT;
  const versions = context.versions ?? V2_VERSIONS;
  const fingerprint = commandFingerprint(command);

  if (state) {
    const processed = state.processedCommands[command.commandId];
    if (processed) {
      if (processed.fingerprint !== fingerprint) return reject(state, content, "IDEMPOTENCY_CONFLICT", "Command ID was already used with a different payload.");
      return { status: "accepted", duplicate: true, resultingStateVersion: processed.resultingStateVersion, state, events: [], randomEvidence: [] };
    }
  }
  if (command.type === "StartRun") {
    if (state) return reject(state, content, "RUN_ALREADY_STARTED", "A run already exists.");
    if (command.expectedStateVersion !== 0) return reject(undefined, content, "STALE_STATE_VERSION", "A new run must start from state version 0.");
  } else {
    if (!state) return reject(undefined, content, "RUN_NOT_STARTED", "Start a run before issuing gameplay commands.");
    if (state.status === "completed") return reject(state, content, "RUN_COMPLETED", "This run is already complete.");
    if (command.expectedStateVersion !== state.stateVersion) return reject(state, content, "STALE_STATE_VERSION", "Expected state version does not match the authoritative state.", { required: state.stateVersion, actual: command.expectedStateVersion });
  }

  const random = createRandomSource(context.runSeed, command.commandId, versions.randomStrategyVersion);
  const events: DomainEvent[] = [];
  const makeEvent = eventFactory(command.commandId, state?.day ?? 1);
  const resolution: Resolution = {
    state,
    events,
    random,
    content,
    versions,
    emit(event) {
      const domainEvent = makeEvent(event);
      events.push(domainEvent);
      resolution.state = reduceEvent(resolution.state, domainEvent);
    },
  };

  let failure: CommandResult | undefined;
  switch (command.type) {
    case "StartRun": {
      const rankId = content.ranks[0]?.id ?? "corner_boy";
      resolution.emit({
        type: "RunStarted",
        runId: command.runId,
        randomSeedId: randomSeedId(context.runSeed),
        versions,
        locationId: content.startingLocationId,
        cash: content.startingCash,
        protectedReserves: content.startingProtectedReserves,
        actions: content.actionsPerDay,
        capacity: content.inventoryCapacity,
        unlockedLocationIds: content.startingUnlockedLocationIds,
        assetIds: Object.keys(content.assets),
        locationIds: Object.keys(content.locations),
        clientIds: Object.keys(content.clients),
        rankId,
      });
      resolution.emit({ type: "PricesUpdated", prices: generatePrices(content, random, `run_start:${content.startingLocationId}`), reason: "run_start" });
      break;
    }
    case "BuyAsset": failure = resolveBuy(command, resolution); break;
    case "SellAsset": failure = resolveSell(command, resolution); break;
    case "DepositStash":
    case "WithdrawStash": failure = resolveStash(command, resolution); break;
    case "Travel": failure = resolveTravel(command, resolution); break;
    case "AcceptClient": failure = resolveClient(command, resolution); break;
    case "UsePlug": failure = resolvePlug(command, resolution); break;
    case "EndDay": settleDay(resolution, resolution.state!.day === content.maxDays ? "day_30_ended" : undefined); break;
    case "EndRun": {
      const current = resolution.state!;
      resolution.emit({ type: "RunCompleted", reason: "ended_early", wealth: calculateWealth(current, content), score: calculateScore(current, content) });
      break;
    }
  }
  if (failure) return failure;

  completeIfExhausted(resolution);
  const resultingStateVersion = (state?.stateVersion ?? 0) + 1;
  const commitEventId = `${command.commandId}:${events.length}`;
  resolution.emit({ type: "CommandCommitted", fingerprint, resultingStateVersion, eventIds: [...events.map((event) => event.eventId), commitEventId] });
  return {
    status: "accepted",
    duplicate: false,
    resultingStateVersion,
    state: resolution.state!,
    events,
    randomEvidence: random.evidence(),
  };
}
