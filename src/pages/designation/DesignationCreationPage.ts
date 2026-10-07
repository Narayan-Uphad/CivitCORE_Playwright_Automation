/**
 * Designation creation (feature: designation_creation.feature).
 *
 * Opens the Add Designation form from the list and checks what the form offers. Typing, the
 * Reporting To lookup and saving live in the shared DesignationFormDialog.
 */
import { expect } from '../../utils/assertions';
import { normalizeDesignationText } from '../../test-data/designation.data';
import type { DesignationApiMonitor } from './DesignationApiMonitor';
import type { DesignationFormDialog } from './DesignationFormDialog';
import type { DesignationListPage } from './DesignationListPage';

export class DesignationCreationPage {
  constructor(
    private readonly list: DesignationListPage,
    private readonly form: DesignationFormDialog,
    private readonly api: DesignationApiMonitor,
  ) {}

  /** Clicks "Add" (MIDC: "Add Designation") on the list toolbar. */
  async open(): Promise<void> {
    await expect(this.list.addButton).toBeVisible({ timeout: 30000 });
    await this.list.addButton.click();
    await expect(this.form.title).toHaveText(/Add Designation/, { timeout: 20000 });
    await expect(this.form.nameInput).toBeVisible();
  }

  async expectAllFieldsDisplayed(): Promise<void> {
    await expect(this.form.shortNameInput, 'Abbreviation (Designation Short Name)').toBeVisible();
    await expect(this.form.nameInput, 'Designation Name').toBeVisible();
    await expect(this.form.nestCheckbox, 'Reporting To (Nest Designation Under)').toBeVisible();
    await expect(this.form.parentInput, 'Reporting To lookup').toBeVisible();
  }

  async expectSaveAndBackButtons(): Promise<void> {
    await expect(this.form.submitButton, 'Save (Add Designation)').toBeVisible();
    await expect(this.form.cancelButton, 'Back (Cancel)').toBeVisible();
  }

  /** Reporting To lookup entries that are not records of the Designation master. */
  async lookupEntriesOutsideMaster(): Promise<{ options: string[]; outside: string[] }> {
    const options = await this.form.parentOptionNames();
    const master = new Set(this.api.records().map((record) => normalizeDesignationText(record.name)));
    return { options, outside: options.filter((option) => !master.has(normalizeDesignationText(option))) };
  }

  /** Types free text into the lookup and reports whether that text is offered back as a value. */
  async isFreeTextOffered(text: string): Promise<boolean> {
    await this.form.parentInput.fill(text);
    const options = await this.form.parentOptionNames();
    return options.some((option) => normalizeDesignationText(option) === normalizeDesignationText(text));
  }

  async clearLookupText(): Promise<void> {
    await this.form.parentInput.fill('');
  }
}
