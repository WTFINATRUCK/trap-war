export const MAX_DAYS = 30;
export const MAX_ACTIONS_PER_DAY = 3;
export const STARTING_CASH = 500;
export const STARTING_PROTECTED = 40;
export const RESERVE_SKIM_RATE = 0.08;
export const COAT_SPACE = 100;
export const PLANT_COST = 100;
export const MIN_PLANT_UNITS = 10;
export const MIN_PLANT_VALUE = 500;
export const SHIELD_DAYS_BASE = 3;
export const SHIELD_DAYS_BOOSTED = 5;
export const MAX_STICK = 3;
export const CHOPPER_HOPS_DEFAULT = 5;
export const WHIP_HOPS_DEFAULT = 3;
export const MAX_FIGHT_BACKS = 2;

export const CITIES = [
  "Compton",
  "Inglewood",
  "Long Beach",
  "South Central",
  "Watts",
  "East LA",
] as const;

export type CityId = (typeof CITIES)[number];

export const ADJACENT_CITIES: Record<CityId, CityId[]> = {
  Compton: ["Inglewood", "Watts"],
  Inglewood: ["Compton", "Long Beach"],
  "Long Beach": ["Inglewood", "South Central"],
  "South Central": ["Long Beach", "Watts", "East LA"],
  Watts: ["Compton", "South Central", "East LA"],
  "East LA": ["South Central", "Watts"],
};

export type AssetCategory = "core" | "weapon" | "transport" | "utility";

export interface AssetDef {
  name: string;
  emoji: string;
  category: AssetCategory;
  minPrice: number;
  maxPrice: number;
  dailyYield: number;
  volatility: number;
  defiLabel: string;
  wordOnStreet: string;
  availableFromDay: number;
}

export const LEGACY_ASSET_NAMES: Record<string, string> = {
  "Clean Cash": "Weed",
  "Blue Chips": "Coke",
  "Meme Bags": "Molly",
  "Leverage Plays": "Meth",
};

export const ASSETS: AssetDef[] = [
  {
    name: "Weed",
    emoji: "🌿",
    category: "core",
    minPrice: 40,
    maxPrice: 80,
    dailyYield: 0.0025,
    volatility: 0.05,
    defiLabel: "Mids — slow flip, low heat",
    wordOnStreet: "Reggie work. Moves slow, cops barely care — safe bread on the block.",
    availableFromDay: 1,
  },
  {
    name: "Coke",
    emoji: "❄️",
    category: "core",
    minPrice: 120,
    maxPrice: 220,
    dailyYield: 0.005,
    volatility: 0.25,
    defiLabel: "Fish scale — steady money",
    wordOnStreet: "Classic white. Price swings both ways — balanced hustle for real players.",
    availableFromDay: 1,
  },
  {
    name: "Molly",
    emoji: "💊",
    category: "core",
    minPrice: 80,
    maxPrice: 200,
    dailyYield: 0.01,
    volatility: 0.6,
    defiLabel: "Pressies — hot & volatile",
    wordOnStreet: "Party packs. Big upside, but wolves and raids love a loud bag.",
    availableFromDay: 1,
  },
  {
    name: "Meth",
    emoji: "🧪",
    category: "core",
    minPrice: 200,
    maxPrice: 450,
    dailyYield: 0.0175,
    volatility: 0.9,
    defiLabel: "Crystal — high risk, high reward",
    wordOnStreet: "Ice lane. Wild swings, heavy heat — only for the fearless.",
    availableFromDay: 5,
  },
  {
    name: "The Stick",
    emoji: "🔫",
    category: "weapon",
    minPrice: 350,
    maxPrice: 500,
    dailyYield: 0,
    volatility: 0.15,
    defiLabel: "Strap — insurance on the block",
    wordOnStreet: "Stay strapped. Robbers think twice when you holding heat.",
    availableFromDay: 1,
  },
  {
    name: "The Chopper",
    emoji: "🏍️",
    category: "transport",
    minPrice: 800,
    maxPrice: 1200,
    dailyYield: 0,
    volatility: 0.1,
    defiLabel: "Quick hops — adjacent blocks only",
    wordOnStreet: "Short runs without burning the day. Adjacent cities only.",
    availableFromDay: 3,
  },
  {
    name: "The Whip",
    emoji: "🚗",
    category: "transport",
    minPrice: 1500,
    maxPrice: 2200,
    dailyYield: 0,
    volatility: 0.12,
    defiLabel: "Cross-town — limited hops per run",
    wordOnStreet: "Cross-city without losing a day. Limited hops per run.",
    availableFromDay: 5,
  },
  {
    name: "The Plug",
    emoji: "📱",
    category: "utility",
    minPrice: 250,
    maxPrice: 400,
    dailyYield: 0,
    volatility: 0.08,
    defiLabel: "Intel — best sell spot today",
    wordOnStreet: "Info edge. Reveals the best sell city for one product today.",
    availableFromDay: 5,
  },
];

