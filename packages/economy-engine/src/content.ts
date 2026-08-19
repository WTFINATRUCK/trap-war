export type LocationId = string;
export type AssetId = string;
export type RankId = string;
export type ClientId = string;

export type AssetCategory = "core" | "weapon" | "transport" | "utility";

export interface AssetDefinition {
  id: AssetId;
  displayName: string;
  category: AssetCategory;
  minPrice: number;
  maxPriceExclusive: number;
  dailyYieldBps: number;
  volatilityBps: number;
  availableFromDay: number;
  maxOwned?: number;
  travelUses?: number;
  gearValuationBps?: number;
}

export interface LocationDefinition {
  id: LocationId;
  displayName: string;
  adjacentLocationIds: LocationId[];
  cheapAssetIds: AssetId[];
  expensiveAssetIds: AssetId[];
  robberyBaseChanceBps: number;
  raidBaseChanceBps: number;
  informationQualityBps: number;
}

export interface RankDefinition {
  id: RankId;
  displayName: string;
  threshold: number;
  diversityRequired: number;
  stashedLocationsRequired: number;
  yieldBonusBps: number;
  skimRateBps: number;
  sellBonusAssetId?: AssetId;
  sellBonusBps?: number;
}

export type ClientObjective =
  | {
      type: "deposit_asset";
      locationId: LocationId;
      assetId: AssetId;
      quantity: number;
      progressKey: string;
    }
  | {
      type: "sell_asset";
      locationId: LocationId;
      assetId: AssetId;
      quantity: number;
      progressKey: string;
    };

export interface ClientAvailabilityRules {
  minDay?: number;
  locationIds?: LocationId[];
  minRankId?: RankId;
  minCash?: number;
  requiredClientIds?: ClientId[];
  requiredInventory?: Record<AssetId, number>;
}

export interface ClientDefinition {
  id: ClientId;
  displayName: string;
  availability: ClientAvailabilityRules;
  objectives: ClientObjective[];
  unlockLocationIds: LocationId[];
  gearRewardAssetId?: AssetId;
}

export interface EconomyContent {
  contentVersion: string;
  balanceVersion: string;
  maxDays: number;
  actionsPerDay: number;
  startingCash: number;
  startingProtectedReserves: number;
  inventoryCapacity: number;
  stashCapacity: number;
  baseStashShieldDays: number;
  tradeSpreadBps: number;
  startingLocationId: LocationId;
  startingUnlockedLocationIds: LocationId[];
  locations: Record<LocationId, LocationDefinition>;
  assets: Record<AssetId, AssetDefinition>;
  ranks: RankDefinition[];
  clients: Record<ClientId, ClientDefinition>;
}

const locations: LocationDefinition[] = [
  {
    id: "compton",
    displayName: "Compton",
    adjacentLocationIds: ["inglewood", "watts"],
    cheapAssetIds: ["molly", "stick"],
    expensiveAssetIds: ["weed"],
    robberyBaseChanceBps: 300,
    raidBaseChanceBps: 250,
    informationQualityBps: 0,
  },
  {
    id: "inglewood",
    displayName: "Inglewood",
    adjacentLocationIds: ["compton", "long_beach"],
    cheapAssetIds: ["plug", "weed"],
    expensiveAssetIds: ["molly"],
    robberyBaseChanceBps: 350,
    raidBaseChanceBps: 300,
    informationQualityBps: 300,
  },
  {
    id: "long_beach",
    displayName: "Long Beach",
    adjacentLocationIds: ["inglewood", "south_central"],
    cheapAssetIds: ["coke", "whip"],
    expensiveAssetIds: ["meth"],
    robberyBaseChanceBps: 200,
    raidBaseChanceBps: 200,
    informationQualityBps: 100,
  },
  {
    id: "south_central",
    displayName: "South Central",
    adjacentLocationIds: ["long_beach", "watts", "east_la"],
    cheapAssetIds: ["meth", "chopper"],
    expensiveAssetIds: ["coke"],
    robberyBaseChanceBps: 750,
    raidBaseChanceBps: 700,
    informationQualityBps: -200,
  },
  {
    id: "watts",
    displayName: "Watts",
    adjacentLocationIds: ["compton", "south_central", "east_la"],
    cheapAssetIds: ["stick", "molly"],
    expensiveAssetIds: ["whip"],
    robberyBaseChanceBps: 500,
    raidBaseChanceBps: 450,
    informationQualityBps: 200,
  },
  {
    id: "east_la",
    displayName: "East LA",
    adjacentLocationIds: ["south_central", "watts"],
    cheapAssetIds: ["weed", "coke"],
    expensiveAssetIds: ["plug"],
    robberyBaseChanceBps: 350,
    raidBaseChanceBps: 300,
    informationQualityBps: 1_000,
  },
];

