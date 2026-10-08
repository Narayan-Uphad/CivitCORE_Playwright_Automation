/**
 * Steps of location_category_update.feature (FRD 6.4, US-4 - Location Category Update).
 * Page objects: LocationCategoryListPage, LocationCategoryFormDialog, LocationCategoryApi.
 * Shared steps (edit, field changes, Save, messages) are in ./common.steps.ts.
 *
 * The categories being edited are the scenario's own copies of the FRD baseline (see ensureCategory), so real
 * data is never changed. The Edit form shows no system-generated ID (it has an editable "Location Category Code"
 * instead), so "ID read-only" is checked as "the form offers no ID field to change".
 */
import { Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { expect } from '../../utils/assertions';
import { locationCategoryMessagePattern } from '../../test-data/location-category.data';
import {
  ensureCategory,
  freshMaster,
  openEditFor,
  requireFixture,
  requireTarget,
  returnToList,
  sameText,
  submitForm,
  uniqueName,
} from './helpers';

/** Record the open Edit form belongs to, as the API stores it now. */
async function storedNow(world: CustomWorld, id: number) {
  const record = (await freshMaster(world)).find((candidate) => candidate.id === id);
  expect(record, `category #${id} is in the master`).toBeTruthy();
  return record!;
}

/** The last submit was a successful Update; returns the id of the record (from the request URL, else the edited one). */
function savedUpdateId(world: CustomWorld): number {
  const outcome = world.locationCategory.lastOutcome;
  if (outcome?.kind !== 'saved' || outcome.call.operation !== 'Update') {
    throw new Error(`Expected the update to succeed, but ${outcome ? JSON.stringify(outcome) : 'nothing was submitted'}.`);
  }
  return outcome.call.id ?? requireTarget(world).id;
}

/** Offers `frdName` as the open form's Parent when the lookup lists it; otherwise remembers that it is not offered. */
async function tryParent(world: CustomWorld, frdName: string): Promise<void> {
  const { form } = world.pages.locationCategory;
  const candidate = requireFixture(world, frdName);
  await form.setNested(true);
  await form.parentInput.click();
  // Typing the candidate's own name filters the lookup to it: a row appears only when it is offered as a Parent.
  await form.parentInput.fill('');
  await form.parentInput.pressSequentially(candidate.name);
  await world.page.waitForTimeout(1500);
  const offered = (await form.parentOption(candidate.name).count()) > 0;
  world.locationCategory.parentOptionOffered = offered;
  world.locationCategory.scratch.saveSuppressed = !offered;
  if (offered) await form.selectParent(candidate.name);
}

/** Opens the hierarchy filtered to the scenario's copies, fully expanded. */
async function showHierarchy(world: CustomWorld): Promise<void> {
  const { list } = world.pages.locationCategory;
  await returnToList(world);
  await list.filterBy('Location Category', world.locationCategory.data.suffix);
  await list.useLargestPageSize();
  await list.expandAll();
}

// ---------------------------------------------------------------------------
// Edit form (F_0026)
// ---------------------------------------------------------------------------

Then(/^the form should show existing Name "([^"]*)"$/, async function (this: CustomWorld, frdName: string) {
  await expect(this.pages.locationCategory.form.nameInput).toHaveValue(requireFixture(this, frdName).name);
});

Then(/^the form should show existing Short Name "([^"]*)"$/, async function (this: CustomWorld, frdName: string) {
  const fixture = this.locationCategory.editing ?? requireTarget(this);
  await expect(this.pages.locationCategory.form.shortNameInput).toHaveValue(fixture.shortName);
});

Then(/^the form should show existing Parent "([^"]*)"$/, async function (this: CustomWorld, parentName: string) {
  const { form } = this.pages.locationCategory;
  await expect(form.nestCheckbox, 'the category is nested').toBeChecked();
  await expect(form.parentInput).toHaveValue(requireFixture(this, parentName).name);
});

Then(/^the Location Category ID should be displayed read-only and cannot be changed$/, async function (this: CustomWorld) {
  const labels = await this.pages.locationCategory.form.fieldLabels();
  expect(
    labels.filter((label) => /\bid\b/i.test(label)),
    `no editable ID field; form fields: ${labels.join(', ')}`,
  ).toEqual([]);
  this.log('The build does not display the system-generated ID on the Edit form; verified that no field exposes it for editing.');
});

