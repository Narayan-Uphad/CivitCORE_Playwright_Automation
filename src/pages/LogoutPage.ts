/**
 * Logout flow: the portal exposes it behind the header user/profile menu.
 * Locators are tolerant because the control is rendered either as an avatar
 * button or as a plain icon depending on the screen.
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from '../utils/assertions';
import { config } from '../support/config';

export class LogoutPage {
  readonly userMenuTrigger: Locator;
  readonly logoutMenuItem: Locator;
  readonly confirmLogoutButton: Locator;
  readonly departmentLoginHeading: Locator;
  /** Anonymous entry point on the portal home, shown again once the session ends. */
  readonly departmentLoginLink: Locator;
  readonly mastersManagementLink: Locator;

  constructor(private readonly page: Page) {
    // The header profile control is an <a class="profile-trigger dropdown-toggle">, not a button,
    // so a role=button locator never resolves. The role-based forms are kept as fallbacks.
    this.userMenuTrigger = page
      .locator('a.profile-trigger, .profile-dropdown .dropdown-toggle')
      .or(page.getByRole('button', { name: /profile|account|user|avatar|menu/i }))
      .first();
    // The menu entry is <a class="panel-menu-item logout" href="/Home/Logout">Sign Out</a>.
    this.logoutMenuItem = page
      .locator('a.panel-menu-item.logout, a[href$="/Home/Logout" i]')
      .or(page.getByRole('menuitem', { name: /log\s*out|sign\s*out/i }))
      .or(page.getByRole('button', { name: /log\s*out|sign\s*out/i }))
      .or(page.getByText(/^\s*(log\s*out|sign\s*out)\s*$/i))
      .first();
    this.confirmLogoutButton = page
      .getByRole('dialog')
      .getByRole('button', { name: /^(yes|ok|log\s*out|sign\s*out|confirm)$/i })
      .first();
    this.departmentLoginHeading = page.getByRole('heading', {
      name: 'Welcome to MIDC Smart Governance Portal',
    });
    this.departmentLoginLink = page.getByRole('link', { name: 'Department Login', exact: true });
    this.mastersManagementLink = page.getByRole('link', { name: 'Masters Management' });
  }

  async openUserMenu(): Promise<void> {
    await expect(this.userMenuTrigger).toBeVisible({ timeout: 20000 });
    await this.userMenuTrigger.click();
  }

  async expectLogoutOptionVisible(timeout = 15000): Promise<void> {
    await expect(this.logoutMenuItem).toBeVisible({ timeout });
  }

  async clickLogout(): Promise<void> {
    await this.logoutMenuItem.click();
  }

  /** The confirmation dialog is optional; skipped when the app logs out immediately. */
  async confirmIfPrompted(): Promise<void> {
    try {
      await this.confirmLogoutButton.waitFor({ state: 'visible', timeout: config.expectTimeoutMs });
    } catch {
      return;
    }
    await this.confirmLogoutButton.click();
  }

  async logout(): Promise<void> {
    await this.openUserMenu();
    await this.expectLogoutOptionVisible();
    await this.clickLogout();
    await this.confirmIfPrompted();
  }

  /**
   * Signing out redirects to the public portal home (BASE_URL/), not to the Department Login
   * page, so the signed-out state is proven by the anonymous entry point being back — either the
   * home page's "Department Login" link or the login page heading — plus the loss of the
   * authenticated "Masters Management" link.
   */
  async expectLoggedOut(timeout = 30000): Promise<void> {
    await expect(this.departmentLoginHeading.or(this.departmentLoginLink).first()).toBeVisible({ timeout });
    await expect(this.mastersManagementLink).toBeHidden({ timeout });
  }

  /** Direct navigation back to a protected page must not restore the session. */
  async expectSessionNotRestorableVia(url: string): Promise<void> {
    await this.page.goto(url);
    await expect(this.mastersManagementLink).toBeHidden({ timeout: 30000 });
  }
}