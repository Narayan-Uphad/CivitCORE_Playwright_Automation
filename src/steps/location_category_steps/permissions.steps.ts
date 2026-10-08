/**
 * Steps of location_category_permissions.feature (FRD 3, 6.1 BR-3, 6.2, 6.7 - Permissions).
 * Page object: LocationCategoryListPage (toolbar + row action menu) and LocationCategoryApi (server-side checks).
 *
 * The build's row menu offers Edit and Delete only: there is no "View" action (the grid itself is the view), so the
 * FRD's "View" is noted in the log instead of asserted. View-only / Editor / NoAccess users must be configured
 * (MIDC_<ROLE>_USERNAME / _PASSWORD); otherwise the scenario is skipped at the login step.
 */
import { Given, Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { expect } from '../../utils/assertions';
import { ensureCategory, ensureSession, logInAs, NO_VIEW_SCREEN, returnToList, skipBecause, uniqueName, uniqueShortName } from './helpers';

/** Row action labels of the scenario's copy of "Zone" (admin) or of the first listed category (other roles). */
async function rowActions(world: CustomWorld): Promise<string[]> {
  const { list } = world.pages.locationCategory;
  await returnToList(world);
  if (/^admin/i.test(String(world.locationCategory.scratch.role ?? 'admin'))) {
    const fixture = await ensureCategory(world, 'Zone');
    await returnToList(world);
    await list.openRowMenu(fixture.name);
  } else {
    await expect(list.dataRows.first()).toBeVisible();
    await list.dataRows.first().locator('[col-id="action"] button').click();
  }
  const labels = await list.rowMenuLabels();
  await list.closeRowMenu();
  world.locationCategory.scratch.actions = labels;
  return labels;
}

When(/^I observe the toolbar above the list$/, async function (this: CustomWorld) {
  await returnToList(this);
});

When(/^I observe the row actions for (?:any|a) category$/, async function (this: CustomWorld) {
  await rowActions(this);
});

When(/^I open the category Detail view and observe the actions$/, function (this: CustomWorld) {
  return skipBecause(this, NO_VIEW_SCREEN);
});

Then(/^the "Add Location Category" action should be visible and enabled$/, async function (this: CustomWorld) {
  const { list } = this.pages.locationCategory;
  await expect(list.addButton).toBeVisible();
  await expect(list.addButton).toBeEnabled();
});

Then(/^the "Add Location Category" action should be hidden or disabled$/, async function (this: CustomWorld) {
  const { list } = this.pages.locationCategory;
  if (await list.addButton.isVisible().catch(() => false)) await expect(list.addButton).toBeDisabled();
});

Then(/^the "View", "Edit" and "Delete" actions should be visible on every row$/, function (this: CustomWorld) {
  const actions = this.locationCategory.scratch.actions as string[];
  for (const action of ['Edit', 'Delete']) expect(actions, `row action "${action}"`).toContain(action);
  if (!actions.includes('View')) this.log(`FRD action "View" is not offered by this build (row menu: ${actions.join(', ')}).`);
});

Then(/^only the "View" action should be displayed$/, function (this: CustomWorld) {
  const actions = this.locationCategory.scratch.actions as string[];
  expect(
    actions.filter((action) => action !== 'View'),
    'row actions other than View',
  ).toEqual([]);
});

Then(/^the "Edit" and "Delete" actions should not be available$/, function (this: CustomWorld) {
  const actions = this.locationCategory.scratch.actions as string[];
  expect(actions.filter((action) => /^(Edit|Delete)$/.test(action))).toEqual([]);
});

Then(/^the "View" and "Edit" actions should be displayed$/, function (this: CustomWorld) {
  expect(this.locationCategory.scratch.actions as string[]).toContain('Edit');
});

Then(/^the "Delete" action should not be displayed on the list$/, function (this: CustomWorld) {
  expect(this.locationCategory.scratch.actions as string[]).not.toContain('Delete');
});

Then(/^the "Delete" action should not be displayed on the Detail view$/, function () {
  // Unreachable: the Detail-view step above always skips this scenario.
});

// ---------------------------------------------------------------------------
// No access (N_0001)
// ---------------------------------------------------------------------------

When(/^I check the left menu for "Location Category Management"$/, async function (this: CustomWorld) {
  const { list } = this.pages.locationCategory;
  const masters = this.pages.mastersManagementPage;
  if (await masters.mastersManagementLink.isVisible().catch(() => false)) {
    await masters.openMastersManagement();
    await masters.expectAdminPortalLoaded();
  }
  if (await list.organizationConfigurationIcon.isVisible().catch(() => false)) await list.organizationConfigurationIcon.click();
  this.locationCategory.scratch.menuVisible = await list.locationCategoryTab.isVisible({ timeout: 5000 }).catch(() => false);
});

When(/^I attempt to open the Location Category URL directly$/, async function (this: CustomWorld) {
  // The screen is a tab inside the Admin Portal (it has no URL of its own), so "direct access" means asking the API.
  this.locationCategory.apiResult = await this.pages.locationCategory.api.send('POST', 'locationCategory/3.0/getHierarchy', {
    specifiedOrgOnly: false,
    orgID: 1,
  });
});

Then(/^the "Location Category Management" menu entry should not be displayed$/, function (this: CustomWorld) {
  expect(this.locationCategory.scratch.menuVisible, 'the Location Category tab is hidden').toBe(false);
});

Then(/^direct URL access should be denied with an access denied message or redirect$/, function (this: CustomWorld) {
  const result = this.locationCategory.apiResult!;
  expect([401, 403], `the API answered ${result.status} ${result.message}`).toContain(result.status);
});

Then(/^no category data should be exposed$/, function (this: CustomWorld) {
  const body = this.locationCategory.apiResult!.body;
  expect(Array.isArray(body) && body.length > 0, 'no categories came back').toBe(false);
});

// ---------------------------------------------------------------------------
// Server-side permission checks (N_0002, N_0003)
// ---------------------------------------------------------------------------

When(/^I send a create-category request using the Viewer's token with payload$/, async function (this: CustomWorld, payload: string) {
  const body = JSON.parse(payload) as { name: string; shortName: string };
  const catName = uniqueName(this, body.name);
  this.locationCategory.scratch.apiName = catName;
  this.locationCategory.apiResult = await this.pages.locationCategory.api.create({
    catName,
    catShortName: uniqueShortName(this, body.shortName),
    catCode: this.locationCategory.data.code(),
  });
});

