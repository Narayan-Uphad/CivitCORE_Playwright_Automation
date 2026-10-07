/**
 * Designation deletion (feature: designation_deletion.feature).
 *
 * The delete confirmation is the same `role="dialog"` container as the Add / Edit form; it is told
 * apart by its "Delete" button.
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from '../../utils/assertions';
import { designationMessages } from '../../test-data/designation.data';
import { DesignationApiMonitor, type DesignationApiCall } from './DesignationApiMonitor';
import type { DesignationListPage } from './DesignationListPage';

/** Text of a message that explains why a Designation cannot be deleted. */
export const DEPENDENCY_MESSAGE = /assigned|associated|in use|dependenc|child designation|cannot be deleted/i;

/** A confirmation that is still on screen is clickable at once; a longer wait means it was closed under us. */
const CONFIRM_CLICK_TIMEOUT = 10000;
const DELETE_ATTEMPTS = 3;

export class DesignationDeletionPage {
  readonly dialog: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;
  readonly dependencyMessage: Locator;

  constructor(
    page: Page,
    private readonly list: DesignationListPage,
    private readonly api: DesignationApiMonitor,
  ) {
    this.dialog = page.getByRole('dialog');
    this.confirmButton = this.dialog.getByRole('button', { name: 'Delete', exact: true });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
    this.dependencyMessage = page.getByText(DEPENDENCY_MESSAGE).first();
  }

  /** Clicks the row's Delete action; what follows (confirmation or a block) is up to the app. */
  async requestDelete(name: string): Promise<void> {
    await this.list.chooseRowAction(name, 'Delete');
  }

  async isConfirmationOpen(): Promise<boolean> {
    return this.confirmButton.isVisible().catch(() => false);
  }

  async expectConfirmationOpen(): Promise<void> {
    await expect(this.confirmButton).toBeVisible({ timeout: 20000 });
  }

  async expectNoConfirmation(): Promise<void> {
    await expect(this.confirmButton).toBeHidden();
  }

  /** The confirmation is shown and asks to confirm a permanent delete. */
  async expectConfirmationPrompt(): Promise<void> {
    await this.expectConfirmationOpen();
    await expect(this.dialog).toContainText(designationMessages.deleteConfirmation);
  }

  /** Waits for the reaction to a Delete click and returns the confirmation text, or null when no confirmation opened. */
  async confirmationAfterDeleteClick(): Promise<string | null> {
    await expect(this.confirmButton.or(this.dependencyMessage).first()).toBeVisible({ timeout: 15000 });
    if (!(await this.isConfirmationOpen())) return null;
    return (await this.dialog.innerText()).replace(/\s+/g, ' ').trim();
  }

  /** Confirms the open delete dialog and returns the Delete API result. */
  async confirm(): Promise<DesignationApiCall> {
    const response = this.api.nextDelete();
    // If the click fails, the pending wait must not surface later as an unhandled rejection.
    response.catch(() => undefined);
    await this.confirmButton.click({ timeout: CONFIRM_CLICK_TIMEOUT });
    return DesignationApiMonitor.parseCall(await response);
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.confirmButton).toBeHidden({ timeout: 20000 });
  }

  /**
   * Deletes a Designation through the UI and waits for the grid to drop it.
   *
   * A grid reload that lands after a save (e.g. right after an update) re-renders the list and
   * closes an open confirmation; the delete is then requested again instead of waiting forever.
   */
  async deleteDesignation(name: string): Promise<DesignationApiCall> {
    for (let attempt = 1; ; attempt++) {
      await this.requestDelete(name);
      await this.expectConfirmationOpen();
      const version = this.api.masterVersion;
      const requestsBefore = this.api.deleteRequests.length;
      try {
        const call = await this.confirm();
        if (call.status < 300) await this.api.waitForReloadAfter(version);
        return call;
      } catch (error) {
        // Retry only when the dialog vanished before anything was sent; never re-send a delete.
        const closedUnsent = !(await this.isConfirmationOpen()) && this.api.deleteRequests.length === requestsBefore;
        if (attempt >= DELETE_ATTEMPTS || !closedUnsent) throw error;
      }
    }
  }

  wasDeleteRequested(id: number): boolean {
    return this.api.deleteRequests.includes(id);
  }
}
