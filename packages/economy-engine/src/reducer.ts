import type { ClientId } from "./content.js";
import type { DomainEvent } from "./events.js";
import type { ClientProgressState, EconomyState, EconomyStats } from "./model.js";
import { cloneState } from "./model.js";

function zeroRecord(ids: string[]): Record<string, number> {
  return Object.fromEntries(ids.map((id) => [id, 0]));
}

function initialClients(ids: ClientId[]): Record<ClientId, ClientProgressState> {
  return Object.fromEntries(
    ids.map((id) => [id, { accepted: false, completed: false, progress: {} }]),
  );
}

export function reduceEvent(state: EconomyState | undefined, event: DomainEvent): EconomyState {
  if (event.type === "RunStarted") {
    if (state) throw new Error("RunStarted cannot be applied to an existing state");
    const stats: EconomyStats = {
      actionsUsed: 0,
      yieldAccrued: 0,
      raidsTriggered: 0,
      robberiesTriggered: 0,
      robberyValueLost: 0,
      raidUnitsSeized: 0,
      assetPurchaseUnits: zeroRecord(event.assetIds),
      assetSaleUnits: zeroRecord(event.assetIds),
      cityVisits: zeroRecord(event.locationIds),
      daysCompleted: 0,
    };
    stats.cityVisits[event.locationId] = 1;
    return {
      runId: event.runId,
      status: "active",
      stateVersion: 0,
      versions: event.versions,
      randomSeedId: event.randomSeedId,
      day: 1,
      actionsRemaining: event.actions,
      locationId: event.locationId,
      cash: event.cash,
      protectedReserves: event.protectedReserves,
      liabilities: 0,
      inventoryCapacity: event.capacity,
      inventory: zeroRecord(event.assetIds),
      stashes: Object.fromEntries(event.locationIds.map((id) => [id, {}])),
      gear: {},
      prices: zeroRecord(event.assetIds),
      rankId: event.rankId,
      reputation: 0,
      unlockedLocationIds: [...event.unlockedLocationIds],
      clients: initialClients(event.clientIds),
      forecasts: [],
      processedCommands: {},
      stats,
    };
  }

  if (!state) throw new Error(`${event.type} cannot be applied before RunStarted`);
  const next = cloneState(state);

  switch (event.type) {
    case "PricesUpdated":
      next.prices = { ...event.prices };
      break;
    case "CashChanged":
      next.cash += event.amount;
      if (event.reason === "yield") next.stats.yieldAccrued += event.amount;
      break;
    case "ProtectedReservesChanged":
      next.protectedReserves += event.amount;
      if (event.reason === "yield_skim") next.stats.yieldAccrued += event.amount;
      break;
    case "InventoryChanged":
      next.inventory[event.assetId] = (next.inventory[event.assetId] ?? 0) + event.quantity;
      if (event.reason === "purchase") next.stats.assetPurchaseUnits[event.assetId] = (next.stats.assetPurchaseUnits[event.assetId] ?? 0) + event.quantity;
      if (event.reason === "sale") next.stats.assetSaleUnits[event.assetId] = (next.stats.assetSaleUnits[event.assetId] ?? 0) - event.quantity;
      if (event.reason === "raid") next.stats.raidUnitsSeized += -event.quantity;
      break;
    case "GearChanged": {
      const prior = next.gear[event.assetId];
      const quantity = (prior?.quantity ?? 0) + event.quantity;
      if (quantity <= 0) delete next.gear[event.assetId];
      else {
        next.gear[event.assetId] = {
          quantity,
          conditionBps: event.conditionBps,
          ...(event.usesRemaining === undefined ? {} : { usesRemaining: event.usesRemaining }),
        };
      }
      break;
    }
    case "GearUsed": {
      const holding = next.gear[event.assetId];
      if (holding?.usesRemaining !== undefined) {
        holding.usesRemaining = Math.max(0, holding.usesRemaining - event.uses);
      }
      break;
    }
    case "ActionConsumed":
      next.actionsRemaining = Math.max(0, next.actionsRemaining - 1);
      next.stats.actionsUsed += 1;
      break;
    case "TravelCompleted":
      next.locationId = event.toLocationId;
      next.stats.cityVisits[event.toLocationId] = (next.stats.cityVisits[event.toLocationId] ?? 0) + 1;
      break;
    case "StashChanged": {
      const stash = next.stashes[event.locationId] ?? (next.stashes[event.locationId] = {});
      const prior = stash[event.assetId];
      const quantity = (prior?.quantity ?? 0) + event.quantity;
      if (quantity <= 0) delete stash[event.assetId];
      else {
        stash[event.assetId] = {
          quantity,
          depositedDay: event.depositedDay,
          shieldDaysRemaining: event.shieldDaysRemaining,
        };
      }
      break;
    }
    case "StashShieldsTicked":
      for (const stash of Object.values(next.stashes)) {
        for (const holding of Object.values(stash)) {
          holding.shieldDaysRemaining = Math.max(0, holding.shieldDaysRemaining - 1);
        }
      }
      break;
    case "YieldAccrued":
      break;
    case "RobberyResolved":
      next.stats.robberiesTriggered += 1;
      next.stats.robberyValueLost += event.totalValueLost;
      break;
    case "RaidResolved": {
      next.stats.raidsTriggered += 1;
      const stash = next.stashes[event.locationId] ?? {};
      for (const [assetId, quantity] of Object.entries(event.localStashLost)) {
        const holding = stash[assetId];
        if (!holding) continue;
        holding.quantity -= quantity;
        next.stats.raidUnitsSeized += quantity;
        if (holding.quantity <= 0) delete stash[assetId];
      }
      break;
    }
    case "DayCompleted":
      next.stats.daysCompleted += 1;
      break;
    case "DayAdvanced":
      next.day = event.day;
      next.actionsRemaining = event.actions;
      next.forecasts = next.forecasts.filter((forecast) => forecast.expiresDay >= event.day);
      break;
    case "ClientAccepted": {
      const client = next.clients[event.clientId];
      if (client) client.accepted = true;
      break;
    }
    case "ClientProgressed": {
      const client = next.clients[event.clientId];
      if (client) client.progress[event.progressKey] = (client.progress[event.progressKey] ?? 0) + event.amount;
      break;
    }
    case "ClientCompleted": {
      const client = next.clients[event.clientId];
      if (client) client.completed = true;
      next.reputation += 1;
      next.unlockedLocationIds = [...new Set([...next.unlockedLocationIds, ...event.unlockedLocationIds])];
      break;
    }
    case "RankChanged":
      next.rankId = event.rankId;
      break;
    case "ForecastGenerated":
      next.forecasts.push(event.forecast);
      break;
    case "RunCompleted":
      next.status = "completed";
      next.completionReason = event.reason;
      next.finalWealth = event.wealth;
      next.finalScore = event.score;
      break;
    case "CommandCommitted":
      next.stateVersion = event.resultingStateVersion;
      next.processedCommands[event.commandId] = {
        fingerprint: event.fingerprint,
        resultingStateVersion: event.resultingStateVersion,
        eventIds: [...event.eventIds],
      };
      break;
  }

  return next;
}

export function reduceEvents(
  state: EconomyState | undefined,
  events: DomainEvent[],
): EconomyState {
  return events.reduce<EconomyState | undefined>(reduceEvent, state) as EconomyState;
}