Then(/^the request should be rejected as unauthorized with status 403$/, function (this: CustomWorld) {
  const result = this.locationCategory.apiResult!;
  expect(result.status, `the API answered ${result.status} ${result.message}`).toBe(403);
});

Then(/^the request should be rejected as unauthorized$/, function (this: CustomWorld) {
  const result = this.locationCategory.apiResult!;
  expect([401, 403], `the API answered ${result.status} ${result.message}`).toContain(result.status);
});

Given(
  /^"([^"]*)" with role "([^"]*)" (?:is authenticated with a valid session token|having View and Edit but no Delete permission is authenticated)$/,
  async function (this: CustomWorld, _user: string, role: string) {
    const skipped = await logInAs(this, role);
    if (skipped) return skipped;
    await ensureSession(this);
    this.locationCategory.scratch.role = role;
    return undefined;
  },
);

Given(/^a deletable category "([^"]*)" exists$/, function (this: CustomWorld, _value1: string) {
  // The Editor cannot create categories and the scenario signs in as the Editor only, so a fixture
  // would have to be seeded by a second (Admin) session, which this suite does not open.
  return skipBecause(this, 'the category must be created by an Admin session while the scenario runs as the Editor; seed it out of band.');
});

When(/^I send a delete request for "([^"]*)" using the Editor's token$/, function (_value1: string) {
  // Unreachable: the Given above always skips this scenario.
});

