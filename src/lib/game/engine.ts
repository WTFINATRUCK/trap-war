import {
  ADJACENT_CITIES,
  ASSETS,
  CHOPPER_HOPS_DEFAULT,
  CITIES,
  CITY_PRICE_BIAS,
  CLIENTS,
  COAT_SPACE,
  CORE_ASSETS,
  MAX_ACTIONS_PER_DAY,
  MAX_DAYS,
  MAX_FIGHT_BACKS,
  MAX_STICK,
  MIN_PLANT_UNITS,
  MIN_PLANT_VALUE,
  PLANT_COST,
  RANKS,
  RESERVE_SKIM_RATE,
  SHIELD_DAYS_BASE,
  SHIELD_DAYS_BOOSTED,
  STARTING_CASH,
  STARTING_PROTECTED,
  WHIP_HOPS_DEFAULT,
  LEGACY_ASSET_NAMES,
  type AssetDef,
  type CityId,
  type ClientId,
  type RankId,
} from "./constants";
import type {
  ActionResult,
  DayAdvanceResult,
  GameMessage,
  GameState,
  PendingFightBack,
  PlantedStash,
} from "./types";

export function createInitialState(): GameState {
  return {
    day: 1,
    location: "Compton",
    cash: STARTING_CASH,
    protectedReserves: STARTING_PROTECTED,
    inventory: {},
    plantedStashes: {},
    coatSpace: COAT_SPACE,
    prices: randomizePrices("Compton"),
    priceHaircuts: {},
    actionsLeft: MAX_ACTIONS_PER_DAY,
    gameOver: false,
    finalScore: 0,
    rank: "corner_boy",
    stickCount: 0,
    hasChopper: false,
    chopperHopsLeft: 0,
    hasWhip: false,
    whipHopsLeft: 0,
    unlockedCities: ["Compton", "Inglewood"],
    longBeachSneakUsed: false,
    clientProgress: {
      pearl: { complete: false, progress: 0, target: 40 },
      ray: { complete: false, blueChips: 0, memeBags: 0 },
      dispatcher: { complete: false, leverageSoldInWatts: 0 },
    },
    payToEarnBoost: false,
    extendedShieldPending: false,
    fightBacksUsed: 0,
    nextDayActionPenalty: 0,
    pendingFightBack: null,
    totalYieldAccrued: 0,
    grossYieldLastDay: 0,
    totalProtectedAtCompletion: 0,
    plugIntel: null,
    tempPriceBoost: null,
    encounterLog: [],
    firstSkimShown: false,
    firstPlantShown: false,
    dispatcherGiftClaimed: false,
  };
}

function remapAssetName(name: string): string {
  return LEGACY_ASSET_NAMES[name] ?? name;
}

function migrateInventoryKeys(inventory: GameState["inventory"]): GameState["inventory"] {
  const migrated: GameState["inventory"] = {};
  for (const [name, qty] of Object.entries(inventory)) {
    const key = remapAssetName(name);
    migrated[key] = (migrated[key] || 0) + qty;
  }
  return migrated;
}

export function migrateSavedState(raw: Partial<GameState>): GameState {
  const base = createInitialState();
  const merged = { ...base, ...raw };
  if (!merged.unlockedCities?.length) merged.unlockedCities = ["Compton", "Inglewood"];
  if (!merged.clientProgress) merged.clientProgress = base.clientProgress;
  if (merged.protectedReserves === undefined) merged.protectedReserves = STARTING_PROTECTED;
  if (merged.actionsLeft === undefined) merged.actionsLeft = MAX_ACTIONS_PER_DAY;
  if (!merged.plantedStashes) merged.plantedStashes = {};
  if (!merged.priceHaircuts) merged.priceHaircuts = {};
  if (merged.dispatcherGiftClaimed === undefined) merged.dispatcherGiftClaimed = false;

  if (merged.inventory) merged.inventory = migrateInventoryKeys(merged.inventory);
  if (merged.plantedStashes) {
    for (const city of Object.keys(merged.plantedStashes) as CityId[]) {
      const stash = merged.plantedStashes[city];
      if (stash) stash.asset = remapAssetName(stash.asset);
    }
  }
  if (merged.priceHaircuts) {
    const haircuts = { ...merged.priceHaircuts };
    for (const [name, haircut] of Object.entries({ ...haircuts })) {
      const key = remapAssetName(name);
      if (key !== name) {
        if (!haircuts[key]) haircuts[key] = haircut;
        delete haircuts[name];
      }
    }
    merged.priceHaircuts = haircuts;
  }
  if (merged.plugIntel) {
    merged.plugIntel = { ...merged.plugIntel, asset: remapAssetName(merged.plugIntel.asset) };
  }
  if (merged.tempPriceBoost) {
    merged.tempPriceBoost = { ...merged.tempPriceBoost, asset: remapAssetName(merged.tempPriceBoost.asset) };
  }
  if (merged.prices) {
    const prices = { ...merged.prices };
    for (const [name, price] of Object.entries(prices)) {
      const key = remapAssetName(name);
      if (key !== name) {
        prices[key] = price;
        delete prices[name];
      }
    }
    merged.prices = prices;
  }

  return merged as GameState;
}

function assetDef(name: string): AssetDef | undefined {
  return ASSETS.find((a) => a.name === name);
}

function getSkimRate(rank: RankId): number {
  const rankDef = RANKS.find((r) => r.id === rank);
  return rankDef?.skimRate ?? RESERVE_SKIM_RATE;
}

export function applyCashInflow(state: GameState, gross: number): { cash: number; protected: number; skim: number } {
  const rate = getSkimRate(state.rank);
  const skim = Math.floor(gross * rate);
  return {
    cash: state.cash + (gross - skim),
    protected: state.protectedReserves + skim,
    skim,
  };
}

