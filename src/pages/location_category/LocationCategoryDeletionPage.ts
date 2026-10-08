/**
 * Location Category deletion (feature: location_category_deletion.feature).
 *
 * The delete confirmation is the same `role="dialog"` container as the Add / Edit form; it is told apart by
 * its "Delete" button. The app deletes permanently (hard delete) after the confirmation.
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from '../../utils/assertions';
import { DELETION_BLOCKED_PATTERN, locationCategoryMessages } from '../../test-data/location-category.data';
import { LocationCategoryApi, type LocationCategoryApiCall } from './LocationCategoryApi';
import type { LocationCategoryListPage } from './LocationCategoryListPage';

/** A confirmation that is still on screen is clickable at once; a longer wait means it was closed under us. */
const CONFIRM_CLICK_TIMEOUT = 10000;
const DELETE_ATTEMPTS = 3;

export class LocationCategoryDeletionPage {
  readonly dialog: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;
  readonly blockedMessage: Locator;

  constructor(
    page: Page,
    private readonly list: LocationCategoryListPage,
    private readonly api: LocationCategoryApi,
  ) {
    this.dialog = page.getByRole('dialog');
    this.confirmButton = this.dialog.getByRole('button', { name: 'Delete', exact: true });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
    this.blockedMessage = page.getByText(DELETION_BLOCKED_PATTERN).first();
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
    await expect(this.dialog).toContainText(locationCategoryMessages.deleteConfirmation);
  }

  /** Waits for the reaction to a Delete click and returns the confirmation text, or null when no confirmation opened. */
  async confirmationAfterDeleteClick(): Promise<string | null> {
    await expect(this.confirmButton.or(this.blockedMessage).first()).toBeVisible({ timeout: 15000 });
    if (!(await this.isConfirmationOpen())) return null;
    return (await this.dialog.innerText()).replace(/\s+/g, ' ').trim();
  }

  /** Confirms the open delete dialog and returns the delete API result. */
  async confirm(): Promise<LocationCategoryApiCall> {
    const response = this.api.nextDelete();
    // If the click fails, the pending wait must not surface later as an unhandled rejection.
    response.catch(() => undefined);
    await this.confirmButton.click({ timeout: CONFIRM_CLICK_TIMEOUT });
    return LocationCategoryApi.parseCall(await response);
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click({ timeout: 8000 });
    await expect(this.confirmButton).toBeHidden({ timeout: 20000 });
  }

  /**
   * Deletes a Location Category through the UI and waits for the grid to drop it.
   *
   * A grid reload that lands after a save re-renders the list and closes an open confirmation; the delete is
   * then requested again instead of waiting forever. A delete request is never sent twice.
   */
  async deleteCategory(name: string): Promise<LocationCategoryApiCall> {
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
        const closedUnsent = !(await this.isConfirmationOpen()) && this.api.deleteRequests.length === requestsBefore;
        if (attempt >= DELETE_ATTEMPTS || !closedUnsent) throw error;
      }
    }
  }

  wasDeleteRequested(id: number): boolean {
    return this.api.deleteRequests.includes(id);
  }
}
