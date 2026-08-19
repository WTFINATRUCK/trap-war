import type { AssetId, ClientId, LocationId } from "./content.js";
import type { DomainEvent } from "./events.js";
import type { EconomyState } from "./model.js";
import type { RandomEvidence } from "./random.js";

interface BaseCommand {
  commandId: string;
  expectedStateVersion: number;
}

export type EconomyCommand =
  | (BaseCommand & { type: "StartRun"; runId: string })
  | (BaseCommand & { type: "BuyAsset"; assetId: AssetId; quantity: number })
  | (BaseCommand & { type: "SellAsset"; assetId: AssetId; quantity: number })
  | (BaseCommand & {
      type: "Travel";
      destinationLocationId: LocationId;
      mode: "walk" | "chopper" | "whip";
    })
  | (BaseCommand & { type: "DepositStash"; assetId: AssetId; quantity: number })
  | (BaseCommand & {
      type: "WithdrawStash";
      locationId: LocationId;
      assetId: AssetId;
      quantity: number;
    })
  | (BaseCommand & { type: "AcceptClient"; clientId: ClientId })
  | (BaseCommand & { type: "UsePlug"; assetId: AssetId; locationId: LocationId })
  | (BaseCommand & { type: "EndDay" })
  | (BaseCommand & { type: "EndRun" });

export type RejectionCode =
  | "RUN_ALREADY_STARTED"
  | "RUN_NOT_STARTED"
  | "RUN_COMPLETED"
  | "STALE_STATE_VERSION"
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_QUANTITY"
  | "UNKNOWN_ASSET"
  | "UNKNOWN_LOCATION"
  | "UNKNOWN_CLIENT"
  | "ASSET_NOT_AVAILABLE"
  | "INSUFFICIENT_CASH"
  | "INSUFFICIENT_INVENTORY"
  | "INSUFFICIENT_STASH"
  | "INVENTORY_CAPACITY_EXCEEDED"
  | "STASH_CAPACITY_EXCEEDED"
  | "ACTION_REQUIRED"
  | "LOCATION_LOCKED"
  | "INVALID_TRAVEL_ROUTE"
  | "GEAR_REQUIRED"
  | "GEAR_EXHAUSTED"
  | "MAX_OWNED"
  | "WRONG_CITY"
  | "CLIENT_UNAVAILABLE"
  | "CLIENT_ALREADY_ACCEPTED"
  | "CLIENT_ALREADY_COMPLETED"
  | "PLUG_REQUIRED";

export interface RejectionDetail {
  field?: string;
  required?: number | string | string[];
  actual?: number | string | string[];
  reasons?: Array<{ code: string; message: string }>;
}

export interface LegalAction {
  type: EconomyCommand["type"];
  assetId?: AssetId;
  locationId?: LocationId;
  clientId?: ClientId;
  modes?: Array<"walk" | "chopper" | "whip">;
}

export interface AcceptedCommandResult {
  status: "accepted";
  duplicate: boolean;
  resultingStateVersion: number;
  state: EconomyState;
  events: DomainEvent[];
  randomEvidence: RandomEvidence[];
}

export interface RejectedCommandResult {
  status: "rejected";
  code: RejectionCode;
  message: string;
  detail?: RejectionDetail;
  state?: EconomyState;
  legalActions: LegalAction[];
}

export type CommandResult = AcceptedCommandResult | RejectedCommandResult;

export function commandFingerprint(command: EconomyCommand): string {
  const entries = Object.entries(command).sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify(Object.fromEntries(entries));
}