function inventoryUnits(state: GameState): number {
  return Object.entries(state.inventory).reduce((sum, [name, qty]) => {
    const def = assetDef(name);
    if (def?.category === "weapon") return sum;
    return sum + qty;
  }, 0);
}

function diversityCount(state: GameState): number {
  return CORE_ASSETS.filter((name) => (state.inventory[name] || 0) > 0 || plantedUnits(state, name) > 0).length;
}

function plantedUnits(state: GameState, asset: string): number {
  return Object.values(state.plantedStashes).reduce((sum, stash) => {
    if (stash?.asset === asset) return sum + stash.units;
    return sum;
  }, 0);
}

function stashCityCredits(state: GameState): number {
  let credits = 0;
  for (const city of CITIES) {
    if (state.plantedStashes[city]) credits += 1;
    else if (state.location === city && CORE_ASSETS.some((a) => (state.inventory[a] || 0) > 0)) {
      credits += 0.5;
    }
  }
  return credits;
}

export function calculateTotalValue(state: GameState): number {
  let total = state.cash + state.protectedReserves;
  for (const [name, qty] of Object.entries(state.inventory)) {
    total += getSellPrice(state, name) * qty;
  }
  for (const stash of Object.values(state.plantedStashes)) {
    if (stash) total += getSellPrice(state, stash.asset) * stash.units;
  }
  return Math.floor(total);
}

export function computeRank(state: GameState): RankId {
  const total = calculateTotalValue(state);
  const diversity = diversityCount(state);
  const stashCredits = stashCityCredits(state);
  const score = total + diversity * 2000 + stashCredits * 3000;

  let rank: RankId = "corner_boy";
  for (const r of RANKS) {
    const plantedNeeded = r.plantedCities;
    const plantedCount = Object.keys(state.plantedStashes).length;
    if (score >= r.threshold && diversity >= r.diversity && plantedCount >= plantedNeeded) {
      rank = r.id;
    }
  }
  return rank;
}

export function getSellPrice(state: GameState, assetName: string): number {
  const base = state.prices[assetName] || 0;
  const haircut = state.priceHaircuts[assetName];
  if (haircut && haircut.daysLeft > 0) {
    return Math.max(5, Math.floor(base * (1 - haircut.percent)));
  }
  if (state.tempPriceBoost?.asset === assetName && state.tempPriceBoost.daysLeft > 0) {
    return Math.floor(base * state.tempPriceBoost.multiplier);
  }
  const rank = RANKS.find((r) => r.id === state.rank);
  if (rank?.sellBonusAsset === assetName) {
    return Math.floor(base * 1.1);
  }
  return base;
}

export function randomizePrices(city: CityId): Record<string, number> {
  const prices: Record<string, number> = {};
  const cityBias = CITY_PRICE_BIAS[city];
  const cheap = cityBias?.cheap ?? [];
  const expensive = cityBias?.expensive ?? [];

  for (const asset of ASSETS) {
    let price = Math.floor(Math.random() * (asset.maxPrice - asset.minPrice) + asset.minPrice);
    if (cheap.includes(asset.name)) price = Math.floor(price * 0.85);
    if (expensive.includes(asset.name)) price = Math.floor(price * 1.15);
    prices[asset.name] = price;
  }
  return prices;
}

function consumeAction(state: GameState): ActionResult | null {
  if (state.actionsLeft <= 0) {
    return {
      state,
      messages: [{ type: "warning", text: "No actions left. Travel to advance the day or use Chopper/Whip." }],
      blocked: true,
    };
  }
  return null;
}

function tryConsumeAction(state: GameState): { state: GameState; forcedDayEnd: boolean } {
  if (state.actionsLeft > 1) {
    return { state: { ...state, actionsLeft: state.actionsLeft - 1 }, forcedDayEnd: false };
  }
  return { state: { ...state, actionsLeft: 0 }, forcedDayEnd: true };
}

export function buyAsset(state: GameState, assetName: string, quantity: number): ActionResult {
  const asset = assetDef(assetName);
  if (!asset) return { state, messages: [{ type: "warning", text: "Unknown asset." }], blocked: true };
  if (state.day < asset.availableFromDay) {
    return { state, messages: [{ type: "warning", text: `${assetName} unlocks on day ${asset.availableFromDay}.` }], blocked: true };
  }
  if (quantity <= 0) return { state, messages: [], blocked: true };

  const penalty = consumeAction(state);
  if (penalty?.blocked) return penalty;

  const price = state.prices[assetName];
  const cost = price * quantity;

  if (cost > state.cash) {
    return { state, messages: [{ type: "warning", text: "Not enough cash." }], blocked: true };
  }

  if (asset.category !== "weapon") {
    if (inventoryUnits(state) + quantity > state.coatSpace) {
      return { state, messages: [{ type: "warning", text: "Not enough coat space." }], blocked: true };
    }
  } else if (state.stickCount + quantity > MAX_STICK) {
    return { state, messages: [{ type: "warning", text: `Max ${MAX_STICK} Stick in holster.` }], blocked: true };
  }

  if (asset.category === "transport") {
    if (assetName === "The Chopper" && state.hasChopper) {
      return { state, messages: [{ type: "warning", text: "Already got a Chopper. Sell it first." }], blocked: true };
    }
    if (assetName === "The Whip" && state.hasWhip) {
      return { state, messages: [{ type: "warning", text: "Already got a Whip. Sell it first." }], blocked: true };
    }
  }

  let newState: GameState = { ...state, cash: state.cash - cost };
  const messages: GameMessage[] = [
    { type: "success", text: `Added ${quantity} ${assetName} — ${asset.defiLabel}. $${cost.toLocaleString()}` },
    { type: "street", text: asset.wordOnStreet },
  ];

  if (asset.category === "weapon") {
    newState.stickCount += quantity;
  } else if (assetName === "The Chopper") {
    newState.hasChopper = true;
    newState.chopperHopsLeft = CHOPPER_HOPS_DEFAULT;
  } else if (assetName === "The Whip") {
    newState.hasWhip = true;
    newState.whipHopsLeft = WHIP_HOPS_DEFAULT;
  } else {
    newState.inventory = {
      ...newState.inventory,
      [assetName]: (newState.inventory[assetName] || 0) + quantity,
    };
  }

  const { state: afterAction, forcedDayEnd } = tryConsumeAction(newState);
  if (forcedDayEnd) {
    const dayResult = advanceDay(afterAction);
    return {
      state: dayResult.state,
      messages: [...messages, { type: "info", text: "Street's getting hot — wrapped up for the day." }, ...dayResult.messages],
    };
  }

  return { state: afterAction, messages };
}

