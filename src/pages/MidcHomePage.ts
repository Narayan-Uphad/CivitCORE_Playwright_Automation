/**
 * MIDC portal home page.
 *
 * RECONSTRUCTED PAGE OBJECT — the original `MidcHomePage` from the Playwright
 * project's fixtures was not supplied with the specs. The public API
 * (`open`, `expectLoaded`, `openDepartmentLogin`) matches every call made by
 * the specs, and the locators are taken from the self-contained
 * `department-management-updated.spec.ts` (`page.goto(`${BASE_URL}/`)`,
 * `getByRole('link', { name: 'Department Login', exact: true })`).
 * If you still have the original class, drop it in here — the step
 * definitions only rely on this public API.
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from '../utils/assertions';
import { midcTestData } from '../test-data/midc.data';

export class MidcHomePage {
  readonly departmentLoginLink: Locator;
  /** ASSUMPTION: the original "welcome heading" text is unknown; any heading starting with "Welcome" is accepted. */
  readonly welcomeHeading: Locator;

  constructor(private readonly page: Page) {
    this.departmentLoginLink = page.getByRole('link', { name: 'Department Login', exact: true });
    this.welcomeHeading = page.getByRole('heading', { name: /^\s*Welcome/i }).first();
  }

  async open(): Promise<void> {
    await this.page.goto(midcTestData.homeUrl);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.welcomeHeading).toBeVisible();
    await expect(this.departmentLoginLink).toBeVisible();
  }

  async openDepartmentLogin(): Promise<void> {
    await this.departmentLoginLink.click();
  }
}
