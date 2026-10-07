/**
 * Position tab of Masters Management > Organization configuration.
 *
 * MIDC has no separate "Post" master: a Post is a Position of a Designation in an Office. After
 * choosing Organisation / Office Category / Office, the tab lists every Designation with its
 * Utilised / Unutilised / Total Position counts, which makes it the Post-side Designation lookup.
 */
import type { Locator, Page } from '@playwright/test';
import { escapeRegExp, expect } from '../utils/assertions';
import { designationMessages } from '../test-data/designation.data';
import type { MastersManagementPage } from './MastersManagementPage';

export interface PositionCounts {
  utilised: number;
  unutilised: number;
  total: number;
}

export class PositionPage {
  /** Module tabs are plain divs without a role (see DesignationPage). */
  readonly positionTab: Locator;
  readonly organizationPlaceholder: Locator;
  readonly officeCategoryPlaceholder: Locator;
  readonly officePlaceholder: Locator;
  readonly proceedButton: Locator;
  readonly grid: Locator;
  readonly dataRows: Locator;
  readonly designationFilter: Locator;
  readonly dialog: Locator;
  readonly positionDeltaInput: Locator;

  constructor(
    private readonly page: Page,
    private readonly organization: MastersManagementPage,
  ) {
    this.positionTab = page.locator('.task-tab-base').filter({ hasText: /^\s*Position\s*$/ });
    this.organizationPlaceholder = page.getByText('Select Organization Name');
    this.officeCategoryPlaceholder = page.getByText('Select Office Category', { exact: true });
    this.officePlaceholder = page.getByText('Select Office', { exact: true });
    this.proceedButton = page.getByRole('button', { name: 'Proceed' });
    this.grid = page.getByRole('treegrid').filter({ has: page.getByRole('columnheader', { name: 'Total Positions' }) });
    this.dataRows = this.grid.locator('.ag-center-cols-container [role="row"]');
    this.designationFilter = page.getByRole('textbox', { name: 'Designation Filter Input' });
    this.dialog = page.getByRole('dialog');
    this.positionDeltaInput = this.dialog.getByRole('textbox', { name: 'No of more Positions to be added/removed *' });
  }

  /** Dropdown entries are plain divs; `.last()` skips the closed-state label of the same text. */
  private async choose(placeholder: Locator, option: string): Promise<void> {
    await placeholder.click();
    const entry = this.page.getByText(option, { exact: true }).last();
    await expect(entry, `"${option}" is offered`).toBeVisible({ timeout: 20000 });
    await entry.click();
  }

  /** Opens the Position list of `office` from anywhere in Organization configuration. */
  async open(organizationName: string, officeCategory: string, office: string): Promise<void> {
    await expect(this.positionTab).toBeVisible({ timeout: 30000 });
    await this.positionTab.click();
    await expect(this.proceedButton).toBeVisible({ timeout: 30000 });
    if (await this.organizationPlaceholder.isVisible()) {
      await this.organization.selectOrganization(organizationName);
    }
    if (await this.officeCategoryPlaceholder.isVisible()) await this.choose(this.officeCategoryPlaceholder, officeCategory);
    if (await this.officePlaceholder.isVisible()) await this.choose(this.officePlaceholder, office);
    await expect(this.proceedButton).toBeEnabled({ timeout: 20000 });
    await this.proceedButton.click();
    await expect(this.dataRows.first(), 'the Position list shows Designations').toBeVisible({ timeout: 30000 });
  }

  row(designation: string): Locator {
    const name = new RegExp(`^\\s*${escapeRegExp(designation.trim())}\\s*$`, 'i');
    return this.dataRows.filter({ has: this.page.getByRole('gridcell', { name }) }).first();
  }

  async filter(designation: string): Promise<void> {
    await this.designationFilter.fill(designation);
  }

  async expectListed(designation: string): Promise<Locator> {
    await this.filter(designation);
    const row = this.row(designation);
    await expect(row, `"${designation}" is listed on the Position tab`).toBeVisible({ timeout: 20000 });
    return row;
  }

  async expectNotListed(designation: string): Promise<void> {
    await this.filter(designation);
    await expect(this.row(designation), `"${designation}" is not listed on the Position tab`).toHaveCount(0, { timeout: 20000 });
  }

  async counts(designation: string): Promise<PositionCounts> {
    const row = await this.expectListed(designation);
    const cells = (await row.getByRole('gridcell').allInnerTexts()).map((text) => text.trim());
    const [utilised, unutilised, total] = cells.slice(1, 4).map(Number);
    return { utilised, unutilised, total };
  }

  /** Adds (positive) or removes (negative) Positions of a Designation in the open office. */
  async changePositions(designation: string, delta: number): Promise<void> {
    const before = await this.counts(designation);
    const row = this.row(designation);
    await row.getByRole('button').click();
    const menuItem = this.page.locator('.menu-item').filter({ hasText: 'Add / Remove Position' }).first();
    await expect(menuItem).toBeVisible({ timeout: 10000 });
    await menuItem.click();
    await expect(this.positionDeltaInput).toBeVisible({ timeout: 20000 });
    // The dialog loads the existing count after it opens and resets the field when it does,
    // so a value typed too early is wiped; re-enter it until it sticks.
    await expect(async () => {
      await this.positionDeltaInput.fill(String(delta));
      await expect(this.positionDeltaInput).toHaveValue(String(delta), { timeout: 1000 });
      await this.page.waitForTimeout(500);
      await expect(this.positionDeltaInput).toHaveValue(String(delta), { timeout: 100 });
    }).toPass({ timeout: 15000 });
    await this.dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(this.page.getByText(designationMessages.positionSaved).first()).toBeVisible({ timeout: 20000 });
    await expect.poll(async () => (await this.counts(designation)).total, { timeout: 20000 }).toBe(before.total + delta);
  }
}
