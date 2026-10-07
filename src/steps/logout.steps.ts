/**
 * Logout steps.
 */
import { Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../support/world';
import { markLoggedOut } from '../support/session';
import { expect, secondsToMs } from '../utils/assertions';
import { midcTestData } from '../test-data/midc.data';

When('I open the user profile menu', async function (this: CustomWorld) {
  await this.pages.logoutPage.openUserMenu();
});

Then(/^the Logout option is visible(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  seconds?: string,
) {
  await this.pages.logoutPage.expectLogoutOptionVisible(secondsToMs(seconds) ?? 15000);
});

When('I click Logout', async function (this: CustomWorld) {
  await this.pages.logoutPage.clickLogout();
  await this.pages.logoutPage.confirmIfPrompted();
  markLoggedOut();
});

When('I log out of the portal', async function (this: CustomWorld) {
  await this.pages.logoutPage.logout();
  markLoggedOut();
});

Then(/^I am logged out and returned to the signed-out portal(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  seconds?: string,
) {
  await this.pages.logoutPage.expectLoggedOut(secondsToMs(seconds) ?? 30000);
});

Then('the Masters Management link is no longer visible', async function (this: CustomWorld) {
  await expect(this.pages.mastersManagementPage.mastersManagementLink).toBeHidden({ timeout: 30000 });
});

When('I navigate back in the browser', async function (this: CustomWorld) {
  await this.page.goBack();
});

Then('the session is not restored', async function (this: CustomWorld) {
  await expect(this.pages.mastersManagementPage.mastersManagementLink).toBeHidden({ timeout: 30000 });
});

Then('reopening the MIDC portal does not restore the session', async function (this: CustomWorld) {
  await this.pages.logoutPage.expectSessionNotRestorableVia(midcTestData.homeUrl);
});
