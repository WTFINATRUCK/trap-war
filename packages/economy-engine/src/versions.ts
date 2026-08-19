export interface EconomyVersions {
  economyVersion: string;
  contentVersion: string;
  balanceVersion: string;
  randomStrategyVersion: string;
}

export const V2_VERSIONS: EconomyVersions = {
  economyVersion: "economy-v2.m5.6",
  contentVersion: "content-v2.m5.6.1",
  balanceVersion: "balance-v2.m5.6.1",
  randomStrategyVersion: "hmac-sha256-streams.1",
};

export const LEGACY_FIXTURE_VERSIONS: EconomyVersions = {
  economyVersion: "legacy-telegram-engine.1",
  contentVersion: "legacy-telegram-content.1",
  balanceVersion: "legacy-telegram-balance.1",
  randomStrategyVersion: "legacy-math-random-tape.1",
};
