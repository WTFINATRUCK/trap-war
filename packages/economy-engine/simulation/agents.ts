import {
  coreAssetIds,
  DEFAULT_ECONOMY_CONTENT,
  inventoryUnits,
  type EconomyCommand,
  type EconomyState,
} from "../src/index.js";

export type AgentName =
  | "random"
  | "conservative"
  | "aggressive"
  | "rumor_follower"
  | "opportunist"
  | "client_seeker"
  | "rank_climber"
  | "stash_heavy"
  | "yield_farmer"
  | "plug_skeptic"
  | "plug_believer"
  | "information_aware_opportunist"
  | "gear_strategist";

export interface SimulationAgent {
  name: AgentName;
  decide(state: EconomyState, commandId: string, random: () => number): EconomyCommand;
}

function command<T extends Omit<EconomyCommand, "commandId" | "expectedStateVersion">>(
  state: EconomyState,
  commandId: string,
  value: T,
): EconomyCommand {
  return { ...value, commandId, expectedStateVersion: state.stateVersion } as EconomyCommand;
}

function coreAssets(state: EconomyState): string[] {
  return coreAssetIds(DEFAULT_ECONOMY_CONTENT).filter(
    (id) => state.day >= DEFAULT_ECONOMY_CONTENT.assets[id]!.availableFromDay,
  );
}

function buyQuantity(state: EconomyState, assetId: string, cashReserve = 0, cap = 25): number {
  const marketPrice = state.prices[assetId] ?? Number.MAX_SAFE_INTEGER;
  const price = Math.ceil(marketPrice * (10_000 + DEFAULT_ECONOMY_CONTENT.tradeSpreadBps) / 10_000);
  const space = state.inventoryCapacity - inventoryUnits(state);
  return Math.max(0, Math.min(cap, space, Math.floor(Math.max(0, state.cash - cashReserve) / price)));
}

function remainingStashCapacity(state: EconomyState): number {
  const used = Object.values(state.stashes).reduce(
    (total, stash) => total + Object.values(stash).reduce((cityTotal, holding) => cityTotal + holding.quantity, 0),
    0,
  );
  return Math.max(0, DEFAULT_ECONOMY_CONTENT.stashCapacity - used);
}

function adjacentDestination(state: EconomyState, random: () => number): string | undefined {
  const adjacent = DEFAULT_ECONOMY_CONTENT.locations[state.locationId]!.adjacentLocationIds.filter((id) =>
    state.unlockedLocationIds.includes(id),
  );
  return adjacent[Math.floor(random() * adjacent.length)];
}

function normalizedPrice(state: EconomyState, assetId: string): number {
  const asset = DEFAULT_ECONOMY_CONTENT.assets[assetId]!;
  return ((state.prices[assetId] ?? asset.minPrice) - asset.minPrice) /
    (asset.maxPriceExclusive - asset.minPrice);
}

function endDay(state: EconomyState, commandId: string): EconomyCommand {
  return command(state, commandId, { type: "EndDay" });
}

function travelTo(state: EconomyState, commandId: string, locationId: string): EconomyCommand | undefined {
  if (state.locationId === locationId || !state.unlockedLocationIds.includes(locationId)) return undefined;
  return command(state, commandId, { type: "Travel", destinationLocationId: locationId, mode: "walk" });
}

function bestBuy(state: EconomyState, reserve: number, cap: number): { assetId: string; quantity: number } | undefined {
  const assetId = [...coreAssets(state)].sort((a, b) => normalizedPrice(state, a) - normalizedPrice(state, b))[0];
  if (!assetId || normalizedPrice(state, assetId) > 0.48) return undefined;
  const quantity = buyQuantity(state, assetId, reserve, cap);
  return quantity > 0 ? { assetId, quantity } : undefined;
}

function bestSale(state: EconomyState, threshold = 0.62): string | undefined {
  return coreAssets(state)
    .filter((id) => (state.inventory[id] ?? 0) > 0 && normalizedPrice(state, id) >= threshold)
    .sort((a, b) => normalizedPrice(state, b) - normalizedPrice(state, a))[0];
}

