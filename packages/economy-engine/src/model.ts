import type { AssetId, ClientId, LocationId, RankId } from "./content.js";
import type { EconomyVersions } from "./versions.js";

export type RunStatus = "active" | "completed";

export interface StashHolding {
  quantity: number;
  depositedDay: number;
  shieldDaysRemaining: number;
}

export interface GearHolding {
  quantity: number;
  conditionBps: number;
  usesRemaining?: number;
}

export interface ClientProgressState {
  accepted: boolean;
  completed: boolean;
  progress: Record<string, number>;
}

export interface ForecastState {
  forecastId: string;
  generatedDay: number;
  expiresDay: number;
  horizonDays: number;
  assetId: AssetId;
  locationId: LocationId;
  referencePrice: number;
  predictedPrice: number;
  direction: "up" | "down";
  magnitudeBand: "low" | "medium" | "high";
  sourceType: "local_contact" | "street_wire" | "distant_source";
  confidenceBps: number;
  sourceQualityBps: number;
  randomDecisionIds: string[];
}

export interface ProcessedCommandRecord {
  fingerprint: string;
  resultingStateVersion: number;
  eventIds: string[];
}

export interface WealthBreakdown {
  liquidCash: number;
  inventoryMarketValue: number;
  stashMarketValue: number;
  gearPropertyValue: number;
  vaultValue: number;
  liabilities: number;
  netWorth: number;
}

export interface ScoreBreakdown {
  netWorth: number;
  progressionBonus: number;
  gameScore: number;
}

export interface EconomyStats {
  actionsUsed: number;
  yieldAccrued: number;
  raidsTriggered: number;
  robberiesTriggered: number;
  robberyValueLost: number;
  raidUnitsSeized: number;
  assetPurchaseUnits: Record<AssetId, number>;
  assetSaleUnits: Record<AssetId, number>;
  cityVisits: Record<LocationId, number>;
  daysCompleted: number;
}

export interface EconomyState {
  runId: string;
  status: RunStatus;
  stateVersion: number;
  versions: EconomyVersions;
  randomSeedId: string;
  day: number;
  actionsRemaining: number;
  locationId: LocationId;
  cash: number;
  protectedReserves: number;
  liabilities: number;
  inventoryCapacity: number;
  inventory: Record<AssetId, number>;
  stashes: Record<LocationId, Record<AssetId, StashHolding>>;
  gear: Record<AssetId, GearHolding>;
  prices: Record<AssetId, number>;
  rankId: RankId;
  reputation: number;
  unlockedLocationIds: LocationId[];
  clients: Record<ClientId, ClientProgressState>;
  forecasts: ForecastState[];
  processedCommands: Record<string, ProcessedCommandRecord>;
  stats: EconomyStats;
  finalWealth?: WealthBreakdown;
  finalScore?: ScoreBreakdown;
  completionReason?: "day_30_exhausted" | "day_30_ended" | "ended_early";
}

export function cloneState(state: EconomyState): EconomyState {
  return structuredClone(state);
}
