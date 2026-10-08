/**
 * Steps of location_category_hierarchy_list.feature (FRD 6.1 - Location Category List / Hierarchy).
 * Page object: LocationCategoryListPage. Shared steps (login, baseline data, "I am on the list") are in ./common.steps.ts.
 *
 * The live master has 23 real categories and none of the FRD baseline names, so "exactly the 8 master records" is
 * checked against this scenario's own copies: the grid is filtered by the scenario's unique suffix, which leaves
 * exactly those records on screen.
 */
import { Given, Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { expect } from '../../utils/assertions';
import { midcTestData } from '../../test-data/midc.data';
import { normalizeLocationCategoryText } from '../../test-data/location-category.data';
import { ensureBaseline, ensureLoggedIn, freshMaster, requireFixture, returnToList, sameText } from './helpers';

/** Filters the grid to this scenario's copies, expands the whole tree and returns what is displayed. */
async function showScenarioRecords(world: CustomWorld) {
  const { list } = world.pages.locationCategory;
  await returnToList(world);
  await list.filterBy('Location Category', world.locationCategory.data.suffix);
  await list.useLargestPageSize();
  await list.expandAll();
  return list.gridRows();
}

function splitNames(list: string): string[] {
  return list
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

/** The scenario's copies in the master. */
async function scenarioMaster(world: CustomWorld) {
  const fixtures = world.locationCategory.fixtures();
  const master = await freshMaster(world);
  return { fixtures, master, owned: master.filter((record) => fixtures.some((fixture) => fixture.id === record.id)) };
}

// ---------------------------------------------------------------------------
// Landing view (F_0001)
// ---------------------------------------------------------------------------

Given(/^the user has valid credentials and Location Category Management permission$/, async function (this: CustomWorld) {
  await ensureLoggedIn(this);
});

When(/^I navigate to "Location Category Management" from the left menu$/, async function (this: CustomWorld) {
  await this.pages.locationCategory.dismissOverlays();
  await this.pages.locationCategory.list.open(midcTestData.organizationName);
});

Then(/^the Location Category List \(Hierarchy\) page should be displayed by default as the landing view$/, async function (this: CustomWorld) {
  const { list } = this.pages.locationCategory;
  await list.expectUsable();
  for (const header of ['Location Category', 'Short Name', 'Hierarchy']) {
    await expect(list.columnHeader(header), `column "${header}" is shown`).toBeVisible();
  }
  await expect(list.addButton).toBeVisible();
});

Then(/^the categories available in the CivitCORE Location Category Master should be listed$/, async function (this: CustomWorld) {
  const { list } = this.pages.locationCategory;
  const master = await freshMaster(this);
  expect(master.length, 'the master has categories').toBeGreaterThan(0);
  expect((await list.pagingSummary()).total, 'the grid lists every master record').toBe(master.length);
});

// ---------------------------------------------------------------------------
// Hierarchy (F_0002, F_0003)
// ---------------------------------------------------------------------------

When(/^I expand the hierarchy "([^"]*)"$/, async function (this: CustomWorld, path: string) {
  await ensureBaseline(this);
  const rows = await showScenarioRecords(this);
  for (const name of path.split('>').map((part) => part.trim())) {
    expect(
      rows.some((row) => sameText(row.name, requireFixture(this, name).name)),
      `"${name}" is displayed`,
    ).toBe(true);
  }
});

When(/^I expand "([^"]*)" and observe its children$/, async function (this: CustomWorld, frdName: string) {
  requireFixture(this, frdName);
  await showScenarioRecords(this);
});

