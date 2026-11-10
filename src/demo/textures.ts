import * as THREE from "three";

/** Small deterministic RNG so the block looks the same on every load. */
export function rng(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function canvas(width: number, height = width) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const context = element.getContext("2d")!;
  return { element, context };
}

function toTexture(element: HTMLCanvasElement, color = true, repeat = true) {
  const texture = new THREE.CanvasTexture(element);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function noise(context: CanvasRenderingContext2D, width: number, height: number, amount: number, random: () => number, alpha = 0.08) {
  for (let index = 0; index < amount; index++) {
    const shade = random() > 0.5 ? 255 : 0;
    context.fillStyle = `rgba(${shade},${shade},${shade},${random() * alpha})`;
    const size = 1 + random() * 3;
    context.fillRect(random() * width, random() * height, size, size);
  }
}

export type FacadeStyle = "brick" | "stucco" | "panel";

export interface FacadeTextures {
  map: THREE.Texture;
  emissive: THREE.Texture;
  bays: number;
  floors: number;
}

const FACADE_BASE: Record<FacadeStyle, string[]> = {
  brick: ["#6b3428", "#5a2d26", "#7a4030", "#4d2a24"],
  stucco: ["#8c8170", "#6f6a62", "#9a8b72", "#5f5a55"],
  panel: ["#3b4148", "#4a4f54", "#2f353b", "#55504a"],
};

/** Upper-floor facade: brick, stucco or panel walls with a grid of windows; a matching emissive map lights some of them. */
export function facadeTexture(style: FacadeStyle, seed: number): FacadeTextures {
  const random = rng(seed);
  const bays = 4;
  const floors = 4;
  const cell = 128;
  const { element, context } = canvas(bays * cell, floors * cell);
  const glow = canvas(bays * cell, floors * cell);
  const base = FACADE_BASE[style][Math.floor(random() * 4)];
  context.fillStyle = base;
  context.fillRect(0, 0, element.width, element.height);
  glow.context.fillStyle = "#000";
  glow.context.fillRect(0, 0, element.width, element.height);

  if (style === "brick") {
    context.strokeStyle = "rgba(20,10,8,0.45)";
    context.lineWidth = 1;
    for (let y = 0; y < element.height; y += 8) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(element.width, y);
      context.stroke();
      for (let x = (y / 8) % 2 ? 0 : 10; x < element.width; x += 20) {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x, y + 8);
        context.stroke();
      }
    }
    for (let index = 0; index < 900; index++) {
      context.fillStyle = `rgba(${random() > 0.5 ? "255,200,170" : "0,0,0"},${random() * 0.08})`;
      context.fillRect(Math.floor(random() * 26) * 20, Math.floor(random() * 64) * 8, 19, 7);
    }
  } else if (style === "panel") {
    context.strokeStyle = "rgba(0,0,0,0.35)";
    for (let x = 0; x <= element.width; x += 64) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, element.height);
      context.stroke();
    }
  }
  noise(context, element.width, element.height, 2600, random, 0.07);

  for (let floor = 0; floor < floors; floor++) {
    // Floor band
    context.fillStyle = "rgba(0,0,0,0.22)";
    context.fillRect(0, floor * cell + cell - 10, element.width, 6);
    for (let bay = 0; bay < bays; bay++) {
      const x = bay * cell + 30;
      const y = floor * cell + 26;
      const w = 68;
      const h = 76;
      context.fillStyle = "#1c1f24";
      context.fillRect(x - 5, y - 5, w + 10, h + 12);
      context.fillStyle = "#0a0d12";
      context.fillRect(x, y, w, h);
      context.fillStyle = "rgba(160,190,220,0.08)";
      context.fillRect(x + 2, y + 2, w / 2 - 3, h - 4);
      context.fillStyle = "#26292d";
      context.fillRect(x + w / 2 - 2, y, 4, h);
      context.fillRect(x, y + h * 0.42, w, 3);
      context.fillStyle = "rgba(255,255,255,0.12)";
      context.fillRect(x - 6, y + h + 3, w + 12, 4);

      const roll = random();
      if (roll < 0.38) {
        const warm = random() > 0.3;
        const gradient = glow.context.createLinearGradient(0, y, 0, y + h);
        const top = warm ? `rgb(255,${170 + Math.floor(random() * 40)},${90 + Math.floor(random() * 40)})` : "rgb(150,190,255)";
        gradient.addColorStop(0, top);
        gradient.addColorStop(1, warm ? "rgb(150,80,40)" : "rgb(60,80,140)");
        glow.context.fillStyle = gradient;
        glow.context.fillRect(x, y, w, h);
        if (random() > 0.5) {
          glow.context.fillStyle = "rgba(0,0,0,0.65)";
          glow.context.fillRect(x, y, w, h * (0.2 + random() * 0.5));
        }
        glow.context.fillStyle = "#000";
        glow.context.fillRect(x + w / 2 - 2, y, 4, h);
        glow.context.fillRect(x, y + h * 0.42, w, 3);
      } else if (roll < 0.46) {
        glow.context.fillStyle = "rgb(40,70,160)";
        glow.context.fillRect(x, y, w, h);
      }
    }
  }
  return { map: toTexture(element), emissive: toTexture(glow.element), bays, floors };
}

