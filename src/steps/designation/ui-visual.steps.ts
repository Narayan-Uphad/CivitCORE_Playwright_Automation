/**
 * Steps of designation_ui_visual.feature (FRD 6.2, 6.7, 9 - Reference Screens).
 * Page object: DesignationUiVisualPage.
 * Shared steps (opening the Add form, leaving a field blank, Save, Delete) are in ./common.steps.ts.
 */
import { Then } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { expect } from '../../utils/assertions';
import { designationMessagePattern } from '../../test-data/designation.data';
import { describeOutcome, formField, submitForm } from './helpers';

Then(/^the "Save" and "Close" buttons are visible and clearly labeled$/, async function (this: CustomWorld) {
  await this.pages.designation.uiVisual.expectSaveAndCloseLabelled();
});

Then(/^the buttons are enabled or disabled appropriately based on form state$/, async function (this: CustomWorld) {
  await this.pages.designation.uiVisual.expectEmptyFormButtonStates();
  // Save stays enabled on an empty form, so it must refuse to send an empty Designation.
  const outcome = await submitForm(this);
  expect(outcome.kind, `saving the empty form: ${describeOutcome(outcome)}`).toBe('client-validation');
});

Then(
  /^the validation message "([^"]*)" appears inline, close to the "([^"]*)" field$/,
  async function (this: CustomWorld, message: string, label: string) {
    await this.pages.designation.uiVisual.expectMessageInline(formField(label), designationMessagePattern(message), message);
  },
);

Then(/^the confirmation dialog clearly states the delete action$/, async function (this: CustomWorld) {
  await this.pages.designation.uiVisual.expectDeleteDialogStatesAction();
});

Then(/^the dialog displays distinctly labeled "Confirm"\/"Yes" and "Cancel"\/"No" buttons$/, async function (
  this: CustomWorld,
) {
  await this.pages.designation.uiVisual.expectDistinctConfirmAndCancel();
});