export function sellAsset(state: GameState, assetName: string, quantity: number): ActionResult {
  const asset = assetDef(assetName);
  if (!asset || quantity <= 0) return { state, messages: [], blocked: true };

  const penalty = consumeAction(state);
  if (penalty?.blocked) return penalty;

  if (asset.category === "weapon") {
    if (state.stickCount < quantity) {
      return { state, messages: [{ type: "warning", text: "Not enough Stick to sell." }], blocked: true };
    }
    const gross = state.prices[assetName] * quantity;
    const inflow = applyCashInflow(state, gross);
    let newState: GameState = {
      ...state,
      stickCount: state.stickCount - quantity,
      cash: inflow.cash,
      protectedReserves: inflow.protected,
    };
    const { state: afterAction, forcedDayEnd } = tryConsumeAction(newState);
    const messages: GameMessage[] = [{ type: "success", text: `Sold ${quantity} Stick for $${gross.toLocaleString()}` }];
    if (forcedDayEnd) {
      const dayResult = advanceDay(afterAction);
      return { state: dayResult.state, messages: [...messages, ...dayResult.messages] };
    }
    return { state: afterAction, messages };
  }

  if (assetName === "The Chopper" || assetName === "The Whip") {
    const has = assetName === "The Chopper" ? state.hasChopper : state.hasWhip;
    if (!has) return { state, messages: [{ type: "warning", text: `You don't own ${assetName}.` }], blocked: true };
    const gross = state.prices[assetName];
    const inflow = applyCashInflow(state, gross);
    let newState: GameState = { ...state, cash: inflow.cash, protectedReserves: inflow.protected };
    if (assetName === "The Chopper") {
      newState = { ...newState, hasChopper: false, chopperHopsLeft: 0 };
    } else {
      newState = { ...newState, hasWhip: false, whipHopsLeft: 0 };
    }
    const { state: afterAction, forcedDayEnd } = tryConsumeAction(newState);
    const messages: GameMessage[] = [{ type: "success", text: `Sold ${assetName} for $${gross.toLocaleString()}` }];
    if (forcedDayEnd) {
      const dayResult = advanceDay(afterAction);
      return { state: dayResult.state, messages: [...messages, ...dayResult.messages] };
    }
    return { state: afterAction, messages };
  }

  const held = state.inventory[assetName] || 0;
  if (held < quantity) {
    return { state, messages: [{ type: "warning", text: `Not enough ${assetName}.` }], blocked: true };
  }

  const price = getSellPrice(state, assetName);
  const gross = price * quantity;
  const inflow = applyCashInflow(state, gross);

  let newState: GameState = {
    ...state,
    cash: inflow.cash,
    protectedReserves: inflow.protected,
    inventory: { ...state.inventory, [assetName]: held - quantity },
  };

  if (newState.inventory[assetName] === 0) delete newState.inventory[assetName];

  if (assetName === "Meth" && state.location === "Watts") {
    const sold = newState.clientProgress.dispatcher.leverageSoldInWatts + quantity;
    newState.clientProgress = {
      ...newState.clientProgress,
      dispatcher: { ...newState.clientProgress.dispatcher, leverageSoldInWatts: sold },
    };
    checkClientCompletions(newState);
  }

  const messages: GameMessage[] = [
    { type: "success", text: `Sold ${quantity} ${assetName} for $${gross.toLocaleString()}` },
  ];
  if (inflow.skim > 0) {
    messages.push({ type: "info", text: `$${inflow.skim} locked to protected reserves 🔒` });
    if (!state.firstSkimShown) {
      newState.firstSkimShown = true;
      messages.push({
        type: "street",
        title: "Word on the Street",
        text: "You your own bank now. 8% of every dollar you earn stays locked — gas, comebacks, rainy days.",
      });
    }
  }

  const { state: afterAction, forcedDayEnd } = tryConsumeAction(newState);
  afterAction.rank = computeRank(afterAction);

  if (forcedDayEnd) {
    const dayResult = advanceDay(afterAction);
    return { state: dayResult.state, messages: [...messages, ...dayResult.messages] };
  }
  return { state: afterAction, messages };
}

