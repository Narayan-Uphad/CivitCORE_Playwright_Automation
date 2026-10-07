/**
 * Add / Edit Department dialog steps.
 */
import { DataTable, Given, Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../support/world';
import { config } from '../support/config';
import { expect, secondsToMs } from '../utils/assertions';
import { departmentMessages, validationMessages } from '../test-data/department.data';

// ---------- dialog visibility ----------
Then(
  /^the (?:Add Department |Edit Department |delete confirmation )?dialog is (?:still )?displayed(?: within (\d+) seconds)?$/,
  async function (this: CustomWorld, seconds?: string) {
    await expect(this.pages.departmentDialog.dialog).toBeVisible({ timeout: secondsToMs(seconds) });
  },
);

Then(
  /^the (?:Add Department |Edit Department |delete confirmation )?dialog is closed(?: within (\d+) seconds)?$/,
  async function (this: CustomWorld, seconds?: string) {
    await expect(this.pages.departmentDialog.dialog).not.toBeVisible({ timeout: secondsToMs(seconds) });
  },
);

// ---------- composite flows (original local helper functions) ----------
When(
  'I add a department named {string} with short name {string} and Prod Code {string}',
  async function (this: CustomWorld, name: string, shortName: string, prodCode: string) {
    await this.pages.departmentFlows.addDepartment(this.resolve(name), this.resolve(shortName), prodCode);
  },
);

Given(
  'a department named {string} with short name {string} and Prod Code {string} has been created successfully',
  async function (this: CustomWorld, name: string, shortName: string, prodCode: string) {
    await this.pages.departmentFlows.createDepartmentSuccessfully(this.resolve(name), this.resolve(shortName), prodCode);
  },
);

// ---------- form fields (role-based locators inside the dialog) ----------
When('I select organization {string} in the dialog if the organization selector is shown', async function (
  this: CustomWorld,
  name: string,
) {
  await this.pages.departmentDialog.selectOrganizationIfShown(name);
});

When('I enter {string} as the Department Name', async function (this: CustomWorld, value: string) {
  await this.pages.departmentDialog.departmentNameInput.fill(this.resolve(value));
});

When('I enter {string} as the Department Short Name', async function (this: CustomWorld, value: string) {
  await this.pages.departmentDialog.departmentShortNameInput.fill(this.resolve(value));
});

When('I leave the Department Name empty', async function (this: CustomWorld) {
  await this.pages.departmentDialog.departmentNameInput.fill('');
});

When('I leave the Department Short Name empty', async function (this: CustomWorld) {
  await this.pages.departmentDialog.departmentShortNameInput.fill('');
});

When('I select {string} as the Department Prod Code', async function (this: CustomWorld, label: string) {
  await this.pages.departmentDialog.selectProdCode(label);
});

When('I submit the Add Department dialog', async function (this: CustomWorld) {
  await this.pages.departmentDialog.submitAddDepartmentButton.click();
  // The success toaster is transient, so it is recorded here for the assertion step that follows.
  await this.captureToast();
});

When(/^I tick the "Nest Department Under" checkbox( in the dialog)?$/, async function (
  this: CustomWorld,
  inDialog?: string,
) {
  await this.pages.departmentDialog.nestDepartmentCheckbox(inDialog ? 'dialog' : 'page').check();
});

Then('the "Nest Department Under" checkbox is not checked', async function (this: CustomWorld) {
  await expect(this.pages.departmentDialog.nestDepartmentCheckbox('page')).not.toBeChecked();
});

Then('the text {string} is visible in the dialog', async function (this: CustomWorld, text: string) {
  await expect(this.pages.departmentDialog.dialog.getByText(this.resolve(text))).toBeVisible();
});

When('I open the Select Parent Department field in the dialog', async function (this: CustomWorld) {
  await this.pages.departmentDialog.parentDepartmentTextbox.click();
});

Then(
  /^the parent department option matching "([^"]*)" ignoring case is visible in the dialog(?: within (\d+) seconds)?$/,
  async function (this: CustomWorld, parentName: string, seconds?: string) {
    await expect(this.pages.departmentDialog.parentDepartmentOption(this.resolve(parentName))).toBeVisible({
      timeout: secondsToMs(seconds),
    });
  },
);

When('I click the parent department option matching {string} ignoring case', async function (
  this: CustomWorld,
  parentName: string,
) {
  const option = this.pages.departmentDialog.parentDepartmentOption(this.resolve(parentName));
  await option.scrollIntoViewIfNeeded();
  await option.click();
});

// ---------- verified-behavior suite (label / placeholder based locators) ----------
When('I open the Add Department modal', async function (this: CustomWorld) {
  await this.pages.departmentDialog.openAddDepartmentModal();
});

When('I enter {string} in the field labelled {string}', async function (this: CustomWorld, value: string, label: string) {
  await this.pages.departmentDialog.fieldByExactLabel(label).fill(this.resolve(value));
});

When('I choose the first option from the "Select Prod Code" dropdown', async function (this: CustomWorld) {
  await this.pages.departmentDialog.chooseFirstProdCodeOption();
});

When('I choose {string} from the "Select Parent Department" dropdown', async function (this: CustomWorld, name: string) {
  await this.pages.departmentDialog.chooseParentDepartmentOption(this.resolve(name));
});

