import {
  DEFAULT_ECONOMY_CONTENT,
  executeCommand,
  getLegalActions,
  type EconomyState,
  type LegalAction,
} from "@trap-wars/economy-engine";

export type CommandType = "BuyAsset" | "SellAsset" | "EndDay";

export interface ForecastView {
  assetId: string;
  direction: "up" | "down";
  magnitudeBand: "low" | "medium" | "high";
  expiresDay: number;
  predictedPrice: number;
  sourceType: string;
}

/** Mirrors the API's run projection, so the UI is identical whichever backend is answering. */
export interface RunView {
  runId: string;
  status: "active" | "completed";
  stateVersion: number;
  day: number;
  actionsRemaining: number;
  locationId: string;
  cash: number;
  inventoryCapacity: number;
  inventory: Record<string, number>;
  prices: Record<string, number>;
  rankId: string;
  forecasts: ForecastView[];
  legalActions: LegalAction[];
}

export type CommandOutcome = { ok: true; run: RunView } | { ok: false; message: string };

export interface RunService {
  readonly mode: "server" | "local";
  start(): Promise<RunView>;
  submit(type: CommandType, payload: Record<string, unknown>): Promise<CommandOutcome>;
  reset(): Promise<RunView>;
}

const commandId = () => `cmd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function project(state: EconomyState): RunView {
  return {
    runId: state.runId,
    status: state.status,
    stateVersion: state.stateVersion,
    day: state.day,
    actionsRemaining: state.actionsRemaining,
    locationId: state.locationId,
    cash: state.cash,
    inventoryCapacity: state.inventoryCapacity,
    inventory: state.inventory,
    prices: state.prices,
    rankId: state.rankId,
    forecasts: state.forecasts.map((forecast) => ({
      assetId: forecast.assetId,
      direction: forecast.direction,
      magnitudeBand: forecast.magnitudeBand,
      expiresDay: forecast.expiresDay,
      predictedPrice: forecast.predictedPrice,
      sourceType: forecast.sourceType,
    })),
    legalActions: getLegalActions(state, DEFAULT_ECONOMY_CONTENT),
  };
}

/** Runs the shared economy engine in the browser. Used when the API cannot be reached. */
export class LocalRunService implements RunService {
  readonly mode = "local" as const;
  private static readonly storageKey = "trapwars.demo.local-run.v1";
  private state: EconomyState | undefined;
  private seed = "";

  async start(): Promise<RunView> {
    try {
      const saved = JSON.parse(localStorage.getItem(LocalRunService.storageKey) ?? "null");
      if (saved?.state && saved?.seed) {
        this.state = saved.state;
        this.seed = saved.seed;
        return project(this.state!);
      }
    } catch {
      // Corrupt or unavailable storage: start fresh.
    }
    return this.reset();
  }

  async reset(): Promise<RunView> {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    this.seed = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    this.state = undefined;
    const result = executeCommand(undefined, { type: "StartRun", runId: crypto.randomUUID(), commandId: commandId(), expectedStateVersion: 0 }, { runSeed: this.seed });
    if (result.status !== "accepted") throw new Error(result.message);
    this.state = result.state;
    this.persist();
    return project(this.state);
  }

  async submit(type: CommandType, payload: Record<string, unknown>): Promise<CommandOutcome> {
    if (!this.state) return { ok: false, message: "No run is active." };
    const command = { type, ...payload, commandId: commandId(), expectedStateVersion: this.state.stateVersion } as Parameters<typeof executeCommand>[1];
    const result = executeCommand(this.state, command, { runSeed: this.seed });
    if (result.status !== "accepted") return { ok: false, message: result.message };
    this.state = result.state;
    this.persist();
    return { ok: true, run: project(this.state) };
  }

  private persist(): void {
    try {
      localStorage.setItem(LocalRunService.storageKey, JSON.stringify({ seed: this.seed, state: this.state }));
    } catch {
      // Storage can be unavailable (private mode); the run still works for this session.
    }
  }
}

/** Talks to the authoritative Trap Wars API on the same origin. */
export class ServerRunService implements RunService {
  readonly mode = "server" as const;
  private static readonly storageKey = "trapwars.demo.server-session.v1";
  private token = "";
  private run: RunView | undefined;

  async start(): Promise<RunView> {
    try {
      const saved = JSON.parse(localStorage.getItem(ServerRunService.storageKey) ?? "null");
      if (saved?.token && saved?.runId) {
        this.token = saved.token;
        const body = await this.request("GET", `/api/v1/runs/${saved.runId}`);
        this.run = body.run as RunView;
        if (this.run.status === "active") return this.run;
      }
    } catch {
      // Expired session or missing run: create a new one below.
    }
    return this.reset();
  }

  async reset(): Promise<RunView> {
    const guest = await this.request("POST", "/api/v1/auth/guest", {});
    this.token = guest.accessToken as string;
    const body = await this.request("POST", "/api/v1/runs", {}, commandId());
    this.run = body.run as RunView;
    this.persist();
    return this.run;
  }

  async submit(type: CommandType, payload: Record<string, unknown>): Promise<CommandOutcome> {
    if (!this.run) return { ok: false, message: "No run is active." };
    const id = commandId();
    try {
      const body = await this.request("POST", `/api/v1/runs/${this.run.runId}/commands`, {
        commandId: id,
        expectedStateVersion: this.run.stateVersion,
        commandType: type,
        payload,
      }, id);
      this.run = body.run as RunView;
      return { ok: true, run: this.run };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "The street did not answer. Try again." };
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(ServerRunService.storageKey, JSON.stringify({ token: this.token, runId: this.run?.runId }));
    } catch {
      // Ignore storage failures.
    }
  }

  private async request(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["content-type"] = "application/json";
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
    const response = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json?.error?.message ?? `Request failed (${response.status})`);
    return json;
  }
}

/** Prefers the live API; falls back to the in-browser engine so the demo always plays. */
export async function connectRunService(): Promise<{ service: RunService; run: RunView }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const ready = await fetch("/api/v1/ready", { signal: controller.signal });
    clearTimeout(timer);
    if (ready.ok) {
      const service = new ServerRunService();
      return { service, run: await service.start() };
    }
  } catch {
    // Fall through to local mode.
  }
  const service = new LocalRunService();
  return { service, run: await service.start() };
}

export const ASSET_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(DEFAULT_ECONOMY_CONTENT.assets).map((asset) => [asset.id, asset.displayName]),
);

export const CORE_ASSETS = Object.values(DEFAULT_ECONOMY_CONTENT.assets)
  .filter((asset) => asset.category === "core")
  .map((asset) => ({ id: asset.id, name: asset.displayName, availableFromDay: asset.availableFromDay }));

export const TRADE_SPREAD_BPS = DEFAULT_ECONOMY_CONTENT.tradeSpreadBps;
