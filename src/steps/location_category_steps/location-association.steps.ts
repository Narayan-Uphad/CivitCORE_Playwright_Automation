/**
 * Steps of location_category_location_association.feature (FRD 6.5 - Location association).
 * Page object: LocationCategoryLocationPage (Add / Edit Location form and the Location API).
 *
 * A Location stores its category as `locCatId`; the category dropdown of the Add Location form lists every master
 * category, the scenario's own copies of the FRD baseline among them. Locations created here carry the scenario's
 * unique suffix and are removed by ./hooks.ts.
 */
import { Given, Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import type { LocationSaveResult } from '../../pages/location_category';
import { expect } from '../../utils/assertions';
import { midcTestData } from '../../test-data/midc.data';
import { normalizeLocationCategoryText } from '../../test-data/location-category.data';
import { createLocation } from './deletion.steps';
import { ensureCategory, ensureSession, reloadIfFixturesAreNew, freshMaster, requireFixture, sameText, uniqueName } from './helpers';

const UNKNOWN_CATEGORY_ID = 'LC-INVALID-9999';

async function openAddLocation(world: CustomWorld): Promise<void> {
  await ensureSession(world);
  await world.pages.locationCategory.dismissOverlays();
  await reloadIfFixturesAreNew(world);
  await world.pages.locationCategory.location.open(midcTestData.organizationName);
  await world.pages.locationCategory.location.openAddForm();
}

function splitNames(list: string): string[] {
  return list
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

/** The scenario's Location whose FRD name starts the stored (suffixed) name. */
function scenarioLocation(world: CustomWorld, frdName: string) {
  const known = world.locationCategory.locations.find((candidate) => candidate.name.toLowerCase().startsWith(frdName.toLowerCase()));
  if (!known) throw new Error(`The scenario has no Location "${frdName}".`);
  return known;
}

// ---------------------------------------------------------------------------
// Category dropdown (F_0033, N_0024)
// ---------------------------------------------------------------------------

When(/^I open "Location Management" and click "Add Location"$/, async function (this: CustomWorld) {
  await openAddLocation(this);
});

When(/^I open Add Location$/, async function (this: CustomWorld) {
  await openAddLocation(this);
});

When(/^I open the Location Category dropdown$/, async function (this: CustomWorld) {
  this.locationCategory.scratch.options = await this.pages.locationCategory.location.categoryOptions();
  this.locationCategory.scratch.masterNames = (await freshMaster(this)).map((record) => record.name);
});

Then(
  /^the dropdown should list all valid categories from the CivitCORE Location Category Master "([^"]*)"$/,
  function (this: CustomWorld, names: string) {
    const { options, masterNames } = this.locationCategory.scratch as { options: string[]; masterNames: string[] };
    const offered = options.map(normalizeLocationCategoryText);
    for (const name of splitNames(names)) {
      const copy = requireFixture(this, name).name;
      expect(offered, `"${copy}" is offered`).toContain(normalizeLocationCategoryText(copy));
    }
    // The live master has more categories than the FRD baseline, so "all valid categories" = every master category.
    expect([...new Set(offered)].sort(), 'the dropdown lists exactly the master categories').toEqual(
      [...new Set(masterNames.map(normalizeLocationCategoryText))].sort(),
    );
  },
);

When(/^I try to type the category "([^"]*)" that is not in the dropdown and save$/, async function (this: CustomWorld, text: string) {
  const { location } = this.pages.locationCategory;
  const options = await location.categoryOptions();
  this.locationCategory.scratch.options = options;
  this.locationCategory.scratch.masterNames = (await freshMaster(this)).map((record) => record.name);
  const name = uniqueName(this, 'Free Text Category Check');
  this.locationCategory.scratch.freeTextLocation = name;
  await location.fill(name, this.locationCategory.data.code());
  const selected = await location.categorySelect.selectOption({ label: text }, { timeout: 2000 }).then(
    () => true,
    () => false,
  );
  this.locationCategory.scratch.freeTextSelected = selected;
  this.locationCategory.scratch.saveResult = await location.save();
});

