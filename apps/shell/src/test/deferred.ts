import { act } from '@testing-library/react';

/** A promise the test settles explicitly, to control timing in async lifecycle tests. */
export function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Settles a deferred (or other trigger) inside act(), then lets dependent promise callbacks run. */
export async function settle(trigger: () => void) {
  await act(async () => {
    trigger();
    await Promise.resolve();
  });
}
