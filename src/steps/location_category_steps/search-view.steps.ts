/**
 * Steps of location_category_search_view.feature (FRD 4, 6.1, 6.3, US-3 - Location Category Search / View).
 * Page object: LocationCategoryListPage.
 *
 * Differences of the MIDC build from the FRD, all handled here:
 *  - there is no single search box: the grid has floating filters for Location Category, Short Name and Prod Code.
 *    "the search box" means the Location Category filter, falling back to the Short Name filter when the text
 *    matches no Location Category (the FRD scenarios search by name and by short name with the same step);
 *    filters apply as you type, so "Search" / Enter changes nothing;
 *  - there is no View / Detail screen and the system-generated ID is never shown, so the scenarios that need
 *    either are skipped with that reason.
 */
import { Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { expect } from '../../utils/assertions';
import { NO_VIEW_SCREEN, requireFixture, returnToList, sameText, skipBecause, unreachable, uniqueShortName } from './helpers';

/** Applies the text to the Location Category filter, or to the Short Name filter when no category name contains it. */
async function search(world: CustomWorld, text: string): Promise<void> {
  const { list } = world.pages.locationCategory;
  await returnToList(world);
  // A short code (capitals, digits, no spaces) is looked up by Short Name first; anything else by name first.
  const columns: Array<'Location Category' | 'Short Name'> = /^[A-Z0-9][A-Z0-9&.-]*$/.test(text.trim())
    ? ['Short Name', 'Location Category']
    : ['Location Category', 'Short Name'];
  let column = columns[0];
  for (const candidate of columns) {
    column = candidate;
    await list.clearFilters();
    await list.filterBy(candidate, text);
    if ((await list.gridRows()).length > 0) break;
  }
  await list.useLargestPageSize();
  await list.expandAll();
  world.locationCategory.lastSearch = { text, column };
}

async function displayedNames(world: CustomWorld): Promise<string[]> {
  return (await world.pages.locationCategory.list.gridRows()).map((row) => row.name);
}

// ---------------------------------------------------------------------------
// Search (F_0009, F_0010, F_0012, F_0013, N_0004)
// ---------------------------------------------------------------------------

When(/^I enter "([^"]*)" in the search box$/, async function (this: CustomWorld, text: string) {
  await search(this, text);
});

When(/^I click Search(?: or press Enter)?$/, async function (this: CustomWorld) {
  // The filters apply as the text is typed; Enter is pressed in the active filter for parity with the FRD.
  const last = this.locationCategory.lastSearch;
  const { list } = this.pages.locationCategory;
  await (last?.column === 'Short Name' ? list.shortNameFilter : list.nameFilter).press('Enter');
});

Then(
  /^the matching category "([^"]*)"(?: with Short Name "([^"]*)")? should be displayed in the results$/,
  async function (this: CustomWorld, frdName: string, shortName?: string) {
    const fixture = requireFixture(this, frdName);
    const rows = await this.pages.locationCategory.list.gridRows();
    const row = rows.find((candidate) => sameText(candidate.name, fixture.name));
    expect(row, `"${fixture.name}" is in the results: ${JSON.stringify(rows.map((r) => r.name))}`).toBeTruthy();
    if (shortName) expect(sameText(row!.shortName, uniqueShortName(this, shortName)), `Short Name "${row!.shortName}"`).toBe(true);
  },
);

Then(/^"([^"]*)" should be returned in the results$/, async function (this: CustomWorld, frdName: string) {
  const fixture = requireFixture(this, frdName);
  const names = await displayedNames(this);
  expect(names.some((name) => sameText(name, fixture.name)), `"${fixture.name}" is in the results: ${JSON.stringify(names)}`).toBe(true);
});

Then(/^the categories whose Parent Category is "([^"]*)" should be displayed$/, async function (this: CustomWorld, parentName: string) {
  const names = await displayedNames(this);
  const children = this.locationCategory.fixtures().filter((fixture) => fixture.parentFrd && sameText(fixture.parentFrd, parentName));
  expect(children.length, `the scenario has children of "${parentName}"`).toBeGreaterThan(0);
  for (const child of children) {
    expect(names.some((name) => sameText(name, child.name)), `child "${child.name}" is displayed: ${JSON.stringify(names)}`).toBe(true);
  }
});