Then(/^free text should not be accepted$/, function (this: CustomWorld) {
  const scratch = this.locationCategory.scratch;
  expect(scratch.freeTextSelected, 'the typed category could be selected').toBe(false);
  const result = scratch.saveResult as LocationSaveResult;
  expect(result.status === 0 || result.status >= 300, `the Location was saved without a valid category: ${JSON.stringify(result)}`).toBe(true);
  expect(this.pages.locationCategory.location.createdIds, 'no Location was created').toEqual([]);
});

Then(/^only an existing category should be selectable$/, function (this: CustomWorld) {
  const { options, masterNames } = this.locationCategory.scratch as { options: string[]; masterNames: string[] };
  const master = masterNames.map(normalizeLocationCategoryText);
  expect(options.filter((option) => !master.includes(normalizeLocationCategoryText(option))), 'options that are not master categories').toEqual([]);
});

// ---------------------------------------------------------------------------
// Association stored by ID (F_0034, F_0035)
// ---------------------------------------------------------------------------

When(/^I create Location "([^"]*)" selecting category "([^"]*)"$/, async function (this: CustomWorld, frdLocation: string, frdCategory: string) {
  const category = await ensureCategory(this, frdCategory);
  await openAddLocation(this);
  const name = this.locationCategory.data.name(frdLocation);
  const code = this.locationCategory.data.code();
  await this.pages.locationCategory.location.fill(name, code, category.name);
  this.locationCategory.locations.push({ name, code, categoryFrd: frdCategory });
});

Given(/^the Location "([^"]*)" is tagged to "([^"]*)"$/, async function (this: CustomWorld, frdLocation: string, frdCategory: string) {
  await ensureCategory(this, frdCategory);
  await createLocation(this, frdLocation, frdCategory);
});

When(/^I edit Location "([^"]*)" and change category from "([^"]*)" to "([^"]*)"$/, async function (this: CustomWorld, frdLocation: string, _from: string, to: string) {
  const { location } = this.pages.locationCategory;
  const known = scenarioLocation(this, frdLocation);
  const target = await ensureCategory(this, to);
  await this.pages.locationCategory.dismissOverlays();
  await location.open(midcTestData.organizationName);
  await location.startEdit(known.name);
  await location.chooseCategory(target.name);
  known.categoryFrd = to;
});

When(/^I save the Location$/, async function (this: CustomWorld) {
  const { location } = this.pages.locationCategory;
  const result = await location.save();
  expect(result.status, `saving the Location: ${result.status} ${result.message}`).toBeGreaterThan(0);
  expect(result.status, `saving the Location: ${result.message}`).toBeLessThan(300);
  const known = this.locationCategory.locations.at(-1);
  if (known && result.id) known.id = result.id;
  this.locationCategory.scratch.saveResult = result;
});

When(/^I query the Location record$/, async function (this: CustomWorld) {
  const known = this.locationCategory.locations.at(-1)!;
  expect(known.id, 'the saved Location has an id').toBeTruthy();
  this.locationCategory.scratch.locationRecord = await this.pages.locationCategory.location.fetchLocation(known.id!);
});

Then(/^the Location record should store the Location Category ID of "([^"]*)"$/, function (this: CustomWorld, frdCategory: string) {
  const record = this.locationCategory.scratch.locationRecord as { categoryId: number | null } | undefined;
  expect(record, 'the Location was found').toBeTruthy();
  expect(record!.categoryId, 'stored Location Category ID').toBe(requireFixture(this, frdCategory).id);
});

Then(/^the Location record should not store the category Name$/, function (this: CustomWorld) {
  const body = this.pages.locationCategory.location.lastCreateBody;
  expect(body, 'the Add Location request was captured').toBeTruthy();
  const category = this.locationCategory.fixture('Depot')!;
  const values = Object.values(JSON.parse(body!) as Record<string, unknown>);
  expect(values.map(String), 'request values').not.toContain(category.name);
  expect(values.map(String), 'the request carries the category id').toContain(String(category.id));
});

