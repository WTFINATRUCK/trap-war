import { ASSET_LABELS, CORE_ASSETS, TRADE_SPREAD_BPS, type ForecastView, type RunView } from "./economy/run-service";

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector(selector) as T;
const money = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;
/** Drop keyboard focus from UI buttons so Enter/Space can't re-trigger a button that has scrolled out of view. */
const blurFocus = () => (document.activeElement as HTMLElement | null)?.blur?.();
const escape = (text: string) => text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!);

export interface DialogueLine {
  speaker: string;
  text: string;
  choices?: Array<{ label: string; reply: string }>;
}

export type PhoneTab = "home" | "word" | "stash" | "contacts";

export interface TradeRequest {
  side: "buy" | "sell";
  assetId: string;
  quantity: number;
}

/** All DOM UI for the demo. Gameplay code calls into this; this never touches the 3D scene. */
export class GameUi {
  onPhoneTab?: (tab: PhoneTab) => void;
  onEndDay?: () => void;
  onTrade?: (request: TradeRequest) => Promise<boolean>;
  onMarketClosed?: () => void;
  onPhoneClosed?: () => void;
  onAction?: () => void;
  onPhoneButton?: () => void;

  private toastTimer = 0;
  private dialogueResolve?: () => void;
  private typing?: number;
  private phoneTab: PhoneTab = "home";
  private run?: RunView;
  private endDayEnabled = false;
  private wordBadge = true;
  private marketQuantity = 1;
  private selectedAsset = "weed";
  private marketBusy = false;
  private notes: string[] = [];

