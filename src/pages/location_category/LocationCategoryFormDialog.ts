/**
 * Add / Edit Location Category dialog (features: location_category_creation / location_category_update).
 *
 * FRD -> MIDC vocabulary: Location Category Name = "Location Category", Parent Category dropdown = "Nest
 * Location Under" checkbox + "Select Parent Location Category" lookup, Save = "Add / Update Location
 * Category", Cancel / Close = "Cancel" / the header close button. The form additionally requires a
 * Location Category Code and a Prod Code (not in the FRD); `fillRequiredExtras` supplies them.
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from '../../utils/assertions';
import { defaultProdCode } from '../../test-data/location-category.data';
import { LocationCategoryApi, MUTATION_URL, SUBMIT_TIMEOUT, type LocationCategoryApiCall } from './LocationCategoryApi';
import { exactText } from './LocationCategoryListPage';

export type FormField = 'Location Category Name' | 'Short Name';

export type SubmitOutcome =
  | { kind: 'saved' | 'rejected'; call: LocationCategoryApiCall }
  | { kind: 'client-validation'; messages: string[] }
  | { kind: 'no-response' }
  /** The app keeps Update disabled until a field changes, so nothing could be submitted. */
  | { kind: 'disabled' };

/** Time allowed for a request to follow a client-side validation message before "no request" is concluded. */
const LATE_REQUEST_GRACE_MS = 1500;

