import type { CityId, ClientId, RankId } from "./constants";

export interface PlantedStash {
  asset: string;
  units: number;
  plantedOnDay: number;
  shieldDaysLeft: number;
}

export interface PriceHaircut {
  percent: number;
  daysLeft: number;
}

export interface ClientProgress {
  pearl: { complete: boolean; progress: number; target: number };
  ray: { complete: boolean; blueChips: number; memeBags: number };
  dispatcher: { complete: boolean; leverageSoldInWatts: number };
}

export interface PendingFightBack {
  lossAmount: number;
  lossType: "yield" | "cash" | "units";
  asset?: string;
}

export interface GameState {
  day: number;
  location: CityId;
  cash: number;
  protectedReserves: number;
  inventory: Record<string, number>;
  plantedStashes: Partial<Record<CityId, PlantedStash>>;
  coatSpace: number;
  prices: Record<string, number>;
  priceHaircuts: Record<string, PriceHaircut>;
  actionsLeft: number;
  gameOver: boolean;
  finalScore: number;
  rank: RankId;

  stickCount: number;
  hasChopper: boolean;
  chopperHopsLeft: number;
  hasWhip: boolean;
  whipHopsLeft: number;

  unlockedCities: CityId[];
  longBeachSneakUsed: boolean;

  clientProgress: ClientProgress;
  payToEarnBoost: boolean;
  extendedShieldPending: boolean;

  fightBacksUsed: number;
  nextDayActionPenalty: number;
  pendingFightBack: PendingFightBack | null;

  totalYieldAccrued: number;
  grossYieldLastDay: number;
  totalProtectedAtCompletion: number;

  plugIntel: { asset: string; city: CityId } | null;
  tempPriceBoost: { asset: string; multiplier: number; daysLeft: number } | null;

  encounterLog: string[];
  firstSkimShown: boolean;
  firstPlantShown: boolean;
  dispatcherGiftClaimed: boolean;
}

export interface DayAdvanceResult {
  state: GameState;
  messages: GameMessage[];
}

export interface GameMessage {
  type: "info" | "success" | "warning" | "event" | "street";
  title?: string;
  text: string;
}

export interface ActionResult {
  state: GameState;
  messages: GameMessage[];
  blocked?: boolean;
}