export const CORE_ASSETS = ASSETS.filter((a) => a.category === "core").map((a) => a.name);

export type RankId =
  | "corner_boy"
  | "runner"
  | "hustler"
  | "kingpin"
  | "trap_lord"
  | "trap_god";

export interface RankDef {
  id: RankId;
  name: string;
  threshold: number;
  diversity: number;
  plantedCities: number;
  yieldBonus: number;
  sellBonusAsset?: string;
  skimRate?: number;
}

export const RANKS: RankDef[] = [
  { id: "corner_boy", name: "Corner Boy", threshold: 0, diversity: 0, plantedCities: 0, yieldBonus: 0 },
  { id: "runner", name: "Runner", threshold: 3000, diversity: 2, plantedCities: 1, yieldBonus: 0.05 },
  { id: "hustler", name: "Hustler", threshold: 10000, diversity: 3, plantedCities: 2, yieldBonus: 0, sellBonusAsset: "Coke" },
  { id: "kingpin", name: "Kingpin", threshold: 30000, diversity: 4, plantedCities: 3, yieldBonus: 0, skimRate: 0.07 },
  { id: "trap_lord", name: "Trap Lord", threshold: 80000, diversity: 4, plantedCities: 4, yieldBonus: 0.1 },
  { id: "trap_god", name: "Trap God", threshold: 175000, diversity: 4, plantedCities: 6, yieldBonus: 0, skimRate: 0.06 },
];

export type ClientId = "pearl" | "ray" | "dispatcher";

export interface ClientDef {
  id: ClientId;
  name: string;
  emoji: string;
  unlockDay: number;
  description: string;
  requirement: string;
  citiesUnlocked: CityId[];
  reward: string;
}

export const CLIENTS: ClientDef[] = [
  {
    id: "pearl",
    name: "Ms. Pearl",
    emoji: "🪞",
    unlockDay: 1,
    description: "Park Weed in Compton — learn the slow, safe flip.",
    requirement: "Plant 40+ Weed in Compton",
    citiesUnlocked: ["Long Beach"],
    reward: "Long Beach unlock + yield bonus in Compton",
  },
  {
    id: "ray",
    name: "Uncle Ray",
    emoji: "🔧",
    unlockDay: 5,
    description: "Diversify in Inglewood — Coke + Molly.",
    requirement: "Plant 15 Coke + 10 Molly in Inglewood",
    citiesUnlocked: ["South Central", "Watts"],
    reward: "South Central & Watts unlock + The Stick gifted",
  },
  {
    id: "dispatcher",
    name: "The Dispatcher",
    emoji: "📡",
    unlockDay: 12,
    description: "Prove you can move hot product in Watts.",
    requirement: "Sell 20 Meth total in Watts",
    citiesUnlocked: ["East LA"],
    reward: "East LA unlock + Chopper or Whip gift",
  },
];

export const CITY_PRICE_BIAS: Partial<Record<CityId, { cheap: string[]; expensive: string[] }>> = {
  Compton: { cheap: ["Molly", "The Stick"], expensive: ["Weed"] },
  "Long Beach": { cheap: ["Coke", "The Whip"], expensive: ["Meth"] },
  Inglewood: { cheap: ["The Plug", "Weed"], expensive: ["Molly"] },
  "South Central": { cheap: ["Meth", "The Chopper"], expensive: ["Coke"] },
  Watts: { cheap: ["The Stick", "Molly"], expensive: ["The Whip"] },
  "East LA": { cheap: ["Weed", "Coke"], expensive: ["The Plug"] },
};

export const RANDOM_ENCOUNTERS = [
  { type: "hot_tip", weight: 35, text: "Word on the Street: Molly prices spike in East LA tomorrow!" },
  { type: "quick_flip", weight: 25, text: "Buyer in Watts paying +30% on Coke today only!" },
  { type: "street_gift", weight: 15, text: "Client leftover — free units landed in your bag!" },
  { type: "rob_setup", weight: 10, text: "Someone's casing you… Stay strapped." },
  { type: "aero_drop", weight: 5, text: "AERO hit your line — bonus credit!" },
  { type: "quiet", weight: 10, text: "" },
] as const;