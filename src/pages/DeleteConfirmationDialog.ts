/**
 * Delete confirmation dialog (delete-added-department.spec.ts `confirmDeleteDialog`).
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from '../utils/assertions';
import { departmentMessages } from '../test-data/department.data';

export class DeleteConfirmationDialog {
  readonly dialog: Locator;
  readonly deleteButton: Locator;
  readonly successToast: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog');
    this.deleteButton = this.dialog.getByRole('button', { name: /^Delete/ });
    this.successToast = page.getByText(departmentMessages.deleted).first();
  }

  async expectPrompt(expectedItemCount: number): Promise<void> {
    await expect(this.dialog).toBeVisible({ timeout: 15000 });
    await expect(this.dialog).toContainText(new RegExp(`Delete\\s*${expectedItemCount}\\s*item`, 'i'));
    await expect(this.dialog).toContainText(/permanently delete/i);
  }

  async confirm(): Promise<void> {
    await this.deleteButton.click();
  }
}