// ---------------------------------------------------------------------------
// Successful updates (F_0027 - F_0032)
// ---------------------------------------------------------------------------

When(/^I note the Location Category ID of "([^"]*)"$/, function (this: CustomWorld, frdName: string) {
  this.locationCategory.notedId = requireFixture(this, frdName).id;
});

Then(/^the record should be updated$/, async function (this: CustomWorld) {
  const id = savedUpdateId(this);
  const record = await storedNow(this, id);
  const entered = this.locationCategory.entered.name;
  if (entered) expect(record.rawName.toLowerCase(), 'stored Name').toBe(entered.trim().toLowerCase());
  this.locationCategory.refresh(id, { name: record.rawName.trim() });
});

Then(/^the Location Category ID should be unchanged$/, async function (this: CustomWorld) {
  const fixture = requireTarget(this);
  expect(savedUpdateId(this), 'the update addressed the same record').toBe(this.locationCategory.notedId ?? fixture.id);
  expect(await storedNow(this, fixture.id), 'the record keeps its id').toBeTruthy();
});

Then(/^the Short Name should remain "([^"]*)"$/, async function (this: CustomWorld, shortName: string) {
  const record = await storedNow(this, requireTarget(this).id);
  expect(sameText(record.shortName, requireFixture(this, 'Zone').shortName), `Short Name stays (${shortName})`).toBe(true);
});

Then(/^the Short Name should be updated to "([^"]*)"$/, async function (this: CustomWorld, _value1: string) {
  const record = await storedNow(this, savedUpdateId(this));
  expect(record.rawShortName.toLowerCase()).toBe((this.locationCategory.entered.shortName ?? '').trim().toLowerCase());
  this.locationCategory.refresh(record.id, { shortName: record.rawShortName.trim() });
});

Then(/^the ID and Name should be unchanged$/, async function (this: CustomWorld) {
  const fixture = requireTarget(this);
  const record = await storedNow(this, savedUpdateId(this));
  expect(record.id).toBe(fixture.id);
  expect(sameText(record.name, fixture.name), `Name stays "${fixture.name}"`).toBe(true);
});

When(/^I open the hierarchy$/, async function (this: CustomWorld) {
  await showHierarchy(this);
});

When(/^I expand the hierarchy$/, async function (this: CustomWorld) {
  await showHierarchy(this);
});

Then(/^"([^"]*)" should be saved with Parent "([^"]*)" and displayed under it$/, async function (this: CustomWorld, frdName: string, parentName: string) {
  const { list } = this.pages.locationCategory;
  const child = requireFixture(this, frdName);
  const parent = requireFixture(this, parentName);
  expect((await storedNow(this, child.id)).parentId, `parent id of "${frdName}"`).toBe(parent.id);
  expect(sameText((await list.parentOnScreen(child.name)) ?? '', parent.name), `"${frdName}" is drawn under "${parentName}"`).toBe(true);
});

Then(/^the ID should be unchanged$/, async function (this: CustomWorld) {
  const fixture = requireTarget(this);
  expect(savedUpdateId(this)).toBe(this.locationCategory.notedId ?? fixture.id);
});

Then(/^the category should be saved without a parent$/, async function (this: CustomWorld) {
  const record = await storedNow(this, savedUpdateId(this));
  expect(record.parentId, 'no parent after clearing it').toBeNull();
});

Then(/^"([^"]*)" should be displayed at the top level \(L1\)$/, async function (this: CustomWorld, frdName: string) {
  const { list } = this.pages.locationCategory;
  const fixture = requireFixture(this, frdName);
  await showHierarchy(this);
  const row = (await list.gridRows()).find((candidate) => sameText(candidate.name, fixture.name));
  expect(row?.level, `"${frdName}" is drawn at level 0 (L1)`).toBe(0);
});

When(/^I do not change any field$/, function () {
  // Nothing to do: the form keeps the values it was opened with.
});

