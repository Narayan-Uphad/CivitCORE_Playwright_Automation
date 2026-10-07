/**
 * Add / Edit Department dialog (both render as `getByRole('dialog')`).
 * Locators are copied verbatim from the original specs. Where two specs
 * interacted with the same control differently, both variants are kept.
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from '../utils/assertions';

export type Scope = 'page' | 'dialog';

export class DepartmentDialog {
  readonly dialog: Locator;
  readonly departmentNameInput: Locator;
  readonly departmentShortNameInput: Locator;
  readonly departmentProdCodeDropdown: Locator;
  readonly submitAddDepartmentButton: Locator;
  readonly updateButton: Locator;
  readonly cancelButton: Locator;
  readonly backOrCancelButton: Locator;
  readonly organizationSelectInDialog: Locator;
  readonly parentDepartmentTextbox: Locator;
  /** The dialog renders its title as plain text, not as an ARIA heading. */
  readonly addDepartmentTitle: Locator;
  /** department-management-updated.spec.ts custom dropdowns */
  readonly prodCodePlaceholder: Locator;
  readonly parentDepartmentPlaceholder: Locator;
  readonly options: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog');
    this.departmentNameInput = this.dialog.getByRole('textbox', { name: 'Department Name *' });
    this.departmentShortNameInput = this.dialog.getByRole('textbox', { name: 'Department Short Name *' });
    this.departmentProdCodeDropdown = this.dialog.getByLabel('Department Prod Code *');
    this.submitAddDepartmentButton = this.dialog.getByRole('button', { name: 'Add Department', exact: true });
    this.updateButton = this.dialog
      .getByRole('button', { name: /^(Update|Save|Edit Department|Update Department)$/i })
      .first();
    this.cancelButton = this.dialog.getByRole('button', { name: /^Cancel$/i });
    // The app labels the discard action "Cancel" (with a "Close" icon button) instead of "Back".
    this.backOrCancelButton = this.dialog.getByRole('button', { name: /^(Back|Cancel)$/i }).first();
    this.organizationSelectInDialog = this.dialog.getByText('Select Organization Name').first();
    this.parentDepartmentTextbox = this.dialog.getByRole('textbox', { name: 'Select Parent Department' });
    this.addDepartmentTitle = this.dialog.getByText('Add Department', { exact: true }).first();
    this.prodCodePlaceholder = page.getByText('Select Prod Code');
    this.parentDepartmentPlaceholder = this.dialog.getByRole('textbox', { name: 'Select Parent Department' });
    this.options = page.getByRole('option');
  }

  nestDepartmentCheckbox(scope: Scope): Locator {
    const root = scope === 'dialog' ? this.dialog : this.page;
    return root.getByRole('checkbox', { name: 'Nest Department Under' });
  }

  /**
   * department-management-updated.spec.ts used `page.getByLabel(label, { exact: true })`.
   * The app renders mandatory labels as "<Label> *", so the asterisk is appended when the
   * bare label does not resolve.
   */
  fieldByExactLabel(label: string): Locator {
    return this.page.getByLabel(label, { exact: true }).or(this.page.getByLabel(`${label} *`, { exact: true })).last();
  }

  /** add-nested-department-fixed.spec.ts: stored names are normalised, so match case-insensitively. */
  parentDepartmentOption(parentName: string): Locator {
    return this.dialog.getByRole('gridcell', { name: new RegExp(`^\\s*${parentName}\\s*$`, 'i') });
  }

  /** Every selectable parent department in the picker. */
  get parentDepartmentOptions(): Locator {
    return this.dialog.getByRole('gridcell');
  }

  async selectProdCode(label: string): Promise<void> {
    await expect(this.departmentProdCodeDropdown).toBeVisible({ timeout: 15000 });
    await this.departmentProdCodeDropdown.selectOption({ label });
  }

  /** Selects the organization inside the dialog only when the selector is rendered (nested specs). */
  async selectOrganizationIfShown(name: string): Promise<void> {
    if (await this.organizationSelectInDialog.isVisible().catch(() => false)) {
      await this.organizationSelectInDialog.click();
      const option = this.page.getByRole('option', { name }).or(this.page.getByText(name, { exact: true }));
      await expect(option).toBeVisible({ timeout: 5000 });
      await option.click();
    }
  }

  /** department-management-updated.spec.ts `openAddDepartmentModal` */
  async openAddDepartmentModal(): Promise<void> {
    const openButton = this.page.getByRole('button', { name: 'Add Department', exact: true }).first();
    await expect(openButton).toBeVisible({ timeout: 20000 });
    await openButton.click();
    await expect(this.dialog).toBeVisible({ timeout: 20000 });
    await expect(this.addDepartmentTitle).toBeVisible({ timeout: 20000 });
  }

  /** "Department Prod Code" is a native `<select>`; its first real option follows the placeholder. */
  async chooseFirstProdCodeOption(): Promise<void> {
    await expect(this.departmentProdCodeDropdown).toBeVisible({ timeout: 15000 });
    const values = await this.departmentProdCodeDropdown
      .locator('option')
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value).filter(Boolean));
    if (values.length === 0) throw new Error('The Department Prod Code dropdown has no selectable option.');
    await this.departmentProdCodeDropdown.selectOption(values[0]);
  }

  /** The parent-department picker opens an AG Grid list of `gridcell`s, not ARIA options. */
  async chooseParentDepartmentOption(parentName: string): Promise<void> {
    await this.parentDepartmentTextbox.click();
    const option = this.parentDepartmentOption(parentName);
    await expect(option).toBeVisible({ timeout: 20000 });
    await option.scrollIntoViewIfNeeded();
    await option.click();
  }
}
