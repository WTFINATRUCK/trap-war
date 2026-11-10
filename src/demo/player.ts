import * as THREE from "three";
import type { Character } from "./characters";
import type { Collision } from "./collision";
import type { Input } from "./input";
import { LAYOUT } from "./world";

const WALK_SPEED = 2.6;
const SPRINT_SPEED = 5.2;
const RADIUS = 0.34;

/** Third-person controller: camera-relative movement, smoothed facing, collision, and an over-the-shoulder camera. */
export class Player {
  readonly position = new THREE.Vector3();
  yaw = 0;
  cameraYaw = 0;
  cameraPitch = 0.28;
  frozen = false;
  private velocity = new THREE.Vector2();
  private cameraDistance = 4.6;
  private focus: THREE.Vector3 | null = null;
  private stepTimer = 0;

  constructor(
    readonly character: Character,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly collision: Collision,
    private readonly onStep: () => void,
  ) {}

  place(position: THREE.Vector3, yaw: number): void {
    this.position.copy(position);
    this.yaw = yaw;
    this.cameraYaw = yaw + Math.PI;
    this.velocity.set(0, 0);
    this.snapCamera();
  }

  /** Points the camera at a world position (dialogue, market) until cleared. */
  setFocus(target: THREE.Vector3 | null): void {
    this.focus = target ? target.clone() : null;
  }

  faceTowards(target: THREE.Vector3): void {
    this.yaw = Math.atan2(target.x - this.position.x, target.z - this.position.z);
  }

  get indoors(): boolean {
    const S = LAYOUT.safehouse;
    return this.position.x > S.minX && this.position.x < S.maxX && this.position.z > S.minZ && this.position.z < S.maxZ - 0.1;
  }

  update(delta: number, input: Input): void {
    const look = input.takeLook();
    this.cameraYaw -= look.x * 0.0042;
    this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch + look.y * 0.0032, -0.15, 0.95);

    const moving = !this.frozen && (input.move.x !== 0 || input.move.y !== 0);
    const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED;
    const target = new THREE.Vector2();
    if (moving) {
      const forward = new THREE.Vector2(-Math.sin(this.cameraYaw), -Math.cos(this.cameraYaw));
      const right = new THREE.Vector2(-forward.y, forward.x);
      target.addScaledVector(forward, -input.move.y).addScaledVector(right, input.move.x);
      const magnitude = Math.min(1, target.length());
      target.normalize().multiplyScalar(speed * magnitude);
    }
    this.velocity.lerp(target, 1 - Math.exp(-delta * 10));
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.y * delta;
    this.collision.resolve(this.position, RADIUS);
    const ground = this.collision.groundHeight(this.position.x, this.position.z);
    this.position.y += (ground - this.position.y) * Math.min(1, delta * 14);

    const planarSpeed = this.velocity.length();
    if (planarSpeed > 0.25) {
      const desired = Math.atan2(this.velocity.x, this.velocity.y);
      let difference = desired - this.yaw;
      difference = Math.atan2(Math.sin(difference), Math.cos(difference));
      this.yaw += difference * Math.min(1, delta * 12);
    }
    this.character.root.position.copy(this.position);
    this.character.root.rotation.y = this.yaw;
    if (planarSpeed > 0.35) {
      this.character.play("Walk");
      this.character.setTimeScale(planarSpeed > 3.4 ? 1.75 : planarSpeed / WALK_SPEED * 1.05);
      this.stepTimer -= delta * planarSpeed;
      if (this.stepTimer <= 0) {
        this.stepTimer = 1.25;
        this.onStep();
      }
    } else if (!this.frozen) {
      this.character.play("Idle");
    }
    this.character.update(delta);
    this.updateCamera(delta);
  }

  private desiredCamera(): { position: THREE.Vector3; target: THREE.Vector3 } {
    const indoors = this.indoors;
    const distance = indoors ? 3.4 : this.focus ? 3.3 : this.cameraDistance;
    const pivot = this.position.clone().add(new THREE.Vector3(0, 1.55, 0));
    let yaw = this.cameraYaw;
    if (this.focus) {
      // Over-the-shoulder framing on whatever we are focusing on.
      yaw = Math.atan2(this.position.x - this.focus.x, this.position.z - this.focus.z);
      this.cameraYaw += Math.atan2(Math.sin(yaw - this.cameraYaw), Math.cos(yaw - this.cameraYaw)) * 0.08;
      yaw = this.cameraYaw;
    }
    const pitch = indoors ? Math.min(this.cameraPitch, 0.4) : this.cameraPitch;
    const offset = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(distance);
    const shoulder = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(this.focus ? 0.55 : 0.35);
    const position = pivot.clone().add(offset).add(shoulder);
    if (indoors) position.y = Math.min(position.y, LAYOUT.safehouse.height - 0.25);
    const target = this.focus ? pivot.clone().lerp(this.focus.clone().setY(this.focus.y + 1.3), 0.5) : pivot.clone().add(shoulder);
    return { position, target };
  }

  private snapCamera(): void {
    const { position, target } = this.desiredCamera();
    this.camera.position.copy(position);
    this.camera.lookAt(target);
  }

  private updateCamera(delta: number): void {
    const { position, target } = this.desiredCamera();
    // Keep the camera out of buildings and walls: pull it in front of the first tall obstacle.
    const pivot = this.position.clone().add(new THREE.Vector3(0, 1.55, 0));
    const t = this.collision.clip(pivot, position);
    if (t < 1) {
      const direction = position.clone().sub(pivot);
      const length = direction.length();
      position.copy(pivot).addScaledVector(direction.normalize(), Math.max(0.5, t * length - 0.3));
    }
    const smoothing = 1 - Math.exp(-delta * 9);
    this.camera.position.lerp(position, smoothing);
    this.camera.lookAt(target);
  }
}
