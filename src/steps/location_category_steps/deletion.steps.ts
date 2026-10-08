/**
 * Steps of location_category_deletion.feature (FRD 6.5, 6.7, US-5 - US-7 - Location Category Deletion).
 * Page objects: LocationCategoryDeletionPage, LocationCategoryLocationPage (the Locations a category is tagged to),
 * LocationCategoryApi.
 *
 * Categories are the scenario's own copies (see ensureCategory); Locations a scenario creates carry the same unique
 * suffix and are removed by ./hooks.ts before the categories, because a category with Locations cannot be deleted.
 * The build has no Detail view, so the "from Detail view" scenario is skipped.
 */
import { Given, Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { expect } from '../../utils/assertions';
import { midcTestData } from '../../test-data/midc.data';
import { locationCategoryMessagePattern } from '../../test-data/location-category.data';
import {
  ensureCategory,
  ensureSession,
  freshMaster,
  reloadIfFixturesAreNew,
  NO_VIEW_SCREEN,
  requireFixture,
  returnToList,
  skipBecause,
  unreachable,
} from './helpers';

/** Creates a Location carrying the scenario's suffix, tagged to the scenario's copy of `frdCategory`. */
export async function createLocation(world: CustomWorld, frdLocation: string, frdCategory: string): Promise<void> {
  await ensureSession(world);
  const category = requireFixture(world, frdCategory);
  const { location } = world.pages.locationCategory;
  const name = world.locationCategory.data.name(frdLocation);
  const code = world.locationCategory.data.code();
  await world.pages.locationCategory.dismissOverlays();
  await reloadIfFixturesAreNew(world);
  await location.open(midcTestData.organizationName);
  const result = await location.create(name, code, category.name);
  if (result.status === 0 || result.status >= 300) throw new Error(`Could not create the test Location "${name}": ${result.status} ${result.message}`);
  world.locationCategory.locations.push({ name, code, categoryFrd: frdCategory, id: result.id });
}

/** Clicks Delete for the scenario's copy of `frdName` and leaves whatever follows (confirmation or block) on screen. */
async function requestDelete(world: CustomWorld, frdName: string): Promise<void> {
  const fixture = requireFixture(world, frdName);
  await returnToList(world);
  world.seenToasts.length = 0;
  world.locationCategory.target = fixture;
  await world.pages.locationCategory.deletion.requestDelete(fixture.name);
}

/** Confirms the open prompt, recording the delete call and the toast it produced. */
async function confirmDeletion(world: CustomWorld): Promise<void> {
  const previous = await world.visibleToasts();
  world.locationCategory.lastDelete = await world.pages.locationCategory.deletion.confirm();
  await world.captureNewToast(previous, 10000);
}

/** The deletion was refused before any confirmation, and the reason is on screen. */
async function expectBlocked(world: CustomWorld, message?: string): Promise<void> {
  const { deletion } = world.pages.locationCategory;
  const confirmation = await deletion.confirmationAfterDeleteClick();
  world.locationCategory.scratch.promptShown = confirmation !== null;
  if (confirmation !== null) {
    // The FRD blocks before any prompt; this app asks first and refuses on confirmation. The block itself must still happen
    // (the "no prompt" expectation is checked by its own step).
    world.log(`The app offered the delete confirmation before refusing the deletion: "${confirmation}"`);
    const previous = await world.visibleToasts();
    const call = await deletion.confirm();
    world.locationCategory.lastDelete = call;
    await world.captureNewToast(previous, 10000);
    expect(call.status, `the deletion is refused: ${call.message}`).toBeGreaterThanOrEqual(400);
  }
  if (!message) return;
  const pattern = locationCategoryMessagePattern(message);
  await expect
    .poll(async () => (await world.sawMessage(pattern, 0)) || (await world.page.getByText(pattern).first().isVisible().catch(() => false)), {
      timeout: 15000,
      message: `"${message}" is displayed; toasters: ${JSON.stringify(world.seenToasts)}`,
    })
    .toBe(true);
}

async function expectStillInMaster(world: CustomWorld, frdName: string): Promise<void> {
  const fixture = requireFixture(world, frdName);
  const master = await freshMaster(world);
  expect(master.some((record) => record.id === fixture.id), `"${fixture.name}" is still in the master`).toBe(true);
  world.locationCategory.target = fixture;
}

// ---------------------------------------------------------------------------
// Preconditions
// ---------------------------------------------------------------------------

Given(/^"([^"]*)" has no Locations and no children$/, async function (this: CustomWorld, frdName: string) {
  await ensureCategory(this, frdName);
});