function opportunisticTrade(state: EconomyState, commandId: string, reserve = 75): EconomyCommand | undefined {
  const sale = bestSale(state);
  if (sale) return command(state, commandId, { type: "SellAsset", assetId: sale, quantity: state.inventory[sale]! });
  const buy = bestBuy(state, reserve, 20);
  if (buy) return command(state, commandId, { type: "BuyAsset", ...buy });
  return undefined;
}

function skilledOpportunity(state: EconomyState, commandId: string): EconomyCommand | undefined {
  const sale = coreAssets(state)
    .filter((id) => (state.inventory[id] ?? 0) > 0 && normalizedPrice(state, id) >= 0.62)
    .sort((a, b) => normalizedPrice(state, b) - normalizedPrice(state, a))[0];
  if (sale) return command(state, commandId, { type: "SellAsset", assetId: sale, quantity: state.inventory[sale]! });
  const assetId = [...coreAssets(state)].sort((a, b) => normalizedPrice(state, a) - normalizedPrice(state, b))[0];
  if (!assetId || normalizedPrice(state, assetId) > 0.38) return undefined;
  const quantity = buyQuantity(state, assetId, 75, 20);
  return quantity > 0 ? command(state, commandId, { type: "BuyAsset", assetId, quantity }) : undefined;
}

const randomAgent: SimulationAgent = {
  name: "random",
  decide(state, commandId, random) {
    if (state.actionsRemaining <= 0) return endDay(state, commandId);
    const assets = coreAssets(state);
    const assetId = assets[Math.floor(random() * assets.length)]!;
    const held = state.inventory[assetId] ?? 0;
    const choices: EconomyCommand[] = [];
    const quantity = buyQuantity(state, assetId, 0, 8);
    if (quantity > 0) choices.push(command(state, commandId, { type: "BuyAsset", assetId, quantity: Math.max(1, Math.ceil(random() * quantity)) }));
    if (held > 0) choices.push(command(state, commandId, { type: "SellAsset", assetId, quantity: Math.max(1, Math.ceil(random() * held)) }));
    const stashSpace = remainingStashCapacity(state);
    if (held > 0 && inventoryUnits(state) > 20 && stashSpace > 0) choices.push(command(state, commandId, { type: "DepositStash", assetId, quantity: Math.min(stashSpace, Math.max(1, Math.ceil(random() * held))) }));
    const destination = adjacentDestination(state, random);
    if (destination && random() < 0.15) choices.push(command(state, commandId, { type: "Travel", destinationLocationId: destination, mode: "walk" }));
    choices.push(endDay(state, commandId));
    return choices[Math.floor(random() * choices.length)]!;
  },
};

const conservativeAgent: SimulationAgent = {
  name: "conservative",
  decide(state, commandId, random) {
    if (state.actionsRemaining <= 0) return endDay(state, commandId);
    if (!state.clients.pearl?.accepted && state.day === 1 && state.locationId === "compton") {
      return command(state, commandId, { type: "AcceptClient", clientId: "pearl" });
    }
    const assets = coreAssets(state);
    const bestSale = assets
      .filter((id) => (state.inventory[id] ?? 0) > 0 && normalizedPrice(state, id) >= 0.65)
      .sort((a, b) => normalizedPrice(state, b) - normalizedPrice(state, a))[0];
    if (bestSale) return command(state, commandId, { type: "SellAsset", assetId: bestSale, quantity: state.inventory[bestSale]! });

    const stashAsset = assets.find((id) => (state.inventory[id] ?? 0) >= 10);
    const stashSpace = remainingStashCapacity(state);
    if (stashAsset && inventoryUnits(state) >= 25 && stashSpace > 0) {
      return command(state, commandId, { type: "DepositStash", assetId: stashAsset, quantity: Math.min(stashSpace, 10, state.inventory[stashAsset]!) });
    }

    const cheapest = [...assets].sort((a, b) => normalizedPrice(state, a) - normalizedPrice(state, b))[0]!;
    const quantity = buyQuantity(state, cheapest, 175, 10);
    if (quantity > 0 && normalizedPrice(state, cheapest) <= 0.45) {
      return command(state, commandId, { type: "BuyAsset", assetId: cheapest, quantity });
    }
    if (random() < 0.08) {
      const destination = adjacentDestination(state, random);
      if (destination) return command(state, commandId, { type: "Travel", destinationLocationId: destination, mode: "walk" });
    }
    return endDay(state, commandId);
  },
};