export function plantStash(state: GameState, assetName: string, units: number): ActionResult {
  if (!CORE_ASSETS.includes(assetName)) {
    return { state, messages: [{ type: "warning", text: "Only product can be planted in a stash." }], blocked: true };
  }

  const penalty = consumeAction(state);
  if (penalty?.blocked) return penalty;

  const held = state.inventory[assetName] || 0;
  const value = getSellPrice(state, assetName) * units;
  if (units < MIN_PLANT_UNITS && value < MIN_PLANT_VALUE) {
    return {
      state,
      messages: [{ type: "warning", text: `Plant at least ${MIN_PLANT_UNITS} units or $${MIN_PLANT_VALUE} value.` }],
      blocked: true,
    };
  }
  if (held < units) {
    return { state, messages: [{ type: "warning", text: "Not enough units to plant." }], blocked: true };
  }
  if (state.cash < PLANT_COST) {
    return { state, messages: [{ type: "warning", text: `Planting costs $${PLANT_COST}.` }], blocked: true };
  }
  if (state.plantedStashes[state.location]) {
    return { state, messages: [{ type: "warning", text: "Already have a stash planted here. Retrieve it first." }], blocked: true };
  }

  const shieldDays = state.extendedShieldPending ? SHIELD_DAYS_BOOSTED : SHIELD_DAYS_BASE;
  const stash: PlantedStash = {
    asset: assetName,
    units,
    plantedOnDay: state.day,
    shieldDaysLeft: shieldDays,
  };

  let newState: GameState = {
    ...state,
    cash: state.cash - PLANT_COST,
    inventory: { ...state.inventory, [assetName]: held - units },
    plantedStashes: { ...state.plantedStashes, [state.location]: stash },
    extendedShieldPending: false,
  };
  if (newState.inventory[assetName] === 0) delete newState.inventory[assetName];

  updateClientProgressFromPlant(newState);
  checkClientCompletions(newState);

  const messages: GameMessage[] = [
    { type: "success", text: `🌱 Planted ${units} ${assetName} in ${state.location}. Shield: ${shieldDays} days.` },
  ];
  if (!state.firstPlantShown) {
    newState.firstPlantShown = true;
    messages.push({
      type: "street",
      title: "Word on the Street",
      text: "Touring ain't owning. Plant a stash when you're ready to lock product on the block.",
    });
  }

  const { state: afterAction, forcedDayEnd } = tryConsumeAction(newState);
  afterAction.rank = computeRank(afterAction);

  if (forcedDayEnd) {
    const dayResult = advanceDay(afterAction);
    return { state: dayResult.state, messages: [...messages, ...dayResult.messages] };
  }
  return { state: afterAction, messages };
}

export function retrieveStash(state: GameState): ActionResult {
  const stash = state.plantedStashes[state.location];
  if (!stash) {
    return { state, messages: [{ type: "warning", text: "No stash here to retrieve." }], blocked: true };
  }

  const penalty = consumeAction(state);
  if (penalty?.blocked) return penalty;

  let newState: GameState = {
    ...state,
    inventory: { ...state.inventory, [stash.asset]: (state.inventory[stash.asset] || 0) + stash.units },
    plantedStashes: { ...state.plantedStashes },
  };
  delete newState.plantedStashes[state.location];

  const { state: afterAction, forcedDayEnd } = tryConsumeAction(newState);
  const messages: GameMessage[] = [{ type: "info", text: `Retrieved ${stash.units} ${stash.asset} from ${state.location}.` }];

  if (forcedDayEnd) {
    const dayResult = advanceDay(afterAction);
    return { state: dayResult.state, messages: [...messages, ...dayResult.messages] };
  }
  return { state: afterAction, messages };
}

function updateClientProgressFromPlant(state: GameState): void {
  const stash = state.plantedStashes[state.location];
  if (!stash) return;

  if (state.location === "Compton" && stash.asset === "Weed") {
    state.clientProgress.pearl.progress = Math.max(state.clientProgress.pearl.progress, stash.units);
  }
  if (state.location === "Inglewood") {
    if (stash.asset === "Coke") {
      state.clientProgress.ray.blueChips = Math.max(state.clientProgress.ray.blueChips, stash.units);
    }
    if (stash.asset === "Molly") {
      state.clientProgress.ray.memeBags = Math.max(state.clientProgress.ray.memeBags, stash.units);
    }
  }
}

function checkClientCompletions(state: GameState): GameMessage[] {
  const messages: GameMessage[] = [];

  if (!state.clientProgress.pearl.complete && state.clientProgress.pearl.progress >= 40) {
    state.clientProgress.pearl.complete = true;
    if (!state.unlockedCities.includes("Long Beach")) {
      state.unlockedCities = [...state.unlockedCities, "Long Beach"];
      messages.push({ type: "success", title: "Ms. Pearl", text: "Long Beach unlocked! Weed stash lesson complete." });
    }
  }

  if (
    !state.clientProgress.ray.complete &&
    state.clientProgress.ray.blueChips >= 15 &&
    state.clientProgress.ray.memeBags >= 10
  ) {
    state.clientProgress.ray.complete = true;
    state.stickCount = Math.min(MAX_STICK, state.stickCount + 1);
    for (const city of ["South Central", "Watts"] as CityId[]) {
      if (!state.unlockedCities.includes(city)) state.unlockedCities = [...state.unlockedCities, city];
    }
    messages.push({ type: "success", title: "Uncle Ray", text: "South Central & Watts unlocked! The Stick gifted 🔫" });
  }

  if (!state.clientProgress.dispatcher.complete && state.clientProgress.dispatcher.leverageSoldInWatts >= 20) {
    state.clientProgress.dispatcher.complete = true;
    if (!state.unlockedCities.includes("East LA")) {
      state.unlockedCities = [...state.unlockedCities, "East LA"];
      messages.push({ type: "success", title: "The Dispatcher", text: "East LA unlocked! Pick Chopper or Whip gift." });
    }
  }

  return messages;
}