When('I open the "Select Parent Department" dropdown', async function (this: CustomWorld) {
  await this.pages.departmentDialog.parentDepartmentTextbox.click();
});

Then('at least one parent department option is available', async function (this: CustomWorld) {
  // The picker lists existing departments as AG Grid cells rather than ARIA options.
  const options = this.pages.departmentDialog.parentDepartmentOptions;
  await expect(options.first()).toBeVisible({ timeout: 20000 });
  expect(await options.count()).toBeGreaterThan(0);
});

Then('no field labelled {string} exists', async function (this: CustomWorld, label: string) {
  await expect(this.page.getByLabel(label)).toHaveCount(0);
});

Then('no field has a placeholder containing {string}', async function (this: CustomWorld, text: string) {
  await expect(this.page.getByPlaceholder(new RegExp(text, 'i'))).toHaveCount(0);
});

Then('the following fields are marked as mandatory with an asterisk:', async function (this: CustomWorld, table: DataTable) {
  for (const [label] of table.raw()) {
    // Label text is rendered as "<Label> *" — assert the asterisk is present
    await expect(this.page.getByText(new RegExp(`^${label}\\s*\\*`))).toBeVisible();
  }
});

// ---------- edit dialog ----------
When('I click the Update button in the dialog', async function (this: CustomWorld) {
  await this.pages.departmentDialog.updateButton.click();
  await this.captureToast();
});

When('I click Cancel in the dialog', async function (this: CustomWorld) {
  await this.pages.departmentDialog.cancelButton.click();
});

When('I click Back or Cancel in the dialog', async function (this: CustomWorld) {
  await this.pages.departmentDialog.backOrCancelButton.click();
});

Then(
  /^the Department Name field in the dialog has the value "([^"]*)" ignoring case(?: within (\d+) seconds)?$/,
  async function (this: CustomWorld, value: string, seconds?: string) {
    await expect(this.pages.departmentDialog.departmentNameInput).toHaveValue(
      new RegExp(`^${this.resolve(value)}$`, 'i'),
      { timeout: secondsToMs(seconds) },
    );
  },
);

Then(
  /^the Department Short Name field in the dialog has the value "([^"]*)" ignoring case(?: within (\d+) seconds)?$/,
  async function (this: CustomWorld, value: string, seconds?: string) {
    await expect(this.pages.departmentDialog.departmentShortNameInput).toHaveValue(
      new RegExp(`^${this.resolve(value)}$`, 'i'),
      { timeout: secondsToMs(seconds) },
    );
  },
);

Then('the Department Prod Code in the dialog has a value', async function (this: CustomWorld) {
  await expect(this.pages.departmentDialog.departmentProdCodeDropdown).toHaveValue(/\S/);
});

// ---------- success / validation messages ----------
Then(/^the department updated success message is displayed(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  seconds?: string,
) {
  // The toaster auto-dismisses, so a message recorded earlier in the scenario also counts.
  const timeout = secondsToMs(seconds) ?? config.expectTimeoutMs;
  expect(await this.sawMessage(departmentMessages.updated, timeout)).toBe(true);
});

Then('no department updated success message is shown', async function (this: CustomWorld) {
  await expect(this.page.getByText(departmentMessages.updated)).toHaveCount(0);
});

Then(/^the dialog shows "Department Name is required"(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  seconds?: string,
) {
  await expect(this.pages.departmentDialog.dialog).toContainText(validationMessages.departmentNameRequired, {
    timeout: secondsToMs(seconds),
  });
});

Then(/^a mandatory field validation message is displayed(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  seconds?: string,
) {
  await expect(this.page.getByText(validationMessages.mandatoryField)).toBeVisible({ timeout: secondsToMs(seconds) });
});

Then(/^a duplicate name validation message is displayed in the dialog(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  seconds?: string,
) {
  // The API rejection (OrgDepartment:11613) is surfaced as a transient toaster rather than inline
  // dialog text, so either form counts; the toast may already be gone, hence `sawMessage`.
  const inline = this.pages.departmentDialog.dialog.getByText(validationMessages.duplicateName).first();
  await expect
    .poll(async () => (await inline.isVisible()) || (await this.sawMessage(validationMessages.duplicateName, 0)), {
      timeout: secondsToMs(seconds) ?? config.expectTimeoutMs,
    })
    .toBe(true);
});

Then(/^a duplicate short name validation message is displayed(?: within (\d+) seconds)?$/, async function (
  this: CustomWorld,
  seconds?: string,
) {
  // Rejected with OrgDepartment:11614 ("same code already exists"), shown as a transient toaster.
  const inline = this.page.getByText(validationMessages.duplicateShortName).first();
  await expect
    .poll(
      async () => (await inline.isVisible()) || (await this.sawMessage(validationMessages.duplicateShortName, 0)),
      { timeout: secondsToMs(seconds) ?? config.expectTimeoutMs },
    )
    .toBe(true);
});

// ---------- edit flow (original `openEditDialog` helper) ----------
When('I open the Edit dialog for the department {string}', { timeout: 240000 }, async function (
  this: CustomWorld,
  departmentName: string,
) {
  await this.pages.departmentFlows.openEditDialog(this.resolve(departmentName));
});
