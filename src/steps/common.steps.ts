/**
 * Generic steps: dynamic test data and page-level text/message assertions.
 */
import { DataTable, Given, Then } from '@cucumber/cucumber';
import type { CustomWorld } from '../support/world';
import { config } from '../support/config';
import { expect, secondsToMs } from '../utils/assertions';
import { TEST_DEPARTMENT_PATTERN } from '../test-data/department.data';

Given('the following unique test data is generated:', function (this: CustomWorld, table: DataTable) {
  for (const row of table.hashes()) {
    const alias = (row.alias ?? '').trim();
    const template = row.template ?? '';
    const rawMax = (row['max length'] ?? '').trim();
    const maxLength = rawMax === '' ? undefined : Number(rawMax);
    if (maxLength !== undefined && (!Number.isInteger(maxLength) || maxLength <= 0)) {
      throw new Error(`Invalid "max length" "${rawMax}" for alias "${alias}".`);
    }
    const value = this.testData.generate(alias, template, maxLength);
    this.log(`${alias} = ${value}`);
  }
});

Then('the value {string} matches the deletable test department pattern', function (this: CustomWorld, value: string) {
  expect(this.resolve(value)).toMatch(TEST_DEPARTMENT_PATTERN);
});

// page.getByText(text) — substring, case-sensitive-by-default string match (Playwright semantics).
// Toaster messages auto-dismiss after ~3 s, so a toast recorded earlier in the scenario also counts.
Then(/^the (?:text|message) "([^"]*)" is (?:visible|displayed)(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  text: string,
  seconds?: string,
) {
  const expected = this.resolve(text);
  const timeout = secondsToMs(seconds) ?? config.expectTimeoutMs;
  if (await this.sawMessage(expected, 0)) return;

  try {
    await expect(this.page.getByText(expected)).toBeVisible({ timeout });
  } catch (error) {
    if (await this.sawMessage(expected, 0)) return;
    this.log(`Messages observed in this scenario: ${JSON.stringify(this.seenToasts)}`);
    throw error;
  }
});

// page.getByText(text, { exact: true })
Then(/^the exact text "([^"]*)" is visible(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  text: string,
  seconds?: string,
) {
  await expect(this.page.getByText(this.resolve(text), { exact: true })).toBeVisible({ timeout: secondsToMs(seconds) });
});

Then(/^the page contains text matching "([^"]*)"(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  pattern: string,
  seconds?: string,
) {
  await expect(this.page.locator('body')).toContainText(new RegExp(pattern, 'i'), { timeout: secondsToMs(seconds) });
});
