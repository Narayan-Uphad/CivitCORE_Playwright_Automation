/**
 * Masters Management / Admin Portal / Organization Configuration.
 *
 * RECONSTRUCTED PAGE OBJECT — the original `MastersManagementPage` was not
 * supplied. API (`mastersManagementLink`, `openMastersManagement`,
 * `expectAdminPortalLoaded`, `openOrganizationConfiguration`,
 * `selectOrganization`, `expectOrganizationSelected`) matches the specs.
 * Locators come from `department-management-updated.spec.ts`.
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from '../utils/assertions';

export class MastersManagementPage {
  readonly mastersManagementLink: Locator;
  readonly adminPortalHeading: Locator;
  readonly organizationConfigurationIcon: Locator;
  readonly organizationSelect: Locator;

  private selectedOrganization?: string;

  constructor(private readonly page: Page) {
    this.mastersManagementLink = page.getByRole('link', { name: 'Masters Management' });
    this.adminPortalHeading = page.getByRole('heading', { name: 'Welcome to Admin Portal' });
    this.organizationConfigurationIcon = page
      .locator('.MuiSvgIcon-root.MuiSvgIcon-fontSizeMedium.css-cusz60 > path')
      .first();
    this.organizationSelect = page.getByText('Select Organization Name');
  }

  async openMastersManagement(): Promise<void> {
    await this.mastersManagementLink.click();
  }

  async expectAdminPortalLoaded(): Promise<void> {
    await expect(this.adminPortalHeading).toBeVisible({ timeout: 30000 });
  }

  async openOrganizationConfiguration(): Promise<void> {
    await this.organizationConfigurationIcon.click();
  }

  /**
   * Opens the organization select and picks the entry.
   * The dropdown renders its entries as plain `div`s without `role="option"`, so an
   * ARIA-option-only locator never resolves; the option is matched by exact text and
   * `.last()` disambiguates it from the closed-state label of the same name.
   */
  async selectOrganization(name: string): Promise<void> {
    await this.organizationSelect.click();
    const option = this.page
      .getByRole('option', { name, exact: true })
      .or(this.page.getByText(name, { exact: true }))
      .last();
    await expect(option).toBeVisible({ timeout: 20000 });
    await option.click();
    this.selectedOrganization = name;
  }

  /**
   * Same interaction as add-nested-department(-fixed).spec.ts, which picks the
   * option by exact text and uses `.last()` to target the dropdown entry.
   */
  async selectOrganizationByText(name: string, timeout = 10000): Promise<void> {
    await this.organizationSelect.click();
    const option = this.page.getByText(name, { exact: true }).last();
    await expect(option).toBeVisible({ timeout });
    await option.click();
    this.selectedOrganization = name;
  }

  /**
   * ASSUMPTION (original implementation not supplied): after a selection the
   * "Select Organization Name" placeholder is replaced by the chosen value.
   */
  async expectOrganizationSelected(name = this.selectedOrganization): Promise<void> {
    await expect(this.organizationSelect).toBeHidden({ timeout: 20000 });
    if (name) {
      await expect(this.page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 20000 });
    }
  }
}