Then(/^each child category should be nested under its Parent Category exactly as stored$/, async function (this: CustomWorld) {
  const { list } = this.pages.locationCategory;
  const { master, owned } = await scenarioMaster(this);
  const displayed = await list.gridRows();
  for (const record of owned) {
    expect(
      displayed.some((candidate) => sameText(candidate.name, record.name)),
      `"${record.name}" is displayed`,
    ).toBe(true);
    const storedParent = record.parentId === null ? null : (master.find((candidate) => candidate.id === record.parentId)?.name ?? null);
    const shownParent = await list.parentOnScreen(record.name);
    expect(
      shownParent === null ? null : normalizeLocationCategoryText(shownParent),
      `"${record.name}" is drawn under its stored parent`,
    ).toBe(storedParent === null ? null : normalizeLocationCategoryText(storedParent));
  }
});

Then(/^"([^"]*)" should show both "([^"]*)" and "([^"]*)" as children$/, async function (this: CustomWorld, parentName: string, first: string, second: string) {
  const { list } = this.pages.locationCategory;
  const parent = requireFixture(this, parentName);
  for (const childName of [first, second]) {
    const shown = await list.parentOnScreen(requireFixture(this, childName).name);
    expect(sameText(shown ?? '', parent.name), `"${childName}" is drawn under "${parentName}"`).toBe(true);
  }
});

When(/^I identify the categories that have no Parent Category$/, async function (this: CustomWorld) {
  await ensureBaseline(this);
  await showScenarioRecords(this);
});

Then(
  /^"([^"]*)", "([^"]*)" and "([^"]*)" should appear at the top level \(L1\) of the hierarchy with no parent$/,
  async function (this: CustomWorld, first: string, second: string, third: string) {
    const { list } = this.pages.locationCategory;
    const { master } = await scenarioMaster(this);
    const displayed = await list.gridRows();
    for (const frdName of [first, second, third]) {
      const fixture = requireFixture(this, frdName);
      expect(master.find((record) => record.id === fixture.id)?.parentId, `"${frdName}" has no parent in the master`).toBeNull();
      const row = displayed.find((candidate) => sameText(candidate.name, fixture.name));
      expect(row?.level, `"${frdName}" is displayed at level 0 (L1)`).toBe(0);
    }
  },
);

// ---------------------------------------------------------------------------
// Only master categories are displayed (F_0004)
// ---------------------------------------------------------------------------

When(/^I note the total number of records in the Location Category Master via DB\/API$/, async function (this: CustomWorld) {
  await ensureBaseline(this);
  this.locationCategory.scratch.masterNames = (await scenarioMaster(this)).owned.map((record) => record.name);
});

When(/^I expand all nodes and count all displayed categories on the Location Category List$/, async function (this: CustomWorld) {
  this.locationCategory.scratch.displayedNames = (await showScenarioRecords(this)).map((row) => row.name);
});

When(/^I compare the master count and names with the displayed count and names$/, function (this: CustomWorld) {
  const { masterNames, displayedNames } = this.locationCategory.scratch as { masterNames?: string[]; displayedNames?: string[] };
  expect(masterNames, 'the master was read').toBeTruthy();
  expect(displayedNames, 'the list was read').toBeTruthy();
});

Then(/^the master count should be (\d+)$/, function (this: CustomWorld, count: string) {
  expect((this.locationCategory.scratch.masterNames as string[]).length).toBe(Number(count));
});

Then(/^the list should show exactly the (\d+) master records "([^"]*)"$/, function (this: CustomWorld, count: string, names: string) {
  const expected = splitNames(names);
  expect(expected).toHaveLength(Number(count));
  const displayed = (this.locationCategory.scratch.displayedNames as string[]).map(normalizeLocationCategoryText).sort();
  const wanted = expected.map((name) => normalizeLocationCategoryText(requireFixture(this, name).name)).sort();
  expect(displayed, 'the list shows exactly the master records').toEqual(wanted);
});

Then(/^no extra, missing or deleted categories should be displayed$/, function (this: CustomWorld) {
  const { masterNames, displayedNames } = this.locationCategory.scratch as { masterNames: string[]; displayedNames: string[] };
  const master = masterNames.map(normalizeLocationCategoryText);
  const displayed = displayedNames.map(normalizeLocationCategoryText);
  expect(displayed.filter((name) => !master.includes(name)), 'displayed but not in the master').toEqual([]);
  expect(master.filter((name) => !displayed.includes(name)), 'in the master but not displayed').toEqual([]);
});