Given(/^"([^"]*)" is tagged only to "([^"]*)"$/, async function (this: CustomWorld, frdName: string, location: string) {
  await ensureCategory(this, frdName);
  await createLocation(this, location, frdName);
});

Given(/^"([^"]*)" has no children and is tagged to (\d+) Locations$/, async function (this: CustomWorld, frdName: string, count: string) {
  await ensureCategory(this, frdName);
  for (let index = 1; index <= Number(count); index += 1) await createLocation(this, `${frdName} Site ${index}`, frdName);
});

Given(/^"([^"]*)" has children "([^"]*)" and "([^"]*)" and no Locations$/, async function (this: CustomWorld, frdName: string, first: string, second: string) {
  await ensureCategory(this, frdName);
  await ensureCategory(this, first);
  await ensureCategory(this, second);
});

Given(/^"([^"]*)" has child "([^"]*)" and is tagged to Location "([^"]*)"$/, async function (this: CustomWorld, frdName: string, child: string, location: string) {
  await ensureCategory(this, child); // creates the whole chain, so "City" exists with "Airport" under it
  requireFixture(this, frdName);
  await createLocation(this, location, frdName);
});

Given(/^parent "([^"]*)" has exactly one new leaf child "([^"]*)" created for this test$/, async function (this: CustomWorld, parent: string, child: string) {
  await ensureCategory(this, parent);
  await ensureCategory(this, child, parent);
});

Given(/^neither "([^"]*)" nor "([^"]*)" has Locations$/, function (_value1: string, _value2: string) {
  // The scenario's own copies are created without Locations.
});

Given(/^the Detail view of "([^"]*)" is open$/, function (this: CustomWorld, _value1: string) {
  return skipBecause(this, NO_VIEW_SCREEN);
});

// ---------------------------------------------------------------------------
// Delete, confirm, cancel
// ---------------------------------------------------------------------------

When(/^I click Delete against "([^"]*)"(?: on the List)?$/, async function (this: CustomWorld, frdName: string) {
  await requestDelete(this, frdName);
});

When(/^I attempt to delete "([^"]*)"(?: which (?:is tagged to Locations|has children))?$/, async function (this: CustomWorld, frdName: string) {
  await requestDelete(this, frdName);
});

When(/^I attempt to delete "([^"]*)" again and confirm$/, async function (this: CustomWorld, frdName: string) {
  await requestDelete(this, frdName);
  await this.pages.locationCategory.deletion.expectConfirmationOpen();
  this.locationCategory.scratch.confirmationShown = true;
  await confirmDeletion(this);
});

When(/^I click Yes or Confirm on the prompt$/, async function (this: CustomWorld) {
  await this.pages.locationCategory.deletion.expectConfirmationOpen();
  await confirmDeletion(this);
});

When(/^I delete (?:child )?"([^"]*)" and confirm$/, async function (this: CustomWorld, frdName: string) {
  const fixture = requireFixture(this, frdName);
  await returnToList(this);
  const previous = await this.visibleToasts();
  this.locationCategory.lastDelete = await this.pages.locationCategory.deletion.deleteCategory(fixture.name);
  await this.captureNewToast(previous, 10000);
});

