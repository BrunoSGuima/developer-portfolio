/** The delay before the jump to the Fun Fact, counted from when the character has fully settled. */
export const JUMP_DELAY_MS = 5000;

/** A one-shot timer that can pause, for a hidden tab, and resume with the time it had left. */
export class JumpTimer {
  private readonly onFire: () => void;
  private readonly delay: number;
  private id: ReturnType<typeof setTimeout> | null = null;
  private remaining = 0;
  private startedAt = 0;
  private paused = false;

  constructor(onFire: () => void, delay = JUMP_DELAY_MS) {
    this.onFire = onFire;
    this.delay = delay;
  }

  get running() {
    return this.id !== null || this.paused;
  }

  /** Starts from the full delay, replacing any earlier run. */
  start() {
    this.cancel();
    this.remaining = this.delay;
    this.run();
  }

  cancel() {
    if (this.id !== null) clearTimeout(this.id);
    this.id = null;
    this.paused = false;
  }

  pause() {
    if (this.id === null) return;
    clearTimeout(this.id);
    this.id = null;
    this.remaining -= Date.now() - this.startedAt;
    this.paused = true;
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.run();
  }

  private run() {
    this.startedAt = Date.now();
    this.id = setTimeout(
      () => {
        this.id = null;
        this.onFire();
      },
      Math.max(0, this.remaining),
    );
  }
}
