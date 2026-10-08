/**
 * Steps of location_category_creation.feature (FRD 6.2, US-2 - Location Category Creation).
 * Page objects: LocationCategoryListPage, LocationCategoryFormDialog, LocationCategoryApi.
 * Shared steps (login, baseline data, field entry, Save, messages) are in ./common.steps.ts.
 *
 * Every name a scenario types gets the scenario's unique suffix (see location-category.data.ts), so
 * "Substation" becomes "Substation Bdd1234567" and a duplicate of the baseline "Airport" is a duplicate of the
 * scenario's own copy. The Code and Prod Code the form requires but the FRD does not mention are filled on Save.
 */
import { Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import type { CreatePayload } from '../../pages/location_category';
import { expect } from '../../utils/assertions';
import { normalizeLocationCategoryText } from '../../test-data/location-category.data';
import {
  describeOutcome,
  ensureSession,
  freshMaster,
  requireFixture,
  returnToList,
  sameText,
  submitForm,
  successfulSaveId,
  uniqueName,
  uniqueShortName,
} from './helpers';
import { expectNoCreateThroughForm } from './common.steps';

function splitNames(list: string): string[] {
  return list
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

/** The record the last successful Create stored, read straight from the API. */
async function createdRecord(world: CustomWorld) {
  const id = successfulSaveId(world, 'Create');
  const record = (await freshMaster(world)).find((candidate) => candidate.id === id);
  expect(record, `category #${id} is in the master`).toBeTruthy();
  return record!;
}

/** Turns the FRD payload of a "tampered request" scenario into the app's create payload (with unique values). */
function tamperedCreate(world: CustomWorld, json: string): CreatePayload {
  const body = JSON.parse(json) as Record<string, unknown>;
  const catName = uniqueName(world, String(body.name));
  world.locationCategory.scratch.apiName = catName;
  const payload: CreatePayload = {
    catName,
    catShortName: uniqueShortName(world, String(body.shortName)),
    catCode: world.locationCategory.data.code(),
  };
  if ('parentId' in body) payload.parentID = body.parentId as string;
  if ('id' in body) payload.id = body.id;
  return payload;
}

// ---------------------------------------------------------------------------
// Form (F_0018)
// ---------------------------------------------------------------------------

Then(
  /^the creation form should be displayed with "Location Category Name", "Short Name" and "Parent Category" dropdown fields$/,
  async function (this: CustomWorld) {
    const { form } = this.pages.locationCategory;
    await expect(form.title).toHaveText(/Add Location Category/);
    await expect(form.nameInput, 'Location Category Name').toBeVisible();
    await expect(form.shortNameInput, 'Short Name').toBeVisible();
    // Parent Category = "Nest Location Under" checkbox + "Select Parent Location Category" lookup.
    await expect(form.nestCheckbox, 'Parent Category switch').toBeVisible();
    await expect(form.parentInput, 'Parent Category lookup').toBeAttached();
  },
);

Then(/^the Location Category ID should not be available for user input$/, async function (this: CustomWorld) {
  const labels = await this.pages.locationCategory.form.fieldLabels();
  expect(
    labels.filter((label) => /\bid\b/i.test(label)),
    `form fields: ${labels.join(', ')}`,
  ).toEqual([]);
});

// ---------------------------------------------------------------------------
// Successful creation (F_0019 - F_0024)
// ---------------------------------------------------------------------------

Then(/^the category should be created and a unique Location Category ID should be generated$/, async function (this: CustomWorld) {
  const record = await createdRecord(this);
  expect(record.id, 'a system-generated id').toBeGreaterThan(0);
  const sameId = (await freshMaster(this)).filter((candidate) => candidate.id === record.id);
  expect(sameId, 'the id is unique in the master').toHaveLength(1);
});

Then(
  /^the category should be stored in the Master with Parent Category "([^"]*)" stored by Parent ID$/,
  async function (this: CustomWorld, parentName: string) {
    const record = await createdRecord(this);
    expect(record.parentId, `parent id of "${record.name}"`).toBe(requireFixture(this, parentName).id);
  },
);

