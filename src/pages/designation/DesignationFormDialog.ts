/**
 * Add / Edit Designation dialog: the form shared by designation_creation.feature and
 * designation_update.feature (and inspected by designation_ui_visual.feature).
 *
 * FRD -> MIDC vocabulary: Abbreviation = "Designation Short Name", Reporting To = "Nest Designation
 * Under" checkbox + "Select Parent Designation" lookup, Save = "Add / Update Designation", Back = "Cancel".
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from '../../utils/assertions';
import { DesignationApiMonitor, MUTATION_URL, SUBMIT_TIMEOUT, type DesignationApiCall } from './DesignationApiMonitor';
import { exactText } from './DesignationListPage';

export type FormField = 'Designation Name' | 'Abbreviation';

export type SubmitOutcome =
  | { kind: 'saved' | 'rejected'; call: DesignationApiCall }
  | { kind: 'client-validation'; messages: string[] }
  | { kind: 'no-response' };

/** Time allowed for a request to follow a client-side validation message before "no request" is concluded. */
const LATE_REQUEST_GRACE_MS = 1500;

export class DesignationFormDialog {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly nameInput: Locator;
  readonly shortNameInput: Locator;
  readonly nestCheckbox: Locator;
  readonly parentInput: Locator;
  readonly parentPicker: Locator;
  readonly parentOptions: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly closeButton: Locator;
  readonly validationMessages: Locator;

  constructor(
    page: Page,
    private readonly api: DesignationApiMonitor,
  ) {
    this.dialog = page.getByRole('dialog');
    this.title = this.dialog.getByText(/^\s*(Add|Edit) Designation\s*$/).first();
    this.nameInput = this.dialog.getByRole('textbox', { name: 'Designation Name *' });
    this.shortNameInput = this.dialog.getByRole('textbox', { name: 'Designation Short Name *' });
    this.nestCheckbox = this.dialog.getByRole('checkbox', { name: 'Nest Designation Under' });
    this.parentInput = this.dialog.getByRole('textbox', { name: 'Select Parent Designation' });
    this.parentPicker = this.dialog.getByRole('treegrid');
    this.parentOptions = this.parentPicker.locator('.ag-center-cols-container [role="row"]');
    this.submitButton = this.dialog.getByRole('button', { name: /^(Add|Update) Designation$/ });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
    this.closeButton = this.dialog.getByRole('button', { name: 'Close', exact: true });
    this.validationMessages = this.dialog.getByText(/is required|cannot exceed/i);
  }

  async isOpen(): Promise<boolean> {
    return this.nameInput.isVisible().catch(() => false);
  }

  async expectClosed(): Promise<void> {
    await expect(this.nameInput).toBeHidden({ timeout: 20000 });
  }

  async mode(): Promise<'add' | 'edit'> {
    return /edit/i.test(await this.title.innerText()) ? 'edit' : 'add';
  }

  input(field: FormField): Locator {
    return field === 'Abbreviation' ? this.shortNameInput : this.nameInput;
  }

  /** Inline message of the form that matches `pattern`. */
  message(pattern: RegExp): Locator {
    return this.dialog.getByText(pattern).first();
  }

  /**
   * Types the value key by key, as a user would. The app filters keystrokes (a short name keeps only
   * letters and digits), and `fill` would instead drop the whole value when one character is refused.
   */
  async type(field: FormField, value: string): Promise<void> {
    const input = this.input(field);
    await expect(input).toBeVisible({ timeout: 20000 });
    await input.fill('');
    if (value !== '') await input.pressSequentially(value);
  }

  // ---------------------------------------------------------------------------
  // Reporting To lookup
  // ---------------------------------------------------------------------------

  async openParentPicker(): Promise<void> {
    await this.nestCheckbox.check();
    await expect(this.parentInput).toBeEnabled();
    await this.parentInput.click();
    await expect(this.parentOptions.first()).toBeVisible({ timeout: 20000 });
  }

  /** Lookup entries currently rendered (the picker uses auto-height, so all entries are in the DOM). */
  async parentOptionNames(): Promise<string[]> {
    return (await this.parentOptions.allInnerTexts()).map((text) => text.trim()).filter(Boolean);
  }

  async selectParent(name: string): Promise<void> {
    await this.openParentPicker();
    const option = this.parentPicker.getByRole('gridcell', { name: exactText(name) }).first();
    await expect(option, `"${name}" is offered in the Reporting To lookup`).toBeAttached({ timeout: 20000 });
    await option.scrollIntoViewIfNeeded();
    await option.click();
    await expect(this.parentInput).toHaveValue(exactText(name));
  }

  async expectNoParentSelected(): Promise<void> {
    await expect(this.nestCheckbox).not.toBeChecked();
  }

  // ---------------------------------------------------------------------------
  // Save / Back / Close
  // ---------------------------------------------------------------------------

  /**
   * Clicks Add / Update Designation and reports what happened: the API accepted or rejected the
   * save, or client-side validation stopped it before any request was sent.
   */
  async submit(): Promise<SubmitOutcome> {
    const masterVersion = this.api.masterVersion;
    const response = this.api.nextMutation();
    await expect(this.submitButton).toBeEnabled({ timeout: 10000 });
    await this.submitButton.click();

    const clientValidation = this.validationMessages
      .first()
      .waitFor({ state: 'visible', timeout: SUBMIT_TIMEOUT })
      .then(() => 'client' as const)
      .catch(() => null);
    let first = await Promise.race([response, clientValidation]);
    if (first === 'client') {
      const late = await Promise.race([response, new Promise<null>((resolve) => setTimeout(resolve, LATE_REQUEST_GRACE_MS, null))]);
      if (late) first = late;
    }
    if (first === 'client') {
      return { kind: 'client-validation', messages: (await this.validationMessages.allInnerTexts()).map((m) => m.trim()) };
    }
    if (!first || !MUTATION_URL.test(first.url())) return { kind: 'no-response' };

    const call = await DesignationApiMonitor.parseCall(first);
    if (call.status >= 300) return { kind: 'rejected', call };
    // The grid reloads the master after every successful save; later assertions read that reload.
    await this.api.waitForReloadAfter(masterVersion, 'the Designation list reloaded after the save');
    return { kind: 'saved', call };
  }

  /** Back (FRD) = Cancel (MIDC). */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.expectClosed();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await this.expectClosed();
  }
}
