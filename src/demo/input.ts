/** Keyboard, mouse-drag look, and an on-screen joystick for touch devices. */
export class Input {
  readonly move = { x: 0, y: 0 };
  look = { x: 0, y: 0 };
  sprint = false;
  enabled = true;
  private readonly keys = new Set<string>();
  private readonly pressed = new Set<string>();
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private joystick = { active: false, id: -1, originX: 0, originY: 0, x: 0, y: 0 };
  private lookTouch = { id: -1, x: 0, y: 0 };
  readonly touch: boolean;

  constructor(private readonly surface: HTMLElement, private readonly stick: HTMLElement, private readonly knob: HTMLElement) {
    this.touch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    window.addEventListener("keydown", (event) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      this.keys.add(key);
      this.pressed.add(key);
      if (["tab", " ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
    });
    window.addEventListener("keyup", (event) => this.keys.delete(event.key.toLowerCase()));
    window.addEventListener("blur", () => this.keys.clear());

    surface.addEventListener("mousedown", (event) => {
      this.dragging = true;
      this.lastPointer = { x: event.clientX, y: event.clientY };
    });
    window.addEventListener("mouseup", () => { this.dragging = false; });
    window.addEventListener("mousemove", (event) => {
      if (!this.dragging) return;
      this.look.x += event.clientX - this.lastPointer.x;
      this.look.y += event.clientY - this.lastPointer.y;
      this.lastPointer = { x: event.clientX, y: event.clientY };
    });

    surface.addEventListener("touchstart", (event) => this.onTouchStart(event), { passive: false });
    surface.addEventListener("touchmove", (event) => this.onTouchMove(event), { passive: false });
    surface.addEventListener("touchend", (event) => this.onTouchEnd(event));
    surface.addEventListener("touchcancel", (event) => this.onTouchEnd(event));
  }

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    for (const touch of Array.from(event.changedTouches)) {
      if (touch.clientX < window.innerWidth * 0.45 && !this.joystick.active) {
        this.joystick = { active: true, id: touch.identifier, originX: touch.clientX, originY: touch.clientY, x: 0, y: 0 };
        this.stick.style.left = `${touch.clientX}px`;
        this.stick.style.top = `${touch.clientY}px`;
        this.stick.classList.add("active");
      } else if (this.lookTouch.id === -1) {
        this.lookTouch = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
      }
    }
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    for (const touch of Array.from(event.changedTouches)) {
      if (touch.identifier === this.joystick.id) {
        const dx = touch.clientX - this.joystick.originX;
        const dy = touch.clientY - this.joystick.originY;
        const length = Math.hypot(dx, dy);
        const radius = 52;
        const scale = length > radius ? radius / length : 1;
        this.joystick.x = (dx * scale) / radius;
        this.joystick.y = (dy * scale) / radius;
        this.knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
      } else if (touch.identifier === this.lookTouch.id) {
        this.look.x += (touch.clientX - this.lookTouch.x) * 1.4;
        this.look.y += (touch.clientY - this.lookTouch.y) * 1.4;
        this.lookTouch.x = touch.clientX;
        this.lookTouch.y = touch.clientY;
      }
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    for (const touch of Array.from(event.changedTouches)) {
      if (touch.identifier === this.joystick.id) {
        this.joystick = { active: false, id: -1, originX: 0, originY: 0, x: 0, y: 0 };
        this.knob.style.transform = "";
        this.stick.classList.remove("active");
      } else if (touch.identifier === this.lookTouch.id) {
        this.lookTouch.id = -1;
      }
    }
  }

  /** True once per key press. */
  consume(key: string): boolean {
    const hit = this.pressed.has(key);
    this.pressed.delete(key);
    return hit;
  }

  update(): void {
    let x = 0;
    let y = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) y -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) y += 1;
    if (this.keys.has("a")) x -= 1;
    if (this.keys.has("d")) x += 1;
    if (this.keys.has("arrowleft")) this.look.x -= 9;
    if (this.keys.has("arrowright")) this.look.x += 9;
    if (this.joystick.active) {
      x = this.joystick.x;
      y = this.joystick.y;
    }
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    this.move.x = this.enabled ? x : 0;
    this.move.y = this.enabled ? y : 0;
    this.sprint = this.keys.has("shift") || (this.joystick.active && Math.hypot(this.joystick.x, this.joystick.y) > 0.92);
  }

  takeLook(): { x: number; y: number } {
    const value = this.enabled ? this.look : { x: 0, y: 0 };
    this.look = { x: 0, y: 0 };
    return value;
  }

  clearPressed(): void {
    this.pressed.clear();
  }
}
