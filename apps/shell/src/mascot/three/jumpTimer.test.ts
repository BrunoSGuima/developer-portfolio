import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JUMP_DELAY_MS, JumpTimer } from './jumpTimer.ts';

describe('JumpTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits 5 seconds by default', () => {
    expect(JUMP_DELAY_MS).toBe(5000);
    const fire = vi.fn();
    new JumpTimer(fire).start();
    vi.advanceTimersByTime(4999);
    expect(fire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fire).toHaveBeenCalledOnce();
  });

  it('fires only once', () => {
    const fire = vi.fn();
    new JumpTimer(fire, 100).start();
    vi.advanceTimersByTime(1000);
    expect(fire).toHaveBeenCalledOnce();
  });

  it('cancel stops it', () => {
    const fire = vi.fn();
    const timer = new JumpTimer(fire, 100);
    timer.start();
    timer.cancel();
    vi.advanceTimersByTime(1000);
    expect(fire).not.toHaveBeenCalled();
    expect(timer.running).toBe(false);
  });

  it('starting again replaces the earlier run, never adding a second one', () => {
    const fire = vi.fn();
    const timer = new JumpTimer(fire, 100);
    timer.start();
    vi.advanceTimersByTime(60);
    timer.start();
    vi.advanceTimersByTime(60);
    expect(fire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(40);
    expect(fire).toHaveBeenCalledOnce();
  });

  it('pause keeps the time left, and resume continues from it', () => {
    const fire = vi.fn();
    const timer = new JumpTimer(fire, 100);
    timer.start();
    vi.advanceTimersByTime(60);
    timer.pause();
    expect(timer.running).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(fire).not.toHaveBeenCalled();
    timer.resume();
    vi.advanceTimersByTime(39);
    expect(fire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fire).toHaveBeenCalledOnce();
  });

  it('cancel while paused stays cancelled after resume', () => {
    const fire = vi.fn();
    const timer = new JumpTimer(fire, 100);
    timer.start();
    timer.pause();
    timer.cancel();
    timer.resume();
    vi.advanceTimersByTime(1000);
    expect(fire).not.toHaveBeenCalled();
  });

  it('reports not running once fired', () => {
    const timer = new JumpTimer(vi.fn(), 100);
    timer.start();
    expect(timer.running).toBe(true);
    vi.advanceTimersByTime(100);
    expect(timer.running).toBe(false);
  });
});