const aggressiveAgent: SimulationAgent = {
  name: "aggressive",
  decide(state, commandId) {
    if (state.actionsRemaining <= 0) return endDay(state, commandId);
    const assets = coreAssets(state).sort(
      (a, b) => DEFAULT_ECONOMY_CONTENT.assets[b]!.volatilityBps - DEFAULT_ECONOMY_CONTENT.assets[a]!.volatilityBps,
    );
    const sell = assets.find((id) => (state.inventory[id] ?? 0) > 0 && normalizedPrice(state, id) >= 0.64);
    if (sell) return command(state, commandId, { type: "SellAsset", assetId: sell, quantity: state.inventory[sell]! });
    const exposed = assets
      .filter((assetId) => normalizedPrice(state, assetId) <= 0.58)
      .sort((a, b) => normalizedPrice(state, a) - normalizedPrice(state, b))[0];
    if (exposed) {
      const quantity = buyQuantity(state, exposed, 0, state.inventoryCapacity);
      if (quantity > 0) return command(state, commandId, { type: "BuyAsset", assetId: exposed, quantity });
    }
    return endDay(state, commandId);
  },
};

const rumorFollowerAgent: SimulationAgent = {
  name: "rumor_follower",
  decide(state, commandId, random) {
    if (state.actionsRemaining <= 0) return endDay(state, commandId);
    const plugCost = Math.ceil((state.prices.plug ?? 400) * (10_000 + DEFAULT_ECONOMY_CONTENT.tradeSpreadBps) / 10_000);
    if (state.day >= 5 && !state.gear.plug && state.cash >= plugCost) {
      return command(state, commandId, { type: "BuyAsset", assetId: "plug", quantity: 1 });
    }
    const liveForecast = [...state.forecasts].reverse().find((forecast) => forecast.expiresDay >= state.day);
    if (state.gear.plug && !liveForecast) {
      const assets = coreAssets(state);
      const assetId = assets[Math.floor(random() * assets.length)]!;
      return command(state, commandId, { type: "UsePlug", assetId, locationId: state.locationId });
    }
    if (liveForecast) {
      const held = state.inventory[liveForecast.assetId] ?? 0;
      const current = state.prices[liveForecast.assetId] ?? 0;
      if (held > 0 && current >= liveForecast.predictedPrice * 0.9) {
        return command(state, commandId, { type: "SellAsset", assetId: liveForecast.assetId, quantity: held });
      }
      const quantity = buyQuantity(state, liveForecast.assetId, 100, 15);
      if (quantity > 0 && current < liveForecast.predictedPrice) {
        return command(state, commandId, { type: "BuyAsset", assetId: liveForecast.assetId, quantity });
      }
    }
    return endDay(state, commandId);
  },
};

const opportunistAgent: SimulationAgent = {
  name: "opportunist",
  decide(state, commandId, random) {
    if (state.actionsRemaining <= 0) return endDay(state, commandId);
    const opportunity = skilledOpportunity(state, commandId);
    if (opportunity) return opportunity;
    const destination = adjacentDestination(state, random);
    if (destination && state.actionsRemaining === DEFAULT_ECONOMY_CONTENT.actionsPerDay && random() < 0.2) {
      return command(state, commandId, { type: "Travel", destinationLocationId: destination, mode: "walk" });
    }
    return endDay(state, commandId);
  },
};

