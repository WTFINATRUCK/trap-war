import type { AssetId, ClientId, LocationId, RankId } from "./content.js";
import type { ForecastState, ScoreBreakdown, WealthBreakdown } from "./model.js";
import type { EconomyVersions } from "./versions.js";

interface EventEnvelope {
  eventId: string;
  commandId: string;
  sequence: number;
  occurredDay: number;
}

export type DomainEvent = EventEnvelope &
  (
    | {
        type: "RunStarted";
        runId: string;
        randomSeedId: string;
        versions: EconomyVersions;
        locationId: LocationId;
        cash: number;
        protectedReserves: number;
        actions: number;
        capacity: number;
        unlockedLocationIds: LocationId[];
        assetIds: AssetId[];
        locationIds: LocationId[];
        clientIds: ClientId[];
        rankId: RankId;
      }
    | { type: "PricesUpdated"; prices: Record<AssetId, number>; reason: "run_start" | "travel" | "new_day" }
    | { type: "CashChanged"; amount: number; reason: "purchase" | "sale" | "yield" | "robbery" }
    | { type: "ProtectedReservesChanged"; amount: number; reason: "sale_skim" | "yield_skim" }
    | { type: "InventoryChanged"; assetId: AssetId; quantity: number; reason: "purchase" | "sale" | "stash" | "withdrawal" | "raid" | "robbery" }
    | { type: "GearChanged"; assetId: AssetId; quantity: number; conditionBps: number; usesRemaining?: number; reason: "purchase" | "client_reward" }
    | { type: "GearUsed"; assetId: AssetId; uses: number }
    | { type: "ActionConsumed"; action: "buy" | "sell" | "travel" | "stash" | "withdraw" | "plug" }
    | { type: "TravelCompleted"; fromLocationId: LocationId; toLocationId: LocationId; mode: "walk" | "chopper" | "whip" }
    | { type: "StashChanged"; locationId: LocationId; assetId: AssetId; quantity: number; depositedDay: number; shieldDaysRemaining: number }
    | { type: "StashShieldsTicked" }
    | { type: "YieldAccrued"; gross: number; skim: number; net: number }
    | { type: "RobberyResolved"; cashLost: number; inventoryLost: Record<AssetId, number>; totalValueLost: number }
    | { type: "RaidResolved"; locationId: LocationId; carriedLost: Record<AssetId, number>; localStashLost: Record<AssetId, number> }
    | { type: "DayCompleted"; completedDay: number }
    | { type: "DayAdvanced"; day: number; actions: number }
    | { type: "ClientAccepted"; clientId: ClientId }
    | { type: "ClientProgressed"; clientId: ClientId; progressKey: string; amount: number }
    | { type: "ClientCompleted"; clientId: ClientId; unlockedLocationIds: LocationId[]; rewardAssetId?: AssetId }
    | { type: "RankChanged"; rankId: RankId }
    | { type: "ForecastGenerated"; forecast: ForecastState }
    | { type: "RunCompleted"; reason: "day_30_exhausted" | "day_30_ended" | "ended_early"; wealth: WealthBreakdown; score: ScoreBreakdown }
    | { type: "CommandCommitted"; fingerprint: string; resultingStateVersion: number; eventIds: string[] }
  );

export type DomainEventPayload = DomainEvent extends infer Event
  ? Event extends EventEnvelope
    ? Omit<Event, keyof EventEnvelope>
    : never
  : never;

export function eventFactory(commandId: string, day: number): (event: DomainEventPayload) => DomainEvent {
  let sequence = 0;
  return (event) => {
    const envelope: EventEnvelope = {
      eventId: `${commandId}:${sequence}`,
      commandId,
      sequence,
      occurredDay: day,
    };
    sequence += 1;
    return { ...envelope, ...event } as DomainEvent;
  };
}