export function giftToClient(state: GameState, clientId: ClientId, assetName: string, units: number): ActionResult {
  const held = state.inventory[assetName] || 0;
  if (units <= 0 || held < units) {
    return { state, messages: [{ type: "warning", text: "Not enough to gift." }], blocked: true };
  }

  const penalty = consumeAction(state);
  if (penalty?.blocked) return penalty;

  const orderProgress = Math.floor(units * 0.7);
  const toReserves = Math.floor(units * getSellPrice(state, assetName) * 0.2);
  const toTvl = Math.floor(units * getSellPrice(state, assetName) * 0.1);

  let newState: GameState = {
    ...state,
    inventory: { ...state.inventory, [assetName]: held - units },
    protectedReserves: state.protectedReserves + toReserves,
  };
  if (newState.inventory[assetName] === 0) delete newState.inventory[assetName];

  if (clientId === "pearl" && assetName === "Weed") {
    newState.clientProgress.pearl.progress += orderProgress;
  }

  checkClientCompletions(newState);

  const { state: afterAction, forcedDayEnd } = tryConsumeAction(newState);
  const messages: GameMessage[] = [
    {
      type: "success",
      text: `Gifted ${units} ${assetName}. +${orderProgress} order progress. $${toReserves} reserves, $${toTvl} ecosystem.`,
    },
    { type: "street", text: "You fed the block. Part stays locked for you. Part feeds the whole crew." },
  ];

  if (forcedDayEnd) {
    const dayResult = advanceDay(afterAction);
    return { state: dayResult.state, messages: [...messages, ...dayResult.messages] };
  }
  return { state: afterAction, messages };
}

export function canTravelTo(state: GameState, city: CityId): { allowed: boolean; reason?: string; softPenalty?: boolean } {
  if (city === state.location) return { allowed: false, reason: "Already here." };

  if (state.unlockedCities.includes(city)) return { allowed: true };

  if (city === "Long Beach" && !state.clientProgress.pearl.complete) {
    if (!state.longBeachSneakUsed) return { allowed: true, softPenalty: true };
    return { allowed: false, reason: "Complete Ms. Pearl's order to access Long Beach." };
  }

  if (city === "South Central" || city === "Watts") {
    if (!state.clientProgress.ray.complete) {
      return { allowed: false, reason: "Uncle Ray's blessing required." };
    }
  }

  if (city === "East LA" && !state.clientProgress.dispatcher.complete) {
    return { allowed: false, reason: "The Dispatcher hasn't cleared you for East LA." };
  }

  return { allowed: true };
}

export function travel(
  state: GameState,
  city: CityId,
  mode: "walk" | "chopper" | "whip"
): ActionResult {
  const gate = canTravelTo(state, city);
  if (!gate.allowed) {
    return { state, messages: [{ type: "warning", text: gate.reason || "Can't travel there." }], blocked: true };
  }

  let newState = { ...state };
  const messages: GameMessage[] = [];

  if (gate.softPenalty && city === "Long Beach") {
    newState.longBeachSneakUsed = true;
    messages.push({
      type: "warning",
      text: "Sneaking into Long Beach — prices hurt and raids run hot until Ms. Pearl clears you.",
    });
  }

  if (mode === "chopper") {
    if (!newState.hasChopper || newState.chopperHopsLeft <= 0) {
      return { state, messages: [{ type: "warning", text: "No Chopper hops left." }], blocked: true };
    }
    if (!ADJACENT_CITIES[newState.location].includes(city)) {
      return { state, messages: [{ type: "warning", text: "Chopper only reaches adjacent cities." }], blocked: true };
    }
    if (newState.actionsLeft <= 0) {
      return { state, messages: [{ type: "warning", text: "No actions left for Chopper." }], blocked: true };
    }
    newState.chopperHopsLeft -= 1;
    newState.actionsLeft -= 1;
    newState.location = city;
    newState.prices = randomizePrices(city);
    messages.push({ type: "info", text: `🏍️ Chopper to ${city} — day unchanged.` });
    return { state: newState, messages };
  }

  if (mode === "whip") {
    if (!newState.hasWhip || newState.whipHopsLeft <= 0) {
      return { state, messages: [{ type: "warning", text: "No Whip hops left." }], blocked: true };
    }
    if (newState.actionsLeft <= 0) {
      return { state, messages: [{ type: "warning", text: "No actions left for Whip." }], blocked: true };
    }
    newState.whipHopsLeft -= 1;
    newState.actionsLeft -= 1;
    newState.location = city;
    newState.prices = randomizePrices(city);
    messages.push({ type: "info", text: `🚗 Whip to ${city} — day unchanged.` });
    return { state: newState, messages };
  }

  newState.location = city;
  const dayResult = advanceDay(newState);
  return { state: dayResult.state, messages: [...messages, { type: "info", text: `Walked to ${city}.` }, ...dayResult.messages] };
}

