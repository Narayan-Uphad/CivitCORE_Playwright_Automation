/**
 * Location Category steps shared by more than one feature file in features/location_category_features.
 * Cucumber step text is global, so a step used by several features is defined once, here; steps used by a
 * single feature live in that feature's own step file.
 *
 * Feature files use FRD vocabulary; location-category.data.ts maps it onto the MIDC build ("Location Category
 * Name" = "Location Category", "Parent Category" = "Nest Location Under" + lookup, "Save" = Add / Update
 * Location Category, "Cancel / Close" = Cancel). Every category a scenario uses is a unique copy of the FRD
 * baseline record (ensureCategory) that ./hooks.ts removes again.
 */
import { Given, Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { expect } from '../../utils/assertions';
import { locationCategoryMessagePattern } from '../../test-data/location-category.data';
import {
  describeOutcome,
  ensureBaseline,
  ensureCategory,
  ensureSession,
  expectMessage,
  expectNoCategoryNamed,
  expectSaveBlocked,
  logInAs,
  openAddForm,
  openEditFor,
  returnToList,
  submitForm,
  successfulSaveId,
  uniqueName,
  uniqueShortName,
} from './helpers';

// ---------------------------------------------------------------------------
// Session and navigation
// ---------------------------------------------------------------------------

Given(/^I am logged in as an? "([^"]*)" user(?: with .*)?$/, async function (this: CustomWorld, role: string) {
  this.locationCategory.scratch.role = role;
  return logInAs(this, role);
});

Given(/^I am logged in (?:to CivitCORE )?as "([^"]*)" with role "([^"]*)"(?: .*)?$/, async function (this: CustomWorld, _user: string, role: string) {
  this.locationCategory.scratch.role = role;
  return logInAs(this, role);
});

Given(/^I am authenticated as an? "([^"]*)" user$/, async function (this: CustomWorld, role: string) {
  const skipped = await logInAs(this, role);
  if (skipped) return skipped;
  await ensureSession(this);
  return undefined;
});

/**
 * "The baseline test data is loaded": the live master holds none of the FRD baseline names, so the scenario gets
 * its own copy of all eight (see data file). They are created now, before any form opens, so the Parent lookup of
 * a form opened later already offers them.
 */
Given(/^the baseline Location Category test data is loaded$/, async function (this: CustomWorld) {
  await ensureSession(this);
  await ensureBaseline(this);
});

Given(/^I am on the Location Category List(?: \(Hierarchy\))?(?: page)?$/, async function (this: CustomWorld) {
  await returnToList(this);
});

When(/^I open the Location Category List$/, async function (this: CustomWorld) {
  await returnToList(this);
});

When(/^I check the List$/, async function (this: CustomWorld) {
  await returnToList(this);
});

Given(/^an API\/request tool is available(?: to submit a tampered payload)?$/, async function (this: CustomWorld) {
  await ensureSession(this);
  expect(this.pages.locationCategory.api.hasSession(), 'an authenticated API session is available').toBe(true);
});

When(/^I check the (?:Location Category )?[Mm]aster$/, async function (this: CustomWorld) {
  this.locationCategory.scratch.masterAfter = await this.pages.locationCategory.api.fetchMaster();
});

// ---------------------------------------------------------------------------
// Add / Edit form
// ---------------------------------------------------------------------------

Given(/^the Add Location Category form is open$/, async function (this: CustomWorld) {
  await openAddForm(this);
});

When(/^I click "Add Location Category"$/, async function (this: CustomWorld) {
  await returnToList(this);
  await openAddForm(this);
});

When(/^I enter Location Category Name "([^"]*)"$/, async function (this: CustomWorld, value: string) {
  const typed = uniqueName(this, value);
  await this.pages.locationCategory.form.type('Location Category Name', typed);
  this.locationCategory.entered.name = typed;
});

When(/^I enter Short Name "([^"]*)"$/, async function (this: CustomWorld, value: string) {
  const typed = uniqueShortName(this, value);
  await this.pages.locationCategory.form.type('Short Name', typed);
  this.locationCategory.entered.shortName = typed;
});

When(/^I leave Location Category Name blank$/, async function (this: CustomWorld) {
  await this.pages.locationCategory.form.clear('Location Category Name');
  this.locationCategory.entered.name = '';
});

When(/^I leave Short Name blank$/, async function (this: CustomWorld) {
  await this.pages.locationCategory.form.clear('Short Name');
  this.locationCategory.entered.shortName = '';
});

When(/^I select Parent Category "([^"]*)"(?: from the dropdown)?$/, async function (this: CustomWorld, frdName: string) {
  // The lookup only lists records loaded with the list, so a category created after the form opened is not offered
  // (the baseline step creates every category before any form opens).
  const edited = this.locationCategory.target;
  const parent = await ensureCategory(this, frdName);
  // Choosing a parent does not change which category the scenario is about.
  this.locationCategory.target = edited ?? parent;
  await this.pages.locationCategory.form.selectParent(parent.name);
  this.locationCategory.entered.parentFrd = frdName;
  this.locationCategory.entered.parentName = parent.name;
});

When(/^I leave Parent Category unselected$/, async function (this: CustomWorld) {
  await this.pages.locationCategory.form.clearParent();
  this.locationCategory.entered.parentFrd = undefined;
});

