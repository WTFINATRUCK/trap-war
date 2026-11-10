import * as THREE from "three";

export interface Box2 {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  id?: string;
  /** Tall boxes (buildings, walls) also block the camera. */
  tall?: boolean;
}

/** Flat 2D collision world: the player is a circle on the XZ plane, obstacles are axis-aligned boxes. */
export class Collision {
  readonly boxes: Box2[] = [];
  private readonly floors: Array<Box2 & { height: number }> = [];

  add(minX: number, maxX: number, minZ: number, maxZ: number, id?: string, tall = false): Box2 {
    const box = { minX: Math.min(minX, maxX), maxX: Math.max(minX, maxX), minZ: Math.min(minZ, maxZ), maxZ: Math.max(minZ, maxZ), id, tall };
    this.boxes.push(box);
    return box;
  }

  addCentered(x: number, z: number, width: number, depth: number, id?: string): Box2 {
    return this.add(x - width / 2, x + width / 2, z - depth / 2, z + depth / 2, id);
  }

  /**
   * Fraction (0..1) along the segment from -> to where it first enters a tall box, or 1 if it is clear.
   * Boxes that already contain the start point are ignored.
   */
  clip(from: THREE.Vector3, to: THREE.Vector3): number {
    let nearest = 1;
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    for (const box of this.boxes) {
      if (!box.tall) continue;
      if (from.x > box.minX && from.x < box.maxX && from.z > box.minZ && from.z < box.maxZ) continue;
      let tMin = 0;
      let tMax = 1;
      for (const [origin, delta, min, max] of [[from.x, dx, box.minX, box.maxX], [from.z, dz, box.minZ, box.maxZ]]) {
        if (Math.abs(delta) < 1e-9) {
          if (origin < min || origin > max) { tMin = 2; break; }
          continue;
        }
        let t1 = (min - origin) / delta;
        let t2 = (max - origin) / delta;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) { tMin = 2; break; }
      }
      if (tMin <= 1 && tMin < nearest) nearest = tMin;
    }
    return nearest;
  }

  remove(id: string): void {
    for (let index = this.boxes.length - 1; index >= 0; index--) if (this.boxes[index].id === id) this.boxes.splice(index, 1);
  }

  addFloor(minX: number, maxX: number, minZ: number, maxZ: number, height: number): void {
    this.floors.push({ minX, maxX, minZ, maxZ, height });
  }

  groundHeight(x: number, z: number): number {
    for (const floor of this.floors) if (x >= floor.minX && x <= floor.maxX && z >= floor.minZ && z <= floor.maxZ) return floor.height;
    return 0;
  }

  /** Pushes a circle out of every overlapping box. Runs a few passes so corners resolve cleanly. */
  resolve(position: THREE.Vector3, radius: number): void {
    for (let pass = 0; pass < 3; pass++) {
      for (const box of this.boxes) {
        const nearestX = Math.max(box.minX, Math.min(position.x, box.maxX));
        const nearestZ = Math.max(box.minZ, Math.min(position.z, box.maxZ));
        const dx = position.x - nearestX;
        const dz = position.z - nearestZ;
        const distanceSq = dx * dx + dz * dz;
        if (distanceSq >= radius * radius) continue;
        if (distanceSq > 1e-8) {
          const distance = Math.sqrt(distanceSq);
          position.x += (dx / distance) * (radius - distance);
          position.z += (dz / distance) * (radius - distance);
        } else {
          // Centre is inside the box: leave by the shortest side.
          const exits = [position.x - box.minX + radius, box.maxX - position.x + radius, position.z - box.minZ + radius, box.maxZ - position.z + radius];
          const shortest = exits.indexOf(Math.min(...exits));
          if (shortest === 0) position.x = box.minX - radius;
          else if (shortest === 1) position.x = box.maxX + radius;
          else if (shortest === 2) position.z = box.minZ - radius;
          else position.z = box.maxZ + radius;
        }
      }
    }
  }
}
