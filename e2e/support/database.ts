import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from '@playwright/test';

const API = fileURLToPath(new URL('../../services/api/', import.meta.url));
const QUERY = fileURLToPath(new URL('./contact_messages.rb', import.meta.url));

export interface StoredContactMessage {
  name: string;
  email: string;
  message: string;
  locale: string;
}

/** A marker unique to the current test, to put in a message and find it again. */
export function e2eMarker(): string {
  return `e2e-${test.info().testId}-${String(test.info().retry)}`;
}

/**
 * The contact messages the e2e API stored whose text contains `marker`, read straight from the
 * e2e database (portfolio_api_e2e) by a read-only Rails runner script that refuses any other
 * environment or database. For the serial real-API specs only (contact-api.spec.ts).
 */
export function storedContactMessages(marker: string): StoredContactMessage[] {
  const output = execFileSync('bin/rails', ['runner', QUERY, marker], {
    cwd: API,
    env: { ...process.env, RAILS_ENV: 'e2e' },
    encoding: 'utf8',
    timeout: 60_000,
  });
  return JSON.parse(output.trim().split('\n').at(-1) ?? '[]') as StoredContactMessage[];
}
