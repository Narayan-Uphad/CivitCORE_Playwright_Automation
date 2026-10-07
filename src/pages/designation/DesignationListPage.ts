/**
 * Designation List (feature: designation_list_search_view.feature).
 *
 * Designation tab of Masters Management > Organization configuration. This is also the landing
 * screen every other Designation page object starts from, so it owns the navigation.
 *
 * Where the app exposes no role/label/test id, the fallback is noted next to the locator:
 *  - the module tabs ("Department", "Designation", "Position", ...) are plain divs (.task-tab-base);
 *  - AG Grid cells are addressed by their configured column id (col-id), never by generated ids
 *    such as `#ag-1558-input`, which change on every render;
 *  - the row action menu is plain markup (.menu-item), exactly as in the Department grid.
 */
import type { Locator, Page } from '@playwright/test';
import { escapeRegExp, expect } from '../../utils/assertions';
import type { MastersManagementPage } from '../MastersManagementPage';
import type { DesignationApiMonitor } from './DesignationApiMonitor';

export type RowAction = 'View' | 'Edit' | 'Delete';
export type FilterColumn = 'Designation Name' | 'Short Name';

export interface GridRow {
  rowIndex: number;
  name: string;
  shortName: string;
  level: number;
  isGroup: boolean;
}

export function exactText(text: string): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(text.trim())}\\s*$`, 'i');
}

export class DesignationListPage {
  /** The "Organization configuration" icon has a tooltip but no accessible name. */
  readonly organizationConfigurationIcon: Locator;
  readonly designationTab: Locator;
  readonly organizationPlaceholder: Locator;

  readonly grid: Locator;
  readonly dataRows: Locator;
  readonly addButton: Locator;
  readonly nameFilter: Locator;
  readonly shortNameFilter: Locator;
  readonly paginationSummary: Locator;
  readonly rowMenuItems: Locator;
  /** Any open dialog (Add / Edit form, delete confirmation); the list is not "visible" behind one. */
  readonly dialog: Locator;

  constructor(
    private readonly page: Page,
    private readonly organization: MastersManagementPage,
    readonly api: DesignationApiMonitor,
  ) {
    this.organizationConfigurationIcon = page.getByTestId('BusinessOutlinedIcon');
    this.designationTab = page.locator('.task-tab-base').filter({ hasText: /^\s*Designation\s*$/ });
    this.organizationPlaceholder = page.getByText('Select Organization Name');

    // The Add / Edit dialog holds its own "Reporting To" tree grid, so the list grid is the one with a Short Name column.
    this.grid = page.getByRole('treegrid').filter({ has: page.getByRole('columnheader', { name: 'Short Name' }) });
    this.dataRows = this.grid.locator('.ag-center-cols-container [role="row"]');
    // Each row's Hierarchy cell has its own "+Add Designation" button, hence the exact match.
    this.addButton = page.getByTestId('tabs').getByRole('button', { name: 'Add Designation', exact: true });
    this.nameFilter = page.getByRole('textbox', { name: 'Designation Name Filter Input' });
    this.shortNameFilter = page.getByRole('textbox', { name: 'Short Name Filter Input' });
    // AG Grid only gives the summary role="status" while rows are shown; the panel class is the fallback.
    this.paginationSummary = page
      .getByRole('status')
      .filter({ hasText: / of / })
      .or(page.locator('.ag-paging-row-summary-panel'));
    this.rowMenuItems = page.locator('.menu-item').filter({ hasText: /\S/ });
    this.dialog = page.getByRole('dialog');
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /** Opens the Designation tab for `organizationName` from the portal landing page or anywhere in the Admin Portal. */
  async open(organizationName: string): Promise<void> {
    if (await this.organization.mastersManagementLink.isVisible().catch(() => false)) {
      await this.organization.openMastersManagement();
      await this.organization.expectAdminPortalLoaded();
    }
    if (!(await this.designationTab.isVisible().catch(() => false))) {
      await expect(this.organizationConfigurationIcon).toBeVisible({ timeout: 30000 });
      await this.organizationConfigurationIcon.click();
    }
    await this.designationTab.click();
    // The organization stays selected when coming back from another tab.
    await expect(this.organizationPlaceholder.or(this.dataRows.first())).toBeVisible({ timeout: 30000 });
    if (await this.organizationPlaceholder.isVisible()) {
      await this.organization.selectOrganization(organizationName);
    }
    await this.expectListVisible();
  }

  async expectListVisible(): Promise<void> {
    await expect(this.grid).toBeVisible({ timeout: 30000 });
    await expect(this.dataRows.first()).toBeVisible({ timeout: 30000 });
    await this.api.expectMasterLoaded();
  }

  async isListVisible(): Promise<boolean> {
    return (await this.grid.isVisible().catch(() => false)) && !(await this.dialog.isVisible().catch(() => false));
  }

  // ---------------------------------------------------------------------------
  // Rows and columns
  // ---------------------------------------------------------------------------

  nameCell(row: Locator): Locator {
    return row.locator('[col-id="ag-Grid-AutoColumn"]');
  }

  shortNameCell(row: Locator): Locator {
    return row.locator('[col-id="code"]');
  }

  /** Data row whose Designation Name is exactly `name` (case-insensitive: the app title-cases names). */
  row(name: string): Locator {
    const nameValue = this.page.locator('[col-id="ag-Grid-AutoColumn"] .ag-group-value', { hasText: exactText(name) });
    return this.dataRows.filter({ has: nameValue }).first();
  }

  columnHeader(name: string): Locator {
    return this.grid.getByRole('columnheader', { name, exact: true });
  }

  async columnHeaderTexts(): Promise<string[]> {
    return (await this.grid.getByRole('columnheader').allInnerTexts()).map((header) => header.trim()).filter(Boolean);
  }

  /** Visible data rows in on-screen order (AG Grid positions rows absolutely, so DOM order is not reliable). */
  async gridRows(): Promise<GridRow[]> {
    const rows = await this.dataRows.evaluateAll((elements) =>
      elements.map((element) => {
        const text = (selector: string) => (element.querySelector(selector)?.textContent ?? '').trim();
        const level = /ag-row-level-(\d+)/.exec(element.className);
        return {
          rowIndex: Number(element.getAttribute('row-index') ?? '0'),
          name: text('[col-id="ag-Grid-AutoColumn"] .ag-group-value') || text('[col-id="ag-Grid-AutoColumn"]'),
          shortName: text('[col-id="code"]'),
          level: level ? Number(level[1]) : 0,
          isGroup: element.classList.contains('ag-row-group'),
        };
      }),
    );
    return rows.filter((row) => row.name !== '').sort((a, b) => a.rowIndex - b.rowIndex);
  }

  // ---------------------------------------------------------------------------
  // Search (floating column filters)
  // ---------------------------------------------------------------------------

  /**
   * Types into a floating column filter and waits until the grid shows the filtered result:
   * either no rows, or only rows that match (plus their tree ancestors / descendants).
   */
  async filterBy(column: FilterColumn, text: string): Promise<void> {
    const filter = column === 'Short Name' ? this.shortNameFilter : this.nameFilter;
    await expect(filter).toBeVisible({ timeout: 20000 });
    await filter.fill(text);
    const needle = text.trim().toLowerCase();
    if (needle === '') {
      await expect(this.dataRows.first()).toBeVisible({ timeout: 20000 });
      return;
    }
    await expect
      .poll(
        async () => {
          const rows = await this.gridRows();
          const matches = (row: GridRow) =>
            (column === 'Short Name' ? row.shortName : row.name).toLowerCase().includes(needle);
          return rows.length === 0 || (rows.some(matches) && rows.every((row) => matches(row) || row.isGroup || row.level > 0));
        },
        { timeout: 20000, message: `grid filtered by ${column} "${text}"` },
      )
      .toBe(true);
  }

  async clearFilters(): Promise<void> {
    for (const filter of [this.nameFilter, this.shortNameFilter]) {
      if ((await filter.inputValue().catch(() => '')) !== '') await filter.fill('');
    }
    await expect(this.dataRows.first()).toBeVisible({ timeout: 20000 });
  }

  /** Filters by name and confirms the row has been rendered. */
  async showRow(name: string): Promise<Locator> {
    await this.clearFilters();
    await this.filterBy('Designation Name', name);
    const row = this.row(name);
    await expect(row, `Designation "${name}" is listed`).toBeVisible({ timeout: 20000 });
    return row;
  }

  /** Filters by name and confirms no row is rendered, re-checking so a transient re-render cannot pass. */
  async expectAbsent(name: string): Promise<void> {
    await this.clearFilters();
    await this.filterBy('Designation Name', name);
    await expect(this.row(name), `Designation "${name}" is not listed`).toHaveCount(0, { timeout: 20000 });
    await this.nameFilter.fill('');
    await this.filterBy('Designation Name', name);
    await expect(this.row(name)).toHaveCount(0);
  }

  /** The row's Short Name cell shows exactly `abbreviation`. */
  async expectShortName(row: Locator, abbreviation: string): Promise<void> {
    await expect(this.shortNameCell(row)).toHaveText(exactText(abbreviation));
  }

  /** Every top-level, non-group row matches `text` in the given column (ancestors / descendants are context). */
  async unrelatedRows(column: 'Abbreviation' | 'name', text: string): Promise<{ rows: GridRow[]; unrelated: string[] }> {
    const rows = await this.gridRows();
    const value = (row: GridRow) => (column === 'Abbreviation' ? row.shortName : row.name);
    const needle = text.toLowerCase();
    const unrelated = rows.filter((row) => !value(row).toLowerCase().includes(needle) && !row.isGroup && row.level === 0);
    return { rows, unrelated: unrelated.map(value) };
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.dataRows).toHaveCount(0, { timeout: 15000 });
    await expect(this.paginationSummary.first()).toContainText(/\b0\s+to\s+0\s+of\s+0\b/);
  }

  async expectUsable(): Promise<void> {
    await expect(this.grid).toBeVisible();
    await expect(this.nameFilter).toBeEditable();
  }

  // ---------------------------------------------------------------------------
  // Row action menu (View / Edit / Delete)
  // ---------------------------------------------------------------------------

  async openRowMenu(name: string): Promise<void> {
    const row = await this.showRow(name);
    await row.locator('[col-id="Action"] button').click();
    await expect(this.rowMenuItems.first()).toBeVisible({ timeout: 10000 });
  }

  async rowMenuLabels(): Promise<string[]> {
    return (await this.rowMenuItems.allInnerTexts()).map((label) => label.trim()).filter(Boolean);
  }

  rowMenuItem(action: RowAction): Locator {
    return this.rowMenuItems.filter({ hasText: exactText(action) }).first();
  }

  async hasRowAction(action: RowAction): Promise<boolean> {
    return (await this.rowMenuItem(action).count()) > 0;
  }

  async chooseRowAction(name: string, action: RowAction): Promise<void> {
    await this.openRowMenu(name);
    const item = this.rowMenuItem(action);
    if ((await item.count()) === 0) {
      const available = await this.rowMenuLabels();
      await this.page.keyboard.press('Escape');
      throw new Error(`The row action menu of "${name}" offers [${available.join(', ')}]; it has no "${action}" action.`);
    }
    await item.click();
  }

  async closeRowMenu(): Promise<void> {
    if (await this.rowMenuItems.first().isVisible().catch(() => false)) await this.page.keyboard.press('Escape');
  }

  /** The View screen shows each of `values` (substring match). */
  async expectViewShows(values: string[]): Promise<void> {
    for (const value of values) {
      await expect(this.page.getByText(value, { exact: false }).first(), `the view shows "${value}"`).toBeVisible({ timeout: 15000 });
    }
  }
}
