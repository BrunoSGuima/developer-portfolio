/**
 * Decides when rendering is too slow to keep the 3D character. It is conservative on purpose: falling
 * back on capable hardware is worse than a slow moment, so only sustained slowness counts.
 */

/** Frames ignored after any start: shader compilation, loading and tab restoration all land here. */
const GRACE_FRAMES = 12;
/** A gap this long isn't slow rendering: a restored tab, a debugger, a sleeping laptop. */
const IGNORED_GAP_MS = 1000;
const WINDOW_FRAMES = 90;
/** About 12 frames per second. Judged by the median, so isolated spikes can't reach it. */
const SLOW_MEDIAN_MS = 80;
/** In a row, so about 14 s of animated time: rendering stops at rest, so this spans many trips. */
const SLOW_WINDOWS = 2;

export class SlowdownWatchdog {
  private grace = GRACE_FRAMES;
  private frames: number[] = [];
  private slowWindows = 0;

  /** Rendering is starting again after a pause: what comes next says nothing about the machine. */
  notePause() {
    this.grace = GRACE_FRAMES;
  }

  /** Records one animated frame's duration. True means it has been slow for long enough. */
  record(frameMs: number): boolean {
    if (frameMs >= IGNORED_GAP_MS) {
      this.notePause();
      return false;
    }
    if (this.grace > 0) {
      this.grace -= 1;
      return false;
    }
    this.frames.push(frameMs);
    if (this.frames.length < WINDOW_FRAMES) return false;
    const sorted = [...this.frames].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    this.frames = [];
    this.slowWindows = median >= SLOW_MEDIAN_MS ? this.slowWindows + 1 : 0;
    return this.slowWindows >= SLOW_WINDOWS;
  }
}
