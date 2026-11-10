import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import "./demo.css";
import { Audio } from "./audio";
import { Character, loadCharacters, loadProps, type CharacterKind } from "./characters";
import { connectRunService, ASSET_LABELS, CORE_ASSETS, type RunService, type RunView } from "./economy/run-service";
import { Input } from "./input";
import { Player } from "./player";
import { GameUi, money, type TradeRequest } from "./ui";
import { buildWorld, LAYOUT, type World } from "./world";

// ---------------------------------------------------------------------------------------------
// Quality tiers
// ---------------------------------------------------------------------------------------------
type Tier = "low" | "medium" | "high";
const TIERS: Tier[] = ["low", "medium", "high"];
const isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
const params = new URLSearchParams(location.search);
const storedTier = (() => { try { return localStorage.getItem("trapwars.demo.quality") as Tier | null; } catch { return null; } })();
let tier: Tier = (params.get("quality") as Tier) ?? storedTier ?? (isTouch ? "medium" : "high");
const manualTier = !!params.get("quality") || !!storedTier;
if (isTouch) document.body.classList.add("touch");

// ---------------------------------------------------------------------------------------------
// Renderer and post-processing
// ---------------------------------------------------------------------------------------------
const canvas = document.querySelector<HTMLCanvasElement>("#view")!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = tier === "high";
renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 700);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.75, 0.55, 0.88);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const fxaa = new ShaderPass(FXAAShader);
composer.addPass(fxaa);

function applyTier(next: Tier, world?: World): void {
  tier = next;
  const ratio = next === "high" ? Math.min(devicePixelRatio, 1.75) : next === "medium" ? Math.min(devicePixelRatio, 1) : 0.7;
  renderer.setPixelRatio(ratio);
  composer.setPixelRatio(ratio);
  resize();
  bloom.resolution.set(innerWidth * (next === "low" ? 0.35 : 0.5), innerHeight * (next === "low" ? 0.35 : 0.5));
  world?.setReflections(next === "high");
  world?.setPracticalLights(next !== "low");
  document.querySelector("#btn-quality")!.textContent = `GFX ${next.toUpperCase()}`;
}

function resize(): void {
  const width = innerWidth;
  const height = innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  composer.setSize(width, height);
  const ratio = renderer.getPixelRatio();
  fxaa.material.uniforms.resolution.value.set(1 / (width * ratio), 1 / (height * ratio));
}
addEventListener("resize", resize);

// ---------------------------------------------------------------------------------------------
// Boot: studio splash while assets load, then the title card
// ---------------------------------------------------------------------------------------------
const boot = document.querySelector<HTMLElement>("#boot")!;
const setProgress = (value: number, label: string) => {
  const pct = `${Math.round(value * 100)}%`;
  document.querySelector<HTMLElement>("#boot-progress")!.style.width = pct;
  document.querySelector<HTMLElement>("#boot-edge")!.style.width = pct;
  document.querySelector("#boot-status")!.textContent = label;
};
document.querySelector("#boot-controls")!.innerHTML = isTouch
  ? "Left thumb: move · Right thumb: look · Big button: interact · ☎ phone"
  : "<kbd>WASD</kbd> move · <kbd>Shift</kbd> run · drag mouse to look · <kbd>E</kbd> interact · <kbd>Tab</kbd> phone · <kbd>G</kbd> graphics";
const studioDone = new Promise((resolve) => setTimeout(resolve, 2700));
studioDone.then(() => boot.classList.add("title"));

const ui = new GameUi();
const audio = new Audio();
const input = new Input(canvas, document.querySelector("#stick")!, document.querySelector("#knob")!);