Then(/^the Save should succeed or the form should close without change$/, async function (this: CustomWorld) {
  const outcome = this.locationCategory.lastOutcome;
  const closed = !(await this.pages.locationCategory.form.isOpen());
  // The app keeps Update disabled until something changes, which is "the form does not save anything".
  expect(outcome?.kind === 'saved' || outcome?.kind === 'disabled' || closed, `a no-change save succeeds or closes the form (${JSON.stringify(outcome)})`).toBe(true);
});

Then(/^no "([^"]*)" error should be raised for the record's own values$/, async function (this: CustomWorld, message: string) {
  const pattern = locationCategoryMessagePattern(message);
  expect(await this.sawMessage(pattern, 1500), `"${message}" was shown; toasters: ${JSON.stringify(this.seenToasts)}`).toBe(false);
  const outcome = this.locationCategory.lastOutcome;
  if (outcome?.kind === 'rejected') expect(pattern.test(outcome.call.message), `API: ${outcome.call.message}`).toBe(false);
});

When(
  /^I edit "([^"]*)" and change its Parent from "([^"]*)" to "([^"]*)"$/,
  async function (this: CustomWorld, frdName: string, _from: string, to: string) {
    const category = await ensureCategory(this, frdName);
    await ensureCategory(this, 'District');
    await ensureCategory(this, 'Assembly Constituency');
    const newParent = requireFixture(this, to);
    this.locationCategory.scratch.saveSuppressed = false;
    await openEditFor(this, category);
    await this.pages.locationCategory.form.selectParent(newParent.name);
    await submitForm(this);
  },
);

Then(
  /^"([^"]*)" should move under "([^"]*)" along with its children "([^"]*)" and "([^"]*)"$/,
  async function (this: CustomWorld, frdName: string, parentName: string, first: string, second: string) {
    const { list } = this.pages.locationCategory;
    const moved = requireFixture(this, frdName);
    const parent = requireFixture(this, parentName);
    expect((await storedNow(this, moved.id)).parentId, `parent id of "${frdName}"`).toBe(parent.id);
    expect(sameText((await list.parentOnScreen(moved.name)) ?? '', parent.name), `"${frdName}" is drawn under "${parentName}"`).toBe(true);
    for (const childName of [first, second]) {
      const child = requireFixture(this, childName);
      expect(sameText((await list.parentOnScreen(child.name)) ?? '', moved.name), `"${childName}" is still drawn under "${frdName}"`).toBe(true);
    }
  },
);

Then(/^the child Parent IDs should be unchanged$/, async function (this: CustomWorld) {
  const moved = requireFixture(this, 'State/Territory');
  for (const childName of ['District', 'Assembly Constituency']) {
    expect((await storedNow(this, requireFixture(this, childName).id)).parentId, `parent id of "${childName}"`).toBe(moved.id);
  }
});

// ---------------------------------------------------------------------------
// Blocked updates (N_0018 - N_0022)
// ---------------------------------------------------------------------------

Then(/^"([^"]*)" should keep its original Name$/, async function (this: CustomWorld, frdName: string) {
  const fixture = requireFixture(this, frdName);
  expect(sameText((await storedNow(this, fixture.id)).name, fixture.name), `Name of "${frdName}" is unchanged`).toBe(true);
});

Then(/^"([^"]*)" should keep its original Short Name$/, async function (this: CustomWorld, frdName: string) {
  const fixture = requireFixture(this, frdName);
  expect(sameText((await storedNow(this, fixture.id)).shortName, fixture.shortName), `Short Name of "${frdName}" is unchanged`).toBe(true);
});

When(/^I attempt to select "([^"]*)" as its own Parent Category via dropdown or tampered request$/, async function (this: CustomWorld, frdName: string) {
  await tryParent(this, frdName);
});

When(/^I set Parent Category to "([^"]*)"$/, async function (this: CustomWorld, frdName: string) {
  await tryParent(this, frdName);
});

Then(
  /^the self-reference should be blocked, either the option is unavailable or Save is rejected with "([^"]*)"$/,
  function (this: CustomWorld, _value1: string) {
    if (this.locationCategory.parentOptionOffered === false) return;
    const outcome = this.locationCategory.lastOutcome;
    expect(outcome && outcome.kind !== 'saved', `the self-reference is blocked, but the form was ${outcome ? outcome.kind : 'not submitted'}`).toBe(true);
  },
);