export function advanceDay(state: GameState): DayAdvanceResult {
  const messages: GameMessage[] = [];

  if (state.day >= MAX_DAYS) {
    return endGame(state);
  }

  const actionPenalty = state.nextDayActionPenalty;
  let newState: GameState = {
    ...state,
    day: state.day + 1,
    actionsLeft: Math.max(0, MAX_ACTIONS_PER_DAY - actionPenalty),
    nextDayActionPenalty: 0,
    prices: randomizePrices(state.location),
  };

  if (actionPenalty > 0) {
    messages.push({ type: "info", text: "Fight-back fatigue — lost 1 action today." });
  }

  if (newState.tempPriceBoost && newState.tempPriceBoost.daysLeft > 0) {
    newState.tempPriceBoost = { ...newState.tempPriceBoost, daysLeft: newState.tempPriceBoost.daysLeft - 1 };
    if (newState.tempPriceBoost.daysLeft <= 0) newState.tempPriceBoost = null;
  }

  for (const [asset, hc] of Object.entries(newState.priceHaircuts)) {
    if (hc.daysLeft > 0) {
      const daysLeft = hc.daysLeft - 1;
      const percent = daysLeft <= 0 ? 0 : hc.percent * 0.67;
      if (daysLeft <= 0) delete newState.priceHaircuts[asset];
      else newState.priceHaircuts[asset] = { percent, daysLeft };
    }
  }

  for (const city of CITIES) {
    const stash = newState.plantedStashes[city];
    if (stash && stash.shieldDaysLeft > 0) {
      newState.plantedStashes[city] = { ...stash, shieldDaysLeft: stash.shieldDaysLeft - 1 };
    }
  }

  const yieldResult = accrueYield(newState);
  newState = yieldResult.state;
  messages.push(...yieldResult.messages);

  const robberyResult = resolveRobbery(newState);
  newState = robberyResult.state;
  messages.push(...robberyResult.messages);

  const raidResult = resolvePoliceRaid(newState);
  newState = raidResult.state;
  messages.push(...raidResult.messages);

  const encounter = rollRandomEncounter(newState);
  newState = encounter.state;
  messages.push(...encounter.messages);

  newState.rank = computeRank(newState);
  newState.grossYieldLastDay = yieldResult.grossYield;

  if (newState.day >= MAX_DAYS) {
    return endGame(newState, messages);
  }

  return { state: newState, messages };
}

function accrueYield(state: GameState): { state: GameState; messages: GameMessage[]; grossYield: number } {
  const messages: GameMessage[] = [];
  let grossYield = 0;
  const rankDef = RANKS.find((r) => r.id === state.rank);
  const yieldMult = 1 + (rankDef?.yieldBonus || 0) + (state.payToEarnBoost ? 0.5 : 0);

  for (const [name, qty] of Object.entries(state.inventory)) {
    const asset = assetDef(name);
    if (!asset || asset.dailyYield <= 0) continue;
    grossYield += getSellPrice(state, name) * qty * asset.dailyYield * yieldMult;
  }

  for (const stash of Object.values(state.plantedStashes)) {
    if (!stash) continue;
    const asset = assetDef(stash.asset);
    if (!asset) continue;
    grossYield += getSellPrice(state, stash.asset) * stash.units * asset.dailyYield * yieldMult * 1.25;
  }

  grossYield = Math.floor(grossYield);
  if (grossYield <= 0) return { state, messages, grossYield: 0 };

  const inflow = applyCashInflow(state, grossYield);
  const newState: GameState = {
    ...state,
    cash: inflow.cash,
    protectedReserves: inflow.protected,
    totalYieldAccrued: state.totalYieldAccrued + grossYield,
  };

  messages.push({ type: "info", text: `Daily yield: +$${grossYield} (${inflow.skim} locked 🔒)` });
  return { state: newState, messages, grossYield };
}

function robberyChance(state: GameState): number {
  let chance = 0.12;
  chance += Math.min(0.2, ((state.inventory["Molly"] || 0) / 10) * 0.04);
  chance += Math.min(0.24, ((state.inventory["Meth"] || 0) / 10) * 0.06);
  if (state.stickCount > 0) chance -= 0.12;
  const shield = state.plantedStashes[state.location]?.shieldDaysLeft || 0;
  if (shield > 0) chance -= 0.15;
  if (state.cash >= 20000) chance += 0.08;
  return Math.max(0.05, Math.min(0.45, chance));
}

function resolveRobbery(state: GameState): { state: GameState; messages: GameMessage[] } {
  if (Math.random() >= robberyChance(state)) return { state, messages: [] };

  const messages: GameMessage[] = [];
  let newState = { ...state };

  if (state.stickCount > 0 && Math.random() < 0.15) {
    messages.push({ type: "info", text: "🔫 Attempted robbery — they backed off. Stick working." });
    return { state: newState, messages };
  }

  const roll = Math.random();
  let pending: PendingFightBack | null = null;

  if (roll < 0.55) {
    const yieldLoss = Math.floor(newState.totalYieldAccrued * (0.01 + Math.random() * 0.02));
    const toReserves = Math.floor(yieldLoss * 0.65);
    const toTvl = yieldLoss - toReserves;
    newState.protectedReserves += toReserves;
    newState.totalYieldAccrued = Math.max(0, newState.totalYieldAccrued - yieldLoss);
    pending = { lossAmount: yieldLoss, lossType: "yield" };
    messages.push({
      type: "warning",
      title: "Robbery",
      text: `Yield skimmed $${yieldLoss} ($${toReserves} → reserves, $${toTvl} → ecosystem).`,
    });
  } else if (roll < 0.85) {
    const pct = 0.08 + Math.random() * 0.07;
    let loss = Math.floor(newState.cash * pct);
    const fromReserves = Math.floor(loss * 0.4);
    const fromRes = Math.min(newState.protectedReserves, fromReserves);
    loss -= fromRes;
    newState.protectedReserves -= fromRes;
    newState.cash = Math.max(0, newState.cash - loss);
    pending = { lossAmount: loss + fromRes, lossType: "cash" };
    messages.push({ type: "warning", title: "Robbery", text: `Mugged for $${loss + fromRes}.` });
  } else {
    const volatile = ["Molly", "Meth"].filter((a) => (newState.inventory[a] || 0) > 0);
    if (volatile.length) {
      const asset = volatile[Math.floor(Math.random() * volatile.length)];
      const loss = Math.min(newState.inventory[asset] || 0, Math.floor(3 + Math.random() * 5));
      newState.inventory = { ...newState.inventory, [asset]: (newState.inventory[asset] || 0) - loss };
      pending = { lossAmount: loss, lossType: "units", asset };
      messages.push({ type: "warning", title: "Robbery", text: `Lost ${loss} ${asset} from your bag.` });
    }
  }

  if (pending && newState.stickCount > 0 && newState.fightBacksUsed < MAX_FIGHT_BACKS) {
    newState.pendingFightBack = pending;
    messages.push({ type: "event", text: "Fight back available? Costs 1 action tomorrow." });
  } else if (pending) {
    messages.push({
      type: "street",
      text: "Hot product attracts wolves. Part of what you lost went to your locked vault.",
    });
  }

  return { state: newState, messages };
}

