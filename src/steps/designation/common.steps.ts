/**
 * Designation steps shared by more than one feature file in features/designation_management_features.
 * Cucumber step text is global, so a step used by several features is defined once, here; steps
 * used by a single feature live in that feature's own step file.
 *
 * Feature files use FRD vocabulary; designation.data.ts maps it onto the MIDC build
 * ("Abbreviation" = Designation Short Name, "Reporting To" = Nest Designation Under,
 * "Save" = Add / Update Designation, "Back" = Cancel). Every Designation a scenario creates gets
 * unique data (DesignationTestData) and is removed again by ./hooks.ts.
 */
import { Given, Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { expect } from '../../utils/assertions';
import {
  describeOutcome,
  ensureDesignation,
  ensureOnDesignationScreen,
  expectMessage,
  formField,
  logInAs,
  openAddFor,
  openEditFor,
  requireTarget,
  returnToList,
  selectReportingTo,
  skipBecause,
  submitForm,
  typeIntoForm,
  NO_EMPLOYEE_DATA,
} from './helpers';

// ---------------------------------------------------------------------------
// Session and navigation (every feature)
// ---------------------------------------------------------------------------

Given(/^the user is logged in as an? "([^"]*)" user(?: with .*)?$/, async function (this: CustomWorld, role: string) {
  return logInAs(this, role);
});

Given(/^the user has navigated to the "Designation Management" screen$/, async function (this: CustomWorld) {
  await ensureOnDesignationScreen(this);
});

// access_and_permissions, creation
When(/^the user navigates to the Designation List(?: screen)?$/, async function (this: CustomWorld) {
  await ensureOnDesignationScreen(this);
  await returnToList(this);
});

// access_and_permissions, deletion, list_search_view, update
When(/^the user (?:observes|returns to) the Designation List(?: column headers)?$/, async function (this: CustomWorld) {
  await returnToList(this);
});

// ---------------------------------------------------------------------------
// Add / Edit form (creation, update, toaster_notifications, ui_visual, list_search_view, cross_module)
// ---------------------------------------------------------------------------

When(/^the user (?:clicks "Add" on the Designation List screen|opens the Add Designation form)$/, async function (
  this: CustomWorld,
) {
  await ensureOnDesignationScreen(this);
  await openAddFor(this);
});

Given(/^the user is on the Add Designation form(?: with valid data entered)?$/, async function (this: CustomWorld) {
  await ensureOnDesignationScreen(this);
  await openAddFor(this);
});

When(/^the user creates a new Designation with Abbreviation "([^"]*)" and Designation Name "([^"]*)"$/, async function (
  this: CustomWorld,
  abbreviation: string,
  name: string,
) {
  await ensureOnDesignationScreen(this);
  await openAddFor(this);
  await typeIntoForm(this, 'Abbreviation', this.designation.data.abbreviation(abbreviation));
  await typeIntoForm(this, 'Designation Name', this.designation.data.name(name));
});

When(/^the user leaves the "(Abbreviation|Designation Name)" field blank$/, async function (this: CustomWorld, label: string) {
  await typeIntoForm(this, formField(label), '');
});

When(/^the user selects "([^"]*)" from the "Reporting To" dropdown$/, async function (this: CustomWorld, parent: string) {
  await selectReportingTo(this, parent);
});

When(/^the user clicks "(Save|Back|Close)"(?: without clicking "Save")?$/, async function (this: CustomWorld, label: string) {
  const form = this.pages.designation.form;
  if (label === 'Save') {
    await submitForm(this);
    return;
  }
  if (label === 'Back') await form.cancel();
  else await form.close();
});

Given(
  /^(?:an existing Designation is being edited|an existing Designation is open in Edit mode with a valid change made)$/,
  async function (this: CustomWorld) {
    await openEditFor(this, await ensureDesignation(this, 'Edit Check'));
  },
);

When(
  /^the user (?:edits the Designation's Abbreviation, Designation Name or Reporting To|updates a field with a valid, unique value)$/,
  async function (this: CustomWorld) {
    const target = requireTarget(this);
    if (!(await this.pages.designation.form.isOpen())) await openEditFor(this, target);
    await typeIntoForm(this, 'Designation Name', `${target.name} Updated`);
  },
);

Given(/^(?:a|an existing) Designation "([^"]*)" - "([^"]*)" (?:already exists|is available for editing)$/, async function (
  this: CustomWorld,
  abbreviation: string,
  name: string,
) {
  await ensureDesignation(this, name, { abbreviation });
});

// ---------------------------------------------------------------------------
// Save outcome and messages (creation, update, deletion, toaster_notifications, list_search_view)
// ---------------------------------------------------------------------------

Then(/^a toaster message "([^"]*)" is displayed$/, async function (this: CustomWorld, message: string) {
  await expectMessage(this, message);
});

