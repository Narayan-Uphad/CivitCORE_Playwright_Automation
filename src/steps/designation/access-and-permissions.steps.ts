/**
 * Steps of designation_access_and_permissions.feature (FRD 6.1 - Designation Management Initiation).
 * Page object: DesignationAccessPage. Shared steps (login, navigation) are in ./common.steps.ts.
 */
import { Given, Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { ensureDesignation, ensureOnDesignationScreen, logInAs, requireTarget, returnToList } from './helpers';

Given(/^the user logs in with valid "([^"]*)" credentials$/, async function (this: CustomWorld, role: string) {
  return logInAs(this, role);
});

// FRD path "System Configuration > Master > Designation" is, in MIDC,
// Masters Management > Organization configuration > Designation tab > Organization "MIDC".
When(
  /^the user navigates to "System Configuration" > "Master" > "Designation" from the left menu$/,
  async function (this: CustomWorld) {
    await ensureOnDesignationScreen(this);
  },
);

Then(/^the Designation List (?:screen is displayed as the landing view|is displayed by default)$/, async function (
  this: CustomWorld,
) {
  await this.pages.designation.access.expectLandingView();
});

Then(
  /^parent-child Designations linked via "Reporting To" are shown in a hierarchical \(tree\/indented\) order$/,
  async function (this: CustomWorld) {
    const { access, api } = this.pages.designation;
    await access.expectTreeGrid();

    // Use an existing parent/child pair when the master has one, otherwise create one.
    let child = api.records().find((record) => record.parentId !== null);
    let parent = child ? api.recordById(child.parentId!) : undefined;
    if (!child || !parent) {
      const parentFixture = await ensureDesignation(this, 'Hierarchy Parent', { asTarget: false });
      const childFixture = await ensureDesignation(this, 'Hierarchy Child', { parent: parentFixture, asTarget: false });
      parent = api.recordById(parentFixture.id);
      child = api.recordById(childFixture.id);
    }
    await returnToList(this);
    await access.expectChildIndentedUnderParent(parent!.name, child!.name);
  },
);

Then(/^the "Add" button is visible and enabled$/, async function (this: CustomWorld) {
  await this.pages.designation.access.expectAddActionAvailable();
});

Then(/^the "Add" button is not visible or is disabled$/, async function (this: CustomWorld) {
  await this.pages.designation.access.expectAddActionUnavailable();
});

Given(/^at least one Designation exists in the Designation Master$/, async function (this: CustomWorld) {
  // A dedicated, dependency-free record makes the expected Delete state deterministic.
  await ensureDesignation(this, 'Row Action Check');
});

When(/^the user navigates to the Designation List and selects a Designation row$/, async function (this: CustomWorld) {
  await returnToList(this);
  await this.pages.designation.list.openRowMenu(requireTarget(this).name);
});

Then(/^"View", "Edit" and "Delete" actions are displayed against the Designation row$/, async function (
  this: CustomWorld,
) {
  await this.pages.designation.access.expectRowActions(['View', 'Edit', 'Delete']);
});

Then(/^the state of the "Delete" action reflects the dependency check outcome$/, async function (this: CustomWorld) {
  // The selected record has no Employee, Post or child Designation, so Delete must be available.
  await this.pages.designation.access.expectDeleteActionEnabled();
});
