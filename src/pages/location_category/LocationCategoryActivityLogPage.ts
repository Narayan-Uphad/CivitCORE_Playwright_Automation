/**
 * Location Category Activity / Audit Log (feature: location_category_audit_log.feature).
 *
 * The MIDC build has no Activity Log screen for Location Categories (the Organization Configuration tabs are
 * Department, Designation, Location Category, Location, Office Category, Office, Position, Industrial Area).
 * This page only probes for an entry point, so the scenarios are skipped while none exists and fail loudly
 * once one appears (at which point the log steps must be automated against the real screen).
 */
import type { Locator, Page } from '@playwright/test';

const ACTIVITY_LOG_NAME = /activity\s*log|audit\s*(log|trail)/i;

export class LocationCategoryActivityLogPage {
  readonly entryPoint: Locator;

  constructor(page: Page) {
    this.entryPoint = page
      .getByRole('button', { name: ACTIVITY_LOG_NAME })
      .or(page.getByRole('tab', { name: ACTIVITY_LOG_NAME }))
      .or(page.getByRole('link', { name: ACTIVITY_LOG_NAME }))
      .or(page.locator('.task-tab-base, .menu-item').filter({ hasText: ACTIVITY_LOG_NAME }));
  }

  async isAvailable(): Promise<boolean> {
    return (await this.entryPoint.count()) > 0;
  }
}