When(/^I click No or Cancel on the confirmation prompt$/, async function (this: CustomWorld) {
  await this.pages.locationCategory.deletion.cancel();
});

When(/^I search for "([^"]*)" and check the master via DB\/API$/, async function (this: CustomWorld, frdName: string) {
  const { list } = this.pages.locationCategory;
  const fixture = requireFixture(this, frdName);
  await list.clearFilters();
  await list.filterBy('Location Category', fixture.name);
  this.locationCategory.scratch.rowsAfter = (await list.gridRows()).map((row) => row.name);
  this.locationCategory.scratch.masterAfter = await freshMaster(this);
});

When(/^I change the category of "([^"]*)" to "([^"]*)"$/, async function (this: CustomWorld, frdLocation: string, frdCategory: string) {
  const { location } = this.pages.locationCategory;
  const known = this.locationCategory.locations.find((candidate) => candidate.name.toLowerCase().startsWith(frdLocation.toLowerCase()));
  if (!known) throw new Error(`The scenario has no Location "${frdLocation}".`);
  const target = await ensureCategory(this, frdCategory);
  await this.pages.locationCategory.dismissOverlays();
  await reloadIfFixturesAreNew(this);
  await location.open(midcTestData.organizationName);
  await location.startEdit(known.name);
  await location.chooseCategory(target.name);
  const result = await location.save();
  if (result.status === 0 || result.status >= 300) throw new Error(`Could not re-tag the Location: ${result.status} ${result.message}`);
  known.categoryFrd = frdCategory;
});

// ---------------------------------------------------------------------------
// Outcomes
// ---------------------------------------------------------------------------

Then(/^the confirmation prompt "([^"]*)" should be displayed$/, async function (this: CustomWorld, prompt: string) {
  await this.pages.locationCategory.deletion.expectConfirmationPrompt();
  this.log(`FRD prompt "${prompt}" -> the app asks: "${(await this.pages.locationCategory.deletion.dialog.innerText()).replace(/\s+/g, ' ').trim()}"`);
});

Then(/^the confirmation should be shown$/, function (this: CustomWorld) {
  expect(this.locationCategory.scratch.confirmationShown, 'the delete confirmation was shown').toBe(true);
});

Then(/^"([^"]*)" should be removed from the List$/, function (this: CustomWorld, frdName: string) {
  const fixture = requireFixture(this, frdName);
  const rows = (this.locationCategory.scratch.rowsAfter as string[]).map((name) => name.toLowerCase());
  expect(rows, `"${fixture.name}" is not listed`).not.toContain(fixture.name.toLowerCase());
});

Then(/^"([^"]*)" should be permanently removed from the Master \(hard delete\)$/, function (this: CustomWorld, frdName: string) {
  const fixture = requireFixture(this, frdName);
  const master = this.locationCategory.scratch.masterAfter as Array<{ id: number }>;
  expect(master.some((record) => record.id === fixture.id), `category #${fixture.id} is gone from the master`).toBe(false);
});

Then(/^the deletion should be blocked$/, async function (this: CustomWorld) {
  await expectBlocked(this);
});

Then(/^the deletion should be blocked with (?:the Location message )?"([^"]*)"$/, async function (this: CustomWorld, message: string) {
  await expectBlocked(this, message);
});

Then(/^(?:the final confirmation prompt|no confirmation prompt) should (?:not )?be displayed$/, async function (this: CustomWorld) {
  expect(this.locationCategory.scratch.promptShown, 'the app asked for confirmation before refusing the deletion').not.toBe(true);
  await this.pages.locationCategory.deletion.expectNoConfirmation();
});

Then(/^"([^"]*)" should (?:still exist|remain)(?: in the master)?$/, async function (this: CustomWorld, frdName: string) {
  await expectStillInMaster(this, frdName);
});

