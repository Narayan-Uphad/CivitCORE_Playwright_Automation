/**
 * Department List (grid) steps: tab, headers, filter, rows, row actions, bulk selection.
 */
import { Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../support/world';
import { expect, secondsToMs } from '../utils/assertions';
import { TEST_DEPARTMENT_PATTERN } from '../test-data/department.data';

When(/^I open the Department tab(?: within (\d+) seconds)?$/, async function (this: CustomWorld, seconds?: string) {
  await this.pages.departmentListPage.openDepartmentTab(secondsToMs(seconds));
});

// getByRole('columnheader', { name: '<text>' }) — Playwright default: case-insensitive substring
Then(/^the "([^"]*)" column header is visible(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  name: string,
  seconds?: string,
) {
  await expect(this.pages.departmentListPage.columnHeader(name)).toBeVisible({ timeout: secondsToMs(seconds) });
});

// getByRole('columnheader', { name: /^<text>$/i })
Then(/^the column header exactly named "([^"]*)" is visible(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  name: string,
  seconds?: string,
) {
  await expect(this.pages.departmentListPage.columnHeader(new RegExp(`^${name}$`, 'i'))).toBeVisible({
    timeout: secondsToMs(seconds),
  });
});

Then(/^the department tree grid is visible(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  seconds?: string,
) {
  await expect(this.pages.departmentListPage.departmentGrid).toBeVisible({ timeout: secondsToMs(seconds) });
});

// Exact name match: getByRole('button', { name: 'Add Department', exact: true })
Then(/^the Add Department button is visible(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  seconds?: string,
) {
  await expect(this.pages.departmentListPage.addDepartmentButton).toBeVisible({ timeout: secondsToMs(seconds) });
});

// Non-exact name match: getByRole('button', { name: 'Add Department' })
Then(/^an Add Department button is visible(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  seconds?: string,
) {
  await expect(this.pages.departmentListPage.addDepartmentButtonAnyMatch).toBeVisible({ timeout: secondsToMs(seconds) });
});

// The grid's "Add Department" button and the dialog's submit button share the same name, so the
// open dialog decides which one the step means (open the form vs. submit it).
When('I click the Add Department button', async function (this: CustomWorld) {
  const dialogOpen = await this.pages.departmentDialog.dialog.isVisible().catch(() => false);
  if (dialogOpen) {
    await this.pages.departmentDialog.submitAddDepartmentButton.click();
    // The success toaster is transient, so it is recorded here for the assertion step that follows.
    await this.captureToast();
    return;
  }
  await this.pages.departmentListPage.addDepartmentButton.click();
});

Then(/^the department name filter is visible(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  seconds?: string,
) {
  await expect(this.pages.departmentListPage.departmentNameFilter).toBeVisible({ timeout: secondsToMs(seconds) });
});

When('I click the department name filter', async function (this: CustomWorld) {
  await this.pages.departmentListPage.departmentNameFilter.click();
});

When('I type {string} in the department name filter', async function (this: CustomWorld, value: string) {
  await this.pages.departmentListPage.departmentNameFilter.fill(this.resolve(value));
});

When('I filter the department grid by name {string}', async function (this: CustomWorld, value: string) {
  await this.pages.departmentListPage.filterByDepartmentName(this.resolve(value));
});

When('I clear the department name filter', async function (this: CustomWorld) {
  await this.pages.departmentListPage.departmentNameFilter.clear();
});

Then(/^a department grid cell containing "([^"]*)" is visible(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  text: string,
  seconds?: string,
) {
  await expect(this.pages.departmentListPage.gridCellContaining(this.resolve(text))).toBeVisible({
    timeout: secondsToMs(seconds),
  });
});

When('I click the department row named {string}', async function (this: CustomWorld, name: string) {
  await this.pages.departmentListPage.departmentRowCellNamed(this.resolve(name)).click();
});

Then(/^the department grid shows exactly (\d+) rows?$/, async function (this: CustomWorld, count: string) {
  await this.pages.departmentListPage.expectRowCount(Number(count));
});

Then('the first row department name matches the deletable test department pattern', async function (this: CustomWorld) {
  // Safety: never delete anything other than the department this test created.
  const visibleName = await this.pages.departmentListPage.firstRowDepartmentName();
  expect(visibleName).toMatch(TEST_DEPARTMENT_PATTERN);
});

Then('the first row department name equals {string} ignoring case', async function (this: CustomWorld, expected: string) {
  const visibleName = await this.pages.departmentListPage.firstRowDepartmentName();
  expect(visibleName.toLowerCase()).toBe(this.resolve(expected).toLowerCase());
});

Then(/^all (\d+) visible department names match the deletable test department pattern$/, async function (
  this: CustomWorld,
  count: string,
) {
  // Safety: never tick a checkbox unless every filtered row is a department this test created.
  const visibleNames = await this.pages.departmentListPage.visibleDepartmentNames();
  expect(visibleNames).toHaveLength(Number(count));
  visibleNames.forEach((name) => expect(name).toMatch(TEST_DEPARTMENT_PATTERN));
});

// toContainText(new RegExp(value, 'i')) exactly as in edit-department.spec.ts
Then('the first row contains {string} ignoring case', async function (this: CustomWorld, value: string) {
  await expect(this.pages.departmentListPage.dataRows.first()).toContainText(new RegExp(this.resolve(value), 'i'));
});

When('I open the row action menu of the first row', async function (this: CustomWorld) {
  const list = this.pages.departmentListPage;
  await list.rowActionButton(list.dataRows.first()).click();
});

When('I choose {string} from the row action menu', async function (this: CustomWorld, label: string) {
  const menuItem = this.pages.departmentListPage.rowMenuItem(label);
  await expect(menuItem).toBeVisible({ timeout: 20000 });
  await menuItem.click();
});

When(/^I select the checkboxes of the first (\d+) rows$/, async function (this: CustomWorld, count: string) {
  await this.pages.departmentListPage.selectFirstRows(Number(count));
});

Then(/^the Unselect All button is visible(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  seconds?: string,
) {
  // The bulk action toolbar only renders while rows are selected.
  await expect(this.pages.departmentListPage.unselectAllButton).toBeVisible({ timeout: secondsToMs(seconds) });
});

Then(/^the bulk Delete button is visible(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  seconds?: string,
) {
  await expect(this.pages.departmentListPage.bulkDeleteButton).toBeVisible({ timeout: secondsToMs(seconds) });
});

When('I click the bulk Delete button', async function (this: CustomWorld) {
  await this.pages.departmentListPage.bulkDeleteButton.click();
});

// Worst case: 20 s + 30 s + 20 s + 20 s + 30 s of waiting, so this step gets the original 240 s test budget.
Then(
  'no departments are listed for the filter {string}, even after re-applying the filter',
  { timeout: 240000 },
  async function (this: CustomWorld, filterValue: string) {
    await this.pages.departmentListPage.expectDepartmentsAbsent(this.resolve(filterValue));
  },
);

Then(/^no department rows containing "([^"]*)" are shown(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  text: string,
  seconds?: string,
) {
  await expect(this.pages.departmentListPage.rowsContaining(this.resolve(text))).toHaveCount(0, {
    timeout: secondsToMs(seconds),
  });
});

Then('the pagination summary is visible', async function (this: CustomWorld) {
  await expect(this.pages.departmentListPage.paginationSummary).toBeVisible();
});

Then('the first department row is visible', async function (this: CustomWorld) {
  await expect(this.pages.departmentListPage.nonEmptyRows.first()).toBeVisible();
});
