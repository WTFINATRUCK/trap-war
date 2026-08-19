import type { EconomyContent } from "./content.js";
import type { EconomyState, ScoreBreakdown, WealthBreakdown } from "./model.js";

function inventoryValue(state: EconomyState): number {
  return Object.entries(state.inventory).reduce(
    (total, [assetId, quantity]) => total + (state.prices[assetId] ?? 0) * quantity,
    0,
  );
}

function stashValue(state: EconomyState): number {
  return Object.values(state.stashes).reduce(
    (total, stash) =>
      total +
      Object.entries(stash).reduce(
        (stashTotal, [assetId, holding]) =>
          stashTotal + (state.prices[assetId] ?? 0) * holding.quantity,
        0,
      ),
    0,
  );
}

function gearValue(state: EconomyState, content: EconomyContent): number {
  return Object.entries(state.gear).reduce((total, [assetId, holding]) => {
    const asset = content.assets[assetId];
    if (!asset) return total;
    const currentPrice = state.prices[assetId] ?? asset.minPrice;
    const valuationBps = asset.gearValuationBps ?? 0;
    const value = Math.floor(
      (currentPrice * holding.quantity * valuationBps * holding.conditionBps) / 100_000_000,
    );
    return total + value;
  }, 0);
}

export function calculateWealth(state: EconomyState, content: EconomyContent): WealthBreakdown {
  const breakdown: WealthBreakdown = {
    liquidCash: state.cash,
    inventoryMarketValue: inventoryValue(state),
    stashMarketValue: stashValue(state),
    gearPropertyValue: gearValue(state, content),
    vaultValue: state.protectedReserves,
    liabilities: state.liabilities,
    netWorth: 0,
  };
  breakdown.netWorth =
    breakdown.liquidCash +
    breakdown.inventoryMarketValue +
    breakdown.stashMarketValue +
    breakdown.gearPropertyValue +
    breakdown.vaultValue -
    breakdown.liabilities;
  return breakdown;
}

export function calculateScore(state: EconomyState, content: EconomyContent): ScoreBreakdown {
  const wealth = calculateWealth(state, content);
  const rankIndex = Math.max(0, content.ranks.findIndex((rank) => rank.id === state.rankId));
  const progressionBonus = state.reputation * 25 + rankIndex * 1_000;
  return {
    netWorth: wealth.netWorth,
    progressionBonus,
    gameScore: wealth.netWorth + progressionBonus,
  };
}