function incompleteObjective(state: EconomyState) {
  for (const client of Object.values(DEFAULT_ECONOMY_CONTENT.clients)) {
    const progress = state.clients[client.id];
    if (!progress?.accepted || progress.completed) continue;
    const objective = client.objectives.find(
      (entry) => (progress.progress[entry.progressKey] ?? 0) < entry.quantity,
    );
    if (objective) return { client, objective, remaining: objective.quantity - (progress.progress[objective.progressKey] ?? 0) };
  }
  return undefined;
}

function availableClient(state: EconomyState): string | undefined {
  for (const client of Object.values(DEFAULT_ECONOMY_CONTENT.clients)) {
    const progress = state.clients[client.id];
    if (progress?.accepted || progress?.completed) continue;
    const rules = client.availability;
    if (rules.minDay && state.day < rules.minDay) continue;
    if (rules.locationIds && !rules.locationIds.includes(state.locationId)) continue;
    if ((rules.requiredClientIds ?? []).some((id) => !state.clients[id]?.completed)) continue;
    return client.id;
  }
  return undefined;
}

function availableClientDestination(state: EconomyState): string | undefined {
  for (const client of Object.values(DEFAULT_ECONOMY_CONTENT.clients)) {
    const progress = state.clients[client.id];
    if (progress?.accepted || progress?.completed) continue;
    const rules = client.availability;
    if (rules.minDay && state.day < rules.minDay) continue;
    if ((rules.requiredClientIds ?? []).some((id) => !state.clients[id]?.completed)) continue;
    const destination = rules.locationIds?.find((id) => state.unlockedLocationIds.includes(id));
    if (destination && destination !== state.locationId) return destination;
  }
  return undefined;
}

const clientSeekerAgent: SimulationAgent = {
  name: "client_seeker",
  decide(state, commandId) {
    if (state.actionsRemaining <= 0) return endDay(state, commandId);
    const clientId = availableClient(state);
    if (clientId) return command(state, commandId, { type: "AcceptClient", clientId });

    for (const client of Object.values(DEFAULT_ECONOMY_CONTENT.clients)) {
      if (!state.clients[client.id]?.completed) continue;
      const objective = client.objectives.find(
        (entry) => entry.type === "deposit_asset" && entry.locationId === state.locationId && (state.stashes[state.locationId]?.[entry.assetId]?.quantity ?? 0) > 0,
      );
      if (objective && inventoryUnits(state) < state.inventoryCapacity) {
        return command(state, commandId, {
          type: "WithdrawStash",
          locationId: state.locationId,
          assetId: objective.assetId,
          quantity: Math.min(state.stashes[state.locationId]![objective.assetId]!.quantity, state.inventoryCapacity - inventoryUnits(state)),
        });
      }
    }
    const unlockedScout = ["long_beach", "south_central", "east_la"].find(
      (locationId) => state.unlockedLocationIds.includes(locationId) && (state.stats.cityVisits[locationId] ?? 0) === 0,
    );
    if (unlockedScout) return command(state, commandId, { type: "Travel", destinationLocationId: unlockedScout, mode: "walk" });
    const clientDestination = availableClientDestination(state);
    if (clientDestination) {
      return command(state, commandId, { type: "Travel", destinationLocationId: clientDestination, mode: "walk" });
    }

    const target = incompleteObjective(state);
    if (target) {
      const travel = travelTo(state, commandId, target.objective.locationId);
      if (travel) return travel;
      const held = state.inventory[target.objective.assetId] ?? 0;
      if (target.objective.type === "deposit_asset" && held >= target.remaining && remainingStashCapacity(state) >= target.remaining) {
        return command(state, commandId, {
          type: "DepositStash",
          assetId: target.objective.assetId,
          quantity: Math.min(held, target.remaining, remainingStashCapacity(state)),
        });
      }
      if (target.objective.type === "sell_asset" && held > 0) {
        return command(state, commandId, {
          type: "SellAsset",
          assetId: target.objective.assetId,
          quantity: Math.min(held, target.remaining),
        });
      }
      const missing = Math.max(0, target.remaining - held);
      const quantity = buyQuantity(state, target.objective.assetId, 75, missing);
      if (missing > 0 && quantity >= missing) {
        return command(state, commandId, {
          type: "BuyAsset",
          assetId: target.objective.assetId,
          quantity,
        });
      }
      const completedContractAssets = new Set(Object.values(DEFAULT_ECONOMY_CONTENT.clients).flatMap((client) =>
        state.clients[client.id]?.completed
          ? client.objectives.filter((objective) => objective.type === "deposit_asset").map((objective) => objective.assetId)
          : [],
      ));
      const liquidation = coreAssets(state).find((assetId) =>
        assetId !== target.objective.assetId && completedContractAssets.has(assetId) && (state.inventory[assetId] ?? 0) > 0,
      );
      if (liquidation) {
        return command(state, commandId, { type: "SellAsset", assetId: liquidation, quantity: state.inventory[liquidation]! });
      }
    }

    const trade = opportunisticTrade(state, commandId, 40);
    return trade ?? endDay(state, commandId);
  },
};