export class LocationCategoryFormDialog {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly nameInput: Locator;
  readonly shortNameInput: Locator;
  readonly codeInput: Locator;
  readonly prodCodeSelect: Locator;
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
    private readonly api: LocationCategoryApi,
  ) {
    this.dialog = page.getByRole('dialog');
    this.title = this.dialog.getByText(/^\s*(Add|Edit) Location Category\s*$/).first();
    this.nameInput = this.dialog.locator('#LactionCat');
    this.shortNameInput = this.dialog.locator('#LocationAbb');
    this.codeInput = this.dialog.locator('#LocCatCode');
    this.prodCodeSelect = this.dialog.locator('#objCatIdnCode');
    this.nestCheckbox = this.dialog.locator('#isNestDesig');
    this.parentInput = this.dialog.locator('[name="selectDesig"]');
    this.parentPicker = this.dialog.getByRole('treegrid');
    this.parentOptions = this.parentPicker.locator('.ag-center-cols-container [role="row"]');
    this.submitButton = this.dialog.getByRole('button', { name: /^(Add|Update) Location Category$/ });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
    this.closeButton = this.dialog.getByRole('button', { name: 'Close', exact: true });
    this.validationMessages = this.dialog.getByText(/is required|cannot exceed|invalid|not allowed/i);
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
    return field === 'Short Name' ? this.shortNameInput : this.nameInput;
  }

  /** Current field values, for diagnostics. */
  async currentValues(): Promise<string> {
    // The app closes the form when the server refuses a save; reading closed fields would only time out.
    if (!(await this.isOpen())) return 'the form already closed';
    const parts = [
      `name="${await this.nameInput.inputValue()}"`,
      `short="${await this.shortNameInput.inputValue()}"`,
      `code="${await this.codeInput.inputValue()}"`,
      `prod="${await this.prodCodeSelect.inputValue()}"`,
    ];
    return parts.join(' ');
  }

  /** Visible labels of the form's fields (asterisk removed). */
  async fieldLabels(): Promise<string[]> {
    const labels = await this.dialog.locator('label.csb-form-label').allInnerTexts();
    return labels.map((label) => label.replace(/\*/g, '').trim()).filter(Boolean);
  }

  /** Inline or toast message that matches `pattern`. */
  message(pattern: RegExp): Locator {
    return this.dialog.getByText(pattern).first();
  }

  /**
   * Types the value key by key, as a user would. The app may filter keystrokes, and `fill` would
   * instead drop the whole value when one character is refused.
   */
  async type(field: FormField, value: string): Promise<void> {
    const input = this.input(field);
    await expect(input).toBeVisible({ timeout: 20000 });
    await input.fill('');
    if (value !== '') await input.pressSequentially(value);
  }

  async clear(field: FormField): Promise<void> {
    await this.type(field, '');
  }

  /** Fills the Code and Prod Code the FRD does not know about, unless the form already has them (Edit). */
  async fillRequiredExtras(code: string): Promise<void> {
    if ((await this.codeInput.inputValue()) === '') await this.codeInput.fill(code);
    if ((await this.prodCodeSelect.inputValue()) === '') await this.prodCodeSelect.selectOption({ label: defaultProdCode.label });
  }

  // ---------------------------------------------------------------------------
  // Parent Category lookup
  // ---------------------------------------------------------------------------

  /**
   * Ticks / unticks "Nest Location Under". The input itself ignores clicks (it is restyled), so the label that
   * belongs to it is clicked, as a user does.
   */
  async setNested(nested: boolean): Promise<void> {
    if ((await this.nestCheckbox.isChecked()) !== nested) await this.dialog.locator('label[for="isNestDesig"]').click();
    await expect(this.nestCheckbox).toBeChecked({ checked: nested });
  }

  async openParentPicker(): Promise<void> {
    await this.setNested(true);
    await expect(this.parentInput).toBeEnabled();
    // Clicking the field again would close a lookup that is already open.
    if (!(await this.parentOptions.first().isVisible().catch(() => false))) await this.parentInput.click();
    await expect(this.parentOptions.first()).toBeVisible({ timeout: 20000 });
  }

  /** Lookup entries currently rendered (the picker uses auto-height, so all entries are in the DOM). */
  async parentOptionNames(): Promise<string[]> {
    return (await this.parentOptions.allInnerTexts()).map((text) => text.trim()).filter(Boolean);
  }

  parentOption(name: string): Locator {
    return this.parentOptions.filter({ hasText: exactText(name) }).first();
  }

  async selectParent(name: string): Promise<void> {
    await this.openParentPicker();
    // The lookup renders only the rows near the top, so a record further down is not in the page until the list is
    // filtered by typing, which the field supports.
    await this.parentInput.fill('');
    await this.parentInput.pressSequentially(name);
    const option = this.parentOption(name);
    try {
      await expect(option, `"${name}" is offered in the Parent Category lookup`).toBeAttached({ timeout: 20000 });
    } catch (error) {
      const shown = (await this.parentOptionNames().catch(() => [])).slice(0, 40);
      const reason = (error as Error).message.split(/\r?\n/)[0];
      throw new Error(`${reason}; filter field holds "${await this.parentInput.inputValue()}", lookup shows [${shown.join(' | ')}]`);
    }
    // The filtered rows are re-rendered while typing settles, so the locator is resolved again for the click.
    await option.click();
    await expect(this.parentInput).toHaveValue(exactText(name));
    // Close the lookup: left open it covers the Save button.
    await this.title.click();
    await expect(this.parentOptions.first()).toBeHidden({ timeout: 5000 }).catch(() => undefined);
  }

  /** "Nest Location Under" off = no Parent Category (top-level, L1). */
  async clearParent(): Promise<void> {
    await this.setNested(false);
  }

  async parentValue(): Promise<string> {
    return (await this.nestCheckbox.isChecked()) ? (await this.parentInput.inputValue()).trim() : '';
  }

  // ---------------------------------------------------------------------------
  // Save / Cancel / Close
  // ---------------------------------------------------------------------------

  /**
   * Clicks Add / Update Location Category and reports what happened: the API accepted or rejected the
   * save, or client-side validation stopped it before any request was sent.
   */
  async submit(): Promise<SubmitOutcome> {
    const masterVersion = this.api.masterVersion;
    const response = this.api.nextMutation();
    const enabled = await expect
      .poll(() => this.submitButton.isEnabled(), { timeout: 3000 })
      .toBe(true)
      .then(
        () => true,
        () => false,
      );
    if (!enabled) return { kind: 'disabled' };
    await this.submitButton.click({ timeout: 10000 });

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

    const call = await LocationCategoryApi.parseCall(first);
    if (call.status >= 300) return { kind: 'rejected', call };
    // The grid reloads the master after every successful save; later assertions read that reload.
    await this.api.waitForReloadAfter(masterVersion, 'the Location Category list reloaded after the save');
    return { kind: 'saved', call };
  }

  /** Cancel (FRD: Close / Cancel without saving). */
  async cancel(): Promise<void> {
    // Bounded: the project's default action timeout is unlimited, and an open lookup can cover the button.
    await this.cancelButton.click({ timeout: 8000 }).catch(() => this.title.page().keyboard.press('Escape'));
    await this.expectClosed();
  }

  /** Header close button. */
  async close(): Promise<void> {
    await this.dialog.locator('button.btn-close, button[aria-label="Close"]').first().click();
    await this.expectClosed();
  }
}