export function fightBack(state: GameState, accept: boolean): ActionResult {
  if (!state.pendingFightBack) return { state, messages: [], blocked: true };

  if (!accept) {
    return {
      state: { ...state, pendingFightBack: null },
      messages: [{ type: "info", text: "Let it go. Live to hustle another day." }],
    };
  }

  if (state.stickCount <= 0) {
    return { state, messages: [{ type: "warning", text: "Need The Stick to fight back." }], blocked: true };
  }

  const pending = state.pendingFightBack;
  let newState: GameState = {
    ...state,
    pendingFightBack: null,
    fightBacksUsed: state.fightBacksUsed + 1,
    nextDayActionPenalty: state.nextDayActionPenalty + 1,
  };

  if (Math.random() < 0.6) {
    const bonus = Math.floor(pending.lossAmount * (0.1 + Math.random() * 0.15));
    const recovery = pending.lossAmount;
    const gross = recovery + bonus;
    const inflow = applyCashInflow(newState, gross);
    newState.cash = inflow.cash;
    newState.protectedReserves = inflow.protected;
    return {
      state: newState,
      messages: [
        { type: "success", title: "Rob the robber!", text: `Recovered $${recovery} + $${bonus} bonus!` },
        { type: "street", text: "You didn't just hold product — you defended it." },
      ],
    };
  }

  if (newState.stickCount > 1) {
    newState.stickCount -= 1;
    return {
      state: newState,
      messages: [{ type: "warning", text: "Fight back failed. Lost 1 Stick." }],
    };
  }

  const doubleLoss =
    pending.lossType === "cash"
      ? Math.floor(newState.cash * 0.1)
      : pending.lossType === "units" && pending.asset
        ? Math.min(newState.inventory[pending.asset] || 0, 3)
        : 0;

  if (pending.lossType === "cash") newState.cash = Math.max(0, newState.cash - doubleLoss);
  if (pending.lossType === "units" && pending.asset) {
    newState.inventory = {
      ...newState.inventory,
      [pending.asset]: Math.max(0, (newState.inventory[pending.asset] || 0) - doubleLoss),
    };
  }
  newState.stickCount = 0;

  return {
    state: newState,
    messages: [{ type: "warning", text: "Fight back failed. Took extra damage." }],
  };
}

function policeRaidChance(state: GameState): number {
  let chance = 0.08;
  chance += Math.min(0.25, ((state.inventory["Molly"] || 0) / 10) * 0.05);
  chance += Math.min(0.32, ((state.inventory["Meth"] || 0) / 10) * 0.08);
  const shield = state.plantedStashes[state.location]?.shieldDaysLeft || 0;
  if (shield > 0) chance -= 0.2;
  if (state.stickCount > 0) chance -= 0.08;

  const onlyStable =
    CORE_ASSETS.filter((a) => (state.inventory[a] || 0) > 0).every((a) => a === "Weed" || a === "Coke");
  if (onlyStable) chance = Math.min(chance, 0.15);

  return Math.max(0.03, Math.min(0.5, chance));
}

function resolvePoliceRaid(state: GameState): { state: GameState; messages: GameMessage[] } {
  if (Math.random() >= policeRaidChance(state)) return { state, messages: [] };

  const shield = state.plantedStashes[state.location]?.shieldDaysLeft || 0;
  if (shield > 0) {
    return {
      state,
      messages: [{ type: "info", text: "🛡️ Raid shield blocked the police hit." }],
    };
  }

  const held = CORE_ASSETS.filter((a) => (state.inventory[a] || 0) > 0 || plantedUnits(state, a) > 0);
  if (!held.length) {
    return { state, messages: [{ type: "info", text: "🚔 Police shook you down — you were clean." }] };
  }

  const weights = held.map((a) => {
    if (a === "Meth") return 4;
    if (a === "Molly") return 3;
    if (a === "Coke") return 2;
    return 1;
  });
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  let asset = held[0];
  for (let i = 0; i < held.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      asset = held[i];
      break;
    }
  }

  const messages: GameMessage[] = [];
  let newState = { ...state, priceHaircuts: { ...state.priceHaircuts } };

  let haircut = 0.1;
  let days = 2;
  if (asset === "Weed") {
    haircut = 0.02 + Math.random() * 0.03;
    days = 1;
  } else if (asset === "Coke") {
    haircut = 0.08 + Math.random() * 0.07;
    days = 2;
  } else if (asset === "Molly") {
    haircut = 0.2 + Math.random() * 0.15;
    days = 3;
  } else if (asset === "Meth") {
    haircut = 0.25 + Math.random() * 0.15;
    days = 3;
    const units = newState.inventory[asset] || 0;
    if (units > 0) {
      const loss = Math.max(1, Math.floor(units * (0.1 + Math.random() * 0.1)));
      newState.inventory = { ...newState.inventory, [asset]: units - loss };
      messages.push({ type: "warning", text: `Confiscated ${loss} Meth units.` });
    }
  }

  newState.priceHaircuts[asset] = {
    percent: Math.min(0.6, (newState.priceHaircuts[asset]?.percent || 0) + haircut),
    daysLeft: days,
  };

  const oldPrice = newState.prices[asset];
  const newPrice = getSellPrice(newState, asset);

  messages.push({
    type: "warning",
    title: "🚔 POLICE RAID",
    text: `${asset}: $${oldPrice} → $${newPrice} (−${Math.round(haircut * 100)}%). Prices got chopped on the block.`,
  });
  messages.push({
    type: "street",
    text: "Hot product swings wild when the block gets hot. Mids barely move.",
  });

  return { state: newState, messages };
}