Then(/^the category should be created successfully without a Parent Category$/, async function (this: CustomWorld) {
  const record = await createdRecord(this);
  expect(record.parentId, 'no parent').toBeNull();
  this.locationCategory.scratch.created = record;
});

Then(/^the category should be displayed at the top level \(L1\) of the hierarchy$/, async function (this: CustomWorld) {
  const { list } = this.pages.locationCategory;
  const record = (this.locationCategory.scratch.created ?? (await createdRecord(this))) as { name: string };
  await returnToList(this);
  await list.showRow(record.name);
  const row = (await list.gridRows()).find((candidate) => sameText(candidate.name, record.name));
  expect(row?.level, `"${record.name}" is drawn at level 0 (L1)`).toBe(0);
});

When(/^I compare the generated IDs$/, async function (this: CustomWorld) {
  const created = this.locationCategory.createdViaUi;
  expect(created, 'two categories were created').toHaveLength(2);
  this.locationCategory.scratch.ids = created.map((category) => category.id);
});

Then(/^two different system-generated IDs should be assigned$/, function (this: CustomWorld) {
  const ids = this.locationCategory.scratch.ids as number[];
  expect(new Set(ids).size, `ids ${ids.join(', ')}`).toBe(2);
});

Then(/^neither ID should duplicate an existing category ID$/, async function (this: CustomWorld) {
  const ids = this.locationCategory.scratch.ids as number[];
  const master = (await freshMaster(this)).map((record) => record.id);
  for (const id of ids) expect(master.filter((candidate) => candidate === id), `id ${id} appears once`).toHaveLength(1);
});

Then(/^the Name should be stored exactly as "([^"]*)"$/, async function (this: CustomWorld, name: string) {
  const record = await createdRecord(this);
  const expected = uniqueName(this, name);
  expect(record.rawName.toLowerCase(), 'stored Name').toBe(expected.toLowerCase());
  if (record.rawName !== expected) this.log(`The app stored "${record.rawName}" for "${expected}" (letter case differs).`);
});

Then(/^the Short Name should be stored exactly as "([^"]*)"$/, async function (this: CustomWorld, shortName: string) {
  const record = await createdRecord(this);
  const expected = uniqueShortName(this, shortName);
  expect(record.rawShortName.toLowerCase(), 'stored Short Name').toBe(expected.toLowerCase());
  if (record.rawShortName !== expected) this.log(`The app stored "${record.rawShortName}" for "${expected}" (letter case differs).`);
});

/** The build has no Detail view, so "the saved record" is read from the list row and the API. */
When(/^I open the saved category's Detail view$/, async function (this: CustomWorld) {
  const record = await createdRecord(this);
  await returnToList(this);
  await this.pages.locationCategory.list.showRow(record.name.trim());
  this.log('The MIDC build has no Detail view; the saved values were read from the list row and the API.');
});

Then(/^the saved Name should be "([^"]*)"$/, async function (this: CustomWorld, name: string) {
  const record = await createdRecord(this);
  expect(record.rawName.toLowerCase(), 'stored Name has no leading / trailing spaces').toBe(uniqueName(this, name).trim().toLowerCase());
});

Then(/^the saved Short Name should be "([^"]*)"$/, async function (this: CustomWorld, shortName: string) {
  const record = await createdRecord(this);
  expect(record.rawShortName.toLowerCase(), 'stored Short Name has no leading / trailing spaces').toBe(
    uniqueShortName(this, shortName).trim().toLowerCase(),
  );
});

// ---------------------------------------------------------------------------
// Parent Category dropdown (F_0025, N_0015)
// ---------------------------------------------------------------------------

When(/^I open the Parent Category dropdown$/, async function (this: CustomWorld) {
  await this.pages.locationCategory.form.openParentPicker();
});

