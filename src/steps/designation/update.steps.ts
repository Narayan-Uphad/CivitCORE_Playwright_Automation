/**
 * Steps of designation_update.feature (FRD 6.4 - Designation Update).
 * Page objects: DesignationUpdatePage + the shared DesignationFormDialog.
 * Shared steps (Edit mode, Save, Reporting To, messages, self-reference) are in ./common.steps.ts.
 */
import { Given, Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { expect } from '../../utils/assertions';
import {
  differencesFromEntered,
  ensureDesignation,
  formField,
  openEditFor,
  requireFixture,
  requireTarget,
  returnToList,
  submitForm,
  successfulSaveId,
  typeIntoForm,
  uniqueValue,
} from './helpers';

// ---------------------------------------------------------------------------
// Opening a Designation in Edit mode
// ---------------------------------------------------------------------------

When(/^the user clicks "Edit" on the Designation "([^"]*)"$/, async function (this: CustomWorld, designation: string) {
  await openEditFor(this, requireFixture(this, designation));
});

Given(/^an existing Designation record with a known Designation ID$/, async function (this: CustomWorld) {
  const fixture = await ensureDesignation(this, 'Known Id');
  this.log(`Designation ID before the update: ${fixture.id}`);
});

Given(/^a Designation "([^"]*)" - "([^"]*)" (?:exists and )?is open in Edit mode$/, async function (
  this: CustomWorld,
  abbreviation: string,
  name: string,
) {
  await openEditFor(this, await ensureDesignation(this, name, { abbreviation }));
});

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

When(/^the user updates the "(Abbreviation|Designation Name)" field to "([^"]*)"$/, async function (
  this: CustomWorld,
  label: string,
  value: string,
) {
  const field = formField(label);
  await typeIntoForm(this, field, uniqueValue(this, field, value));
});

When(/^the user updates the Designation Name and clicks "Save"$/, async function (this: CustomWorld) {
  await typeIntoForm(this, 'Designation Name', `${requireTarget(this).name} Updated`);
  await submitForm(this);
});

When(/^the user changes the Designation Name of "([^"]*)" to "([^"]*)"$/, async function (
  this: CustomWorld,
  abbreviation: string,
  value: string,
) {
  expect(this.designation.editing, `"${abbreviation}" is open in Edit mode`).toBeTruthy();
  await typeIntoForm(this, 'Designation Name', this.designation.data.name(value));
});

When(/^the user reopens the Designation in View mode$/, async function (this: CustomWorld) {
  const record = this.pages.designation.api.recordById(requireTarget(this).id);
  if (!record) throw new Error(`Designation #${requireTarget(this).id} is no longer in the master.`);
  await returnToList(this);
  const action = await this.pages.designation.update.reopenForReview(record.name);
  this.log(`Re-opened "${record.name}" via its ${action} action.`);
});

// ---------------------------------------------------------------------------
// Outcome
// ---------------------------------------------------------------------------

Then(/^the Designation record is updated successfully$/, async function (this: CustomWorld) {
  const id = successfulSaveId(this, 'Update');
  await this.pages.designation.form.expectClosed();
  expect(differencesFromEntered(this, id), 'the stored Designation matches what was entered').toEqual([]);
});

Then(/^the Designation ID after update is identical to the Designation ID before update$/, async function (this: CustomWorld) {
  const target = requireTarget(this);
  const updatedId = successfulSaveId(this, 'Update');
  expect(updatedId, 'the update was sent for the same Designation ID').toBe(target.id);
  const newName = this.designation.entered.name!;
  const holders = this.pages.designation.api.recordsNamed(newName).map((record) => record.id);
  expect(holders, `ID of "${newName.trim()}" after the update`).toEqual([target.id]);
});

Then(
  /^the Designation List displays the newly updated Designation Name without requiring a page reload$/,
  async function (this: CustomWorld) {
    successfulSaveId(this, 'Update');
    await returnToList(this);
    await this.pages.designation.list.showRow(this.designation.entered.name!.trim());
  },
);

Then(/^"([^"]*)" retains its original Designation Name$/, async function (this: CustomWorld, abbreviation: string) {
  const original = requireFixture(this, abbreviation);
  const stored = this.pages.designation.api.recordById(original.id);
  expect(stored?.name, `stored name of "${abbreviation}"`).toBe(original.name);
  await returnToList(this);
  await this.pages.designation.list.showRow(original.name);
});