  constructor() {
    $("#phone-close").addEventListener("click", () => this.closePhone());
    document.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) =>
      button.addEventListener("click", () => this.showPhoneTab(button.dataset.tab as PhoneTab)),
    );
    $("#touch-action").addEventListener("touchstart", (event) => { event.preventDefault(); this.onAction?.(); });
    $("#touch-phone").addEventListener("touchstart", (event) => { event.preventDefault(); this.onPhoneButton?.(); });
    $("#touch-action").addEventListener("click", () => this.onAction?.());
    $("#touch-phone").addEventListener("click", () => this.onPhoneButton?.());
    $("#market-close").addEventListener("click", () => this.closeMarket());
    $("#dialogue").addEventListener("click", () => this.advanceDialogue());
  }

  // ---------- HUD ----------
  setRun(run: RunView): void {
    this.run = run;
    $("#hud-cash").textContent = money(run.cash);
    $("#hud-day").textContent = `DAY ${run.day}`;
    $("#hud-actions").textContent = `${run.actionsRemaining} MOVE${run.actionsRemaining === 1 ? "" : "S"}`;
    if (this.phoneOpen) this.renderPhone();
    if (this.marketOpen) this.renderMarket();
  }

  setObjective(title: string, detail: string): void {
    const card = $("#objective");
    $("#objective-title").textContent = title;
    $("#objective-detail").textContent = detail;
    card.classList.remove("pulse");
    void card.offsetWidth;
    card.classList.add("pulse");
  }

  setPrompt(text: string | null, key = "E"): void {
    const prompt = $("#prompt");
    prompt.hidden = !text;
    if (text) {
      $("#prompt-key").textContent = key;
      $("#prompt-text").textContent = text;
    }
    $("#touch-action").classList.toggle("ready", !!text);
    $("#touch-action").textContent = text ? text.toUpperCase() : "";
  }

  toast(text: string, tone: "gold" | "green" | "red" = "gold", duration = 3600): void {
    const toast = $("#toast");
    toast.textContent = text;
    toast.className = `show ${tone}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => { toast.className = ""; }, duration);
  }

  setMode(text: string): void {
    $("#mode-badge").textContent = text;
  }

  setWordBadge(on: boolean): void {
    this.wordBadge = on;
    $("#phone-badge").hidden = !on;
    $("#touch-phone").classList.toggle("badge", on);
  }

  setEndDayEnabled(on: boolean): void {
    this.endDayEnabled = on;
    if (this.phoneOpen) this.renderPhone();
  }

  addNote(text: string): void {
    if (!this.notes.includes(text)) this.notes.push(text);
  }

  showHud(on: boolean): void {
    document.body.classList.toggle("hud-on", on);
  }

  // ---------- Clue card ----------
  async clue(title: string, body: string): Promise<void> {
    const card = $("#clue");
    $("#clue-title").textContent = title;
    $("#clue-body").textContent = body;
    card.hidden = false;
    card.classList.add("show");
    await new Promise<void>((resolve) => {
      const done = () => {
        card.classList.remove("show");
        card.hidden = true;
        window.removeEventListener("keydown", key);
        card.removeEventListener("click", done);
        resolve();
      };
      const key = (event: KeyboardEvent) => { if (["e", "enter", " ", "escape"].includes(event.key.toLowerCase())) done(); };
      setTimeout(() => {
        window.addEventListener("keydown", key);
        card.addEventListener("click", done);
      }, 250);
    });
  }

  // ---------- Dialogue ----------
  async dialogue(lines: DialogueLine[]): Promise<void> {
    const box = $("#dialogue");
    box.hidden = false;
    document.body.classList.add("talking");
    for (const line of lines) {
      await this.showLine(line);
      if (line.choices) {
        const reply = await this.choose(line.choices);
        await this.showLine({ speaker: line.speaker, text: reply });
      }
    }
    box.hidden = true;
    document.body.classList.remove("talking");
  }

  private showLine(line: DialogueLine): Promise<void> {
    $("#dialogue-speaker").textContent = line.speaker.toUpperCase();
    $("#dialogue-speaker").className = line.speaker === "You" ? "you" : "";
    const text = $("#dialogue-text");
    text.textContent = "";
    let index = 0;
    clearInterval(this.typing);
    this.typing = window.setInterval(() => {
      index += 2;
      text.textContent = line.text.slice(0, index);
      if (index >= line.text.length) clearInterval(this.typing);
    }, 18);
    return new Promise((resolve) => {
      this.dialogueResolve = () => {
        if (text.textContent!.length < line.text.length) {
          clearInterval(this.typing);
          text.textContent = line.text;
          return;
        }
        this.dialogueResolve = undefined;
        resolve();
      };
    });
  }

  advanceDialogue(): void {
    this.dialogueResolve?.();
  }

  get inDialogue(): boolean {
    return !$("#dialogue").hidden;
  }

  private choose(choices: Array<{ label: string; reply: string }>): Promise<string> {
    const container = $("#dialogue-choices");
    container.innerHTML = "";
    container.hidden = false;
    return new Promise((resolve) => {
      choices.forEach((choice, index) => {
        const button = document.createElement("button");
        button.innerHTML = `<b>${index + 1}</b> ${escape(choice.label)}`;
        const pick = () => {
          container.hidden = true;
          window.removeEventListener("keydown", key);
          resolve(choice.reply);
        };
        button.addEventListener("click", (event) => { event.stopPropagation(); pick(); });
        container.appendChild(button);
      });
      const key = (event: KeyboardEvent) => {
        const index = Number(event.key) - 1;
        if (choices[index]) container.children[index].dispatchEvent(new MouseEvent("click"));
      };
      window.addEventListener("keydown", key);
    });
  }

  // ---------- Phone ----------
  get phoneOpen(): boolean {
    return $("#phone").classList.contains("open");
  }

  openPhone(tab: PhoneTab = "home"): void {
    $("#phone").classList.add("open");
    this.showPhoneTab(tab);
  }

  closePhone(): void {
    if (!this.phoneOpen) return;
    blurFocus();
    $("#phone").classList.remove("open");
    this.onPhoneClosed?.();
  }

  showPhoneTab(tab: PhoneTab): void {
    this.phoneTab = tab;
    document.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
    this.renderPhone();
    this.onPhoneTab?.(tab);
  }

  private renderPhone(): void {
    const run = this.run;
    const screen = $("#phone-screen");
    if (!run) return;
    if (this.phoneTab === "home") {
      screen.innerHTML = `
        <div class="ph-balance"><small>CASH BALANCE</small><strong>${money(run.cash)}</strong><span>Day ${run.day} · ${run.actionsRemaining} moves left</span></div>
        <button class="ph-row" data-go="word"><b>WORD ON THE STREET</b><span>Neighborhood intel</span>${this.wordBadge ? '<i class="dot"></i>' : ""}</button>
        <button class="ph-row" data-go="stash"><b>STASH</b><span>What you're carrying</span></button>
        <button class="ph-row" data-go="contacts"><b>CONTACTS</b><span>People in your network</span></button>
        ${this.endDayEnabled ? '<button class="ph-endday" id="ph-endday">END THE DAY</button>' : '<p class="ph-hint">Make a move before you can end the day.</p>'}`;
      screen.querySelectorAll<HTMLButtonElement>("[data-go]").forEach((button) => button.addEventListener("click", () => this.showPhoneTab(button.dataset.go as PhoneTab)));
      screen.querySelector("#ph-endday")?.addEventListener("click", () => { blurFocus(); this.onEndDay?.(); });
    } else if (this.phoneTab === "word") {
      const forecasts = run.forecasts.filter((forecast) => forecast.expiresDay >= run.day);
      const items = forecasts.length
        ? forecasts.map((forecast) => this.forecastRow(forecast)).join("")
        : `<div class="ph-word"><b>RAY</b><p>The Hub has been moving inventory fast. No promises. Check the board, read the block, and keep an exit open.</p></div>`;
      const notes = this.notes.map((note) => `<div class="ph-note">${escape(note)}</div>`).join("");
      screen.innerHTML = `<h3>WORD ON THE STREET</h3>${items}${notes ? `<h4>WHAT YOU SAW</h4>${notes}` : ""}<p class="ph-hint">Known info only. The move is still yours.</p>`;
    } else if (this.phoneTab === "stash") {
      const rows = Object.entries(run.inventory).filter(([, quantity]) => quantity > 0);
      const value = rows.reduce((sum, [asset, quantity]) => sum + (run.prices[asset] ?? 0) * quantity, 0);
      screen.innerHTML = `<h3>CURRENT LOAD</h3>${rows.length ? rows.map(([asset, quantity]) => `<div class="ph-line"><span>${ASSET_LABELS[asset] ?? asset}</span><b>${quantity} units</b><em>${money((run.prices[asset] ?? 0) * quantity)}</em></div>`).join("") : '<p class="ph-empty">Nothing carried.</p>'}
        <div class="ph-line total"><span>Carried value</span><em>${money(value)}</em></div><div class="ph-line"><span>Capacity</span><b>${rows.reduce((s, [, q]) => s + q, 0)} / ${run.inventoryCapacity}</b></div>`;
    } else {
      screen.innerHTML = `<h3>CONTACTS</h3><div class="ph-contact"><i>R</i><div><b>RAY</b><span>Street contact · corner by the market</span></div></div><div class="ph-contact dim"><i>P</i><div><b>PEARL</b><span>Unlocks later</span></div></div><div class="ph-contact dim"><i>D</i><div><b>DISPATCHER</b><span>Unlocks later</span></div></div>`;
    }
  }

  private forecastRow(forecast: ForecastView): string {
    const up = forecast.direction === "up";
    const source = forecast.sourceType === "local_contact" ? "Ray" : forecast.sourceType === "street_wire" ? "Street wire" : "Out of town";
    return `<div class="ph-word ${up ? "up" : "down"}"><b>${ASSET_LABELS[forecast.assetId] ?? forecast.assetId} ${up ? "▲" : "▼"}</b><p>${source} says ${forecast.magnitudeBand} move ${up ? "up" : "down"} by Day ${forecast.expiresDay}.</p></div>`;
  }

  // ---------- Market ----------
  get marketOpen(): boolean {
    return !$("#market").hidden;
  }

  openMarket(): void {
    $("#market").hidden = false;
    this.marketQuantity = 1;
    this.renderMarket();
  }

  closeMarket(): void {
    if (!this.marketOpen) return;
    blurFocus();
    $("#market").hidden = true;
    this.onMarketClosed?.();
  }

  private renderMarket(): void {
    const run = this.run;
    if (!run) return;
    const available = CORE_ASSETS.filter((asset) => run.day >= asset.availableFromDay);
    if (!available.some((asset) => asset.id === this.selectedAsset)) this.selectedAsset = available[0].id;
    const price = run.prices[this.selectedAsset] ?? 0;
    const owned = run.inventory[this.selectedAsset] ?? 0;
    const buyCost = Math.ceil(price * this.marketQuantity * (10_000 + TRADE_SPREAD_BPS) / 10_000);
    const sellGross = Math.floor(price * this.marketQuantity * (10_000 - TRADE_SPREAD_BPS) / 10_000);
    const maxBuy = Math.max(0, Math.floor(run.cash / (price * (10_000 + TRADE_SPREAD_BPS) / 10_000)));
    const forecast = run.forecasts.find((item) => item.assetId === this.selectedAsset && item.expiresDay >= run.day);
    const canAct = run.actionsRemaining > 0 && !this.marketBusy;
    $("#market-body").innerHTML = `
      <div class="mk-list">${available.map((asset) => {
        const value = run.prices[asset.id] ?? 0;
        const hint = run.forecasts.find((item) => item.assetId === asset.id && item.expiresDay >= run.day);
        return `<button class="mk-asset ${asset.id === this.selectedAsset ? "active" : ""}" data-asset="${asset.id}"><b>${asset.name}</b><span>${money(value)}</span>${hint ? `<i class="${hint.direction}">${hint.direction === "up" ? "▲" : "▼"}</i>` : ""}<small>${run.inventory[asset.id] ?? 0} held</small></button>`;
      }).join("")}</div>
      <div class="mk-detail">
        <div class="mk-quote"><small>QUOTE · ${ASSET_LABELS[this.selectedAsset]}</small><strong>${money(price)}</strong><span>per unit · 2% spread each way</span></div>
        ${forecast ? `<p class="mk-intel ${forecast.direction}">Word says: ${forecast.magnitudeBand} move ${forecast.direction} by Day ${forecast.expiresDay}.</p>` : `<p class="mk-intel">No intel on this one. Price can move either way.</p>`}
        <div class="mk-qty"><span>QUANTITY</span><div>${[1, 5, 10].map((q) => `<button data-qty="${q}" class="${this.marketQuantity === q ? "active" : ""}">${q}</button>`).join("")}<button data-qty="${Math.max(1, Math.min(maxBuy, 50))}" class="${![1, 5, 10].includes(this.marketQuantity) ? "active" : ""}">MAX</button></div></div>
        <div class="mk-actions">
          <button id="mk-buy" ${canAct && buyCost <= run.cash ? "" : "disabled"}>BUY ${this.marketQuantity}<small>${money(buyCost)}</small></button>
          <button id="mk-sell" ${canAct && owned >= this.marketQuantity ? "" : "disabled"}>SELL ${this.marketQuantity}<small>${owned >= this.marketQuantity ? money(sellGross) : `you hold ${owned}`}</small></button>
        </div>
        <p class="mk-foot">Cash ${money(run.cash)} · ${run.actionsRemaining} move${run.actionsRemaining === 1 ? "" : "s"} left today · Each trade uses a move.</p>
      </div>`;
    const body = $("#market-body");
    body.querySelectorAll<HTMLButtonElement>("[data-asset]").forEach((button) => button.addEventListener("click", () => { this.selectedAsset = button.dataset.asset!; this.renderMarket(); }));
    body.querySelectorAll<HTMLButtonElement>("[data-qty]").forEach((button) => button.addEventListener("click", () => { this.marketQuantity = Number(button.dataset.qty); this.renderMarket(); }));
    body.querySelector("#mk-buy")?.addEventListener("click", () => this.submitTrade("buy"));
    body.querySelector("#mk-sell")?.addEventListener("click", () => this.submitTrade("sell"));
  }

  private async submitTrade(side: "buy" | "sell"): Promise<void> {
    if (this.marketBusy || !this.onTrade) return;
    this.marketBusy = true;
    this.renderMarket();
    await this.onTrade({ side, assetId: this.selectedAsset, quantity: this.marketQuantity });
    this.marketBusy = false;
    if (this.marketOpen) this.renderMarket();
  }

  // ---------- Story cards ----------
  async card(options: { kicker: string; title: string; body: string; button: string; tone?: "gold" | "green" | "red" }): Promise<void> {
    const card = $("#story-card");
    card.className = `show ${options.tone ?? "gold"}`;
    card.hidden = false;
    $("#story-kicker").textContent = options.kicker;
    $("#story-title").textContent = options.title;
    $("#story-body").innerHTML = options.body;
    const button = $<HTMLButtonElement>("#story-button");
    button.textContent = options.button;
    await new Promise<void>((resolve) => {
      const done = () => {
        blurFocus();
        button.removeEventListener("click", done);
        window.removeEventListener("keydown", key);
        card.hidden = true;
        card.className = "";
        resolve();
      };
      const key = (event: KeyboardEvent) => { if (["enter", " ", "e"].includes(event.key.toLowerCase())) done(); };
      button.addEventListener("click", done);
      setTimeout(() => window.addEventListener("keydown", key), 400);
    });
  }

  async nightfall(day: number): Promise<void> {
    const curtain = $("#curtain");
    $("#curtain-text").textContent = `DAY ${day - 1} IS DONE`;
    $("#curtain-sub").textContent = `The block keeps moving overnight. Day ${day} starts now.`;
    curtain.hidden = false;
    curtain.classList.add("show");
    await new Promise((resolve) => setTimeout(resolve, 2600));
    curtain.classList.remove("show");
    await new Promise((resolve) => setTimeout(resolve, 700));
    curtain.hidden = true;
  }

  get blocking(): boolean {
    return this.phoneOpen || this.marketOpen || this.inDialogue || !$("#story-card").hidden || !$("#clue").hidden || !$("#curtain").hidden;
  }
}

export { money };
