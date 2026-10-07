/**
 * MIDC portal + Department Login steps.
 *
 * In shared-session mode (SHARED_SESSION=1) the login happens once, before the first scenario.
 * Every later Background repeats these same steps, so each of them short-circuits while the
 * session is still authenticated instead of signing in again.
 */
import { Given, Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../support/world';
import { alreadyAuthenticated, markAuthenticated } from '../support/session';
import { expect } from '../utils/assertions';
import { midcTestData } from '../test-data/midc.data';

Given('I open the MIDC portal', async function (this: CustomWorld) {
  if (alreadyAuthenticated()) {
    this.log('Shared session is already signed in; staying on the authenticated page.');
    return;
  }
  await this.pages.midcHomePage.open();
});

Then('the MIDC portal URL is loaded', async function (this: CustomWorld) {
  if (alreadyAuthenticated()) return;
  await expect(this.page).toHaveURL(midcTestData.homeUrl);
});

Then('the MIDC portal is loaded', async function (this: CustomWorld) {
  if (alreadyAuthenticated()) return;
  await this.pages.midcHomePage.expectLoaded();
});

When('I open the Department Login page', async function (this: CustomWorld) {
  if (alreadyAuthenticated()) return;
  await this.pages.midcHomePage.openDepartmentLogin();
});

Then('the Department Login page is displayed', async function (this: CustomWorld) {
  if (alreadyAuthenticated()) return;
  await this.pages.departmentLoginPage.expectLoaded();
});

When('I log in with the configured Department Login credentials', async function (this: CustomWorld) {
  if (alreadyAuthenticated()) {
    this.log('Reusing the session established before the first scenario.');
    return;
  }
  // Credentials come from MIDC_USERNAME / MIDC_PASSWORD (never logged).
  await this.pages.departmentLoginPage.login(midcTestData.credentials.username, midcTestData.credentials.password);
  markAuthenticated(this.page);
});

// Equivalent of: if (await departmentLoginPage.hasAuthenticationError()) test.skip(true, reason);
Then(
  'the scenario is skipped if Department Login authentication fails, because {string}',
  async function (this: CustomWorld, reason: string) {
    if (alreadyAuthenticated()) return undefined;
    if (await this.pages.departmentLoginPage.hasAuthenticationError()) {
      this.log(`Skipped: ${reason}`);
      return 'skipped';
    }
    return undefined;
  },
);