Then(/^the save action is blocked$/, async function (this: CustomWorld) {
  const outcome = this.designation.lastOutcome;
  expect(outcome?.kind === 'client-validation' || outcome?.kind === 'rejected', `the save was stopped: ${describeOutcome(outcome)}`).toBe(true);
});

Then(/^the validation message "([^"]*)" is displayed$/, async function (this: CustomWorld, message: string) {
  await expectMessage(this, message);
});

Then(
  /^the Designation "([^"]*)" - "([^"]*)" is visible in the Designation List(?: without a manual refresh)?$/,
  async function (this: CustomWorld, abbreviation: string, name: string) {
    // Never reloads the page: the row must come from the grid's own refresh after the save.
    const list = this.pages.designation.list;
    const expectedName = this.designation.fixture(name)?.name ?? this.designation.data.name(name);
    await returnToList(this);
    const row = await list.showRow(expectedName);
    await list.expectShortName(row, this.designation.data.abbreviation(abbreviation));
  },
);

// ---------------------------------------------------------------------------
// Self-reference in Reporting To (creation, update)
// ---------------------------------------------------------------------------

When(
  /^the user attempts to (?:select "([^"]*)" - "([^"]*)" as its own "Reporting To"|set "Reporting To" to "([^"]*)" - "([^"]*)" \(itself\))$/,
  async function (this: CustomWorld, addAbbr?: string, addName?: string, editAbbr?: string, editName?: string) {
    const form = this.pages.designation.form;
    const self = this.designation.fixture(addName ?? editName ?? '') ?? this.designation.fixture(addAbbr ?? editAbbr ?? '');
    if (!self) throw new Error('The Designation to self-reference was not created by an earlier step.');
    this.designation.target = self;
    if ((await form.mode()) === 'add') {
      // On the Add form the record being entered is "CE - Chief Engineer" itself.
      await typeIntoForm(this, 'Designation Name', self.name);
      await typeIntoForm(this, 'Abbreviation', self.shortName);
    }
    await form.selectParent(self.name);
    this.designation.entered.parent = self;
  },
);

Then(/^the self-reference (?:selection|update) is blocked$/, async function (this: CustomWorld) {
  const outcome = this.designation.lastOutcome;
  expect(outcome?.kind, `saving with itself as Reporting To: ${describeOutcome(outcome)}`).not.toBe('saved');
  const self = requireTarget(this);
  const records = this.pages.designation.api.recordsNamed(self.name);
  expect(records.map((record) => record.id), `only the original "${self.name}" exists`).toEqual([self.id]);
  expect(records[0].parentId, 'the Designation does not report to itself').not.toBe(self.id);
});

// ---------------------------------------------------------------------------
// Delete (deletion, toaster_notifications, ui_visual)
// ---------------------------------------------------------------------------

Given(/^a dependency-free Designation(?: is selected for deletion|'s Delete action is triggered)$/, async function (
  this: CustomWorld,
) {
  await ensureDesignation(this, 'Delete Check');
});

When(
  /^the user clicks "Delete" on (?:the Designation "([^"]*)"|the dependency-free Designation|a Designation with no dependency)$/,
  async function (this: CustomWorld, name?: string) {
    const fixture = name ? this.designation.fixture(name) : requireTarget(this);
    if (!fixture) throw new Error(`"${name}" was not created by an earlier step.`);
    this.designation.target = fixture;
    await returnToList(this);
    await this.pages.designation.deletion.requestDelete(fixture.name);
  },
);

When(/^the user confirms (?:the delete action in the confirmation dialog|the deletion)$/, async function (this: CustomWorld) {
  const deletion = this.pages.designation.deletion;
  await deletion.expectConfirmationOpen();
  const toastsBefore = await this.visibleToasts();
  const call = await deletion.confirm();
  await this.captureNewToast(toastsBefore);
  expect(call.status, `Delete: ${call.message}`).toBeLessThan(300);
  this.designation.deletedName = requireTarget(this).name;
});

// ---------------------------------------------------------------------------
// Employee / Post lookups (cross_module_consumption, deletion)
// ---------------------------------------------------------------------------

When(/^the user navigates to the (Employee|Post) creation screen$/, async function (this: CustomWorld, module: string) {
  if (module === 'Employee') return skipBecause(this, NO_EMPLOYEE_DATA);
  await returnToList(this);
  await this.pages.designation.crossModule.openPostLookup();
  return undefined;
});

When(/^the user opens the Designation lookup(?: on the (?:Employee|Post) form)?$/, async function (this: CustomWorld) {
  await this.pages.designation.crossModule.expectPostLookupPopulated();
});