const rankClimberAgent: SimulationAgent = {
  name: "rank_climber",
  decide(state, commandId, random) {
    if (state.actionsRemaining <= 0) return endDay(state, commandId);
    const unstashed = coreAssets(state).find(
      (assetId) =>
        (state.inventory[assetId] ?? 0) >= 5 &&
        !Object.values(state.stashes).some((stash) => (stash[assetId]?.quantity ?? 0) > 0),
    );
    if (unstashed && remainingStashCapacity(state) > 0) {
      return command(state, commandId, { type: "DepositStash", assetId: unstashed, quantity: Math.min(5, remainingStashCapacity(state)) });
    }
    const assets = coreAssets(state);
    const missing = assets.find(
      (assetId) =>
        (state.inventory[assetId] ?? 0) === 0 &&
        !Object.values(state.stashes).some((stash) => (stash[assetId]?.quantity ?? 0) > 0),
    );
    if (missing) {
      const quantity = buyQuantity(state, missing, 100, 5);
      if (quantity > 0) return command(state, commandId, { type: "BuyAsset", assetId: missing, quantity });
    }
    if (state.actionsRemaining === DEFAULT_ECONOMY_CONTENT.actionsPerDay && random() < 0.2) {
      const destination = adjacentDestination(state, random);
      if (destination) return command(state, commandId, { type: "Travel", destinationLocationId: destination, mode: "walk" });
    }
    const trade = opportunisticTrade(state, commandId, 100);
    return trade ?? endDay(state, commandId);
  },
};

const stashHeavyAgent: SimulationAgent = {
  name: "stash_heavy",
  decide(state, commandId, random) {
    if (state.actionsRemaining <= 0) return endDay(state, commandId);
    const localStash = state.stashes[state.locationId] ?? {};
    const withdrawal = Object.keys(localStash).find(
      (assetId) => (localStash[assetId]?.quantity ?? 0) > 0 && normalizedPrice(state, assetId) >= 0.68,
    );
    if (withdrawal && inventoryUnits(state) < state.inventoryCapacity) {
      return command(state, commandId, {
        type: "WithdrawStash",
        locationId: state.locationId,
        assetId: withdrawal,
        quantity: Math.min(localStash[withdrawal]!.quantity, state.inventoryCapacity - inventoryUnits(state)),
      });
    }
    const sale = bestSale(state, 0.68);
    if (sale) return command(state, commandId, { type: "SellAsset", assetId: sale, quantity: state.inventory[sale]! });
    const deposit = coreAssets(state).find((assetId) => (state.inventory[assetId] ?? 0) >= 4);
    const stashSpace = remainingStashCapacity(state);
    if (deposit && stashSpace > 0) {
      return command(state, commandId, {
        type: "DepositStash",
        assetId: deposit,
        quantity: Math.min(stashSpace, Math.max(1, Math.floor(state.inventory[deposit]! * 0.75))),
      });
    }
    const buy = bestBuy(state, 100, 16);
    if (buy) return command(state, commandId, { type: "BuyAsset", ...buy });
    if (random() < 0.25) {
      const destination = adjacentDestination(state, random);
      if (destination) return command(state, commandId, { type: "Travel", destinationLocationId: destination, mode: "walk" });
    }
    return endDay(state, commandId);
  },
};

