/**
 * Delete confirmation steps (delete-added-department.spec.ts `confirmDeleteDialog`).
 */
import { Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../support/world';
import { config } from '../support/config';
import { expect, secondsToMs } from '../utils/assertions';
import { departmentMessages } from '../test-data/department.data';

Then(/^the delete confirmation dialog asks to permanently delete (\d+) items?$/, async function (
  this: CustomWorld,
  count: string,
) {
  await this.pages.deleteConfirmationDialog.expectPrompt(Number(count));
});

When('I confirm the deletion', async function (this: CustomWorld) {
  await this.pages.deleteConfirmationDialog.confirm();
  // The success toaster is transient, so it is recorded here for the assertion step that follows.
  await this.captureToast();
});

// The success toaster auto-dismisses, so a message recorded earlier in the scenario also counts.
Then(/^the department deleted success message is displayed(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  seconds?: string,
) {
  const timeout = secondsToMs(seconds) ?? config.expectTimeoutMs;
  expect(await this.sawMessage(departmentMessages.deleted, timeout)).toBe(true);
});
