import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

export type CharacterKind = "hero" | "ray" | "crowd_a" | "crowd_b" | "crowd_c";
export type AnimationName = "Idle" | "Walk" | "PickUp" | "Victory" | "Defeat" | "Punch";

const loader = new GLTFLoader();

export async function loadGltf(url: string): Promise<GLTF> {
  return loader.loadAsync(url);
}

/** A skinned character instance with simple cross-faded animation states. */
export class Character {
  readonly root = new THREE.Group();
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private current?: THREE.AnimationAction;
  private currentName = "";

  constructor(source: GLTF, tint?: Partial<Record<string, string>>, height = 1.8) {
    const model = cloneSkinned(source.scene);
    model.traverse((child) => {
      const mesh = child as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      const adopt = (material: THREE.Material) => {
        const copy = (material as THREE.MeshStandardMaterial).clone();
        const color = tint?.[copy.name];
        if (color) copy.color.set(color);
        copy.envMapIntensity = 0.6;
        return copy;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(adopt) : adopt(mesh.material);
    });
    // Normalize to a real-world height (the source rigs animate their own root scale, so scale the wrapper).
    const bounds = new THREE.Box3().setFromObject(model, true);
    const measured = bounds.max.y - bounds.min.y;
    if (measured > 0.1) model.scale.setScalar(height / measured);
    this.root.add(model);
    this.mixer = new THREE.AnimationMixer(model);
    for (const clip of source.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));
  }

  play(name: AnimationName, options: { fade?: number; timeScale?: number; once?: boolean } = {}): void {
    const action = this.actions.get(name);
    if (!action) return;
    action.timeScale = options.timeScale ?? 1;
    if (this.currentName === name && !options.once) return;
    action.reset();
    action.setLoop(options.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = !!options.once;
    action.enabled = true;
    action.play();
    if (this.current && this.current !== action) this.current.crossFadeTo(action, options.fade ?? 0.25, false);
    this.current = action;
    this.currentName = name;
  }

  setTimeScale(value: number): void {
    if (this.current) this.current.timeScale = value;
  }

  update(delta: number): void {
    this.mixer.update(delta);
  }
}

export interface CharacterLibrary {
  get(kind: CharacterKind): GLTF;
}

export async function loadCharacters(onProgress: (done: number, total: number) => void): Promise<CharacterLibrary> {
  const kinds: CharacterKind[] = ["hero", "ray", "crowd_a", "crowd_b", "crowd_c"];
  const loaded = new Map<CharacterKind, GLTF>();
  let done = 0;
  await Promise.all(kinds.map(async (kind) => {
    loaded.set(kind, await loadGltf(`/demo/assets/models/${kind}.glb`));
    onProgress(++done, kinds.length);
  }));
  return { get: (kind) => loaded.get(kind)! };
}

export async function loadProps(): Promise<Map<string, THREE.Object3D>> {
  const gltf = await loadGltf("/demo/assets/models/props.glb");
  const props = new Map<string, THREE.Object3D>();
  for (const child of gltf.scene.children) props.set(child.name.replace(/\.?\d{3}$/, ""), child);
  return props;
}