async function start(): Promise<void> {
  applyTier(tier);
  setProgress(0.05, "Loading the block…");
  const [props, characters, economy] = await Promise.all([
    loadProps(),
    loadCharacters((done, total) => setProgress(0.1 + (done / total) * 0.6, "Waking up the neighborhood…")),
    connectRunService(),
  ]);
  setProgress(0.8, "Building the street…");
  await new Promise((resolve) => setTimeout(resolve, 30));
  const world = buildWorld(scene, renderer, props, tier === "high");
  applyTier(tier, world);
  const game = new Game(world, characters, economy.service, economy.run);
  setProgress(0.95, "Warming up the lights…");
  renderer.compile(scene, camera);
  game.render(0);
  setProgress(1, economy.service.mode === "server" ? "Connected to the live economy." : "Ready. Running the economy on this device.");
  await studioDone;
  const button = document.querySelector<HTMLButtonElement>("#boot-start")!;
  button.hidden = false;
  button.focus();
  await new Promise<void>((resolve) => {
    const go = () => {
      removeEventListener("keydown", key);
      resolve();
    };
    const key = (event: KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") go(); };
    button.addEventListener("click", go, { once: true });
    addEventListener("keydown", key);
  });
  void audio.unlock();
  boot.classList.add("gone");
  setTimeout(() => boot.remove(), 800);
  game.begin();
  if (params.has("debug")) (window as unknown as { __game: unknown }).__game = game.debugApi();
}

/** Swaps keyboard hints for their on-screen equivalents on touch devices. */
const controls = (text: string) => (isTouch ? text.replace(/\(Tab\)/g, "(tap ☎)").replace(/\bTab\b/g, "☎") : text);

// ---------------------------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------------------------
enum Step { CheckWord, LeaveSafehouse, ReadBlock, MeetRay, Review, MakeMove, EndDay, DayTwo, Free }

const OBJECTIVES: Record<Step, [string, string]> = {
  [Step.CheckWord]: ["Check Word on the Street", "Your phone is buzzing on the desk. Open it (Tab) and read the Word tab."],
  [Step.LeaveSafehouse]: ["Hit the block", "Head out the front door of the safehouse."],
  [Step.ReadBlock]: ["Read the block", "Inspect the delivery board, the crates across the street, and the corner."],
  [Step.MeetRay]: ["Meet your contact", "Ray is posted by the corner store, past the market."],
  [Step.Review]: ["Review the opportunity", "Cross to The Hub — the red neon — and check the quotes."],
  [Step.MakeMove]: ["Make your move", "Buy or sell at The Hub. Size it so you can still get out."],
  [Step.EndDay]: ["End the day", "Open your phone and end the day to see how the market played out."],
  [Step.DayTwo]: ["Check the new notification", "New word came in overnight. Open your phone."],
  [Step.Free]: ["The block is yours", "Read the word, trade at The Hub, end the day. 30 days to build your stack."],
};

const CLUES = {
  deliveryBoard: { prompt: "Inspect the delivery board", title: "Rush pickups", body: "Three rush pickups were added this morning. Demand is real, but it showed up late.", note: "Delivery board: three rush pickups added today. Demand is real, but late." },
  crates: { prompt: "Inspect the empty crates", title: "Fresh labels, empty crates", body: "Fresh labels, nothing inside. Inventory already moved through here.", note: "Crates: fresh labels, empty. Supply already moved." },
  corner: { prompt: "Watch the corner", title: "Eyes on the corner", body: "Buyers keep checking The Hub, then checking who is watching them.", note: "Corner: buyers circling The Hub, nervous." },
} as const;
type ClueId = keyof typeof CLUES;

interface Interactable {
  id: string;
  position: THREE.Vector3;
  radius: number;
  prompt(): string | null;
  action(): void;
}

class Game {
  private step = Step.CheckWord;
  private readonly timer = new THREE.Timer();
  private readonly player: Player;
  private readonly ray: Character;
  private readonly npcs: Array<{ character: Character; update(delta: number): void }> = [];
  private readonly interactables: Interactable[] = [];
  private readonly inspected = new Set<ClueId>();
  private active: Interactable | null = null;
  private doorOpen = false;
  private wentOutside = false;
  private busy = false;
  private lastTrade?: { side: "buy" | "sell"; assetId: string; quantity: number; price: number; cashDelta: number };
  private frames = 0;
  private sampleTime = 0;
  private started = false;
  private readonly heroFill: THREE.PointLight;

  constructor(private readonly world: World, characters: Awaited<ReturnType<typeof loadCharacters>>, private readonly service: RunService, private run: RunView) {
    const A = world.anchors;
    const hero = new Character(characters.get("hero"));
    scene.add(hero.root);
    this.player = new Player(hero, camera, world.collision, () => audio.play("footstep", 0.22));
    this.player.place(A.spawn, A.spawnYaw);
    // Soft cool fill that follows the hero so the dark hoodie still reads against night backgrounds.
    this.heroFill = new THREE.PointLight("#9fb6ff", 2.2, 5, 1.5);
    scene.add(this.heroFill);

    this.ray = new Character(characters.get("ray"), undefined, 1.84);
    this.ray.root.position.copy(A.ray);
    this.ray.root.rotation.y = A.rayYaw;
    this.ray.play("Idle");
    scene.add(this.ray.root);
    world.collision.addCentered(A.ray.x, A.ray.z, 0.7, 0.7);

    const crowdKinds: CharacterKind[] = ["crowd_a", "crowd_b", "crowd_c"];
    const tints = [
      { Shirt: "#2b5d8a", Pants: "#1a1a22" }, { Shirt: "#7a1c4a", Pants: "#2a2420" }, { Shirt: "#d0c7b4", Pants: "#3a3f4a" },
      { Shirt: "#1e4a2a", Pants: "#14141a" }, { Shirt: "#c45a1a", Pants: "#22262e" }, { Shirt: "#3b3b40", Pants: "#4a3a2a" },
    ];
    A.loiterers.forEach((spot, index) => {
      const character = new Character(characters.get(crowdKinds[index % 3]), tints[index], 1.68 + index * 0.04);
      character.root.position.copy(spot.position);
      character.root.rotation.y = spot.yaw;
      character.play("Idle", { timeScale: 0.8 + index * 0.15 });
      scene.add(character.root);
      world.collision.addCentered(spot.position.x, spot.position.z, 0.6, 0.6);
      this.npcs.push({ character, update: (delta) => character.update(delta) });
    });
    for (let index = 0; index < 6; index++) {
      const character = new Character(characters.get(crowdKinds[index % 3]), tints[(index + 3) % tints.length], 1.66 + (index % 3) * 0.06);
      const lane = A.walkLanes[index % 2] + (Math.random() - 0.5) * 0.6;
      let direction = index % 3 === 0 ? -1 : 1;
      const speed = 1.15 + Math.random() * 0.5;
      character.root.position.set(-40 + index * 14, LAYOUT.sidewalkHeight, lane);
      character.play("Walk", { timeScale: speed / 1.3 });
      scene.add(character.root);
      this.npcs.push({
        character,
        update: (delta) => {
          const root = character.root;
          const player = this.player.position;
          const close = Math.abs(player.z - root.position.z) < 0.9 && (player.x - root.position.x) * direction > 0 && Math.abs(player.x - root.position.x) < 1.6;
          if (!close) root.position.x += direction * speed * delta;
          if (root.position.x > 41) direction = -1;
          if (root.position.x < -41) direction = 1;
          root.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
          character.play(close ? "Idle" : "Walk", { timeScale: close ? 1 : speed / 1.3 });
          character.update(delta);
        },
      });
    }

    this.registerInteractables();
    this.wireUi();
    ui.setRun(run);
    ui.setMode(service.mode === "server" ? "LIVE ECONOMY" : "LOCAL ECONOMY");
    this.setStep(Step.CheckWord);
    this.loop();
  }

  /** Test hooks, only exposed with ?debug=1. */
  debugApi() {
    return {
      teleport: (x: number, z: number, yaw = 0) => this.player.place(new THREE.Vector3(x, this.world.collision.groundHeight(x, z), z), yaw),
      state: () => ({ step: Step[this.step], prompt: this.active?.prompt() ?? null, cash: this.run.cash, day: this.run.day, inventory: this.run.inventory, mode: this.service.mode, position: this.player.position.toArray() }),
      interact: () => this.interact(),
    };
  }

  begin(): void {
    this.started = true;
    ui.showHud(true);
    ui.setWordBadge(true);
    this.world.setPhoneHighlight(true);
    setTimeout(() => ui.toast("Your phone just buzzed. Word on the street.", "gold"), 900);
  }

  // ---------------- Steps ----------------
  private setStep(step: Step): void {
    this.step = step;
    const [title, rawDetail] = OBJECTIVES[step];
    const detail = controls(rawDetail);
    ui.setObjective(step === Step.ReadBlock ? `${title} (${this.inspected.size}/3)` : title, detail);
    const show = (id: string, on: boolean) => this.world.setMarkerVisible(id, on);
    show("phone", step === Step.CheckWord);
    show("door", step === Step.LeaveSafehouse);
    for (const id of Object.keys(CLUES) as ClueId[]) show(id, step === Step.ReadBlock && !this.inspected.has(id));
    show("ray", step === Step.MeetRay || step === Step.ReadBlock);
    show("hub", step === Step.Review || step === Step.MakeMove);
    ui.setEndDayEnabled(step === Step.EndDay || step === Step.Free);
  }

  private registerInteractables(): void {
    const A = this.world.anchors;
    this.interactables.push({
      id: "phone", position: A.phone, radius: 1.6,
      prompt: () => (this.player.indoors ? "Pick up your phone" : null),
      action: () => this.openPhone(this.step === Step.CheckWord ? "word" : "home"),
    });
    this.interactables.push({
      id: "door", position: A.door, radius: 1.7,
      prompt: () => (this.doorOpen ? null : this.step === Step.CheckWord ? "Check your phone first" : "Step outside"),
      action: () => {
        if (this.step === Step.CheckWord) {
          audio.play("invalid", 0.5);
          ui.toast("Check Word on the Street before you hit the block.", "red");
          return;
        }
        this.doorOpen = true;
        this.world.openDoor();
        audio.play("door", 0.8);
      },
    });
    for (const id of Object.keys(CLUES) as ClueId[]) {
      const clue = CLUES[id];
      this.interactables.push({
        id, position: A[id], radius: 2.2,
        prompt: () => (this.step === Step.ReadBlock && !this.inspected.has(id) ? clue.prompt : null),
        action: () => void this.inspect(id),
      });
    }
    this.interactables.push({
      id: "ray", position: A.ray, radius: 2.4,
      prompt: () => (this.step >= Step.ReadBlock ? "Talk to Ray" : null),
      action: () => void this.talkToRay(),
    });
    this.interactables.push({
      id: "hub", position: A.hub, radius: 2.6,
      prompt: () => (this.step >= Step.Review ? "Enter The Hub" : this.step >= Step.ReadBlock ? "The Hub (talk to Ray first)" : null),
      action: () => {
        if (this.step < Step.Review) {
          ui.toast("Ray knows how this spot moves. Talk to him first.", "gold");
          return;
        }
        this.openMarket();
      },
    });
  }

  private async inspect(id: ClueId): Promise<void> {
    const clue = CLUES[id];
    this.busy = true;
    audio.play("investigation", 0.6);
    this.player.setFocus(this.world.anchors[id]);
    await ui.clue(clue.title, clue.body);
    this.player.setFocus(null);
    this.inspected.add(id);
    ui.addNote(clue.note);
    this.busy = false;
    if (this.inspected.size === 3) {
      ui.toast("You read the block. Now find Ray.", "green");
      this.setStep(Step.MeetRay);
    } else {
      this.setStep(Step.ReadBlock);
    }
  }

  private async talkToRay(): Promise<void> {
    this.busy = true;
    const A = this.world.anchors;
    this.ray.root.rotation.y = Math.atan2(this.player.position.x - A.ray.x, this.player.position.z - A.ray.z);
    this.player.faceTowards(A.ray);
    this.player.setFocus(A.ray);
    audio.play("dialogue", 0.5);
    if (this.step === Step.ReadBlock || this.step === Step.MeetRay) {
      const informed = this.inspected.size === 3;
      const lines = informed
        ? [
            { speaker: "Ray", text: "I saw you reading the block. Good. A screen gives you numbers; the sidewalk tells you whether they mean anything." },
            { speaker: "You", text: "The delivery board is busy, but those empty crates say supply already moved." },
            { speaker: "Ray", text: "Exactly. Folks are paying up because they think the window is closing. That can help you, or trap you." },
          ]
        : [
            { speaker: "Ray", text: "You came straight to me without reading the block. Slow down." },
            { speaker: "You", text: "Word on the Street says The Hub is moving. What am I missing?" },
            { speaker: "Ray", text: "Delivery board is slammed, but the crates out back are already empty. Demand showed up late. Supply already moved." },
          ];
      await ui.dialogue([
        ...lines,
        {
          speaker: "Ray",
          text: "Keep enough cash free to move if the price turns. Confidence is useful. An exit is better. What would you do?",
          choices: [
            { label: "Check the quote, start small.", reply: "That's how you stay in the game long enough to get good at it." },
            { label: "Go big while it's hot.", reply: "Maybe. Just know where the door is before you walk in." },
          ],
        },
        { speaker: "Ray", text: "The Hub is across the street — red sign. Check the quote, size the risk, make your own call. This one is yours." },
      ]);
      if (!informed) ui.addNote("Ray: demand showed up late, supply already moved.");
      this.setStep(Step.Review);
    } else {
      const tips = [
        "Price is what you pay. Liquidity is whether anybody pays you back when you need out.",
        "Don't let one good day talk you into a bad week.",
        "The word on your phone is a hint, not a promise.",
      ];
      await ui.dialogue([{ speaker: "Ray", text: tips[this.run.day % tips.length] }]);
    }
    this.player.setFocus(null);
    this.busy = false;
  }

  private openPhone(tab: "home" | "word" = "home"): void {
    if (ui.phoneOpen) return;
    audio.play("phone_open", 1);
    ui.openPhone(tab);
  }

  private openMarket(): void {
    audio.play("ui_select", 0.9);
    this.player.setFocus(this.world.anchors.hub.clone().setZ(18.5));
    ui.openMarket();
    if (this.step === Step.Review) this.setStep(Step.MakeMove);
  }

  private wireUi(): void {
    ui.onAction = () => this.interact();
    ui.onPhoneButton = () => (ui.phoneOpen ? ui.closePhone() : this.openPhone());
    ui.onPhoneClosed = () => audio.play("phone_close", 0.9);
    ui.onPhoneTab = (tab) => {
      audio.play("ui_select", 0.8);
      if (tab !== "word") return;
      ui.setWordBadge(false);
      this.world.setPhoneHighlight(false);
      if (this.step === Step.CheckWord) {
        this.setStep(Step.LeaveSafehouse);
        ui.toast(controls("Got it. Close the phone (Tab) and hit the block."), "green");
      } else if (this.step === Step.DayTwo) {
        this.setStep(Step.Free);
      }
    };
    ui.onMarketClosed = () => {
      this.player.setFocus(null);
      audio.play("ui_select", 0.8);
    };
    ui.onTrade = (request) => this.trade(request);
    ui.onEndDay = () => void this.endDay();
    document.querySelector("#btn-quality")!.addEventListener("click", () => this.cycleQuality());
    document.querySelector("#btn-sound")!.addEventListener("click", (event) => {
      (event.currentTarget as HTMLElement).textContent = audio.toggle() ? "SOUND" : "MUTED";
    });
    document.querySelector("#btn-full")!.addEventListener("click", () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen?.().catch(() => undefined);
    });
  }

  private cycleQuality(): void {
    const next = TIERS[(TIERS.indexOf(tier) + 1) % TIERS.length];
    try { localStorage.setItem("trapwars.demo.quality", next); } catch { /* ignore */ }
    applyTier(next, this.world);
    ui.toast(`Graphics: ${next.toUpperCase()}`, "gold", 1600);
  }

  private async trade(request: TradeRequest): Promise<boolean> {
    const before = this.run;
    const price = before.prices[request.assetId] ?? 0;
    const outcome = await this.service.submit(request.side === "buy" ? "BuyAsset" : "SellAsset", { assetId: request.assetId, quantity: request.quantity });
    if (!outcome.ok) {
      audio.play("invalid", 0.6);
      ui.toast(outcome.message, "red");
      return false;
    }
    this.run = outcome.run;
    ui.setRun(this.run);
    audio.play("trade", 0.7);
    const cashDelta = this.run.cash - before.cash;
    this.lastTrade = { side: request.side, assetId: request.assetId, quantity: request.quantity, price, cashDelta };
    const name = ASSET_LABELS[request.assetId] ?? request.assetId;
    ui.toast(request.side === "buy" ? `Bought ${request.quantity} ${name} for ${money(-cashDelta)}` : `Sold ${request.quantity} ${name} for ${money(cashDelta)}`, "green");
    if (this.step === Step.MakeMove) {
      ui.closeMarket();
      await this.consequence();
    }
    return true;
  }

  private async consequence(): Promise<void> {
    const trade = this.lastTrade!;
    const name = ASSET_LABELS[trade.assetId] ?? trade.assetId;
    const held = this.run.inventory[trade.assetId] ?? 0;
    const exposure = held * trade.price;
    const share = exposure / Math.max(1, exposure + this.run.cash);
    const swing = Math.round(exposure * 0.15);
    audio.play("reveal", 0.9);
    await ui.card({
      kicker: "YOUR MOVE",
      title: trade.side === "buy" ? `You're holding ${held} ${name}` : `You sold ${trade.quantity} ${name}`,
      body: trade.side === "buy"
        ? `<div class="stat"><span>Paid</span><b>${money(-trade.cashDelta)}</b></div>
           <div class="stat"><span>Cash left</span><b>${money(this.run.cash)}</b></div>
           <div class="stat"><span>Money tied up in ${name}</span><b>${Math.round(share * 100)}%</b></div>
           <p>If the price drops 15% overnight, that stack loses about <b class="down">${money(swing)}</b>. If it rises 15%, you're up about <b class="up">${money(swing)}</b>. You only get paid when someone buys it back.</p>`
        : `<div class="stat"><span>Received</span><b>${money(trade.cashDelta)}</b></div><div class="stat"><span>Cash now</span><b>${money(this.run.cash)}</b></div><p>Cash is the most liquid thing you can hold. It can't go up — but it can't get stuck either.</p>`,
      button: "GOT IT",
      tone: "green",
    });
    this.setStep(Step.EndDay);
    ui.toast(controls("Open your phone (Tab) to end the day."), "gold");
  }

  private async endDay(): Promise<void> {
    if (this.busy || !ui.phoneOpen) return;
    this.busy = true;
    const before = this.run;
    const outcome = await this.service.submit("EndDay", {});
    if (!outcome.ok) {
      ui.toast(outcome.message, "red");
      this.busy = false;
      return;
    }
    ui.closePhone(true);
    audio.play("nightfall", 0.9);
    this.run = outcome.run;
    await ui.nightfall(this.run.day);
    ui.setRun(this.run);
    if (this.step === Step.EndDay) await this.lesson(before);
    else await ui.card({ kicker: `DAY ${this.run.day}`, title: "New day, new prices", body: this.priceTable(before), button: "HIT THE BLOCK" });
    if (this.step === Step.EndDay) {
      this.setStep(Step.DayTwo);
      ui.setWordBadge(true);
      ui.toast("New word just came in. Day 2 is live.", "gold");
    }
    this.busy = false;
  }

  private priceTable(before: RunView): string {
    return Object.keys(before.prices)
      .filter((asset) => CORE_ASSETS.some((core) => core.id === asset && core.availableFromDay <= this.run.day) && (this.run.prices[asset] ?? 0) > 0)
      .map((asset) => {
        const a = before.prices[asset];
        const b = this.run.prices[asset];
        const change = ((b - a) / a) * 100;
        return `<div class="stat"><span>${ASSET_LABELS[asset]}</span><b>${money(a)} → ${money(b)} <span class="${change >= 0 ? "up" : "down"}">${change >= 0 ? "+" : ""}${change.toFixed(0)}%</span></b></div>`;
      })
      .join("");
  }

  private async lesson(before: RunView): Promise<void> {
    const trade = this.lastTrade;
    let headline = "Here's how the market moved overnight.";
    if (trade) {
      const name = ASSET_LABELS[trade.assetId];
      const after = this.run.prices[trade.assetId] ?? trade.price;
      const held = this.run.inventory[trade.assetId] ?? 0;
      const change = after - trade.price;
      headline = trade.side === "buy"
        ? `${name} moved from ${money(trade.price)} to ${money(after)}. Your ${held} units are now worth ${money(after * held)} — that's <b class="${change >= 0 ? "up" : "down"}">${change >= 0 ? "+" : "-"}${money(Math.abs(change * held))}</b> on paper.`
        : `You sold ${name} at ${money(trade.price)}. Tonight it's ${money(after)}. ${after > trade.price ? "You left some upside on the table — and kept your cash safe." : "Selling before the drop kept that money safe."}`;
    }
    audio.play("reveal", 0.9);
    await ui.card({
      kicker: "WHAT JUST HAPPENED",
      title: "Liquidity",
      body: `<p>${headline}</p>${this.priceTable(before)}
        <div class="concept"><b>Liquidity</b> is how easily you can get in or out without taking a worse price. "On paper" money isn't real until someone buys it from you.</div>
        <p><b>You just experienced:</b></p><ul><li>Market information</li><li>Risk and reward</li><li>Liquidity</li><li>Price movement</li><li>Capital allocation</li></ul>`,
      button: "START DAY 2",
    });
  }

  // ---------------- Frame ----------------
  private interact(): void {
    if (!this.started || this.busy || ui.blocking) return;
    if (this.active) this.active.action();
  }

  private findInteractable(): Interactable | null {
    let best: Interactable | null = null;
    let bestScore = Infinity;
    const forward = new THREE.Vector2(Math.sin(this.player.yaw), Math.cos(this.player.yaw));
    for (const item of this.interactables) {
      const dx = item.position.x - this.player.position.x;
      const dz = item.position.z - this.player.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > item.radius || !item.prompt()) continue;
      const facing = distance < 0.01 ? 1 : (dx * forward.x + dz * forward.y) / distance;
      const score = distance - facing * 0.6;
      if (score < bestScore) {
        best = item;
        bestScore = score;
      }
    }
    return best;
  }

  render(delta: number): void {
    this.world.update(delta, this.timer.getElapsed(), this.player.position);
    composer.render(delta);
  }

  private loop = (): void => {
    requestAnimationFrame(this.loop);
    this.timer.update();
    const delta = Math.min(this.timer.getDelta(), 0.1);
    input.enabled = this.started && !this.busy && !ui.blocking;
    input.update();
    if (this.started) {
      if (input.consume("tab")) ui.phoneOpen ? ui.closePhone() : this.openPhone();
      if (input.consume("escape")) { ui.closePhone(); ui.closeMarket(); }
      if (input.consume("g")) this.cycleQuality();
      const advance = input.consume("e") || input.consume("enter") || input.consume(" ");
      if (ui.inDialogue && advance) ui.advanceDialogue();
      else if (advance) this.interact();
      input.clearPressed();
    }

    this.player.frozen = !input.enabled;
    this.player.update(delta, input);
    this.heroFill.position.copy(this.player.position).add(new THREE.Vector3(0, 2.4, 0)).addScaledVector(camera.getWorldDirection(new THREE.Vector3()), -1.2);
    for (const npc of this.npcs) npc.update(delta);
    this.ray.update(delta);

    if (!this.wentOutside && this.doorOpen && this.player.position.z > 0.3) {
      this.wentOutside = true;
      ui.toast("Street noise rolls in. Read the block before you move.", "gold");
      this.setStep(Step.ReadBlock);
    }

    this.active = this.started && !ui.blocking && !this.busy ? this.findInteractable() : null;
    ui.setPrompt(this.active?.prompt() ?? null, isTouch ? "TAP" : "E");

    this.render(delta);
    this.autoQuality(delta);
  };

  /** Steps quality down if the frame rate stays low, unless the player chose a tier. */
  private autoQuality(delta: number): void {
    if (manualTier || !this.started || tier === "low") return;
    this.frames++;
    this.sampleTime += delta;
    if (this.sampleTime < 5) return;
    const fps = this.frames / this.sampleTime;
    this.frames = 0;
    this.sampleTime = 0;
    if (fps < 28) {
      applyTier(TIERS[TIERS.indexOf(tier) - 1], this.world);
      ui.toast(`Graphics lowered to ${tier.toUpperCase()} for smoother play (G to change).`, "gold", 2600);
    }
  }
}

start().catch((error) => {
  console.error(error);
  document.querySelector("#boot-status")!.textContent = "The block didn't load. Refresh to try again.";
});

// Exposed for automated playtests.
(window as unknown as { __trapwars: unknown }).__trapwars = { scene, camera, renderer };