function rollRandomEncounter(state: GameState): { state: GameState; messages: GameMessage[] } {
  if (Math.random() > 0.35) return { state, messages: [] };

  const totalWeight = 100;
  const roll = Math.random() * totalWeight;
  let cumulative = 0;
  let newState = { ...state };
  const messages: GameMessage[] = [];

  const encounters = [
    { w: 35, fn: () => { messages.push({ type: "street", text: "Word on the Street: prices shifting tomorrow — stay sharp." }); } },
    {
      w: 25,
      fn: () => {
        const asset = CORE_ASSETS[Math.floor(Math.random() * CORE_ASSETS.length)];
        newState.tempPriceBoost = { asset, multiplier: 1.3, daysLeft: 1 };
        messages.push({ type: "success", text: `Quick flip: ${asset} +30% today!` });
      },
    },
    {
      w: 15,
      fn: () => {
        const asset = CORE_ASSETS[Math.floor(Math.random() * CORE_ASSETS.length)];
        const qty = Math.floor(2 + Math.random() * 3);
        if (inventoryUnits(newState) + qty <= COAT_SPACE) {
          newState.inventory = { ...newState.inventory, [asset]: (newState.inventory[asset] || 0) + qty };
          messages.push({ type: "success", text: `Street gift: +${qty} ${asset}!` });
        }
      },
    },
    { w: 10, fn: () => { messages.push({ type: "event", text: "Someone's casing you… Stay strapped." }); } },
    {
      w: 5,
      fn: () => {
        const bonus = Math.floor(50 + Math.random() * 100);
        const inflow = applyCashInflow(newState, bonus);
        newState.cash = inflow.cash;
        newState.protectedReserves = inflow.protected;
        messages.push({ type: "success", text: `AERO surprise: +$${bonus}!` });
      },
    },
    { w: 10, fn: () => {} },
  ];

  for (const enc of encounters) {
    cumulative += enc.w;
    if (roll <= cumulative) {
      enc.fn();
      break;
    }
  }

  return { state: newState, messages };
}

export function usePlug(state: GameState): ActionResult {
  const qty = state.inventory["The Plug"] || 0;
  if (qty <= 0 && !state.hasChopper) {
    return { state, messages: [{ type: "warning", text: "Need The Plug for intel." }], blocked: true };
  }

  let bestCity: CityId = "Compton";
  let bestAsset = CORE_ASSETS[0];
  let bestPrice = 0;

  for (const city of CITIES) {
    const prices = randomizePrices(city);
    for (const asset of CORE_ASSETS) {
      if (prices[asset] > bestPrice) {
        bestPrice = prices[asset];
        bestCity = city;
        bestAsset = asset;
      }
    }
  }

  let newState: GameState = { ...state, plugIntel: { asset: bestAsset, city: bestCity } };
  if (qty > 0) {
    newState.inventory = { ...newState.inventory, "The Plug": qty - 1 };
    if (newState.inventory["The Plug"] === 0) delete newState.inventory["The Plug"];
  }

  return {
    state: newState,
    messages: [{ type: "success", text: `📱 Plug says: sell ${bestAsset} in ${bestCity} ($${bestPrice})` }],
  };
}

export function grantDispatcherGift(state: GameState, gift: "chopper" | "whip"): ActionResult {
  if (!state.clientProgress.dispatcher.complete) {
    return { state, messages: [{ type: "warning", text: "Complete Dispatcher order first." }], blocked: true };
  }

  if (gift === "chopper") {
    return {
      state: { ...state, hasChopper: true, chopperHopsLeft: CHOPPER_HOPS_DEFAULT, dispatcherGiftClaimed: true },
      messages: [{ type: "success", text: "🏍️ The Dispatcher gifted you a Chopper!" }],
    };
  }
  return {
    state: { ...state, hasWhip: true, whipHopsLeft: WHIP_HOPS_DEFAULT, dispatcherGiftClaimed: true },
    messages: [{ type: "success", text: "🚗 The Dispatcher gifted you a Whip!" }],
  };
}

export function enablePayToEarn(state: GameState): GameState {
  return { ...state, payToEarnBoost: true, extendedShieldPending: true };
}

export function endGame(state: GameState, extraMessages: GameMessage[] = []): DayAdvanceResult {
  const finalScore = calculateTotalValue(state);
  return {
    state: {
      ...state,
      gameOver: true,
      finalScore,
      totalProtectedAtCompletion: state.protectedReserves,
    },
    messages: [
      ...extraMessages,
      { type: "success", title: "RUN COMPLETE", text: `Final value: $${finalScore.toLocaleString()}` },
      { type: "info", text: `Protected reserves: $${state.protectedReserves.toLocaleString()} 🔒` },
    ],
  };
}

export function endRunEarly(state: GameState): DayAdvanceResult {
  return endGame(state, [{ type: "info", text: `Ended early on day ${state.day}. Earnings staked to vault.` }]);
}

