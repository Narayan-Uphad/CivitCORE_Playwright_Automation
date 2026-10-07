/**
 * Steps of designation_deletion.feature (FRD 6.7 - Designation Deletion).
 * Page object: DesignationDeletionPage.
 * Shared steps (clicking Delete, confirming, the Post / Employee lookup) are in ./common.steps.ts.
 */
import { Given, Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { expect } from '../../utils/assertions';
import { DEPENDENCY_MESSAGE } from '../../pages/designation';
import {
  addPosts,
  ensureDesignation,
  requireFixture,
  requireTarget,
  returnToList,
  skipBecause,
  NO_EMPLOYEE_DATA,
} from './helpers';

async function expectDependencyMessage(world: CustomWorld): Promise<void> {
  const deletion = world.pages.designation.deletion;
  const visible = async () => (await world.sawMessage(DEPENDENCY_MESSAGE, 0)) || (await deletion.dependencyMessage.isVisible());
  await expect.poll(visible, { timeout: 15000, message: `a dependency message is shown; toasters: ${JSON.stringify(world.seenToasts)}` }).toBe(true);
}

// ---------------------------------------------------------------------------
// Dependency-free deletion
// ---------------------------------------------------------------------------

Given(
  /^a Designation "([^"]*)" exists with no (?:Employee association, no Post association and no child Designations|dependencies)$/,
  async function (this: CustomWorld, name: string) {
    await ensureDesignation(this, name);
  },
);

Given(/^the delete confirmation dialog is displayed for "([^"]*)"$/, async function (this: CustomWorld, name: string) {
  const fixture = requireFixture(this, name);
  const deletion = this.pages.designation.deletion;
  await returnToList(this);
  await deletion.requestDelete(fixture.name);
  await deletion.expectConfirmationOpen();
});

When(/^the user clicks "Cancel" on the confirmation dialog$/, async function (this: CustomWorld) {
  await this.pages.designation.deletion.cancel();
});

Then(/^the Designation is permanently removed from the Designation Master$/, async function (this: CustomWorld) {
  const target = requireTarget(this);
  const { api, list } = this.pages.designation;
  await api.waitForMaster((records) => !records.some((record) => record.id === target.id), `#${target.id} left the master`);
  await returnToList(this);
  await list.expectAbsent(target.name);
});

Then(/^a confirmation prompt is displayed before deletion proceeds$/, async function (this: CustomWorld) {
  const deletion = this.pages.designation.deletion;
  await deletion.expectConfirmationPrompt();
  expect(deletion.wasDeleteRequested(requireTarget(this).id), 'nothing is deleted before the prompt is answered').toBe(false);
});

Then(
  /^the Designation "([^"]*)" is retained in the Designation Master without any changes$/,
  async function (this: CustomWorld, name: string) {
    const fixture = requireFixture(this, name);
    const stored = this.pages.designation.api.recordById(fixture.id);
    expect(stored, `#${fixture.id} is still in the master`).toBeTruthy();
    expect({ name: stored!.name, shortName: stored!.shortName }).toEqual({ name: fixture.name, shortName: fixture.shortName });
    await this.pages.designation.list.showRow(fixture.name);
  },
);

// With no Activity Log screen, the verifiable part is that no deletion happened, so none could be logged.
Then(/^no Activity Log deletion entry is recorded$/, async function (this: CustomWorld) {
  const target = requireTarget(this);
  expect(this.pages.designation.deletion.wasDeleteRequested(target.id), `a Delete request was sent for #${target.id}`).toBe(false);
  this.log(`No Activity Log screen exists; verified instead that no Delete request was sent for #${target.id}.`);
});

// ---------------------------------------------------------------------------
// Dependency-blocked deletion
// ---------------------------------------------------------------------------

Given(/^a Designation is associated with at least one (Employee|Post) record$/, async function (this: CustomWorld, entity: string) {
  if (entity === 'Employee') return skipBecause(this, NO_EMPLOYEE_DATA);
  await addPosts(this, await ensureDesignation(this, 'Post Linked'), 1);
  return undefined;
});

Given(
  /^a parent Designation has at least one child Designation reporting to it via "Reporting To"$/,
  async function (this: CustomWorld) {
    const parent = await ensureDesignation(this, 'Parent With Child');
    await ensureDesignation(this, 'Child Of Parent', { parent, asTarget: false });
    this.designation.target = parent;
  },
);

Given(
  /^a Designation has an Employee association, a Post association and a nested child Designation$/,
  async function (this: CustomWorld) {
    return skipBecause(this, NO_EMPLOYEE_DATA);
  },
);

When(/^the user clicks "Delete" on (?:that|the parent) Designation$/, async function (this: CustomWorld) {
  await returnToList(this);
  this.seenToasts.length = 0;
  await this.pages.designation.deletion.requestDelete(requireTarget(this).name);
});

Then(/^the deletion is blocked$/, async function (this: CustomWorld) {
  // Wait for whichever reaction the click produces before judging it.
  const confirmation = await this.pages.designation.deletion.confirmationAfterDeleteClick();
  expect(confirmation === null, `deletion is blocked, but a delete confirmation was offered instead: "${confirmation}"`).toBe(true);
});

Then(
  /^a message is displayed indicating the Designation (?:is assigned to one or more (?:Employees|Posts)|has one or more child Designations)$/,
  async function (this: CustomWorld) {
    await expectDependencyMessage(this);
  },
);

Then(/^an appropriate dependency message is displayed$/, async function (this: CustomWorld) {
  await expectDependencyMessage(this);
});

Then(/^no (?:delete )?confirmation dialog is (?:shown|displayed)$/, async function (this: CustomWorld) {
  await this.pages.designation.deletion.expectNoConfirmation();
});

// ---------------------------------------------------------------------------
// Deleted Designation is gone from the Employee / Post lookups
// ---------------------------------------------------------------------------

Given(/^a dependency-free Designation has just been deleted$/, async function (this: CustomWorld) {
  const fixture = await ensureDesignation(this, 'Deleted Check');
  await returnToList(this);
  const call = await this.pages.designation.deletion.deleteDesignation(fixture.name);
  expect(call.status, `Delete: ${call.message}`).toBeLessThan(300);
  this.designation.deletedName = fixture.name;
});

Then(/^the deleted Designation no longer appears in the (?:Employee|Post) Designation lookup$/, async function (this: CustomWorld) {
  const name = this.designation.deletedName;
  if (!name) throw new Error('No Designation was deleted by an earlier step.');
  await this.pages.designation.crossModule.expectNotSelectableForPost(name);
});