When(/^I clear the Parent Category$/, async function (this: CustomWorld) {
  await this.pages.locationCategory.form.clearParent();
  this.locationCategory.entered.parentFrd = undefined;
  this.locationCategory.scratch.parentCleared = true;
});

When(/^I click Save$/, async function (this: CustomWorld) {
  if (this.locationCategory.scratch.saveSuppressed) {
    // The Parent option the scenario tried to pick is not offered, so there is nothing to save.
    this.locationCategory.lastOutcome = undefined;
    return;
  }
  await submitForm(this);
});

When(/^I click Close or Cancel without saving$/, async function (this: CustomWorld) {
  this.locationCategory.scratch.cancelled = true;
  await this.pages.locationCategory.form.cancel();
});

/** Creates a category through the form (opens it first when needed) and records the result. */
When(/^I create category "([^"]*)" with Short Name "([^"]*)"$/, async function (this: CustomWorld, name: string, shortName: string) {
  const { form } = this.pages.locationCategory;
  await openAddForm(this);
  const typedName = uniqueName(this, name);
  const typedShort = uniqueShortName(this, shortName);
  await form.type('Location Category Name', typedName);
  await form.type('Short Name', typedShort);
  const outcome = await submitForm(this);
  if (outcome.kind !== 'saved') {
    throw new Error(`Could not create category "${typedName}": ${describeOutcome(outcome)}; the form held ${await form.currentValues().catch(() => 'unreadable values')}; dialog: ${(await form.dialog.innerText().catch(() => '')).replace(/s+/g, ' ').replace(/Select Location Category Prod.*Select Department.*Juridication/, '[..]')}`);
  }
  this.locationCategory.createdViaUi.push({ id: successfulSaveId(this, 'Create'), frd: name, name: typedName, shortName: typedShort });
});

When(/^I attempt to create a category with Name "([^"]*)" and Short Name "([^"]*)"$/, async function (this: CustomWorld, name: string, shortName: string) {
  const { form } = this.pages.locationCategory;
  await openAddForm(this);
  await form.type('Location Category Name', uniqueName(this, name));
  await form.type('Short Name', uniqueShortName(this, shortName));
  await submitForm(this);
});

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

When(/^I click Edit against "([^"]*)" on the List$/, async function (this: CustomWorld, frdName: string) {
  await openEditFor(this, await ensureCategory(this, frdName));
});

When(
  /^I edit category "([^"]*)"(?: which is at L1| whose parent is "[^"]*"| which is the parent of "[^"]*")?$/,
  async function (this: CustomWorld, frdName: string) {
    this.locationCategory.scratch.saveSuppressed = false;
    await openEditFor(this, await ensureCategory(this, frdName));
  },
);

When(/^I change Name to "([^"]*)"$/, async function (this: CustomWorld, value: string) {
  const typed = uniqueName(this, value);
  await this.pages.locationCategory.form.type('Location Category Name', typed);
  this.locationCategory.entered.name = typed;
});

When(/^I change Short Name to "([^"]*)"$/, async function (this: CustomWorld, value: string) {
  const typed = uniqueShortName(this, value);
  await this.pages.locationCategory.form.type('Short Name', typed);
  this.locationCategory.entered.shortName = typed;
});

When(/^I clear the Name field$/, async function (this: CustomWorld) {
  await this.pages.locationCategory.form.clear('Location Category Name');
  this.locationCategory.entered.name = '';
});

// ---------------------------------------------------------------------------
// Outcome (creation, update, deletion)
// ---------------------------------------------------------------------------

Then(/^the toaster "([^"]*)" should be (?:shown|displayed)$/, async function (this: CustomWorld, message: string) {
  const pattern = locationCategoryMessagePattern(message);
  const seen = await this.sawMessage(pattern, 15000);
  expect(seen, `toaster "${message}" appeared; toasters seen: ${JSON.stringify(this.seenToasts)}; outcome: ${describeOutcome(this.locationCategory.lastOutcome)}`).toBe(true);
});

Then(/^the message "([^"]*)" should be displayed$/, async function (this: CustomWorld, message: string) {
  await expectMessage(this, message);
});

Then(/^Save should be prevented$/, function (this: CustomWorld) {
  expectSaveBlocked(this);
});

Then(/^the update should be prevented$/, function (this: CustomWorld) {
  expectSaveBlocked(this);
});

/** Nothing was created through the Add form of this scenario (fixtures are created with direct API calls, which the page does not see). */
export function expectNoCreateThroughForm(world: CustomWorld): void {
  const { api } = world.pages.locationCategory;
  const created = api.apiCalls.filter((call) => call.operation === 'Create' && call.status < 300 && !api.directIds.has(call.id ?? -1));
  expect(created.map((call) => call.id), 'no category was created through the form').toEqual([]);
}

Then(/^no category should be created(?: and no ID should be generated)?$/, async function (this: CustomWorld) {
  const apiName = this.locationCategory.scratch.apiName as string | undefined;
  if (apiName) await expectNoCategoryNamed(this, apiName);
  else expectNoCreateThroughForm(this);
});

Then(/^no new category should be created$/, function (this: CustomWorld) {
  expectNoCreateThroughForm(this);
});

Then(/^the category should be created$/, function (this: CustomWorld) {
  expect(successfulSaveId(this, 'Create')).toBeGreaterThan(0);
});
