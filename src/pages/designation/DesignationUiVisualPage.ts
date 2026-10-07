/**
 * UI / visual checks (feature: designation_ui_visual.feature): labels, button states and layout
 * of the Add / Edit form and the delete confirmation dialog.
 */
import { expect } from '../../utils/assertions';
import { designationMessages } from '../../test-data/designation.data';
import type { DesignationDeletionPage } from './DesignationDeletionPage';
import type { DesignationFormDialog, FormField } from './DesignationFormDialog';

/** Largest gap (px) between a field and its validation message that still reads as "inline". */
const INLINE_MESSAGE_MAX_GAP = 40;

export class DesignationUiVisualPage {
  constructor(
    private readonly form: DesignationFormDialog,
    private readonly deletion: DesignationDeletionPage,
  ) {}

  /** FRD "Save" = "Add / Update Designation"; "Close" is the dialog's close (X) button. */
  async expectSaveAndCloseLabelled(): Promise<void> {
    await expect(this.form.submitButton).toBeVisible();
    await expect(this.form.submitButton).toHaveText(/^\s*(Add|Update) Designation\s*$/);
    await expect(this.form.closeButton).toBeVisible();
    await expect(this.form.closeButton).toHaveAccessibleName('Close');
  }

  /** Close / Cancel / Save are all enabled on an empty form (Save then relies on validation). */
  async expectEmptyFormButtonStates(): Promise<void> {
    await expect(this.form.closeButton).toBeEnabled();
    await expect(this.form.cancelButton).toBeEnabled();
    await expect(this.form.submitButton).toBeEnabled();
  }

  /** The validation message sits directly below its field and is aligned with it. */
  async expectMessageInline(field: FormField, pattern: RegExp, description: string): Promise<void> {
    const error = this.form.message(pattern);
    await expect(error, `"${description}" is shown in the form`).toBeVisible({ timeout: 15000 });
    const fieldBox = await this.form.input(field).boundingBox();
    const errorBox = await error.boundingBox();
    if (!fieldBox || !errorBox) throw new Error('The field or its validation message has no layout box.');
    const gapBelowField = errorBox.y - (fieldBox.y + fieldBox.height);
    expect(gapBelowField, 'the message sits directly under its field').toBeGreaterThanOrEqual(-2);
    expect(gapBelowField, 'the message sits directly under its field').toBeLessThan(INLINE_MESSAGE_MAX_GAP);
    expect(errorBox.x, 'the message is aligned with its field').toBeLessThan(fieldBox.x + fieldBox.width);
  }

  async expectDeleteDialogStatesAction(): Promise<void> {
    const dialog = this.deletion.dialog;
    await expect(dialog).toBeVisible({ timeout: 20000 });
    await expect(dialog).toContainText(/delete\s*1\s*item/i);
    await expect(dialog).toContainText(designationMessages.deleteConfirmation);
  }

  /** The MIDC dialog labels its confirm button "Delete", an explicit confirmation verb. */
  async expectDistinctConfirmAndCancel(): Promise<void> {
    const dialog = this.deletion.dialog;
    const confirm = dialog.getByRole('button', { name: /^\s*(Confirm|Yes|Delete|OK)\s*$/i });
    const cancel = dialog.getByRole('button', { name: /^\s*(Cancel|No)\s*$/i });
    await expect(confirm).toHaveCount(1);
    await expect(cancel).toHaveCount(1);
    await expect(confirm).toBeEnabled();
    await expect(cancel).toBeEnabled();
    expect((await confirm.innerText()).trim().toLowerCase()).not.toBe((await cancel.innerText()).trim().toLowerCase());
  }
}