/** Wet asphalt tile (10 m square): base, patches, cracks; a second canvas drives roughness so puddles read glossy. */
export function asphaltTextures(seed: number) {
  const random = rng(seed);
  const size = 1024;
  const { element, context } = canvas(size);
  const rough = canvas(size);
  context.fillStyle = "#1d1e21";
  context.fillRect(0, 0, size, size);
  noise(context, size, size, 26000, random, 0.12);
  for (let index = 0; index < 14; index++) {
    context.fillStyle = `rgba(${random() > 0.5 ? 40 : 10},${random() > 0.5 ? 40 : 12},${random() > 0.5 ? 42 : 14},0.5)`;
    context.fillRect(random() * size, random() * size, 60 + random() * 260, 40 + random() * 180);
  }
  context.strokeStyle = "rgba(0,0,0,0.6)";
  for (let index = 0; index < 22; index++) {
    context.lineWidth = 1 + random() * 2;
    context.beginPath();
    let x = random() * size;
    let y = random() * size;
    context.moveTo(x, y);
    for (let step = 0; step < 8; step++) {
      x += (random() - 0.5) * 70;
      y += (random() - 0.5) * 70;
      context.lineTo(x, y);
    }
    context.stroke();
  }
  rough.context.fillStyle = "rgb(205,205,205)";
  rough.context.fillRect(0, 0, size, size);
  for (let index = 0; index < 7; index++) {
    const x = random() * size;
    const y = random() * size;
    const radius = 60 + random() * 160;
    const gradient = rough.context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgb(25,25,25)");
    gradient.addColorStop(0.7, "rgb(60,60,60)");
    gradient.addColorStop(1, "rgba(205,205,205,0)");
    rough.context.fillStyle = gradient;
    rough.context.beginPath();
    rough.context.ellipse(x, y, radius * 1.6, radius, random() * Math.PI, 0, Math.PI * 2);
    rough.context.fill();
    const wet = context.createRadialGradient(x, y, 0, x, y, radius * 1.4);
    wet.addColorStop(0, "rgba(0,0,0,0.12)");
    wet.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = wet;
    context.beginPath();
    context.ellipse(x, y, radius * 1.4, radius * 0.85, random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  return { map: toTexture(element), roughness: toTexture(rough.element, false) };
}

/** Concrete sidewalk slabs with seams, stains and gum spots. */
export function sidewalkTexture(seed: number) {
  const random = rng(seed);
  const size = 512;
  const { element, context } = canvas(size);
  context.fillStyle = "#57585a";
  context.fillRect(0, 0, size, size);
  noise(context, size, size, 9000, random, 0.12);
  for (let index = 0; index < 10; index++) {
    context.fillStyle = `rgba(0,0,0,${0.05 + random() * 0.12})`;
    context.beginPath();
    context.ellipse(random() * size, random() * size, 20 + random() * 60, 12 + random() * 40, random() * 3, 0, Math.PI * 2);
    context.fill();
  }
  context.strokeStyle = "rgba(15,15,15,0.7)";
  context.lineWidth = 3;
  for (let offset = 0; offset <= size; offset += size / 4) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset, size);
    context.moveTo(0, offset);
    context.lineTo(size, offset);
    context.stroke();
  }
  return toTexture(element);
}