Then(/^the results should contain "([^"]*)" and "([^"]*)"$/, async function (this: CustomWorld, first: string, second: string) {
  const names = await displayedNames(this);
  for (const frdName of [first, second]) {
    expect(names.some((name) => sameText(name, requireFixture(this, frdName).name)), `"${frdName}" is in the results: ${JSON.stringify(names)}`).toBe(true);
  }
});

Then(/^no records should be displayed$/, async function (this: CustomWorld) {
  expect(await this.pages.locationCategory.list.gridRows()).toEqual([]);
});

Then(/^no error or exception should occur$/, async function (this: CustomWorld) {
  const { list } = this.pages.locationCategory;
  await list.expectUsable();
  expect(this.apiErrors, 'failed API calls').toEqual([]);
});

Then(/^an empty result indication should be shown$/, async function (this: CustomWorld) {
  await this.pages.locationCategory.list.expectEmptyState();
});

// ---------------------------------------------------------------------------
// ID search and Detail view (F_0011, F_0014 - F_0017, N_0027): not available on the MIDC build
// ---------------------------------------------------------------------------

When(/^I copy the Location Category ID of "([^"]*)" from its Detail view$/, function (this: CustomWorld, _value1: string) {
  return skipBecause(this, NO_VIEW_SCREEN);
});

When(/^I select the category "([^"]*)" from the list using the View action$/, function (this: CustomWorld, _value1: string) {
  return skipBecause(this, NO_VIEW_SCREEN);
});

When(/^I select "([^"]*)" from the list$/, function (this: CustomWorld, _value1: string) {
  return skipBecause(this, NO_VIEW_SCREEN);
});

When(/^I open the Detail view of "([^"]*)"$/, function (this: CustomWorld, _value1: string) {
  return skipBecause(this, NO_VIEW_SCREEN);
});

When(/^I paste the ID in the search box and search$/, function () {
  unreachable('I paste the ID in the search box and search');
});

Then(/^exactly the category with that ID, "([^"]*)", should be displayed$/, function (_value1: string) {
  unreachable('exactly the category with that ID should be displayed');
});

Then(/^the Detail view should display the system-generated Location Category ID$/, function () {
  unreachable('the Detail view should display the system-generated Location Category ID');
});

Then(/^the Detail view should display Location Category Name "([^"]*)"$/, function (_value1: string) {
  unreachable('the Detail view should display Location Category Name');
});

Then(/^the Detail view should display Short Name "([^"]*)"$/, function (_value1: string) {
  unreachable('the Detail view should display Short Name');
});

Then(/^the Detail view should display Parent Category "([^"]*)"$/, function (_value1: string) {
  unreachable('the Detail view should display Parent Category');
});

Then(/^the Parent Category should be shown as blank or None$/, function () {
  unreachable('the Parent Category should be shown as blank or None');
});

Then(/^the Location Category ID should be displayed$/, function () {
  unreachable('the Location Category ID should be displayed');
});

Then(/^the Location Category Name "([^"]*)" should be displayed$/, function (_value1: string) {
  unreachable('the Location Category Name should be displayed');
});

Then(/^the Short Name "([^"]*)" should be displayed$/, function (_value1: string) {
  unreachable('the Short Name should be displayed');
});

When(/^I click Back or Close$/, function () {
  unreachable('I click Back or Close');
});

Then(/^I should be returned to the Location Category List$/, function () {
  unreachable('I should be returned to the Location Category List');
});

When(/^I observe the available actions$/, function () {
  unreachable('I observe the available actions');
});

Then(/^the "Edit" and "Delete" actions should not be displayed$/, function () {
  unreachable('the "Edit" and "Delete" actions should not be displayed');
});

Then(/^the Detail fields should be viewable$/, function () {
  unreachable('the Detail fields should be viewable');
});
