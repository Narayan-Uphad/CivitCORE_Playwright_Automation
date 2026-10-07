/**
 * Department List search steps (search-department.spec.ts): column filters and row matching.
 */
import { Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../support/world';
import { expect, secondsToMs } from '../utils/assertions';

Then(/^the "([^"]*)" column filter is visible(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  columnName: string,
  seconds?: string,
) {
  await expect(this.pages.departmentListPage.columnFilter(columnName)).toBeVisible({
    timeout: secondsToMs(seconds),
  });
});

When('I filter the department grid by {string} with {string}', async function (
  this: CustomWorld,
  columnName: string,
  value: string,
) {
  await this.pages.departmentListPage.filterByColumn(columnName, this.resolve(value));
});

When('I clear the {string} column filter', async function (this: CustomWorld, columnName: string) {
  await this.pages.departmentListPage.filterByColumn(columnName, '');
});

Then('the {string} column filter is empty', async function (this: CustomWorld, columnName: string) {
  await expect(this.pages.departmentListPage.columnFilter(columnName)).toHaveValue('');
});

Then(/^a department row containing "([^"]*)" is visible(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  text: string,
  seconds?: string,
) {
  await expect(this.pages.departmentListPage.rowMatching(this.resolve(text))).toBeVisible({
    timeout: secondsToMs(seconds),
  });
});

Then('the department row containing {string} also contains {string}', async function (
  this: CustomWorld,
  rowText: string,
  expectedText: string,
) {
  const row = this.pages.departmentListPage.rowMatching(this.resolve(rowText));
  await expect(row).toContainText(new RegExp(this.resolve(expectedText), 'i'));
});

Then(/^the department grid shows more than (\d+) rows?$/, async function (this: CustomWorld, count: string) {
  await this.pages.departmentListPage.expectRowCountAbove(Number(count));
});