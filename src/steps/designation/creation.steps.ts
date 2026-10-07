/**
 * Steps of designation_creation.feature (FRD 6.2 - Designation Creation).
 * Page objects: DesignationCreationPage + the shared DesignationFormDialog.
 * Shared steps (Add, Save, toaster / validation messages, self-reference) are in ./common.steps.ts.
 */
import { Given, Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { expect } from '../../utils/assertions';
import {
  deleteFromAnotherTab,
  describeOutcome,
  differencesFromEntered,
  ensureDesignation,
  formField,
  openAddFor,
  requireTarget,
  returnToList,
  successfulSaveId,
  typeIntoForm,
  uniqueValue,
} from './helpers';

// ---------------------------------------------------------------------------
// Form layout and Reporting To lookup
// ---------------------------------------------------------------------------

Then(
  /^the Designation creation form displays the "Abbreviation", "Designation Name" and "Reporting To" fields$/,
  async function (this: CustomWorld) {
    await this.pages.designation.creation.expectAllFieldsDisplayed();
  },
);

Then(/^"Save" and "Back" buttons are present$/, async function (this: CustomWorld) {
  await this.pages.designation.creation.expectSaveAndBackButtons();
});

When(/^the user enters "([^"]*)" in the "(Abbreviation|Designation Name)" field$/, async function (
  this: CustomWorld,
  value: string,
  label: string,
) {
  const field = formField(label);
  await typeIntoForm(this, field, uniqueValue(this, field, value));
});

When(/^the user leaves the "Reporting To" field unselected$/, async function (this: CustomWorld) {
  await this.pages.designation.form.expectNoParentSelected();
  this.designation.entered.parent = undefined;
});

When(/^the user opens the "Reporting To" dropdown$/, async function (this: CustomWorld) {
  await this.pages.designation.form.openParentPicker();
});

Then(/^only Designations existing in the CivitCORE Designation Master are listed$/, async function (this: CustomWorld) {
  const { options, outside } = await this.pages.designation.creation.lookupEntriesOutsideMaster();
  expect(options.length, 'the Reporting To lookup offers Designations').toBeGreaterThan(0);
  expect(outside, 'lookup entries missing from the master').toEqual([]);
});

Then(/^no free-text or unrelated values are shown$/, async function (this: CustomWorld) {
  const creation = this.pages.designation.creation;
  const offered = await creation.isFreeTextOffered(`Free text ${this.designation.data.suffix}`);
  const { outside } = await creation.lookupEntriesOutsideMaster();
  expect(offered, 'typed text is not offered as a value').toBe(false);
  expect(outside, 'lookup entries missing from the master').toEqual([]);
  await creation.clearLookupText();
});

// ---------------------------------------------------------------------------
// Successful creation
// ---------------------------------------------------------------------------

Then(/^the Designation is created successfully$/, async function (this: CustomWorld) {
  const id = successfulSaveId(this, 'Create');
  await this.pages.designation.form.expectClosed();
  expect(differencesFromEntered(this, id), 'the stored Designation matches what was entered').toEqual([]);
});

Then(/^a unique Designation ID is generated$/, async function (this: CustomWorld) {
  const id = successfulSaveId(this, 'Create');
  expect(Number.isInteger(id) && id > 0, `generated id ${id}`).toBe(true);
  const holders = this.pages.designation.api.records().filter((record) => record.id === id);
  expect(holders.map((record) => record.name), `records holding id ${id}`).toEqual([requireTarget(this).name]);
  this.log(`Designation ID generated: ${id}`);
});

Then(/^the Designation is accepted as having no reporting relationship$/, async function (this: CustomWorld) {
  const id = successfulSaveId(this, 'Create');
  expect(this.pages.designation.api.recordById(id)?.parentId, 'the record reports to no Designation').toBeNull();
});

Then(/^the Designation is saved as a level-1 \(top-level\) record$/, async function (this: CustomWorld) {
  const id = successfulSaveId(this, 'Create');
  const { api, list } = this.pages.designation;
  const record = api.recordById(id)!;
  expect(record.depth, 'depth in the Designation hierarchy').toBe(0);
  await returnToList(this);
  await expect(await list.showRow(record.name)).toHaveClass(/\bag-row-level-0\b/);
});

// ---------------------------------------------------------------------------
// Validation / negative
// ---------------------------------------------------------------------------

Given(/^a Designation with (Designation Name|Abbreviation) "([^"]*)" already exists(?: in the Designation Master)?$/, async function (
  this: CustomWorld,
  kind: string,
  value: string,
) {
  if (kind === 'Abbreviation') await ensureDesignation(this, `${value} Designation`, { abbreviation: value });
  else await ensureDesignation(this, value);
});

Then(/^the whitespace-only value is treated as blank$/, async function (this: CustomWorld) {
  const outcome = this.designation.lastOutcome;
  expect(outcome?.kind, `a whitespace-only value is not saved: ${describeOutcome(outcome)}`).not.toBe('saved');
});

Then(/^the consecutive spaces are normalized to a single space before comparison$/, async function (this: CustomWorld) {
  const outcome = this.designation.lastOutcome;
  expect(outcome?.kind, `"Senior   Engineer" is treated as the existing "Senior Engineer": ${describeOutcome(outcome)}`).not.toBe('saved');
});

Then(/^no Designation record is created$/, async function (this: CustomWorld) {
  const outcome = this.designation.lastOutcome;
  expect(outcome?.kind === 'saved' && outcome.call.operation === 'Create', `last save: ${describeOutcome(outcome)}`).toBe(false);
  const name = this.designation.entered.name;
  await returnToList(this);
  if (name !== undefined && name.trim() !== '') {
    expect(this.pages.designation.api.recordsNamed(name), `records named "${name.trim()}"`).toHaveLength(0);
    await this.pages.designation.list.expectAbsent(name);
  }
});

When(/^the user searches the Designation List for "([^"]*)"$/, async function (this: CustomWorld, name: string) {
  await returnToList(this);
  await this.pages.designation.list.filterBy('Designation Name', this.designation.data.name(name));
});

Then(/^"([^"]*)" does not appear in the Designation List$/, async function (this: CustomWorld, name: string) {
  await this.pages.designation.list.expectAbsent(this.designation.data.name(name));
});

Given(/^the user has selected a Reporting To value on the Add Designation form$/, async function (this: CustomWorld) {
  const parent = await ensureDesignation(this, 'Reporting Parent', { asTarget: false });
  this.designation.target = parent;
  await openAddFor(this);
  await this.pages.designation.form.selectParent(parent.name);
  this.designation.entered.parent = parent;
});

Given(/^the referenced Designation has since been removed from the Designation Master$/, async function (this: CustomWorld) {
  const parent = this.designation.entered.parent;
  if (!parent) throw new Error('No Reporting To value was selected by an earlier step.');
  // Another session deletes the parent while this form stays open with it selected.
  await deleteFromAnotherTab(this, parent.name);
  this.log(`"${parent.name}" was deleted from a second tab while the Add form stayed open.`);
});
