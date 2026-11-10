import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { Collision } from "./collision";
import {
  asphaltTextures,
  coneTexture,
  facadeTexture,
  graffitiTexture,
  lightPoolTexture,
  neonTexture,
  paperTexture,
  rng,
  screenTexture,
  shutterTexture,
  sidewalkTexture,
  signBoardTexture,
  skyTexture,
  storefrontTexture,
  type FacadeStyle,
} from "./textures";

/** Street layout (metres). The block runs along X; Z crosses the street. */
export const LAYOUT = {
  northFacade: 0,
  northCurb: 4,
  southCurb: 14,
  southFacade: 18,
  sidewalkHeight: 0.15,
  playableMinX: -43,
  playableMaxX: 43,
  groundFloor: 4.2,
  floorHeight: 3.2,
  safehouse: { minX: -35, maxX: -25, minZ: -9, maxZ: 0, doorMinX: -28.2, doorMaxX: -26.6, height: 3.5 },
};

export interface WorldAnchors {
  spawn: THREE.Vector3;
  spawnYaw: number;
  phone: THREE.Vector3;
  door: THREE.Vector3;
  outsideDoor: THREE.Vector3;
  deliveryBoard: THREE.Vector3;
  crates: THREE.Vector3;
  corner: THREE.Vector3;
  ray: THREE.Vector3;
  rayYaw: number;
  hub: THREE.Vector3;
  loiterers: Array<{ position: THREE.Vector3; yaw: number }>;
  walkLanes: number[];
}

export interface World {
  collision: Collision;
  anchors: WorldAnchors;
  update(delta: number, elapsed: number, playerPosition: THREE.Vector3): void;
  openDoor(): void;
  setPhoneHighlight(on: boolean): void;
  setMarkerVisible(id: string, visible: boolean): void;
  setReflections(on: boolean): void;
  setPracticalLights(on: boolean): void;
}

type Props = Map<string, THREE.Object3D>;

/** Collects static meshes per material and merges them into a handful of draw calls. */
class StaticBatch {
  private readonly groups = new Map<THREE.Material, THREE.BufferGeometry[]>();

  add(geometry: THREE.BufferGeometry, material: THREE.Material, matrix: THREE.Matrix4): void {
    const copy = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    copy.applyMatrix4(matrix);
    for (const name of Object.keys(copy.attributes)) if (!["position", "normal", "uv"].includes(name)) copy.deleteAttribute(name);
    if (!copy.attributes.uv) copy.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((copy.attributes.position.count) * 2), 2));
    const list = this.groups.get(material) ?? [];
    list.push(copy);
    this.groups.set(material, list);
  }

  box(width: number, height: number, depth: number, material: THREE.Material, x: number, y: number, z: number, rotationY = 0): void {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(x, y + height / 2, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY), new THREE.Vector3(1, 1, 1));
    this.add(new THREE.BoxGeometry(width, height, depth), material, matrix);
  }

  flush(scene: THREE.Object3D, options: { castShadow?: boolean; receiveShadow?: boolean } = {}): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    for (const [material, geometries] of this.groups) {
      const merged = mergeGeometries(geometries, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = options.castShadow ?? false;
      mesh.receiveShadow = options.receiveShadow ?? true;
      mesh.matrixAutoUpdate = false;
      scene.add(mesh);
      meshes.push(mesh);
    }
    this.groups.clear();
    return meshes;
  }
}

/** A box whose UVs are in world metres, so every building of a style can share one material and tile seamlessly. */
function worldUvBox(minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number, tileX: number, tileY: number, originY: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const quad = (corners: number[][], normal: number[], uv: (point: number[]) => [number, number]) => {
    for (const index of [0, 1, 2, 0, 2, 3]) {
      positions.push(...corners[index]);
      normals.push(...normal);
      uvs.push(...uv(corners[index]));
    }
  };
  const front = (point: number[]): [number, number] => [point[0] / tileX, (point[1] - originY) / tileY];
  const side = (point: number[]): [number, number] => [point[2] / tileX, (point[1] - originY) / tileY];
  quad([[minX, minY, maxZ], [maxX, minY, maxZ], [maxX, maxY, maxZ], [minX, maxY, maxZ]], [0, 0, 1], front);
  quad([[maxX, minY, minZ], [minX, minY, minZ], [minX, maxY, minZ], [maxX, maxY, minZ]], [0, 0, -1], front);
  quad([[maxX, minY, maxZ], [maxX, minY, minZ], [maxX, maxY, minZ], [maxX, maxY, maxZ]], [1, 0, 0], side);
  quad([[minX, minY, minZ], [minX, minY, maxZ], [minX, maxY, maxZ], [minX, maxY, minZ]], [-1, 0, 0], side);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
}

function plane(width: number, height: number, material: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

function unlit(texture: THREE.Texture, intensity = 1, transparent = true): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent, depthWrite: !transparent, toneMapped: false });
  material.color.setScalar(intensity);
  return material;
}

function placeProp(props: Props, name: string, scale: number, x: number, y: number, z: number, rotationY = 0): THREE.Object3D | undefined {
  const source = props.get(name);
  if (!source) return undefined;
  const instance = source.clone(true);
  instance.scale.setScalar(scale);
  instance.position.set(x, y, z);
  instance.rotation.y = rotationY;
  instance.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return instance;
}

interface Lot {
  side: "north" | "south";
  minX: number;
  maxX: number;
  floors: number;
  style: number;
  shop?: { kind: "store" | "shutter" | "boarded"; sign?: string; neon?: string; neonColor?: string; tint?: string; tag?: string };
}

const SHOPS: Lot["shop"][] = [
  { kind: "store", sign: "LIQUOR", neon: "OPEN", neonColor: "#ff3048", tint: "#b07a3a" },
  { kind: "shutter", tag: "TRAP" },
  { kind: "store", sign: "CHECKS CASHED", neon: "$ CASH $", neonColor: "#29ff8a", tint: "#6f8a5a" },
  { kind: "store", sign: "PHONE REPAIR", neon: "WIRELESS", neonColor: "#3fb6ff", tint: "#4a6c8c" },
  { kind: "shutter", tag: "WTF" },
  { kind: "store", sign: "LAUNDROMAT", neon: "24 HRS", neonColor: "#ffd23a", tint: "#c9c08a" },
  { kind: "store", sign: "BARBER", neon: "FADES", neonColor: "#ff4fd8", tint: "#a07070" },
  { kind: "shutter", tag: "BLOCK" },
  { kind: "store", sign: "PAWN & GOLD", neon: "WE BUY GOLD", neonColor: "#ffb020", tint: "#a08040" },
  { kind: "store", sign: "TACOS", neon: "TACOS", neonColor: "#ff7a1a", tint: "#c08050" },
];