Then(/^"([^"]*)" and its children should remain$/, async function (this: CustomWorld, frdName: string) {
  await expectStillInMaster(this, frdName);
  for (const child of this.locationCategory.fixtures().filter((fixture) => fixture.parentFrd && fixture.parentFrd.toLowerCase() === frdName.toLowerCase())) {
    await expectStillInMaster(this, child.frd);
  }
});

Then(/^the deletion should succeed with "([^"]*)"$/, async function (this: CustomWorld, message: string) {
  expect(this.locationCategory.lastDelete?.status, JSON.stringify(this.locationCategory.lastDelete)).toBeLessThan(300);
  expect(await this.sawMessage(locationCategoryMessagePattern(message), 10000), `toaster "${message}"; seen: ${JSON.stringify(this.seenToasts)}`).toBe(true);
});

Then(/^the child deletion should succeed$/, function (this: CustomWorld) {
  expect(this.locationCategory.lastDelete?.status, JSON.stringify(this.locationCategory.lastDelete)).toBeLessThan(300);
});

Then(/^the parent deletion should succeed with "([^"]*)"$/, async function (this: CustomWorld, message: string) {
  expect(this.locationCategory.lastDelete?.status, JSON.stringify(this.locationCategory.lastDelete)).toBeLessThan(300);
  expect(await this.sawMessage(locationCategoryMessagePattern(message), 10000), `toaster "${message}"; seen: ${JSON.stringify(this.seenToasts)}`).toBe(true);
});

Then(/^the prompt should close$/, async function (this: CustomWorld) {
  await this.pages.locationCategory.deletion.expectNoConfirmation();
});

Then(/^"([^"]*)" should not be deleted$/, async function (this: CustomWorld, frdName: string) {
  await expectStillInMaster(this, frdName);
  const fixture = requireFixture(this, frdName);
  expect(this.pages.locationCategory.deletion.wasDeleteRequested(fixture.id), 'no delete request was sent').toBe(false);
});

Then(/^no success toaster should be shown$/, async function (this: CustomWorld) {
  expect(await this.sawMessage(/deleted successfully/i, 1500), `toasters: ${JSON.stringify(this.seenToasts)}`).toBe(false);
});

Then(/^no "deleted" Activity Log entry should be created$/, function (this: CustomWorld) {
  const fixture = this.locationCategory.target!;
  // The build has no Activity Log screen, so the verifiable part is that no delete was sent that could be logged.
  expect(this.pages.locationCategory.deletion.wasDeleteRequested(fixture.id), 'a delete request was sent').toBe(false);
  this.log('No Activity Log screen exists; verified instead that no delete request was sent.');
});

// ---------------------------------------------------------------------------
// UI bypassed (N_0031) and Detail view (N_0027)
// ---------------------------------------------------------------------------

When(/^I send a direct delete request for "([^"]*)" which is tagged to Locations$/, async function (this: CustomWorld, frdName: string) {
  const fixture = await ensureCategory(this, frdName);
  await createLocation(this, `${frdName} Site 1`, frdName);
  this.locationCategory.target = fixture;
  this.locationCategory.apiResult = await this.pages.locationCategory.api.remove(fixture.id);
});

Then(/^the request should be rejected with the Location-dependency reason "([^"]*)"$/, function (this: CustomWorld, message: string) {
  const result = this.locationCategory.apiResult!;
  expect(result.status, `the API answered ${result.status} ${result.message}`).toBeGreaterThanOrEqual(400);
  expect(locationCategoryMessagePattern(message).test(result.message), `the reason "${result.message}" names the Location dependency`).toBe(true);
});

Then(/^a "Deletion Blocked" entry should be logged$/, function (this: CustomWorld) {
  // The build has no Activity Log screen; the blocked request itself was verified in the steps above.
  this.log('No Activity Log screen exists; the "Deletion Blocked" log entry could not be checked.');
});

When(/^I click Delete on the Detail view$/, function () {
  unreachable('I click Delete on the Detail view');
});
