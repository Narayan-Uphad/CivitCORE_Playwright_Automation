/**
 * Playwright's web-first `expect`, configured with the project's default
 * assertion timeout (Playwright Test default is 5 s; override with EXPECT_TIMEOUT_MS).
 * `@playwright/test`'s expect works outside the Playwright runner, so the exact
 * same matchers used in the original specs are used here.
 */
import { expect as baseExpect } from '@playwright/test';
import { config } from '../support/config';

export const expect = baseExpect.configure({ timeout: config.expectTimeoutMs });

/** Polling settings used by every `expect.poll(rows.count())` in the original specs. */
export const ROW_COUNT_POLL: { timeout: number; intervals: number[] } = { timeout: 30000, intervals: [500, 1000, 2000] };

/** Converts an optional "within N seconds" capture from a step into milliseconds. */
export function secondsToMs(seconds?: string | number | null): number | undefined {
  if (seconds === undefined || seconds === null || seconds === '') return undefined;
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid timeout "${seconds}" seconds.`);
  return value * 1000;
}

/** Escapes a literal string so it can be embedded safely in a RegExp. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
