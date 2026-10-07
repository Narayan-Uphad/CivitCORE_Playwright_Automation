/**
 * Steps of designation_list_search_view.feature (FRD 6.3 - Designation View / Search).
 * Page object: DesignationListPage.
 * Shared steps (creating a Designation, "is visible in the Designation List") are in ./common.steps.ts.
 */
import { Given, Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { expect } from '../../utils/assertions';
import { designationColumnHeaders, normalizeDesignationText } from '../../test-data/designation.data';
import { ensureDesignation, ensureOnDesignationScreen, requireTarget, returnToList } from './helpers';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

Given(/^the Designation List has at least one Designation record$/, async function (this: CustomWorld) {
  await ensureOnDesignationScreen(this);
  expect(this.pages.designation.api.records().length).toBeGreaterThan(0);
});

Given(/^a Designation named "([^"]*)" exists$/, async function (this: CustomWorld, name: string) {
  await ensureDesignation(this, name);
  this.designation.searchColumn = 'Designation Name';
});

Given(
  /^an existing Designation "([^"]*)" - "([^"]*)" with Reporting To "([^"]*)" is available$/,
  async function (this: CustomWorld, abbreviation: string, name: string, parentName: string) {
    const parent = await ensureDesignation(this, parentName, { asTarget: false });
    await ensureDesignation(this, name, { abbreviation, parent });
  },
);

Given(/^multiple Designations exist including one with Abbreviation "([^"]*)"$/, async function (
  this: CustomWorld,
  abbreviation: string,
) {
  await ensureDesignation(this, `${abbreviation} Designation`, { abbreviation });
  expect(this.pages.designation.api.records().length, 'Designations in the master').toBeGreaterThan(1);
  this.designation.searchColumn = 'Short Name';
});

Given(/^the Designation List contains existing records none of which match the search text$/, async function (
  this: CustomWorld,
) {
  await ensureOnDesignationScreen(this);
  expect(this.pages.designation.api.records().length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

// Search text is used literally: it is a partial match, not one of the scenario's own records.
When(/^the user enters "([^"]*)" in the Designation List search field$/, async function (this: CustomWorld, text: string) {
  await returnToList(this);
  await this.pages.designation.list.filterBy(this.designation.searchColumn, text);
});

Then(
  /^the Designation List filters to show (?:only )?Designations whose (Abbreviation|name) contains "([^"]*)" regardless of case$/,
  async function (this: CustomWorld, column: string, text: string) {
    const { rows, unrelated } = await this.pages.designation.list.unrelatedRows(column as 'Abbreviation' | 'name', text);
    expect(rows.length, `rows matching "${text}"`).toBeGreaterThan(0);
    // Tree ancestors / descendants of a match are shown for context and are not matches themselves.
    expect(unrelated, `rows whose ${column} does not contain "${text}"`).toEqual([]);
  },
);

Then(/^the Designation List displays an empty\/no-records state$/, async function (this: CustomWorld) {
  await this.pages.designation.list.expectEmptyState();
});

Then(/^no error message or application crash occurs$/, async function (this: CustomWorld) {
  await this.pages.designation.list.expectUsable();
  expect(this.apiErrors, 'no failing API calls were recorded').toEqual([]);
  expect(this.seenToasts, 'no error toaster was shown').toEqual([]);
});

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

Then(/^the list displays "(.*)" columns$/, async function (this: CustomWorld, columnList: string) {
  const list = this.pages.designation.list;
  const columns = columnList
    .split(/",\s*"|"\s+and\s+"/)
    .map((column) => column.replace(/"/g, '').trim())
    .filter(Boolean);
  const missing: string[] = [];
  for (const column of columns) {
    const header = designationColumnHeaders[column] ?? column;
    if (!(await list.columnHeader(header).isVisible())) missing.push(column);
  }
  expect(missing, `columns shown: [${(await list.columnHeaderTexts()).join(', ')}]`).toEqual([]);
});

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

When(/^the user selects "([^"]*)" - "([^"]*)" in the Designation List$/, async function (
  this: CustomWorld,
  abbreviation: string,
  name: string,
) {
  const fixture = this.designation.fixture(name) ?? this.designation.fixture(abbreviation);
  if (!fixture) throw new Error(`"${abbreviation} - ${name}" was not created by an earlier step.`);
  this.designation.target = fixture;
  await returnToList(this);
  await this.pages.designation.list.showRow(fixture.name);
});

When(/^the user clicks "View"$/, async function (this: CustomWorld) {
  await this.pages.designation.list.chooseRowAction(requireTarget(this).name, 'View');
});

Then(
  /^the view screen displays Designation ID, Abbreviation "([^"]*)", Designation Name "([^"]*)" and Reporting To "([^"]*)" correctly$/,
  async function (this: CustomWorld, abbreviation: string, name: string, parentName: string) {
    const target = requireTarget(this);
    const parent = this.designation.fixture(parentName);
    await this.pages.designation.list.expectViewShows([
      String(target.id),
      this.designation.data.abbreviation(abbreviation).trim(),
      target.name,
      parent?.name ?? parentName,
    ]);
    expect(normalizeDesignationText(target.name)).toBe(normalizeDesignationText(this.designation.data.name(name)));
  },
);
