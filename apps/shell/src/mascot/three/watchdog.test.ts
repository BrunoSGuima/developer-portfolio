import { describe, expect, it } from 'vitest';
import { SlowdownWatchdog } from './watchdog.ts';

const GRACE = 12;
const WINDOW = 90;

function feed(watchdog: SlowdownWatchdog, frameMs: number, count: number) {
  let tripped = false;
  for (let i = 0; i < count; i += 1) tripped = watchdog.record(frameMs) || tripped;
  return tripped;
}

describe('SlowdownWatchdog', () => {
  it('stays quiet on a healthy machine, however long it runs', () => {
    expect(feed(new SlowdownWatchdog(), 16, 100_000)).toBe(false);
  });

  it('trips on sustained slowness, and only after two slow windows', () => {
    const watchdog = new SlowdownWatchdog();
    expect(feed(watchdog, 100, GRACE + WINDOW)).toBe(false);
    expect(feed(watchdog, 100, WINDOW - 1)).toBe(false);
    expect(feed(watchdog, 100, 1)).toBe(true);
  });

  it('that takes at least 14 s of animated time at its threshold', () => {
    const framesToTrip = GRACE + WINDOW * 2;
    expect((WINDOW * 2 * 80) / 1000).toBeGreaterThanOrEqual(14);
    expect(feed(new SlowdownWatchdog(), 80, framesToTrip)).toBe(true);
  });

  it('ignores slow frames at the start: shader compilation and loading', () => {
    const watchdog = new SlowdownWatchdog();
    feed(watchdog, 900, GRACE);
    expect(feed(watchdog, 16, WINDOW * 5)).toBe(false);
  });

  it('isolated spikes cannot trip it, even very frequent ones', () => {
    const watchdog = new SlowdownWatchdog();
    feed(watchdog, 16, GRACE);
    for (let i = 0; i < 5000; i += 1) {
      expect(watchdog.record(i % 3 === 0 ? 800 : 16)).toBe(false);
    }
  });

  it('ignores a gap of a second or more: a restored tab or a sleeping laptop', () => {
    const watchdog = new SlowdownWatchdog();
    feed(watchdog, 16, GRACE);
    expect(feed(watchdog, 60_000, 500)).toBe(false);
  });

  it('gives a new grace after a gap: the frames right after a restored tab do not count', () => {
    const watchdog = new SlowdownWatchdog();
    feed(watchdog, 16, GRACE);
    feed(watchdog, 100, WINDOW);
    watchdog.record(5000);
    // Grace again, so one more slow window's worth is not yet enough to finish it
    expect(feed(watchdog, 100, GRACE + WINDOW - 1)).toBe(false);
    expect(feed(watchdog, 100, 1)).toBe(true);
  });

  it('a good window in between clears the count', () => {
    const watchdog = new SlowdownWatchdog();
    feed(watchdog, 16, GRACE);
    expect(feed(watchdog, 100, WINDOW)).toBe(false);
    expect(feed(watchdog, 16, WINDOW)).toBe(false);
    expect(feed(watchdog, 100, WINDOW)).toBe(false);
  });

  it('a pause in rendering gives a new grace: starting a trip after rest does not count', () => {
    const watchdog = new SlowdownWatchdog();
    feed(watchdog, 16, GRACE);
    for (let trip = 0; trip < 200; trip += 1) {
      watchdog.notePause();
      expect(feed(watchdog, 500, GRACE)).toBe(false);
      expect(feed(watchdog, 16, 40)).toBe(false);
    }
  });

  it('a slow machine is still judged across many short trips', () => {
    const watchdog = new SlowdownWatchdog();
    let tripped = false;
    for (let trip = 0; trip < 50 && !tripped; trip += 1) {
      watchdog.notePause();
      tripped = feed(watchdog, 120, GRACE + 30);
    }
    expect(tripped).toBe(true);
  });
});
