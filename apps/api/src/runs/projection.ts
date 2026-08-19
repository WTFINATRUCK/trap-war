import {
  DEFAULT_ECONOMY_CONTENT,
  getLegalActions,
  type DomainEvent,
  type EconomyState,
  type ForecastState,
} from "@trap-wars/economy-engine";

function projectForecast(forecast: ForecastState) {
  return {
    forecastId: forecast.forecastId,
    generatedDay: forecast.generatedDay,
    expiresDay: forecast.expiresDay,
    horizonDays: forecast.horizonDays,
    assetId: forecast.assetId,
    locationId: forecast.locationId,
    predictedPrice: forecast.predictedPrice,
    direction: forecast.direction,
    magnitudeBand: forecast.magnitudeBand,
    sourceType: forecast.sourceType,
    confidenceBps: forecast.confidenceBps,
  };
}

export function projectRun(state: EconomyState) {
  return {
    runId: state.runId,
    status: state.status,
    stateVersion: state.stateVersion,
    versions: state.versions,
    day: state.day,
    actionsRemaining: state.actionsRemaining,
    locationId: state.locationId,
    cash: state.cash,
    protectedReserves: state.protectedReserves,
    liabilities: state.liabilities,
    inventoryCapacity: state.inventoryCapacity,
    inventory: state.inventory,
    stashes: state.stashes,
    gear: state.gear,
    prices: state.prices,
    rankId: state.rankId,
    reputation: state.reputation,
    unlockedLocationIds: state.unlockedLocationIds,
    clients: state.clients,
    forecasts: state.forecasts.map(projectForecast),
    stats: state.stats,
    ...(state.finalWealth ? { finalWealth: state.finalWealth } : {}),
    ...(state.finalScore ? { finalScore: state.finalScore } : {}),
    ...(state.completionReason ? { completionReason: state.completionReason } : {}),
    legalActions: getLegalActions(state, DEFAULT_ECONOMY_CONTENT),
  };
}

export function projectEvent(event: DomainEvent): Record<string, unknown> | undefined {
  if (event.type === "CommandCommitted") return undefined;
  if (event.type === "RunStarted") {
    const { randomSeedId: _randomSeedId, ...safeEvent } = event;
    return safeEvent;
  }
  if (event.type === "ForecastGenerated") {
    return { ...event, forecast: projectForecast(event.forecast) };
  }
  return { ...event };
}

export function projectEvents(events: DomainEvent[]): Record<string, unknown>[] {
  return events.flatMap((event) => {
    const projected = projectEvent(event);
    return projected ? [projected] : [];
  });
}