export function buildWorld(scene: THREE.Scene, renderer: THREE.WebGLRenderer, props: Props, highQuality: boolean): World {
  const collision = new Collision();
  const random = rng(20261106);
  const batch = new StaticBatch();
  const animated: Array<(delta: number, elapsed: number, player: THREE.Vector3) => void> = [];
  const markers = new Map<string, THREE.Object3D>();
  const L = LAYOUT;

  // ---------- Sky, fog, lighting ----------
  scene.background = new THREE.Color("#05060c");
  scene.fog = new THREE.FogExp2("#120f1c", 0.0125);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.rotation.y = Math.PI * 0.5;
  scene.add(sky);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.55, 1.4), fog: false, toneMapped: false }));
  moon.position.set(-140, 150, -260);
  moon.lookAt(0, 0, 0);
  scene.add(moon);

  scene.add(new THREE.HemisphereLight("#4a5a8c", "#1a1210", 0.55));
  const moonLight = new THREE.DirectionalLight("#9fb4ff", 0.85);
  moonLight.position.set(-30, 60, -40);
  moonLight.target.position.set(0, 0, 9);
  moonLight.castShadow = highQuality;
  moonLight.shadow.mapSize.set(2048, 2048);
  const shadowCamera = moonLight.shadow.camera as THREE.OrthographicCamera;
  shadowCamera.left = -50;
  shadowCamera.right = 50;
  shadowCamera.top = 30;
  shadowCamera.bottom = -30;
  shadowCamera.far = 160;
  moonLight.shadow.bias = -0.0006;
  scene.add(moonLight, moonLight.target);

  // A soft generated environment gives the wet surfaces something to reflect.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color("#0b0d18");
  const envGlow = (color: string, x: number, y: number, z: number, s: number) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 8), new THREE.MeshBasicMaterial({ color }));
    m.position.set(x, y, z);
    envScene.add(m);
  };
  envGlow("#ff6a2a", 0, -2, 30, 12);
  envGlow("#ff2a48", 25, 4, -10, 5);
  envGlow("#7a5cff", -25, 4, -5, 3);
  envGlow("#ffcc66", 0, 20, 0, 6);
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  scene.environmentIntensity = 0.55;

  // ---------- Ground: road, markings, sidewalks ----------
  const roadLength = 200;
  const asphalt = asphaltTextures(11);
  asphalt.map.repeat.set(roadLength / 10, 1);
  asphalt.roughness.repeat.set(roadLength / 10, 1);
  const roadMaterial = new THREE.MeshStandardMaterial({ map: asphalt.map, roughnessMap: asphalt.roughness, roughness: 1, metalness: 0, transparent: true, opacity: 0.86, envMapIntensity: 0.45 });
  const road = plane(roadLength, L.southCurb - L.northCurb, roadMaterial);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.002, (L.northCurb + L.southCurb) / 2);
  road.receiveShadow = true;
  scene.add(road);

  // Wet-road reflections: a mirror just under the semi-transparent asphalt picks up neon, lamps and headlights.
  const reflector = new Reflector(new THREE.PlaneGeometry(roadLength, L.southCurb - L.northCurb), {
    textureWidth: Math.min(1024, window.innerWidth),
    textureHeight: Math.min(512, window.innerHeight),
    color: new THREE.Color("#5a5a66"),
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.set(0, -0.01, (L.northCurb + L.southCurb) / 2);
  reflector.visible = highQuality;
  scene.add(reflector);
  const roadUnderlay = plane(roadLength, L.southCurb - L.northCurb, new THREE.MeshBasicMaterial({ color: "#0d0d10" }));
  roadUnderlay.rotation.x = -Math.PI / 2;
  roadUnderlay.position.set(0, -0.012, (L.northCurb + L.southCurb) / 2);
  roadUnderlay.visible = !highQuality;
  scene.add(roadUnderlay);

  const paintYellow = new THREE.MeshStandardMaterial({ color: "#d9a520", roughness: 0.6, emissive: "#3a2a05" });
  const paintWhite = new THREE.MeshStandardMaterial({ color: "#d8d8d2", roughness: 0.6, emissive: "#222" });
  const centre = (L.northCurb + L.southCurb) / 2;
  for (let x = -roadLength / 2; x < roadLength / 2; x += 6) {
    batch.box(3, 0.01, 0.12, paintYellow, x + 1.5, 0.004, centre - 0.12);
    batch.box(3, 0.01, 0.12, paintYellow, x + 1.5, 0.004, centre + 0.12);
  }
  batch.box(roadLength, 0.01, 0.14, paintWhite, 0, 0.004, L.northCurb + 0.45);
  batch.box(roadLength, 0.01, 0.14, paintWhite, 0, 0.004, L.southCurb - 0.45);
  // Crosswalk in front of the safehouse.
  for (let z = L.northCurb + 0.6; z < L.southCurb - 0.5; z += 1.1) batch.box(3.2, 0.012, 0.6, paintWhite, -22, 0.004, z + 0.3);

  const sidewalk = sidewalkTexture(5);
  sidewalk.repeat.set(roadLength / 4, 1);
  const sidewalkMaterial = new THREE.MeshStandardMaterial({ map: sidewalk, roughness: 0.82, envMapIntensity: 0.6 });
  const curbMaterial = new THREE.MeshStandardMaterial({ color: "#7d7c78", roughness: 0.75 });
  for (const [minZ, maxZ] of [[L.northFacade - 0.5, L.northCurb], [L.southCurb, L.southFacade + 0.5]]) {
    const walk = new THREE.Mesh(new THREE.BoxGeometry(roadLength, L.sidewalkHeight, maxZ - minZ), sidewalkMaterial);
    walk.position.set(0, L.sidewalkHeight / 2, (minZ + maxZ) / 2);
    walk.receiveShadow = true;
    scene.add(walk);
    collision.addFloor(-roadLength / 2, roadLength / 2, minZ, maxZ, L.sidewalkHeight);
  }
  batch.box(roadLength, L.sidewalkHeight + 0.02, 0.22, curbMaterial, 0, 0, L.northCurb - 0.11);
  batch.box(roadLength, L.sidewalkHeight + 0.02, 0.22, curbMaterial, 0, 0, L.southCurb + 0.11);

  // ---------- Buildings ----------
  const facadeStyles: Array<{ style: FacadeStyle; textures: ReturnType<typeof facadeTexture>; material: THREE.MeshStandardMaterial }> = [];
  (["brick", "brick", "stucco", "panel", "brick", "stucco"] as FacadeStyle[]).forEach((style, index) => {
    const textures = facadeTexture(style, 100 + index * 17);
    const material = new THREE.MeshStandardMaterial({ map: textures.map, emissiveMap: textures.emissive, emissive: new THREE.Color(1.6, 1.6, 1.6), roughness: 0.9, envMapIntensity: 0.4 });
    facadeStyles.push({ style, textures, material });
  });
  const tileX = 12;
  const tileY = 12.8;
  const roofMaterial = new THREE.MeshStandardMaterial({ color: "#1b1c20", roughness: 0.95 });
  const groundFloorMaterial = new THREE.MeshStandardMaterial({ color: "#2a2726", roughness: 0.9 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.6, metalness: 0.4 });
  const fireEscapeMaterial = new THREE.MeshStandardMaterial({ color: "#0e0f10", roughness: 0.5, metalness: 0.6 });

  const lots: Lot[] = [];
  const makeLots = (side: Lot["side"], from: number, to: number, reserved: Array<[number, number, Partial<Lot>]>) => {
    let x = from;
    let shopIndex = side === "north" ? 0 : 5;
    while (x < to) {
      const fixed = reserved.find(([minX]) => Math.abs(minX - x) < 0.01);
      if (fixed) {
        lots.push({ side, minX: fixed[0], maxX: fixed[1], floors: 3, style: 0, ...fixed[2] });
        x = fixed[1];
        continue;
      }
      const nextReserved = reserved.filter(([minX]) => minX > x).map(([minX]) => minX).sort((a, b) => a - b)[0] ?? to;
      const width = Math.min(nextReserved - x, [9, 12, 12, 15][Math.floor(random() * 4)]);
      const near = Math.abs(x) < 50;
      lots.push({
        side,
        minX: x,
        maxX: x + width,
        floors: 2 + Math.floor(random() * 4),
        style: Math.floor(random() * facadeStyles.length),
        shop: near ? SHOPS[shopIndex++ % SHOPS.length] : { kind: random() > 0.5 ? "shutter" : "store", sign: undefined, tint: "#806040" },
      });
      x += width;
    }
  };
  makeLots("north", -99, 99, [
    [-36, -24, { floors: 3, style: 0, shop: { kind: "boarded" } }],
    [-15, -6, { floors: 4, style: 2, shop: { kind: "store", sign: "EXPRESS DELIVERY", neon: "PICKUP", neonColor: "#ffd23a", tint: "#8a7a50" } }],
    [12, 21, { floors: 3, style: 4, shop: { kind: "store", sign: "CORNER MARKET", neon: "OPEN 24/7", neonColor: "#29ff8a", tint: "#7a9060" } }],
  ]);
  makeLots("south", -99, 99, [[24, 39, { floors: 4, style: 3, shop: { kind: "store", sign: "THE HUB", tint: "#9a4a2a" } }]]);

  for (const lot of lots) {
    const north = lot.side === "north";
    const facadeZ = north ? L.northFacade : L.southFacade;
    const backZ = north ? facadeZ - 14 : facadeZ + 14;
    const minZ = Math.min(facadeZ, backZ);
    const maxZ = Math.max(facadeZ, backZ);
    const height = L.groundFloor + lot.floors * L.floorHeight;
    const style = facadeStyles[lot.style];
    batch.add(worldUvBox(lot.minX + 0.05, lot.maxX - 0.05, L.groundFloor, height, minZ, maxZ, tileX, tileY, L.groundFloor), style.material, new THREE.Matrix4());
    // Roof cap and parapet
    batch.box(lot.maxX - lot.minX, 0.3, maxZ - minZ, roofMaterial, (lot.minX + lot.maxX) / 2, height, (minZ + maxZ) / 2);
    batch.box(lot.maxX - lot.minX, 0.7, 0.35, trimMaterial, (lot.minX + lot.maxX) / 2, height, facadeZ + (north ? -0.15 : 0.15));
    // Cornice between ground and upper floors
    batch.box(lot.maxX - lot.minX, 0.35, 0.5, trimMaterial, (lot.minX + lot.maxX) / 2, L.groundFloor - 0.2, facadeZ + (north ? 0.1 : -0.1));
    if (random() > 0.55) {
      const tankX = lot.minX + 2 + random() * (lot.maxX - lot.minX - 4);
      batch.add(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 10), trimMaterial, new THREE.Matrix4().makeTranslation(tankX, height + 2.6, (minZ + maxZ) / 2));
      for (const leg of [-0.7, 0.7]) batch.box(0.15, 1.6, 0.15, trimMaterial, tankX + leg, height + 0.3, (minZ + maxZ) / 2);
    }
    if (random() > 0.45) batch.box(1.6, 1, 1.2, trimMaterial, lot.minX + 1.5 + random() * 3, height + 0.3, (minZ + maxZ) / 2 + (random() - 0.5) * 6);

    // Fire escape on some facades
    if (lot.floors >= 3 && random() > 0.55 && Math.abs(lot.minX) < 60) {
      const fx = lot.minX + 1.5 + random() * Math.max(0.5, lot.maxX - lot.minX - 6);
      const out = north ? 1 : -1;
      for (let floor = 0; floor < lot.floors; floor++) {
        const y = L.groundFloor + floor * L.floorHeight + 0.15;
        batch.box(3.4, 0.08, 1.1, fireEscapeMaterial, fx + 1.7, y, facadeZ + out * 0.55);
        batch.box(3.4, 0.05, 0.05, fireEscapeMaterial, fx + 1.7, y + 1, facadeZ + out * 1.08);
        for (let post = 0; post <= 4; post++) batch.box(0.04, 1, 0.04, fireEscapeMaterial, fx + post * 0.85, y, facadeZ + out * 1.08);
        const ladder = new THREE.Matrix4().compose(new THREE.Vector3(fx + 1.7, y + 1.6, facadeZ + out * 0.6), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.85), new THREE.Vector3(1, 1, 1));
        batch.add(new THREE.BoxGeometry(0.08, 3.6, 0.5), fireEscapeMaterial, ladder);
      }
    }

    if (lot.shop?.kind === "boarded") continue; // The safehouse builds its own ground floor.
    batch.add(new THREE.BoxGeometry(lot.maxX - lot.minX - 0.1, L.groundFloor, maxZ - minZ - 0.2), groundFloorMaterial, new THREE.Matrix4().makeTranslation((lot.minX + lot.maxX) / 2, L.groundFloor / 2, (minZ + maxZ) / 2));
    collision.add(lot.minX, lot.maxX, minZ, maxZ, undefined, true);
    buildShopfront(lot, facadeZ, north);
  }

  function buildShopfront(lot: Lot, facadeZ: number, north: boolean) {
    const shop = lot.shop;
    if (!shop) return;
    const out = north ? 1 : -1;
    const width = lot.maxX - lot.minX;
    const cx = (lot.minX + lot.maxX) / 2;
    const face = facadeZ + out * 0.03;
    const yaw = north ? 0 : Math.PI;
    const seed = Math.floor(cx * 13 + (north ? 3 : 7));
    if (shop.kind === "shutter") {
      const shutter = plane(width - 1.2, 3.1, new THREE.MeshStandardMaterial({ map: shutterTexture(seed, shop.tag), roughness: 0.6, metalness: 0.5 }));
      shutter.position.set(cx, 1.55 + 0.1, face);
      shutter.rotation.y = yaw;
      scene.add(shutter);
    } else {
      const glassWidth = width - 1.6;
      const glass = plane(glassWidth, 2.7, new THREE.MeshStandardMaterial({ map: storefrontTexture(seed, shop.tint ?? "#806040"), emissiveMap: storefrontTexture(seed, shop.tint ?? "#806040"), emissive: new THREE.Color(0.72, 0.68, 0.62), roughness: 0.15, metalness: 0.1 }));
      glass.position.set(cx, 1.5 + 0.1, face);
      glass.rotation.y = yaw;
      scene.add(glass);
      batch.box(glassWidth + 0.3, 0.18, 0.3, trimMaterial, cx, 2.85, facadeZ + out * 0.12);
      batch.box(glassWidth + 0.3, 0.5, 0.3, trimMaterial, cx, 0, facadeZ + out * 0.12);
      if (shop.sign) {
        const sign = plane(Math.min(width - 1, 9), 0.95, unlit(signBoardTexture(shop.sign, "#141414", "#e8e2d4"), 0.85, false));
        sign.position.set(cx, 3.55, face + out * 0.02);
        sign.rotation.y = yaw;
        scene.add(sign);
      }
      if (shop.neon && Math.abs(cx) < 60) {
        const neon = plane(2.8, 0.7, unlit(neonTexture(shop.neon, shop.neonColor ?? "#ff3048"), 2.4));
        neon.position.set(cx + (glassWidth / 2 - 1.8) * (north ? 1 : -1), 2.2, face + out * 0.05);
        neon.rotation.y = yaw;
        scene.add(neon);
        if (random() > 0.6) {
          const material = neon.material as THREE.MeshBasicMaterial;
          const phase = random() * 10;
          animated.push((_d, t) => {
            const flicker = Math.sin(t * 23 + phase) > 0.94 || Math.sin(t * 3.1 + phase) > 0.995 ? 0.25 : 2.4;
            material.color.setScalar(flicker);
          });
        }
      }
      // Awning over some storefronts
      if (random() > 0.45 && props.has("detail_awning_wide")) {
        const awning = placeProp(props, "detail_awning_wide", Math.min(width - 2, 7), cx, 2.95, facadeZ + out * 0.5, north ? Math.PI : 0);
        if (awning) {
          awning.scale.set(Math.min(width - 2, 7), 3.2, 3.2);
          scene.add(awning);
        }
      }
    }
    // Graffiti on blank wall sections near the street
    if (random() > 0.5 && Math.abs(cx) < 60) {
      const tag = plane(2.6, 1.3, new THREE.MeshStandardMaterial({ map: graffitiTexture(seed), transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }));
      tag.position.set(lot.minX + 1.4, 5.4 + random() * 2, face + out * 0.02);
      tag.rotation.y = yaw;
      scene.add(tag);
    }
  }

  // ---------- Safehouse ----------
  const S = L.safehouse;
  const plaster = new THREE.TextureLoader().load("/demo/assets/plaster.jpg");
  plaster.colorSpace = THREE.SRGBColorSpace;
  plaster.wrapS = plaster.wrapT = THREE.RepeatWrapping;
  plaster.repeat.set(3, 1.2);
  const interiorWall = new THREE.MeshStandardMaterial({ map: plaster, color: "#b9a993", roughness: 0.95 });
  const exteriorBoard = new THREE.MeshStandardMaterial({ color: "#3a2f28", roughness: 0.9 });
  const woodFloorCanvas = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d")!;
    for (let y = 0; y < 512; y += 32) {
      g.fillStyle = `hsl(25, 30%, ${18 + Math.floor(random() * 8)}%)`;
      g.fillRect(0, y, 512, 32);
      g.fillStyle = "rgba(0,0,0,0.5)";
      g.fillRect(0, y, 512, 2);
      g.fillRect(Math.floor(random() * 512), y, 2, 32);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
    return t;
  })();
  const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(S.maxX - S.minX, 0.15, S.maxZ - S.minZ), new THREE.MeshStandardMaterial({ map: woodFloorCanvas, roughness: 0.55 }));
  floorMesh.position.set((S.minX + S.maxX) / 2, 0.075, (S.minZ + S.maxZ) / 2);
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);
  collision.addFloor(S.minX, S.maxX, S.minZ, S.maxZ, 0.15);
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(S.maxX - S.minX + 2, 0.3, S.maxZ - S.minZ + 0.6), new THREE.MeshStandardMaterial({ color: "#2b2622", roughness: 1 }));
  ceiling.position.set((S.minX + S.maxX) / 2, S.height + 0.15, (S.minZ + S.maxZ) / 2);
  scene.add(ceiling);
  // Upper floors of the safehouse building sit above the room.
  const wallT = 0.3;
  const wall = (minX: number, maxX: number, minZ: number, maxZ: number, height: number, material: THREE.Material | THREE.Material[], y = 0, solid = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, height, maxZ - minZ), material);
    mesh.position.set((minX + maxX) / 2, y + height / 2, (minZ + maxZ) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (solid) collision.add(minX, maxX, minZ, maxZ, undefined, true);
    return mesh;
  };
  const sideMaterials = (inner: THREE.Material, outer: THREE.Material, innerFace: number) =>
    [0, 1, 2, 3, 4, 5].map((face) => (face === innerFace ? inner : outer));
  // Back, left, right walls (plaster inside)
  wall(S.minX - wallT, S.maxX + wallT, S.minZ - wallT, S.minZ, L.groundFloor, sideMaterials(interiorWall, groundFloorMaterial, 4));
  wall(S.minX - wallT, S.minX, S.minZ, S.maxZ, L.groundFloor, sideMaterials(interiorWall, groundFloorMaterial, 0));
  wall(S.maxX, S.maxX + wallT, S.minZ, S.maxZ, L.groundFloor, sideMaterials(interiorWall, groundFloorMaterial, 1));
  // Front wall with a door gap
  const front = (minX: number, maxX: number) => wall(minX, maxX, S.maxZ - wallT, S.maxZ, L.groundFloor, sideMaterials(interiorWall, exteriorBoard, 5));
  front(S.minX - wallT, S.doorMinX);
  front(S.doorMaxX, S.maxX + wallT);
  wall(S.doorMinX, S.doorMaxX, S.maxZ - wallT, S.maxZ, L.groundFloor - 2.4, sideMaterials(interiorWall, exteriorBoard, 5), 2.4, false);
  collision.add(-36, S.minX - wallT, -14, 0, undefined, true);
  collision.add(S.maxX + wallT, -24, -14, 0, undefined, true);
  collision.add(-36, -24, -14, S.minZ - wallT, undefined, true);
  // Boarded windows and a tag on the outside
  for (const bx of [-33.2, -30.4]) {
    const board = plane(2.2, 1.6, new THREE.MeshStandardMaterial({ map: shutterTexture(41 + bx), color: "#8a6a4a", roughness: 0.9 }));
    board.position.set(bx, 1.9, S.maxZ + 0.02);
    scene.add(board);
  }
  const safehouseTag = plane(3.2, 1.6, new THREE.MeshStandardMaterial({ map: graffitiTexture(77), transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }));
  safehouseTag.position.set(-31.8, 3.2, S.maxZ + 0.03);
  scene.add(safehouseTag);
  const doorSign = plane(1.1, 0.35, unlit(signBoardTexture("NO. 12", "#101010", "#d6a742"), 1.2, false));
  doorSign.position.set((S.doorMinX + S.doorMaxX) / 2, 2.75, S.maxZ + 0.04);
  scene.add(doorSign);
  const doorPivot = new THREE.Group();
  doorPivot.position.set(S.doorMinX, 0.15, S.maxZ - 0.15);
  const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(S.doorMaxX - S.doorMinX, 2.25, 0.08), new THREE.MeshStandardMaterial({ color: "#4a2f22", roughness: 0.7 }));
  doorLeaf.position.set((S.doorMaxX - S.doorMinX) / 2, 1.125, 0);
  doorLeaf.castShadow = true;
  doorPivot.add(doorLeaf);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshStandardMaterial({ color: "#c9a24a", metalness: 1, roughness: 0.3 }));
  knob.position.set(S.doorMaxX - S.doorMinX - 0.15, 1.05, 0.06);
  doorPivot.add(knob);
  scene.add(doorPivot);
  collision.add(S.doorMinX, S.doorMaxX, S.maxZ - wallT, S.maxZ, "safehouse-door");
  let doorTarget = 0;
  animated.push((delta) => {
    doorPivot.rotation.y += (doorTarget - doorPivot.rotation.y) * Math.min(1, delta * 4);
  });

  // Furniture
  const fabric = new THREE.TextureLoader().load("/demo/assets/fabric.jpg");
  fabric.colorSpace = THREE.SRGBColorSpace;
  fabric.wrapS = fabric.wrapT = THREE.RepeatWrapping;
  const furniture = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, solid = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (solid) collision.addCentered(x, z, w + 0.1, d + 0.1);
    return mesh;
  };
  const darkWood = new THREE.MeshStandardMaterial({ color: "#2a1d15", roughness: 0.6 });
  const metalDark = new THREE.MeshStandardMaterial({ color: "#1a1b1e", roughness: 0.4, metalness: 0.6 });
  // Bed
  furniture(2.2, 0.35, 2.9, darkWood, -32.7, 0.15, -7.0);
  furniture(2.1, 0.28, 2.8, new THREE.MeshStandardMaterial({ map: fabric, roughness: 0.95 }), -32.7, 0.5, -7.0, false);
  furniture(1.6, 0.18, 0.5, new THREE.MeshStandardMaterial({ color: "#d9d2c3", roughness: 0.9 }), -32.7, 0.78, -8.15, false);
  // Rug
  const rug = plane(3.4, 2.4, new THREE.MeshStandardMaterial({ map: fabric, color: "#7a2a2a", roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-30, 0.16, -4);
  scene.add(rug);
  // Desk, laptop, phone
  furniture(2.4, 0.08, 1.0, darkWood, -27.2, 0.85, -8.35, false);
  for (const lx of [-28.3, -26.1]) furniture(0.08, 0.85, 0.9, metalDark, lx, 0.15, -8.35, false);
  collision.addCentered(-27.2, -8.35, 2.5, 1.1);
  const laptop = furniture(0.55, 0.03, 0.38, metalDark, -27.7, 1.0, -8.4, false);
  const laptopScreen = plane(0.55, 0.36, unlit(screenTexture(["PRICES  ▲▼", "WEED   $58", "COKE  $171", "MOLLY $133"], "#29ff8a"), 1.3, false));
  laptopScreen.position.set(-27.7, 1.22, -8.6);
  laptopScreen.rotation.x = -0.25;
  scene.add(laptopScreen);
  void laptop;
  const phone = furniture(0.16, 0.02, 0.3, new THREE.MeshStandardMaterial({ color: "#0c0c0e", roughness: 0.3 }), -26.6, 0.94, -8.2, false);
  const phoneScreen = plane(0.13, 0.26, unlit(screenTexture(["1 NEW", "WORD"], "#ffd23a"), 2.2, false));
  phoneScreen.rotation.x = -Math.PI / 2;
  phoneScreen.position.set(-26.6, 0.962, -8.2);
  scene.add(phoneScreen);
  void phone;
  // Chair
  furniture(0.55, 0.06, 0.55, metalDark, -27.2, 0.5, -7.55, false);
  furniture(0.55, 0.6, 0.06, metalDark, -27.2, 0.56, -7.27, false);
  // Dresser + boxes
  furniture(1.6, 1.1, 0.6, darkWood, -25.9, 0.15, -5.0);
  furniture(0.6, 0.35, 0.4, new THREE.MeshStandardMaterial({ color: "#c84a2a" }), -25.9, 1.25, -5.0, false);
  furniture(0.9, 0.6, 0.6, new THREE.MeshStandardMaterial({ color: "#6a5a40", roughness: 0.9 }), -34.0, 0.15, -2.0);
  furniture(0.9, 0.4, 0.6, new THREE.MeshStandardMaterial({ color: "#5a4a34", roughness: 0.9 }), -34.0, 0.75, -2.0, false);
  // Posters
  const plan = plane(1.1, 1.4, new THREE.MeshStandardMaterial({ map: paperTexture(["THE PLAN", "1. LEARN", "2. WATCH", "3. MOVE", "4. BUILD", "5. ELEVATE"], { size: 58 }), roughness: 0.9 }));
  plan.position.set(-29.6, 2.1, S.minZ + 0.02);
  scene.add(plan);
  const motto = plane(1.2, 1.5, new THREE.MeshStandardMaterial({ map: paperTexture(["DISCIPLINE", "FOCUS", "EXECUTE", "FREEDOM"], { background: "#141414", color: "#d6a742", size: 70 }), roughness: 0.9 }));
  motto.position.set(S.minX + 0.02, 2.1, -5.2);
  motto.rotation.y = Math.PI / 2;
  scene.add(motto);
  // Window with the city view
  const cityView = new THREE.TextureLoader().load("/demo/assets/cityview.jpg");
  cityView.colorSpace = THREE.SRGBColorSpace;
  const viewMaterial = unlit(cityView, 1, false);
  viewMaterial.color.setRGB(0.16, 0.18, 0.34); // grade the daytime photo toward night
  const view = plane(2.4, 1.6, viewMaterial);
  view.position.set(-32.3, 2.2, S.minZ + 0.02);
  scene.add(view);
  const frameMaterial = new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.5 });
  for (const [w, h, x, y] of [[2.6, 0.1, -32.3, 1.35], [2.6, 0.1, -32.3, 3.0], [0.1, 1.7, -33.55, 1.35], [0.1, 1.7, -31.05, 1.35], [0.06, 1.7, -32.3, 1.35]] as number[][]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), frameMaterial);
    bar.position.set(x, y + h / 2, S.minZ + 0.06);
    scene.add(bar);
  }
  // Interior lights: warm lamp + cool screen spill
  const lampLight = new THREE.PointLight("#ffb46a", 9, 9, 1.6);
  lampLight.position.set(-30.5, 3.1, -4.5);
  lampLight.castShadow = highQuality;
  lampLight.shadow.mapSize.set(512, 512);
  scene.add(lampLight);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1.4), toneMapped: false }));
  bulb.position.copy(lampLight.position);
  scene.add(bulb);
  const screenLight = new THREE.PointLight("#3fffaa", 2.2, 3.5, 2);
  screenLight.position.set(-27.4, 1.5, -8.0);
  scene.add(screenLight);

  // ---------- Street lamps ----------
  const poolTexture = lightPoolTexture();
  const conesTexture = coneTexture();
  const poleMaterial = new THREE.MeshStandardMaterial({ color: "#16181b", roughness: 0.5, metalness: 0.7 });
  const practicalLights: THREE.PointLight[] = [];
  const lampXs: number[] = [];
  for (let x = -91; x <= 91; x += 15) lampXs.push(x);
  const lampPositions: THREE.Vector3[] = [];
  for (const x of lampXs) {
    for (const north of [true, false]) {
      const lx = north ? x : x + 7.5;
      const z = north ? L.northCurb - 0.5 : L.southCurb + 0.5;
      const dir = north ? 1 : -1;
      batch.add(new THREE.CylinderGeometry(0.09, 0.13, 6.2, 8), poleMaterial, new THREE.Matrix4().makeTranslation(lx, 3.1 + 0.15, z));
      batch.box(0.1, 0.1, 1.6, poleMaterial, lx, 6.15, z + dir * 0.75);
      batch.box(0.55, 0.16, 0.8, poleMaterial, lx, 6.05, z + dir * 1.45);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.9, 1.6), toneMapped: false }));
      head.position.set(lx, 6.02, z + dir * 1.45);
      scene.add(head);
      const pool = plane(7.5, 7.5, new THREE.MeshBasicMaterial({ map: poolTexture, color: "#ffb15a", transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(lx, 0.17, z + dir * 1.45);
      scene.add(pool);
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 2.4, 5.8, 20, 1, true), new THREE.MeshBasicMaterial({ map: conesTexture, color: "#ffb766", transparent: true, opacity: 0.055, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      cone.position.set(lx, 3.05, z + dir * 1.45);
      scene.add(cone);
      if (Math.abs(lx) < 45) {
        collision.addCentered(lx, z, 0.35, 0.35);
        lampPositions.push(new THREE.Vector3(lx, 5.6, z + dir * 1.45));
      }
    }
  }
  // Real point lights only near the playable block; the rest of the street is carried by emissive pools.
  for (const position of lampPositions.filter((_, index) => index % 2 === 0)) {
    const light = new THREE.PointLight("#ffa955", 26, 15, 1.7);
    light.position.copy(position);
    scene.add(light);
    practicalLights.push(light);
  }

  // ---------- Props ----------
  const addProp = (name: string, scale: number, x: number, z: number, yaw = 0, solid?: [number, number]) => {
    const prop = placeProp(props, name, scale, x, collision.groundHeight(x, z), z, yaw);
    if (prop) scene.add(prop);
    if (solid) collision.addCentered(x, z, solid[0], solid[1]);
    return prop;
  };
  addProp("detail_dumpster_closed", 2.6, -18.5, 1.2, Math.PI, [2.1, 1.6]);
  addProp("detail_dumpster_closed", 2.6, 4.5, 1.1, Math.PI, [2.1, 1.6]);
  addProp("detail_dumpster_closed", 2.6, 41.5, 16.9, 0, [2.1, 1.6]);
  addProp("detail_bench", 2.1, -3, 3.0, Math.PI, [1.7, 0.9]);
  addProp("detail_bench", 2.1, 15.5, 15.2, 0, [1.7, 0.9]);
  addProp("tree_shrub", 3, 9, 15.0);
  addProp("tree_shrub", 3, -38.5, 3.2);
  addProp("detail_bricks_type_a", 3, 2.2, 16.6, 0.4);
  addProp("detail_bricks_type_b", 3, -10.4, 1.0, 1.2);
  // Empty crates clue: a stack of pallets and crates on the south sidewalk.
  const crateMaterial = new THREE.MeshStandardMaterial({ color: "#7a5a36", roughness: 0.9 });
  const crateLabel = new THREE.MeshStandardMaterial({ map: paperTexture(["FRESH", "#0417"], { size: 90, width: 256, height: 256, background: "#e8e0c8" }), roughness: 0.9 });
  addProp("pallet", 2.6, -1.5, 16.7, 0.2, [2.8, 2.8]);
  for (const [cx, cy, cz, r] of [[-1.9, 0.55, 16.3, 0.1], [-0.9, 0.55, 16.9, -0.2], [-1.5, 1.35, 16.6, 0.3]] as number[][]) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.9), [crateMaterial, crateMaterial, crateMaterial, crateMaterial, crateLabel, crateMaterial]);
    crate.position.set(cx, cy, cz);
    crate.rotation.y = r;
    crate.castShadow = crate.receiveShadow = true;
    scene.add(crate);
  }
  // Parked box trucks
  addProp("truck_grey", 3.3, -8, 12.6, Math.PI / 2, [5.4, 2.8]);
  addProp("truck_flat", 3.3, 33, 5.4, -Math.PI / 2, [5.4, 2.8]);
  // Road-work barriers close the block at both ends
  for (const x of [L.playableMinX - 0.8, L.playableMaxX + 0.8]) {
    for (let z = -0.2; z < 18.5; z += 2.1) addProp("detail_barrier_strong_damaged", 3, x, z, Math.PI / 2);
    collision.add(x - 0.6, x + 0.6, -2, 20);
    const sign = plane(3.4, 1, unlit(signBoardTexture("ROAD CLOSED", "#d07a12", "#141414"), 1.2, false));
    sign.position.set(x, 1.6, 9);
    sign.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(sign);
    const blinker = new THREE.Mesh(new THREE.SphereGeometry(0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.4, 0.2), toneMapped: false }));
    blinker.position.set(x, 1.2, 4.5);
    scene.add(blinker);
    animated.push((_d, t) => { blinker.visible = Math.sin(t * 5) > 0; });
  }
  // Overhead cables between facades
  for (let x = -40; x < 45; x += 13) {
    const cable = placeProp(props, "detail_cables_type_a", 1, x, 7.2 + random(), 9, Math.PI / 2);
    if (cable) {
      cable.scale.set(18.5, 6, 6);
      scene.add(cable);
    }
  }
  // Scaffolding on a south building
  for (let i = 0; i < 3; i++) for (let level = 0; level < 2; level++) addProp("scaffolding_structure", 2.6, -30 + i * 2.6, 19.5, 0)?.position.setY(level * 2.6);

  // Delivery board clue on the express-delivery storefront
  const board = plane(1.8, 1.2, new THREE.MeshStandardMaterial({
    map: paperTexture(["RUSH PICKUPS", "#1  8:40", "#2  9:15", "#3  9:30", "ADDED TODAY"], { background: "#202428", color: "#f2efe6", size: 50, width: 512, height: 360 }),
    emissive: "#222",
    roughness: 0.8,
  }));
  board.position.set(-7.2, 1.7, L.northFacade + 0.05);
  scene.add(board);

  // The Hub: big neon over the market storefront
  const hubNeon = plane(7, 1.75, unlit(neonTexture("THE HUB", "#ff2a3a", 1024, 256, "900 170px 'Arial Black', Impact, sans-serif"), 1.7));
  hubNeon.position.set(31.5, 5.6, L.southFacade - 0.1);
  hubNeon.rotation.y = Math.PI;
  scene.add(hubNeon);
  const hubSub = plane(4.2, 0.6, unlit(neonTexture("BUY · SELL · MOVE", "#ffd23a", 1024, 160, "900 92px 'Arial Black', Impact, sans-serif"), 2.2));
  hubSub.position.set(31.5, 4.6, L.southFacade - 0.1);
  hubSub.rotation.y = Math.PI;
  scene.add(hubSub);
  const hubLight = new THREE.PointLight("#ff3a3a", 18, 14, 1.6);
  hubLight.position.set(31.5, 4.2, 15.6);
  scene.add(hubLight);
  practicalLights.push(hubLight);
  animated.push((_d, t) => {
    (hubNeon.material as THREE.MeshBasicMaterial).color.setScalar(1.6 + Math.sin(t * 2) * 0.25);
  });

  // ---------- Distant skyline ----------
  const skyline = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: "#0d0f16", emissiveMap: facadeStyles[0].textures.emissive, emissive: new THREE.Color(0.9, 0.85, 0.8), roughness: 1 }), 140);
  const dummy = new THREE.Object3D();
  let skylineIndex = 0;
  for (let index = 0; index < 140; index++) {
    const angle = random() * Math.PI * 2;
    const distance = 130 + random() * 120;
    const x = Math.cos(angle) * distance;
    const z = 9 + Math.sin(angle) * distance;
    if (Math.abs(z - 9) < 40 && Math.abs(x) < 110) continue;
    const h = 20 + random() * 70;
    dummy.position.set(x, h / 2, z);
    dummy.scale.set(14 + random() * 20, h, 14 + random() * 20);
    dummy.rotation.y = random() * Math.PI;
    dummy.updateMatrix();
    skyline.setMatrixAt(skylineIndex++, dummy.matrix);
  }
  skyline.count = skylineIndex;
  scene.add(skyline);

  // ---------- Traffic ----------
  const cars: Array<{ group: THREE.Group; speed: number; lane: number; direction: number; base: number }> = [];
  const carColors = ["#7a0f16", "#1d2a44", "#cfcfcf", "#0f0f12", "#5a4a20", "#2c4a2e"];
  const tailMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.15, 0.15), toneMapped: false });
  const headMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.8, 3.2), toneMapped: false });
  const glassMaterial = new THREE.MeshStandardMaterial({ color: "#0a0d14", roughness: 0.1, metalness: 0.6 });
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: "#0b0b0b", roughness: 0.9 });
  const beamTexture = coneTexture();
  for (let index = 0; index < 4; index++) {
    const group = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color: carColors[index % carColors.length], roughness: 0.25, metalness: 0.6, envMapIntensity: 1.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.7, 1.85), paint);
    body.position.y = 0.6;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.55, 1.65), glassMaterial);
    cabin.position.set(-0.25, 1.22, 0);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 1.6), paint);
    roof.position.set(-0.3, 1.52, 0);
    group.add(body, cabin, roof);
    for (const [wx, wz] of [[1.4, 0.85], [-1.4, 0.85], [1.4, -0.85], [-1.4, -0.85]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 14), wheelMaterial);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.36, wz);
      group.add(wheel);
    }
    for (const side of [-0.65, 0.65]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.38), headMaterial);
      head.position.set(2.21, 0.72, side);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.4), tailMaterial);
      tail.position.set(-2.21, 0.72, side);
      group.add(head, tail);
    }
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4), new THREE.MeshBasicMaterial({ map: beamTexture, color: "#fff1d0", transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    beam.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    beam.position.set(6.6, -0.58 + 0.6, 0);
    group.add(beam);
    group.traverse((child) => { if ((child as THREE.Mesh).isMesh && child !== beam) child.castShadow = true; });
    const direction = index % 2 === 0 ? 1 : -1;
    const lane = direction === 1 ? 11.4 : 6.6;
    group.position.set(-90 + index * 47, 0, lane);
    group.rotation.y = direction === 1 ? 0 : Math.PI;
    scene.add(group);
    cars.push({ group, speed: 9 + random() * 4, lane, direction, base: 9 + random() * 4 });
  }
  animated.push((delta, _t, player) => {
    for (const car of cars) {
      // Yield to the player crossing in front.
      const ahead = (player.x - car.group.position.x) * car.direction;
      const inLane = Math.abs(player.z - car.lane) < 2.2;
      const target = inLane && ahead > 0 && ahead < 11 ? 0 : car.base;
      car.speed += (target - car.speed) * Math.min(1, delta * (target === 0 ? 3 : 0.8));
      car.group.position.x += car.speed * car.direction * delta;
      if (car.group.position.x > 100) car.group.position.x = -100;
      if (car.group.position.x < -100) car.group.position.x = 100;
    }
  });

  // ---------- Interaction markers ----------
  const markerMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.8, 0.4), transparent: true, opacity: 0.9, toneMapped: false });
  const makeMarker = (id: string, position: THREE.Vector3) => {
    const group = new THREE.Group();
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), markerMaterial);
    group.add(diamond);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.5, 0.3), transparent: true, opacity: 0.6, side: THREE.DoubleSide, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -position.y + collision.groundHeight(position.x, position.z) + 0.03;
    group.add(ring);
    group.position.copy(position);
    scene.add(group);
    markers.set(id, group);
    const phase = random() * 6;
    animated.push((_d, t) => {
      diamond.position.y = Math.sin(t * 2.4 + phase) * 0.08;
      diamond.rotation.y = t * 1.8;
      ring.scale.setScalar(1 + (Math.sin(t * 3 + phase) + 1) * 0.08);
    });
  };

  const anchors: WorldAnchors = {
    spawn: new THREE.Vector3(-30.5, 0.15, -6.2),
    spawnYaw: Math.PI * 0.85,
    phone: new THREE.Vector3(-26.6, 0.96, -8.2),
    door: new THREE.Vector3((S.doorMinX + S.doorMaxX) / 2, 0.15, S.maxZ - 0.9),
    outsideDoor: new THREE.Vector3((S.doorMinX + S.doorMaxX) / 2, 0.15, 1.6),
    deliveryBoard: new THREE.Vector3(-7.2, 0.15, 1.2),
    crates: new THREE.Vector3(-1.4, 0.15, 15.2),
    corner: new THREE.Vector3(18.5, 0.15, 2.6),
    ray: new THREE.Vector3(23.2, 0.15, 1.3),
    rayYaw: Math.PI * 1.15,
    hub: new THREE.Vector3(31.5, 0.15, 16.3),
    loiterers: [
      { position: new THREE.Vector3(19.6, 0.15, 1.0), yaw: Math.PI * 0.9 },
      { position: new THREE.Vector3(17.4, 0.15, 1.2), yaw: Math.PI * 0.6 },
      { position: new THREE.Vector3(29.5, 0.15, 17.0), yaw: -0.3 },
    ],
    walkLanes: [2.4, 15.8],
  };
  makeMarker("phone", new THREE.Vector3(-26.6, 1.35, -8.2));
  makeMarker("door", new THREE.Vector3(anchors.door.x, 2.0, S.maxZ - 0.5));
  makeMarker("deliveryBoard", new THREE.Vector3(-7.2, 2.7, 0.6));
  makeMarker("crates", new THREE.Vector3(-1.4, 2.2, 16.5));
  makeMarker("corner", new THREE.Vector3(18.5, 2.4, 1.6));
  makeMarker("ray", new THREE.Vector3(23.2, 2.35, 1.3));
  makeMarker("hub", new THREE.Vector3(31.5, 2.6, 17.2));

  // Static geometry batches
  batch.flush(scene, { castShadow: highQuality, receiveShadow: true });

  return {
    collision,
    anchors,
    update(delta, elapsed, playerPosition) {
      for (const tick of animated) tick(delta, elapsed, playerPosition);
    },
    openDoor() {
      doorTarget = -Math.PI * 0.55;
      collision.remove("safehouse-door");
    },
    setPhoneHighlight(on) {
      (phoneScreen.material as THREE.MeshBasicMaterial).color.setScalar(on ? 2.6 : 1);
    },
    setMarkerVisible(id, visible) {
      const marker = markers.get(id);
      if (marker) marker.visible = visible;
    },
    setReflections(on) {
      reflector.visible = on;
      roadUnderlay.visible = !on;
      roadMaterial.opacity = on ? 0.86 : 1;
    },
    setPracticalLights(on) {
      for (const light of practicalLights) light.visible = on;
    },
  };
}