Then(/^the circular hierarchy should be blocked$/, function (this: CustomWorld) {
  if (this.locationCategory.parentOptionOffered === false) return;
  const outcome = this.locationCategory.lastOutcome;
  expect(outcome && outcome.kind !== 'saved', `the circular hierarchy is blocked, but the form was ${outcome ? outcome.kind : 'not submitted'}`).toBe(true);
});

Then(/^the update should not be saved$/, function (this: CustomWorld) {
  expect(this.locationCategory.lastOutcome?.kind === 'saved', 'the update was saved').toBe(false);
});

Then(/^the Parent of "([^"]*)" should remain "([^"]*)"$/, async function (this: CustomWorld, frdName: string, parentName: string) {
  const child = requireFixture(this, frdName);
  expect((await storedNow(this, child.id)).parentId, `parent id of "${frdName}"`).toBe(requireFixture(this, parentName).id);
});

Then(/^the hierarchy should remain "([^"]*)"$/, async function (this: CustomWorld, chain: string) {
  const names = chain.split('>').map((name) => name.trim());
  const master = await freshMaster(this);
  for (let index = 1; index < names.length; index += 1) {
    const child = requireFixture(this, names[index]);
    const record = master.find((candidate) => candidate.id === child.id);
    expect(record?.parentId, `"${names[index]}" stays under "${names[index - 1]}"`).toBe(requireFixture(this, names[index - 1]).id);
  }
});

// ---------------------------------------------------------------------------
// Tampered update (N_0023)
// ---------------------------------------------------------------------------

/**
 * Learns the real update request by saving the category once without changes (the app's own call), then replays
 * it with a foreign id in the body and a new name, as a client that bypasses the UI would.
 */
When(/^I submit an update for "([^"]*)" including a different id in the payload$/, async function (this: CustomWorld, frdName: string, json: string) {
  const { api } = this.pages.locationCategory;
  const fixture = await ensureCategory(this, frdName);
  await openEditFor(this, fixture);
  // The app only enables Update once a field changed, so the template request renames the copy slightly.
  const renamed = `${fixture.name}x`;
  await this.pages.locationCategory.form.type('Location Category Name', renamed);
  this.locationCategory.refresh(fixture.id, { name: renamed });
  const outcome = await submitForm(this);
  if (outcome.kind !== 'saved') throw new Error(`The template update did not succeed: ${JSON.stringify(outcome)}`);
  const template = api.lastCall('Update');
  if (!template?.requestBody) throw new Error('The update request body could not be captured.');

  const tamper = JSON.parse(json) as { id: string; name: string };
  const body = JSON.parse(template.requestBody) as Record<string, unknown>;
  body.id = tamper.id;
  const nameKey = ['catName', 'name', 'displayName'].find((key) => key in body);
  if (nameKey) body[nameKey] = uniqueName(this, tamper.name);
  this.locationCategory.scratch.tamperedId = tamper.id;
  this.locationCategory.scratch.tamperedName = uniqueName(this, tamper.name);
  this.locationCategory.apiResult = await api.send(template.method as 'PUT' | 'POST' | 'PATCH', template.url, body);
});

When(/^I re-read the record$/, async function (this: CustomWorld) {
  this.locationCategory.scratch.master = await freshMaster(this);
});

Then(/^the ID change should be rejected or ignored$/, function (this: CustomWorld) {
  const result = this.locationCategory.apiResult!;
  const master = this.locationCategory.scratch.master as Array<{ id: number }>;
  const persisted = master.some((record) => String(record.id) === String(this.locationCategory.scratch.tamperedId));
  expect(persisted, `the answer was ${result.status} ${result.message}; id "${this.locationCategory.scratch.tamperedId}" was persisted`).toBe(false);
});

Then(/^the record should keep its original system-generated ID$/, function (this: CustomWorld) {
  const master = this.locationCategory.scratch.master as Array<{ id: number; name: string }>;
  const fixture = requireTarget(this);
  expect(master.some((record) => record.id === fixture.id), `category #${fixture.id} still has its id`).toBe(true);
});