When(/^I query the Location and both categories' dependencies$/, async function (this: CustomWorld) {
  this.locationCategory.scratch.allLocations = await this.pages.locationCategory.location.fetchLocations();
});

Then(/^the Location should store the Category ID of "([^"]*)"$/, function (this: CustomWorld, frdCategory: string) {
  const known = this.locationCategory.locations.at(-1)!;
  const records = this.locationCategory.scratch.allLocations as Array<{ id: number; categoryId: number | null }>;
  expect(records.find((record) => record.id === known.id)?.categoryId, 'stored Location Category ID').toBe(requireFixture(this, frdCategory).id);
});

Then(/^"([^"]*)" should no longer have "([^"]*)" as a dependency$/, function (this: CustomWorld, frdCategory: string, frdLocation: string) {
  const known = scenarioLocation(this, frdLocation);
  const records = this.locationCategory.scratch.allLocations as Array<{ id: number; categoryId: number | null }>;
  const tagged = records.filter((record) => record.categoryId === requireFixture(this, frdCategory).id).map((record) => record.id);
  expect(tagged, `Locations still tagged to "${frdCategory}"`).not.toContain(known.id);
});

Then(/^"([^"]*)" should now have "([^"]*)" as a dependency$/, function (this: CustomWorld, frdCategory: string, frdLocation: string) {
  const known = scenarioLocation(this, frdLocation);
  const records = this.locationCategory.scratch.allLocations as Array<{ id: number; categoryId: number | null }>;
  const tagged = records.filter((record) => record.categoryId === requireFixture(this, frdCategory).id).map((record) => record.id);
  expect(tagged, `Locations tagged to "${frdCategory}"`).toContain(known.id);
});

// ---------------------------------------------------------------------------
// Unknown category through the API (N_0025)
// ---------------------------------------------------------------------------

/**
 * Creates one valid Location the normal way, takes the request body the app sent for it, and replays it as a new
 * Location whose category id does not exist, as a client that bypasses the form would.
 */
When(/^I submit a create-Location request with an unknown Location Category ID$/, async function (this: CustomWorld, json: string) {
  const { location } = this.pages.locationCategory;
  const category = await ensureCategory(this, 'Depot');
  await createLocation(this, 'Template Location', 'Depot');
  const template = JSON.parse(location.lastCreateBody ?? 'null') as Record<string, unknown> | null;
  if (!template) throw new Error('The Add Location request body was not recorded.');
  const created = this.locationCategory.locations.at(-1)!;
  const typed = JSON.parse(json) as { name: string };
  const name = uniqueName(this, typed.name);
  const code = this.locationCategory.data.code();
  const categoryKey = Object.keys(template).find((key) => String(template[key]) === String(category.id));
  if (!categoryKey) throw new Error(`The Add Location request has no field holding the category id: ${JSON.stringify(template)}`);
  for (const key of Object.keys(template)) {
    if (template[key] === created.name) template[key] = name;
    else if (template[key] === created.code) template[key] = code;
  }
  template[categoryKey] = UNKNOWN_CATEGORY_ID;
  this.locationCategory.scratch.locationName = name;
  const result = await location.post('location/3.0/create', template);
  if (result.status < 300 && typeof (result.body as { data?: unknown })?.data === 'number') location.createdIds.push((result.body as { data: number }).data);
  this.locationCategory.apiResult = result;
});

When(/^I check the Locations list$/, async function (this: CustomWorld) {
  this.locationCategory.scratch.allLocations = await this.pages.locationCategory.location.fetchLocations();
});

Then(/^the request should be rejected$/, function (this: CustomWorld) {
  const result = this.locationCategory.apiResult!;
  expect(result.status, `the API answered ${result.status} ${result.message}`).toBeGreaterThanOrEqual(400);
});

Then(/^no Location should be created with an invalid category reference$/, function (this: CustomWorld) {
  const name = String(this.locationCategory.scratch.locationName);
  const records = this.locationCategory.scratch.allLocations as Array<{ name: string }>;
  expect(records.filter((record) => sameText(record.name, name)), `no Location "${name}" exists`).toEqual([]);
});
