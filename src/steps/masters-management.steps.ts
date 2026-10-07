/**
 * Masters Management / Admin Portal / Organization Configuration steps.
 */
import { Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../support/world';
import { expect, secondsToMs } from '../utils/assertions';

Then(/^the Masters Management link is visible(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  seconds?: string,
) {
  await expect(this.pages.mastersManagementPage.mastersManagementLink).toBeVisible({ timeout: secondsToMs(seconds) });
});

When('I open Masters Management', async function (this: CustomWorld) {
  await this.pages.mastersManagementPage.openMastersManagement();
});

Then('the Admin Portal is loaded', async function (this: CustomWorld) {
  await this.pages.mastersManagementPage.expectAdminPortalLoaded();
});

When('I open Organization Configuration', async function (this: CustomWorld) {
  await this.pages.mastersManagementPage.openOrganizationConfiguration();
});

When('I select the organization {string}', async function (this: CustomWorld, name: string) {
  await this.pages.mastersManagementPage.selectOrganization(name);
});

When(/^I choose "([^"]*)" from the organization list by its text(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  name: string,
  seconds?: string,
) {
  await this.pages.mastersManagementPage.selectOrganizationByText(name, secondsToMs(seconds));
});

Then('the organization is shown as selected', async function (this: CustomWorld) {
  await this.pages.mastersManagementPage.expectOrganizationSelected();
});
