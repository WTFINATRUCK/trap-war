import { coreAssetIds, type EconomyContent } from "./content.js";
import type { LegalAction } from "./commands.js";
import type { EconomyState } from "./model.js";

export function inventoryUnits(state: EconomyState): number {
  return Object.values(state.inventory).reduce((total, quantity) => total + quantity, 0);
}

export function stashUnits(state: EconomyState, locationId: string): number {
  return Object.values(state.stashes[locationId] ?? {}).reduce(
    (total, holding) => total + holding.quantity,
    0,
  );
}

export function totalStashUnits(state: EconomyState): number {
  return Object.keys(state.stashes).reduce(
    (total, locationId) => total + stashUnits(state, locationId),
    0,
  );
}

export function getLegalActions(state: EconomyState | undefined, content: EconomyContent): LegalAction[] {
  if (!state) return [{ type: "StartRun" }];
  if (state.status === "completed") return [];

  const actions: LegalAction[] = [{ type: "EndDay" }, { type: "EndRun" }];
  if (state.actionsRemaining <= 0) return actions;

  for (const assetId of coreAssetIds(content)) {
    const asset = content.assets[assetId];
    if (asset && state.day >= asset.availableFromDay) {
      if (state.cash >= (state.prices[assetId] ?? asset.minPrice) && inventoryUnits(state) < state.inventoryCapacity) {
        actions.push({ type: "BuyAsset", assetId });
      }
      if ((state.inventory[assetId] ?? 0) > 0) {
        actions.push({ type: "SellAsset", assetId });
        if (totalStashUnits(state) < content.stashCapacity) {
          actions.push({ type: "DepositStash", assetId, locationId: state.locationId });
        }
      }
      if ((state.stashes[state.locationId]?.[assetId]?.quantity ?? 0) > 0) {
        actions.push({ type: "WithdrawStash", assetId, locationId: state.locationId });
      }
    }
  }

  for (const asset of Object.values(content.assets)) {
    if (asset.category === "core" || state.day < asset.availableFromDay) continue;
    const holding = state.gear[asset.id];
    if (state.cash >= (state.prices[asset.id] ?? asset.minPrice) && (!asset.maxOwned || (holding?.quantity ?? 0) < asset.maxOwned)) {
      actions.push({ type: "BuyAsset", assetId: asset.id });
    }
  }

  const current = content.locations[state.locationId];
  for (const destination of state.unlockedLocationIds) {
    if (destination === state.locationId) continue;
    const modes: Array<"walk" | "chopper" | "whip"> = ["walk"];
    if (current?.adjacentLocationIds.includes(destination) && (state.gear.chopper?.usesRemaining ?? 0) > 0) modes.push("chopper");
    if ((state.gear.whip?.usesRemaining ?? 0) > 0) modes.push("whip");
    actions.push({ type: "Travel", locationId: destination, modes });
  }

  if ((state.gear.plug?.quantity ?? 0) > 0) actions.push({ type: "UsePlug" });
  for (const [clientId, client] of Object.entries(state.clients)) {
    if (!client.accepted && !client.completed) actions.push({ type: "AcceptClient", clientId });
  }
  return actions;
}
