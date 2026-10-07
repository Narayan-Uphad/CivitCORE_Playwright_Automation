/**
 * Toaster notifications (feature: designation_toaster_notifications.feature).
 *
 * The toaster auto-dismisses after ~3 s, so the World records every toast it sees
 * (CustomWorld.captureToast / sawMessage); this page covers what the toaster itself must do.
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from '../../utils/assertions';

export class DesignationToasterPage {
  /** The `[role="alert"]` container is rendered empty; the text lives in an element whose class contains "toast". */
  readonly toasts: Locator;

  constructor(page: Page) {
    this.toasts = page.locator('[class*="toast" i]').filter({ hasText: /\S/ });
  }

  async expectAutoDismissed(timeout = 20000): Promise<void> {
    await expect(this.toasts, 'the toaster disappears without user action').toHaveCount(0, { timeout });
  }
}