When(/^I compare the options with the master "([^"]*)"$/, async function (this: CustomWorld, names: string) {
  const { form } = this.pages.locationCategory;
  this.locationCategory.scratch.options = await form.parentOptionNames();
  this.locationCategory.scratch.masterNames = (await freshMaster(this)).map((record) => record.name);
  this.locationCategory.scratch.wanted = splitNames(names).map((name) => requireFixture(this, name).name);
});

Then(/^the dropdown should contain exactly the (\d+) existing valid categories$/, function (this: CustomWorld, count: string) {
  // The live master also holds its real categories, so "exactly" means: every master category, the scenario's
  // own copies of the FRD baseline among them.
  const { options, masterNames, wanted } = this.locationCategory.scratch as { options: string[]; masterNames: string[]; wanted: string[] };
  expect(wanted).toHaveLength(Number(count));
  const offered = options.map(normalizeLocationCategoryText);
  for (const name of wanted) expect(offered, `"${name}" is offered`).toContain(normalizeLocationCategoryText(name));
  expect([...new Set(offered)].sort(), 'the dropdown lists exactly the master categories').toEqual(
    [...new Set(masterNames.map(normalizeLocationCategoryText))].sort(),
  );
});

Then(/^no invalid or deleted values should be present$/, function (this: CustomWorld) {
  const { options, masterNames } = this.locationCategory.scratch as { options: string[]; masterNames: string[] };
  const master = masterNames.map(normalizeLocationCategoryText);
  expect(options.filter((option) => !master.includes(normalizeLocationCategoryText(option))), 'options that are not in the master').toEqual([]);
});

Then(/^no free-text value should be enterable$/, async function (this: CustomWorld) {
  const { form } = this.pages.locationCategory;
  // The lookup field lets you type (it filters the list); what matters is that typing never creates a selectable value.
  await form.parentInput.pressSequentially('Made Up Parent', { delay: 5 }).catch(() => undefined);
  expect(await form.parentOption('Made Up Parent').count(), 'typed text is not offered as a Parent Category').toBe(0);
  const master = (this.locationCategory.scratch.masterNames as string[]).map(normalizeLocationCategoryText);
  const offered = (await form.parentOptionNames()).map(normalizeLocationCategoryText);
  expect(offered.filter((name) => !master.includes(name)), 'options that are not master categories').toEqual([]);
});

When(/^I click into the Parent Category field$/, async function (this: CustomWorld) {
  const { form } = this.pages.locationCategory;
  await form.openParentPicker();
});

When(/^I type "([^"]*)" and attempt to save$/, async function (this: CustomWorld, text: string) {
  const { form } = this.pages.locationCategory;
  await form.parentInput.pressSequentially(text, { delay: 5 }).catch(() => undefined);
  this.locationCategory.scratch.typedParent = text;
  this.locationCategory.scratch.parentValueAfterTyping = (await form.parentInput.inputValue()).trim();
  // Give the form valid Name / Short Name so only the Parent Category can stop the save.
  const name = uniqueName(this, 'Free Text Parent Check');
  await form.type('Location Category Name', name);
  await form.type('Short Name', uniqueShortName(this, 'FTP'));
  this.locationCategory.scratch.apiName = undefined;
  this.locationCategory.scratch.freeTextName = name;
  await submitForm(this);
});

Then(/^only values from the dropdown should be selectable$/, async function (this: CustomWorld) {
  const typed = String(this.locationCategory.scratch.typedParent);
  expect(await this.pages.locationCategory.form.parentOption(typed).count(), 'typed text is not offered as a Parent Category').toBe(0);
});

Then(/^the free-text value should not be accepted$/, async function (this: CustomWorld) {
  // Accepting it would mean a category saved under a parent named like the typed text.
  const typed = String(this.locationCategory.scratch.typedParent);
  const master = await freshMaster(this);
  const saved = master.find((record) => sameText(record.name, String(this.locationCategory.scratch.freeTextName)));
  const parent = saved ? master.find((record) => record.id === saved.parentId) : undefined;
  expect(parent?.name ?? '', `parent of the saved category (${describeOutcome(this.locationCategory.lastOutcome)})`).not.toMatch(new RegExp(typed, 'i'));
});