const assets: AssetDefinition[] = [
  {
    id: "weed",
    displayName: "Weed",
    category: "core",
    minPrice: 40,
    maxPriceExclusive: 80,
    dailyYieldBps: 25,
    volatilityBps: 500,
    availableFromDay: 1,
  },
  {
    id: "coke",
    displayName: "Coke",
    category: "core",
    minPrice: 120,
    maxPriceExclusive: 220,
    dailyYieldBps: 50,
    volatilityBps: 2_500,
    availableFromDay: 1,
  },
  {
    id: "molly",
    displayName: "Molly",
    category: "core",
    minPrice: 80,
    maxPriceExclusive: 200,
    dailyYieldBps: 100,
    volatilityBps: 6_000,
    availableFromDay: 1,
  },
  {
    id: "meth",
    displayName: "Meth",
    category: "core",
    minPrice: 200,
    maxPriceExclusive: 450,
    dailyYieldBps: 175,
    volatilityBps: 9_000,
    availableFromDay: 5,
  },
  {
    id: "stick",
    displayName: "The Stick",
    category: "weapon",
    minPrice: 350,
    maxPriceExclusive: 500,
    dailyYieldBps: 0,
    volatilityBps: 1_500,
    availableFromDay: 1,
    maxOwned: 3,
    gearValuationBps: 6_000,
  },
  {
    id: "chopper",
    displayName: "The Chopper",
    category: "transport",
    minPrice: 800,
    maxPriceExclusive: 1_200,
    dailyYieldBps: 0,
    volatilityBps: 1_000,
    availableFromDay: 3,
    maxOwned: 1,
    travelUses: 5,
    gearValuationBps: 6_500,
  },
  {
    id: "whip",
    displayName: "The Whip",
    category: "transport",
    minPrice: 1_500,
    maxPriceExclusive: 2_200,
    dailyYieldBps: 0,
    volatilityBps: 1_200,
    availableFromDay: 5,
    maxOwned: 1,
    travelUses: 3,
    gearValuationBps: 7_000,
  },
  {
    id: "plug",
    displayName: "The Plug",
    category: "utility",
    minPrice: 250,
    maxPriceExclusive: 400,
    dailyYieldBps: 0,
    volatilityBps: 800,
    availableFromDay: 5,
    gearValuationBps: 5_000,
  },
];

const ranks: RankDefinition[] = [
  {
    id: "corner_boy",
    displayName: "Corner Boy",
    threshold: 0,
    diversityRequired: 0,
    stashedLocationsRequired: 0,
    yieldBonusBps: 0,
    skimRateBps: 800,
  },
  {
    id: "runner",
    displayName: "Runner",
    threshold: 3_000,
    diversityRequired: 2,
    stashedLocationsRequired: 1,
    yieldBonusBps: 500,
    skimRateBps: 800,
  },
  {
    id: "hustler",
    displayName: "Hustler",
    threshold: 10_000,
    diversityRequired: 3,
    stashedLocationsRequired: 2,
    yieldBonusBps: 0,
    skimRateBps: 800,
    sellBonusAssetId: "coke",
    sellBonusBps: 1_000,
  },
  {
    id: "kingpin",
    displayName: "Kingpin",
    threshold: 30_000,
    diversityRequired: 4,
    stashedLocationsRequired: 3,
    yieldBonusBps: 0,
    skimRateBps: 700,
  },
  {
    id: "trap_lord",
    displayName: "Trap Lord",
    threshold: 80_000,
    diversityRequired: 4,
    stashedLocationsRequired: 4,
    yieldBonusBps: 1_000,
    skimRateBps: 800,
  },
  {
    id: "trap_god",
    displayName: "Trap God",
    threshold: 175_000,
    diversityRequired: 4,
    stashedLocationsRequired: 6,
    yieldBonusBps: 0,
    skimRateBps: 600,
  },
];

const clients: ClientDefinition[] = [
  {
    id: "pearl",
    displayName: "Ms. Pearl",
    availability: { minDay: 1, locationIds: ["compton"] },
    objectives: [
      {
        type: "deposit_asset",
        locationId: "compton",
        assetId: "weed",
        quantity: 30,
        progressKey: "weed_deposited",
      },
    ],
    unlockLocationIds: ["long_beach"],
  },
  {
    id: "ray",
    displayName: "Uncle Ray",
    availability: {
      minDay: 5,
      locationIds: ["inglewood"],
      requiredClientIds: ["pearl"],
    },
    objectives: [
      {
        type: "deposit_asset",
        locationId: "inglewood",
        assetId: "coke",
        quantity: 6,
        progressKey: "coke_deposited",
      },
      {
        type: "deposit_asset",
        locationId: "inglewood",
        assetId: "molly",
        quantity: 5,
        progressKey: "molly_deposited",
      },
    ],
    unlockLocationIds: ["south_central", "watts"],
    gearRewardAssetId: "stick",
  },
  {
    id: "dispatcher",
    displayName: "The Dispatcher",
    availability: {
      minDay: 12,
      locationIds: ["watts"],
      requiredClientIds: ["ray"],
    },
    objectives: [
      {
        type: "sell_asset",
        locationId: "watts",
        assetId: "meth",
        quantity: 12,
        progressKey: "meth_sold",
      },
    ],
    unlockLocationIds: ["east_la"],
    gearRewardAssetId: "whip",
  },
];

function byId<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

export const DEFAULT_ECONOMY_CONTENT: EconomyContent = {
  contentVersion: "content-v2.m5.6.1",
  balanceVersion: "balance-v2.m5.6.1",
  maxDays: 30,
  actionsPerDay: 3,
  startingCash: 500,
  startingProtectedReserves: 40,
  inventoryCapacity: 100,
  stashCapacity: 100,
  baseStashShieldDays: 3,
  tradeSpreadBps: 200,
  startingLocationId: "compton",
  startingUnlockedLocationIds: ["compton", "inglewood"],
  locations: byId(locations),
  assets: byId(assets),
  ranks,
  clients: byId(clients),
};

export function coreAssetIds(content: EconomyContent): AssetId[] {
  return Object.values(content.assets)
    .filter((asset) => asset.category === "core")
    .map((asset) => asset.id);
}
