/**
 * Steps of designation_cross_module_consumption.feature
 * (FRD 6.5 - Usage in Employee & Post Management, 6.6 - Consumption by Civit Products).
 * Page object: DesignationCrossModulePage.
 *
 * What the MIDC build offers (checked against the live portal):
 *  - Post: a Position of a Designation in an Office, so Post scenarios use a temporary Position of a
 *    temporary Designation.
 *  - Employee: no Designation field on "Register New Employee", and registering one sends real
 *    invitations. Employee scenarios are skipped.
 *  - Other Civit products (CivitBUILD): not reachable from this portal. Skipped.
 * Shared steps (navigating to the Post / Employee screen, opening the lookup) are in ./common.steps.ts.
 */
import { Given, Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { expect } from '../../utils/assertions';
import {
  addPosts,
  describeOutcome,
  ensureDesignation,
  openEditFor,
  requireTarget,
  returnToList,
  skipBecause,
  unreachable,
  NO_EMPLOYEE_DATA,
} from './helpers';

const NO_OTHER_PRODUCT = 'other Civit products (e.g. CivitBUILD) are not reachable from the MIDC portal.';

// ---------------------------------------------------------------------------
// New Designation available in the Employee / Post lookup
// ---------------------------------------------------------------------------

Then(/^the Designation "([^"]*)" - "([^"]*)" is available for selection$/, async function (
  this: CustomWorld,
  _abbreviation: string,
  name: string,
) {
  const expectedName = this.designation.data.name(name).trim();
  const target = requireTarget(this);
  expect(target.name.toLowerCase(), 'the Designation created by this scenario').toBe(expectedName.toLowerCase());
  // The row action is how a Post of this Designation is created, i.e. how it is selected.
  await this.pages.designation.crossModule.expectSelectableForPost(target.name);
});

// ---------------------------------------------------------------------------
// Updating a Designation keeps its Employee / Post associations
// ---------------------------------------------------------------------------

Given(/^a Designation is associated with one or more existing (Employees|Posts)$/, async function (this: CustomWorld, entity: string) {
  if (entity === 'Employees') return skipBecause(this, NO_EMPLOYEE_DATA);
  await addPosts(this, await ensureDesignation(this, 'Post Linked'), 1);
  return undefined;
});

When(/^the user edits the Designation's Name, Abbreviation or Reporting To$/, async function (this: CustomWorld) {
  const target = requireTarget(this);
  await openEditFor(this, target);
  const updated = `${target.name} Updated`;
  await this.pages.designation.form.type('Designation Name', updated);
  this.designation.entered.name = updated;
});

When(/^the user navigates to the associated (Employee|Post) record\(s\)$/, async function (this: CustomWorld, module: string) {
  if (module === 'Employee') unreachable('the user navigates to the associated Employee record(s)');
  await returnToList(this);
  await this.pages.designation.crossModule.openPostLookup();
});

Then(/^the Designation update completes successfully$/, async function (this: CustomWorld) {
  const outcome = this.designation.lastOutcome;
  expect(outcome?.kind === 'saved' && outcome.call.operation === 'Update', `the update: ${describeOutcome(outcome)}`).toBe(true);
  expect(outcome?.kind === 'saved' && outcome.call.id, 'the update targeted the associated Designation').toBe(requireTarget(this).id);
});

Then(
  /^the existing (Employee|Post)-Designation association\(s\) remain intact and unchanged$/,
  async function (this: CustomWorld, module: string) {
    if (module === 'Employee') unreachable('the existing Employee-Designation association(s) remain intact and unchanged');
    const target = requireTarget(this);
    const added = this.designation.addedPositions.get(target.id) ?? 0;
    const renamed = this.designation.entered.name!.trim();
    const total = await this.pages.designation.crossModule.postCount(renamed);
    expect(total, `Positions of "${renamed}" after the rename`).toBe(added);
  },
);

// ---------------------------------------------------------------------------
// Employee keeps the same Designation ID after an Abbreviation update
// ---------------------------------------------------------------------------

Given(/^Employee "([^"]*)" is assigned Designation "([^"]*)" - "([^"]*)"$/, async function (this: CustomWorld, _employee: string, _abbreviation: string, _name: string) {
  return skipBecause(this, NO_EMPLOYEE_DATA);
});

When(/^the user edits Designation "([^"]*)" and changes its Abbreviation to "([^"]*)"$/, async function () {
  unreachable('the user edits Designation ... and changes its Abbreviation');
});

When(/^the user opens Employee "([^"]*)" record$/, async function () {
  unreachable('the user opens Employee ... record');
});

Then(
  /^the Employee's Designation reference continues to point to the same Designation ID without interruption$/,
  async function () {
    unreachable("the Employee's Designation reference continues to point to the same Designation ID");
  },
);

Then(/^it is now displayed as "([^"]*)" - "([^"]*)"$/, async function () {
  unreachable('it is now displayed as ...');
});

// ---------------------------------------------------------------------------
// Multi-product consumption
// ---------------------------------------------------------------------------

Given(
  /^Designation "([^"]*)" exists in CivitCORE but has not been configured in "([^"]*)"$/,
  // Cucumber requires one parameter per capture group, even when the step ignores them.
  async function (this: CustomWorld, _designation: string, _product: string) {
    return skipBecause(this, NO_OTHER_PRODUCT);
  },
);

When(
  /^the user references Designation "([^"]*)" within "([^"]*)" without configuring any product-specific settings$/,
  async function () {
    unreachable('the user references Designation ... within another product');
  },
);

Then(/^the Designation is available for reference in "([^"]*)"$/, async function () {
  unreachable('the Designation is available for reference in another product');
});

Then(/^it has no product-specific behavior until explicitly configured$/, async function () {
  unreachable('it has no product-specific behavior until explicitly configured');
});

Then(/^no error occurs$/, async function () {
  unreachable('no error occurs');
});