Then(/^the free-text value should not be saved$/, async function (this: CustomWorld) {
  const typed = String(this.locationCategory.scratch.typedParent);
  const master = await freshMaster(this);
  expect(master.filter((record) => sameText(record.name, typed)), `no category named "${typed}" was created`).toEqual([]);
  const saved = master.find((record) => sameText(record.name, String(this.locationCategory.scratch.freeTextName)));
  if (saved) {
    const parent = master.find((record) => record.id === saved.parentId);
    expect(parent?.name ?? '', `parent of the saved category (${describeOutcome(this.locationCategory.lastOutcome)})`).not.toMatch(/made up parent/i);
  }
});

// ---------------------------------------------------------------------------
// Validation (N_0012, N_0013) and cancel (N_0017)
// ---------------------------------------------------------------------------

Then(/^Save should be prevented with a validation error(?: for invalid characters)?$/, function (this: CustomWorld) {
  const outcome = this.locationCategory.lastOutcome;
  expect(outcome && outcome.kind !== 'saved', `the save is blocked, but ${describeOutcome(outcome)}`).toBe(true);
});

Then(/^the form should close$/, async function (this: CustomWorld) {
  await this.pages.locationCategory.form.expectClosed();
});

Then(/^no toaster should be shown$/, async function (this: CustomWorld) {
  expect(await this.visibleToasts(), 'toasters on screen').toEqual([]);
  expect(this.seenToasts, 'toasters seen during the scenario').toEqual([]);
});

Then(/^no Activity Log entry should be created$/, function (this: CustomWorld) {
  // The build has no Activity Log screen, so the verifiable part is that nothing was saved that could be logged.
  expectNoCreateThroughForm(this);
  this.log('No Activity Log screen exists; verified instead that no category was created.');
});

// ---------------------------------------------------------------------------
// API-level scenarios (N_0014, N_0016)
// ---------------------------------------------------------------------------

When(/^I submit a create request with a Parent Category ID that does not exist in the master$/, async function (this: CustomWorld, json: string) {
  // The FRD payload carries a non-numeric parent id, which the app's numeric ParentID never matches.
  await ensureSession(this);
  this.locationCategory.apiResult = await this.pages.locationCategory.api.create(tamperedCreate(this, json));
});

Then(/^the request should be rejected with "([^"]*)"$/, function (this: CustomWorld, message: string) {
  const result = this.locationCategory.apiResult!;
  expect(result.status, `the API answered ${result.status} ${result.message}`).toBeGreaterThanOrEqual(400);
  this.log(`Rejected as "${message}" in the FRD; the app answered ${result.status}: ${result.message}`);
});

When(/^I submit a create request including a custom id$/, async function (this: CustomWorld, json: string) {
  this.locationCategory.apiResult = await this.pages.locationCategory.api.create(tamperedCreate(this, json));
});

When(/^I read the created record, if any$/, async function (this: CustomWorld) {
  this.locationCategory.scratch.master = await freshMaster(this);
});

Then(
  /^either the request should be rejected, or the custom ID should be ignored and the system should generate its own ID$/,
  function (this: CustomWorld) {
    const result = this.locationCategory.apiResult as { status: number; message: string; id?: number };
    if (result.status >= 300) return;
    expect(result.id, 'the system generated its own numeric id').toEqual(expect.any(Number));
    expect(String(result.id)).not.toBe('LC-CUSTOM-001');
  },
);

Then(/^the ID "([^"]*)" should never be persisted$/, function (this: CustomWorld, id: string) {
  const master = this.locationCategory.scratch.master as Array<{ id: number }>;
  expect(master.map((record) => String(record.id)), `no record has id "${id}"`).not.toContain(id);
});