/** Storefront glass: lit interior with shelf silhouettes. Returned as an emissive-ready texture. */
export function storefrontTexture(seed: number, tint: string) {
  const random = rng(seed);
  const { element, context } = canvas(512, 256);
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, tint);
  gradient.addColorStop(1, "#140c08");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 256);
  for (let shelf = 0; shelf < 3; shelf++) {
    const y = 70 + shelf * 55;
    context.fillStyle = "rgba(0,0,0,0.55)";
    context.fillRect(0, y, 512, 6);
    for (let x = 4; x < 508; x += 6 + random() * 10) {
      context.fillStyle = `hsla(${random() * 360},38%,${26 + random() * 22}%,0.9)`;
      const h = 14 + random() * 26;
      context.fillRect(x, y - h, 4 + random() * 8, h);
    }
  }
  for (let index = 0; index < 3; index++) {
    context.fillStyle = "rgba(0,0,0,0.75)";
    const x = random() * 480;
    context.fillRect(x, 120, 18, 136);
    context.beginPath();
    context.arc(x + 9, 112, 11, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = "rgba(0,0,0,0.85)";
  for (let x = 0; x <= 512; x += 128) context.fillRect(x - 3, 0, 6, 256);
  return toTexture(element, true, false);
}

/** Corrugated roll-down shutter, optionally tagged. */
export function shutterTexture(seed: number, tag?: string) {
  const random = rng(seed);
  const { element, context } = canvas(512, 256);
  context.fillStyle = "#5d6064";
  context.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 256; y += 8) {
    context.fillStyle = "rgba(0,0,0,0.35)";
    context.fillRect(0, y, 512, 2);
    context.fillStyle = "rgba(255,255,255,0.08)";
    context.fillRect(0, y + 3, 512, 2);
  }
  noise(context, 512, 256, 3000, random, 0.15);
  if (tag) {
    context.save();
    context.translate(256, 140);
    context.rotate(-0.08);
    context.font = "900 92px Impact, 'Arial Black', sans-serif";
    context.textAlign = "center";
    context.lineWidth = 10;
    context.strokeStyle = "#111";
    context.strokeText(tag, 0, 0);
    context.fillStyle = ["#e8232f", "#16d879", "#f2c230", "#3fa9ff"][Math.floor(random() * 4)];
    context.fillText(tag, 0, 0);
    context.restore();
  }
  return toTexture(element, true, false);
}

/** Neon sign text with a soft halo baked into the canvas; used on an unlit material so bloom picks it up. */
export function neonTexture(text: string, color: string, width = 1024, height = 256, font = "900 150px 'Arial Black', Impact, sans-serif") {
  const { element, context } = canvas(width, height);
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = color;
  for (const blur of [40, 22, 10]) {
    context.shadowBlur = blur;
    context.fillStyle = color;
    context.fillText(text, width / 2, height / 2 + 6);
  }
  context.shadowBlur = 0;
  context.fillStyle = "#fff";
  context.globalAlpha = 0.75;
  context.fillText(text, width / 2, height / 2 + 6);
  return toTexture(element, true, false);
}

/** Painted shop sign board (lit from the front, not neon). */
export function signBoardTexture(text: string, background: string, foreground: string) {
  const { element, context } = canvas(1024, 192);
  context.fillStyle = background;
  context.fillRect(0, 0, 1024, 192);
  context.strokeStyle = "rgba(0,0,0,0.4)";
  context.lineWidth = 10;
  context.strokeRect(5, 5, 1014, 182);
  context.font = "900 108px 'Arial Black', Impact, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = foreground;
  context.fillText(text, 512, 100);
  return toTexture(element, true, false);
}