// ---------------------------------------------------------------------------
// Pagination (F_0005)
// ---------------------------------------------------------------------------

Given(/^the page size is configured as (\d+)$/, async function (this: CustomWorld, size: string) {
  await returnToList(this);
  const configured = await this.pages.locationCategory.list.pageSize();
  if (configured !== Number(size)) {
    this.log(`Skipped: the page size is ${configured}, not ${size}.`);
    return 'skipped';
  }
  return undefined;
});

/**
 * The live master has 23 categories, so the scenario tops it up with unique filler categories (removed afterwards)
 * to reach 25; a master that is already larger cannot be reduced, so the scenario is skipped there.
 */
Given(/^the Location Category Master contains (\d+) Location Categories$/, async function (this: CustomWorld, count: string) {
  const wanted = Number(count);
  await returnToList(this);
  const { list, api } = this.pages.locationCategory;
  const current = (await list.pagingSummary()).total;
  if (current > wanted) {
    this.log(`Skipped: the master already holds ${current} categories (more than ${wanted}) and real data is never deleted.`);
    return 'skipped';
  }
  for (let index = current; index < wanted; index += 1) {
    const name = this.locationCategory.data.name(`Pagination Filler ${index + 1}`);
    const result = await api.create({
      catName: name,
      catShortName: this.locationCategory.data.shortName(`PF${index + 1}`),
      catCode: this.locationCategory.data.code(),
    });
    if (result.status >= 300) throw new Error(`Could not create filler category "${name}": ${result.status} ${result.message}`);
  }
  this.locationCategory.needsRefresh = true;
  await returnToList(this);
  expect((await list.pagingSummary()).total, 'the master now holds the wanted number of categories').toBe(wanted);
  return undefined;
});

async function recordPage(world: CustomWorld): Promise<void> {
  const { list } = world.pages.locationCategory;
  const pages = (world.locationCategory.scratch.pages ?? []) as string[][];
  pages.push((await list.gridRows()).map((row) => row.name));
  world.locationCategory.scratch.pages = pages;
}

Then(/^the first page should show (\d+) records$/, async function (this: CustomWorld, count: string) {
  const { list } = this.pages.locationCategory;
  await list.expandAll();
  expect(await list.dataRows.count(), 'rows on page 1').toBe(Number(count));
  this.locationCategory.scratch.pages = [];
  await recordPage(this);
});

Then(/^pagination controls should be visible$/, async function (this: CustomWorld) {
  const { list } = this.pages.locationCategory;
  await expect(list.pagingPanel).toBeVisible();
  await expect(list.nextPageButton).toBeVisible();
});

When(/^I click page (\d+)$/, async function (this: CustomWorld, page: string) {
  const { list } = this.pages.locationCategory;
  await list.goToNextPage();
  expect((await list.pagingSummary()).page).toBe(Number(page));
  await recordPage(this);
});

Then(/^the pagination controls should display (\d+) pages$/, async function (this: CustomWorld, pages: string) {
  expect((await this.pages.locationCategory.list.pagingSummary()).pages).toBe(Number(pages));
});

Then(/^pages (\d+), (\d+) and (\d+) should show (\d+), (\d+) and (\d+) records respectively$/, function (
  this: CustomWorld,
  _first: string,
  _second: string,
  _third: string,
  firstCount: string,
  secondCount: string,
  thirdCount: string,
) {
  const counts = [firstCount, secondCount, thirdCount].map(Number);
  const pages = this.locationCategory.scratch.pages as string[][];
  expect(pages.map((names) => names.length)).toEqual(counts);
});

Then(/^there should be no duplicate records across pages$/, function (this: CustomWorld) {
  const all = (this.locationCategory.scratch.pages as string[][]).flat();
  expect(all.length - new Set(all).size, 'duplicate rows across pages').toBe(0);
});
