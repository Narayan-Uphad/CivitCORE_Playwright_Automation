/**
 * Steps of designation_toaster_notifications.feature (FRD 8 - Toaster Messages).
 * Page object: DesignationToasterPage.
 * Shared steps (Add form, Save, Delete / confirm, "a toaster message ... is displayed") are in ./common.steps.ts.
 */
import { Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { typeIntoForm } from './helpers';

When(/^the user fills all mandatory fields with valid, unique values$/, async function (this: CustomWorld) {
  await typeIntoForm(this, 'Designation Name', this.designation.data.name('Toaster Check'));
  await typeIntoForm(this, 'Abbreviation', this.designation.data.abbreviation('TC'));
});

Then(/^the toaster is transient and auto-dismisses$/, async function (this: CustomWorld) {
  await this.pages.designation.toaster.expectAutoDismissed();
});
