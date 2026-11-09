const FIXED_DT = 1 / 60;
const MAX_STEPS = 4;

export class SimulationLoop {
  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private running = false;
  private onStep: (dt: number) => void;
  private onRender: (alpha: number) => void;

  constructor(onStep: (dt: number) => void, onRender: (alpha: number) => void) {
    this.onStep = onStep;
    this.onRender = onRender;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop = (now: number) => {
    if (!this.running) return;

    const elapsed = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Clamp accumulator to prevent spiral-of-death on tab resume
    this.accumulator = Math.min(this.accumulator + elapsed, MAX_STEPS * FIXED_DT);

    while (this.accumulator >= FIXED_DT) {
      this.onStep(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    // Interpolation alpha for smooth rendering between physics steps
    const alpha = this.accumulator / FIXED_DT;
    this.onRender(alpha);

    this.rafId = requestAnimationFrame(this.loop);
  };
}
