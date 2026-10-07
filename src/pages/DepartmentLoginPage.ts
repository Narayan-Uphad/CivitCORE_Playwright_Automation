/**
 * MIDC Department Login page.
 *
 * RECONSTRUCTED PAGE OBJECT — the original `DepartmentLoginPage` was not
 * supplied. API (`expectLoaded`, `login`, `hasAuthenticationError`) matches the
 * specs; locators come from `department-management-updated.spec.ts`:
 *   heading  'Welcome to MIDC Smart Governance Portal'
 *   username input[type='text'], password input[type='password'], button 'Login' (exact)
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from '../utils/assertions';
import { config } from '../support/config';
import { authenticationErrorPattern } from '../test-data/department.data';

export class DepartmentLoginPage {
  readonly heading: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly authenticationError: Locator;
  /** Element that proves a successful login (used to stop waiting for an error early). */
  private readonly loggedInIndicator: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { name: 'Welcome to MIDC Smart Governance Portal' });
    this.usernameInput = page.locator("input[type='text']");
    this.passwordInput = page.locator("input[type='password']");
    this.loginButton = page.getByRole('button', { name: 'Login', exact: true });
    this.authenticationError = page.getByText(authenticationErrorPattern).first();
    this.loggedInIndicator = page.getByRole('link', { name: 'Masters Management' });
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * ASSUMPTION (original implementation not supplied): waits until either the
   * post-login "Masters Management" link or an authentication error message is
   * shown, then reports whether the error is visible. If neither appears within
   * AUTH_ERROR_PROBE_TIMEOUT_MS it returns false, so the scenario continues and
   * the next assertion fails exactly as the original test would.
   */
  async hasAuthenticationError(): Promise<boolean> {
    try {
      await this.authenticationError
        .or(this.loggedInIndicator)
        .first()
        .waitFor({ state: 'visible', timeout: config.authErrorProbeTimeoutMs });
    } catch {
      return false;
    }
    return this.authenticationError.isVisible();
  }
}