const yieldFarmerAgent: SimulationAgent = {
  name: "yield_farmer",
  decide(state, commandId) {
    if (state.actionsRemaining <= 0) return endDay(state, commandId);
    const assets = coreAssets(state).sort((a, b) => {
      const left = DEFAULT_ECONOMY_CONTENT.assets[a]!.dailyYieldBps / (state.prices[a] ?? 1);
      const right = DEFAULT_ECONOMY_CONTENT.assets[b]!.dailyYieldBps / (state.prices[b] ?? 1);
      return right - left;
    });
    const deposit = assets.find((assetId) => (state.inventory[assetId] ?? 0) >= 5);
    const stashSpace = remainingStashCapacity(state);
    if (deposit && stashSpace > 0) {
      return command(state, commandId, {
        type: "DepositStash",
        assetId: deposit,
        quantity: Math.min(stashSpace, state.inventory[deposit]!),
      });
    }
    for (const assetId of assets) {
      const quantity = buyQuantity(state, assetId, 75, 25);
      if (quantity > 0) return command(state, commandId, { type: "BuyAsset", assetId, quantity });
    }
    return endDay(state, commandId);
  },
};

function plugDecision(
  state: EconomyState,
  commandId: string,
  random: () => number,
  confidenceFloor: number,
  alwaysFollow: boolean,
): EconomyCommand {
  if (state.actionsRemaining <= 0) return endDay(state, commandId);
  if (state.day >= 5 && !state.gear.plug && state.cash >= (state.prices.plug ?? 400) + 75) {
    return command(state, commandId, { type: "BuyAsset", assetId: "plug", quantity: 1 });
  }
  const live = [...state.forecasts].reverse().find(
    (forecast) => forecast.locationId === state.locationId && forecast.expiresDay >= state.day,
  );
  if (live && (alwaysFollow || live.confidenceBps >= confidenceFloor)) {
    const current = state.prices[live.assetId] ?? 0;
    const held = state.inventory[live.assetId] ?? 0;
    if (held > 0 && (live.direction === "down" || live.generatedDay < state.day)) {
      return command(state, commandId, { type: "SellAsset", assetId: live.assetId, quantity: held });
    }
    const minimumEdge = alwaysFollow ? 1.02 : 1.08;
    if (live.generatedDay === state.day && live.direction === "up" && live.predictedPrice >= current * minimumEdge) {
      const quantity = buyQuantity(state, live.assetId, 75, 15);
      if (quantity > 0) return command(state, commandId, { type: "BuyAsset", assetId: live.assetId, quantity });
    }
  }
  if (state.gear.plug && (!live || live.generatedDay < state.day)) {
    const candidates = coreAssets(state).sort((a, b) => normalizedPrice(state, a) - normalizedPrice(state, b));
    const shortlist = candidates.slice(0, Math.min(2, candidates.length));
    const assetId = shortlist[Math.floor(random() * shortlist.length)] ?? candidates[0]!;
    return command(state, commandId, { type: "UsePlug", assetId, locationId: state.locationId });
  }
  return opportunisticTrade(state, commandId, 100) ?? endDay(state, commandId);
}

const plugSkepticAgent: SimulationAgent = {
  name: "plug_skeptic",
  decide: (state, commandId, random) => plugDecision(state, commandId, random, 7_500, false),
};