/** Soft radial light pool, projected on the ground under lamps with additive blending. */
export function lightPoolTexture() {
  const { element, context } = canvas(256);
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return toTexture(element, true, false);
}

/** Vertical fade used for the light cone under each street lamp. */
export function coneTexture() {
  const { element, context } = canvas(64, 256);
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 256);
  return toTexture(element, true, false);
}

/** Poster or paper sign with text lines (safehouse wall, delivery board). */
export function paperTexture(lines: string[], options: { background?: string; color?: string; size?: number; width?: number; height?: number; font?: string } = {}) {
  const width = options.width ?? 512;
  const height = options.height ?? 640;
  const { element, context } = canvas(width, height);
  context.fillStyle = options.background ?? "#e9e2cf";
  context.fillRect(0, 0, width, height);
  const random = rng(lines.join("").length * 97);
  noise(context, width, height, 2500, random, 0.08);
  context.fillStyle = options.color ?? "#1b1b1b";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const size = options.size ?? 64;
  context.font = options.font ?? `900 ${size}px Impact, 'Arial Black', sans-serif`;
  const total = lines.length * size * 1.15;
  lines.forEach((line, index) => context.fillText(line, width / 2, height / 2 - total / 2 + size * 0.6 + index * size * 1.15));
  return toTexture(element, true, false);
}

/** Abstract graffiti marks for walls. */
export function graffitiTexture(seed: number) {
  const random = rng(seed);
  const { element, context } = canvas(512, 256);
  const colors = ["#e8232f", "#16d879", "#f2c230", "#3fa9ff", "#d14fff", "#ffffff"];
  const words = ["TRAP", "WTF", "BLOCK", "RAY", "CASH", "LABZ", "WAR", "EAST", "HUSTLE"];
  context.save();
  context.translate(256, 128);
  context.rotate((random() - 0.5) * 0.3);
  context.font = `900 ${110 + random() * 40}px Impact, 'Arial Black', sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const word = words[Math.floor(random() * words.length)];
  context.lineWidth = 14;
  context.strokeStyle = "#0b0b0b";
  context.strokeText(word, 0, 0);
  context.fillStyle = colors[Math.floor(random() * colors.length)];
  context.fillText(word, 0, 0);
  context.lineWidth = 4;
  context.strokeStyle = colors[Math.floor(random() * colors.length)];
  context.strokeText(word, 4, -4);
  context.restore();
  for (let index = 0; index < 30; index++) {
    context.fillStyle = context.strokeStyle as string;
    context.globalAlpha = 0.6;
    context.fillRect(random() * 512, 180 + random() * 70, 2, 4 + random() * 30);
  }
  return toTexture(element, true, false);
}

/** Night sky dome gradient with stars and a sodium-orange city glow at the horizon. */
export function skyTexture() {
  const { element, context } = canvas(1024, 512);
  const gradient = context.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#03040a");
  gradient.addColorStop(0.45, "#0b1024");
  gradient.addColorStop(0.72, "#2a1a3a");
  gradient.addColorStop(0.86, "#6a2f2a");
  gradient.addColorStop(1, "#c46a35");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1024, 512);
  const random = rng(7);
  for (let index = 0; index < 420; index++) {
    const y = random() * 300;
    context.fillStyle = `rgba(255,255,255,${0.2 + random() * 0.7 * (1 - y / 300)})`;
    const s = random() > 0.97 ? 2 : 1;
    context.fillRect(random() * 1024, y, s, s);
  }
  return toTexture(element, true, false);
}

/** Phone screen glow for the prop on the safehouse desk. */
export function screenTexture(lines: string[], color: string) {
  const { element, context } = canvas(256, 160);
  context.fillStyle = "#06120c";
  context.fillRect(0, 0, 256, 160);
  context.fillStyle = color;
  context.font = "bold 22px monospace";
  lines.forEach((line, index) => context.fillText(line, 14, 34 + index * 30));
  return toTexture(element, true, false);
}