const plugBelieverAgent: SimulationAgent = {
  name: "plug_believer",
  decide: (state, commandId, random) => plugDecision(state, commandId, random, 0, true),
};

const informationAwareOpportunistAgent: SimulationAgent = {
  name: "information_aware_opportunist",
  decide(state, commandId, random) {
    if (state.actionsRemaining <= 0) return endDay(state, commandId);
    const market = skilledOpportunity(state, commandId);
    if (market) return market;
    const destination = adjacentDestination(state, random);
    if (destination && state.actionsRemaining === DEFAULT_ECONOMY_CONTENT.actionsPerDay && random() < 0.2) {
      return command(state, commandId, { type: "Travel", destinationLocationId: destination, mode: "walk" });
    }
    const plug = plugDecision(state, commandId, random, 7_000, false);
    if (plug.type !== "EndDay") return plug;
    return market ?? plug;
  },
};

const gearStrategistAgent: SimulationAgent = {
  name: "gear_strategist",
  decide(state, commandId) {
    if (state.actionsRemaining <= 0) return endDay(state, commandId);
    const stickPrice = Math.ceil((state.prices.stick ?? 500) * (10_000 + DEFAULT_ECONOMY_CONTENT.tradeSpreadBps) / 10_000);
    if (!state.gear.stick && state.cash >= stickPrice + 500) {
      return command(state, commandId, { type: "BuyAsset", assetId: "stick", quantity: 1 });
    }
    const chopperPrice = Math.ceil((state.prices.chopper ?? 1_200) * (10_000 + DEFAULT_ECONOMY_CONTENT.tradeSpreadBps) / 10_000);
    if (state.day >= 3 && !state.gear.chopper && state.cash >= chopperPrice + 800) {
      return command(state, commandId, { type: "BuyAsset", assetId: "chopper", quantity: 1 });
    }
    if ((state.gear.chopper?.usesRemaining ?? 0) > 0) {
      const destination = DEFAULT_ECONOMY_CONTENT.locations[state.locationId]!.adjacentLocationIds.find(
        (locationId) => state.unlockedLocationIds.includes(locationId) && coreAssets(state).some(
          (assetId) => (state.inventory[assetId] ?? 0) > 0 && DEFAULT_ECONOMY_CONTENT.locations[locationId]!.expensiveAssetIds.includes(assetId),
        ),
      );
      if (destination) return command(state, commandId, { type: "Travel", destinationLocationId: destination, mode: "chopper" });
    }
    const sale = bestSale(state, 0.6);
    if (sale) return command(state, commandId, { type: "SellAsset", assetId: sale, quantity: state.inventory[sale]! });
    const localCheap = DEFAULT_ECONOMY_CONTENT.locations[state.locationId]!.cheapAssetIds
      .filter((assetId) => DEFAULT_ECONOMY_CONTENT.assets[assetId]?.category === "core")
      .sort((a, b) => normalizedPrice(state, a) - normalizedPrice(state, b))[0];
    if (localCheap && normalizedPrice(state, localCheap) <= 0.5) {
      const quantity = buyQuantity(state, localCheap, 250, 15);
      if (quantity > 0) return command(state, commandId, { type: "BuyAsset", assetId: localCheap, quantity });
    }
    return opportunisticTrade(state, commandId, 250) ?? endDay(state, commandId);
  },
};

export const AGENTS: SimulationAgent[] = [
  randomAgent,
  conservativeAgent,
  aggressiveAgent,
  rumorFollowerAgent,
  opportunistAgent,
  clientSeekerAgent,
  rankClimberAgent,
  stashHeavyAgent,
  yieldFarmerAgent,
  plugSkepticAgent,
  plugBelieverAgent,
  informationAwareOpportunistAgent,
  gearStrategistAgent,
];

export const BASELINE_AGENT_NAMES: AgentName[] = [
  "random",
  "conservative",
  "aggressive",
  "rumor_follower",
  "opportunist",
];
