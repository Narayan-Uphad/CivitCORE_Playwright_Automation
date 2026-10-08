/**
 * Location Category List (hierarchy) - landing screen of Location Category Management
 * (features: location_category_hierarchy_list / search_view / permissions).
 *
 * Location Category tab of Masters Management > Organization Configuration. It owns navigation, so every
 * other Location Category page object starts from it. Where the app exposes no role / label / test id:
 *  - the module tabs are plain divs (.task-tab-base);
 *  - AG Grid cells are addressed by their configured column id (col-id), never by generated ids;
 *  - the row action menu is plain markup (.menu-item), exactly as in the Department and Designation grids.
 *
 * The build offers no View / Detail screen and no global search box: the row menu is Edit + Delete and
 * the grid has per-column floating filters (Location Category, Short Name, Prod Code).
 */
import type { Locator, Page } from '@playwright/test';
import { escapeRegExp, expect } from '../../utils/assertions';
import type { MastersManagementPage } from '../MastersManagementPage';
import type { LocationCategoryApi } from './LocationCategoryApi';

export type RowAction = 'Edit' | 'Delete';
export type FilterColumn = 'Location Category' | 'Short Name';

export interface GridRow {
  rowIndex: number;
  name: string;
  shortName: string;
  level: number;
  isGroup: boolean;
}

export interface PagingSummary {
  from: number;
  to: number;
  total: number;
  page: number;
  pages: number;
}

export function exactText(text: string): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(text.trim())}\\s*$`, 'i');
}

export class LocationCategoryListPage {
  readonly organizationConfigurationIcon: Locator;
  readonly departmentTab: Locator;
  readonly locationCategoryTab: Locator;
  readonly locationTab: Locator;
  readonly organizationPlaceholder: Locator;

  readonly grid: Locator;
  readonly dataRows: Locator;
  readonly addButton: Locator;
  readonly nameFilter: Locator;
  readonly shortNameFilter: Locator;
  readonly pagingPanel: Locator;
  readonly nextPageButton: Locator;
  readonly noRowsOverlay: Locator;
  readonly rowMenuItems: Locator;
  /** Any open dialog (Add / Edit form, delete confirmation); the list is not "visible" behind one. */
  readonly dialog: Locator;

  constructor(
    private readonly page: Page,
    private readonly organization: MastersManagementPage,
    readonly api: LocationCategoryApi,
  ) {
    this.organizationConfigurationIcon = page.getByTestId('BusinessOutlinedIcon');
    this.departmentTab = page.locator('.task-tab-base').filter({ hasText: /^\s*Department\s*$/ });
    this.locationCategoryTab = page.locator('.task-tab-base').filter({ hasText: /^\s*Location Category\s*$/ });
    this.locationTab = page.locator('.task-tab-base').filter({ hasText: /^\s*Location\s*$/ });
    this.organizationPlaceholder = page.getByText('Select Organization Name');

    this.grid = page.getByRole('treegrid').filter({ has: page.getByRole('columnheader', { name: 'Prod Code' }) });
    this.dataRows = this.grid.locator('.ag-center-cols-container [role="row"]');
    this.addButton = page.getByRole('button', { name: 'Add Location Category', exact: true });
    this.nameFilter = page.getByRole('textbox', { name: 'Location Category Filter Input' });
    this.shortNameFilter = page.getByRole('textbox', { name: 'Short Name Filter Input' });
    this.pagingPanel = page.locator('.ag-paging-panel');
    this.nextPageButton = page.getByRole('button', { name: 'Next Page' });
    this.noRowsOverlay = page.getByText('No Rows To Show');
    this.rowMenuItems = page.locator('.menu-item').filter({ hasText: /\S/ });
    this.dialog = page.getByRole('dialog');
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /** Opens the Location Category tab for `organizationName` from the portal landing page or anywhere in the Admin Portal. */
  async open(organizationName: string): Promise<void> {
    if (await this.organization.mastersManagementLink.isVisible().catch(() => false)) {
      await this.organization.openMastersManagement();
      await this.organization.expectAdminPortalLoaded();
    }
    if (!(await this.locationCategoryTab.isVisible().catch(() => false))) {
      await expect(this.organizationConfigurationIcon).toBeVisible({ timeout: 30000 });
      await this.organizationConfigurationIcon.click();
    }
    await this.locationCategoryTab.click();
    // The organization stays selected when coming back from another tab.
    await expect(this.organizationPlaceholder.or(this.dataRows.first())).toBeVisible({ timeout: 30000 });
    if (await this.organizationPlaceholder.isVisible()) {
      await this.organization.selectOrganization(organizationName);
    }
    await this.expectListVisible();
  }

  /** Reloads the tab (Department tab and back) so the grid and the Parent lookup show records created through the API. */
  async refresh(organizationName: string): Promise<void> {
    // The Parent lookup is loaded once per page load, so only a full reload makes new records appear in it.
    await this.page.reload();
    await this.open(organizationName);
  }

  async expectListVisible(): Promise<void> {
    await expect(this.grid).toBeVisible({ timeout: 30000 });
    await expect(this.dataRows.first()).toBeVisible({ timeout: 30000 });
    await this.api.expectMasterLoaded();
  }

  async isListVisible(): Promise<boolean> {
    return (await this.grid.isVisible().catch(() => false)) && !(await this.dialog.isVisible().catch(() => false));
  }

  async isModuleAvailable(): Promise<boolean> {
    return this.locationCategoryTab.isVisible().catch(() => false);
  }

  // ---------------------------------------------------------------------------
  // Rows and columns
  // ---------------------------------------------------------------------------

  nameCell(row: Locator): Locator {
    return row.locator('[col-id="ag-Grid-AutoColumn"]');
  }

  shortNameCell(row: Locator): Locator {
    return row.locator('[col-id="abbreviation"]');
  }

  /** Data row whose Location Category is exactly `name` (case-insensitive). */
  row(name: string): Locator {
    const nameValue = this.page.locator('[col-id="ag-Grid-AutoColumn"] .ag-group-value', { hasText: exactText(name) });
    return this.dataRows.filter({ has: nameValue }).first();
  }

  columnHeader(name: string): Locator {
    return this.grid.getByRole('columnheader', { name, exact: true });
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
          shortName: text('[col-id="abbreviation"]'),
          level: level ? Number(level[1]) : 0,
          isGroup: element.classList.contains('ag-row-group'),
        };
      }),
    );
    return rows.filter((row) => row.name !== '').sort((a, b) => a.rowIndex - b.rowIndex);
  }

  /** Expands every collapsed tree node currently rendered (repeats because expanding renders more nodes). */
  async expandAll(): Promise<void> {
    const collapsed = this.grid.locator('.ag-group-contracted:not(.ag-hidden)');
    for (let pass = 0; pass < 12 && (await collapsed.count()) > 0; pass++) {
      await collapsed.first().click();
      await this.page.waitForTimeout(150);
    }
  }

  /** Name of the row's parent as the grid draws it: the nearest row above with one level less. */
  async parentOnScreen(name: string): Promise<string | null> {
    const rows = await this.gridRows();
    const index = rows.findIndex((row) => row.name.toLowerCase() === name.trim().toLowerCase());
    if (index < 0) throw new Error(`"${name}" is not displayed in the Location Category grid.`);
    if (rows[index].level === 0) return null;
    for (let i = index - 1; i >= 0; i--) if (rows[i].level < rows[index].level) return rows[i].name;
    return null;
  }

  // ---------------------------------------------------------------------------
  // Search (floating column filters)
  // ---------------------------------------------------------------------------

  /**
   * Types into a floating column filter and waits until the grid shows the filtered result: either no rows,
   * or only rows that match (plus their tree ancestors / descendants).
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
          const matches = (row: GridRow) => (column === 'Short Name' ? row.shortName : row.name).toLowerCase().includes(needle);
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
    await this.filterBy('Location Category', name);
    const row = this.row(name);
    await expect(row, `Location Category "${name}" is listed`).toBeVisible({ timeout: 20000 });
    return row;
  }

  /** Filters by name and confirms no row is rendered, re-checking so a transient re-render cannot pass. */
  async expectAbsent(name: string): Promise<void> {
    await this.clearFilters();
    await this.filterBy('Location Category', name);
    await expect(this.row(name), `Location Category "${name}" is not listed`).toHaveCount(0, { timeout: 20000 });
    await this.nameFilter.fill('');
    await this.filterBy('Location Category', name);
    await expect(this.row(name)).toHaveCount(0);
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.dataRows).toHaveCount(0, { timeout: 15000 });
    // The "No Rows To Show" overlay is not always rendered visibly; the pager's "0 to 0 of 0" is the dependable sign.
    await expect(this.noRowsOverlay.first().or(this.pagingPanel.getByText(/0\s+to\s+0\s+of\s+0/)).first()).toBeVisible();
  }

  async expectUsable(): Promise<void> {
    await expect(this.grid).toBeVisible();
    await expect(this.nameFilter).toBeEditable();
  }

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  async pagingSummary(): Promise<PagingSummary> {
    const text = (await this.pagingPanel.innerText()).replace(/,/g, '').replace(/\s+/g, ' ');
    const range = /(\d+)\s+to\s+(\d+)\s+of\s+(\d+)/i.exec(text);
    const pages = /Page\s+(\d+)\s+of\s+(\d+)/i.exec(text);
    if (!range || !pages) throw new Error(`Could not read the pagination summary from "${text}".`);
    return { from: Number(range[1]), to: Number(range[2]), total: Number(range[3]), page: Number(pages[1]), pages: Number(pages[2]) };
  }

  async goToNextPage(): Promise<void> {
    const before = (await this.pagingSummary()).page;
    await this.nextPageButton.click();
    await expect.poll(async () => (await this.pagingSummary()).page, { timeout: 15000 }).toBe(before + 1);
  }

  /** Configured page size shown next to "Page Size:". */
  async pageSize(): Promise<number> {
    const text = (await this.pagingPanel.innerText()).replace(/\s+/g, ' ');
    const shown = /Page Size:\s*(\d+)/i.exec(text);
    return shown ? Number(shown[1]) : 0;
  }

  /**
   * Raises the page size to the largest offered, so a filtered result is not cut into pages. The control is an
   * AG Grid select (role combobox, name "Page Size") whose options render in a popup.
   */
  async useLargestPageSize(): Promise<void> {
    const picker = this.page.getByRole('combobox', { name: 'Page Size' });
    if ((await picker.count()) === 0) return;
    await picker.click();
    const options = this.page.getByRole('option');
    const sizes = (await options.allInnerTexts()).map((text) => Number(text.trim())).filter((size) => size > 0);
    if (sizes.length === 0) {
      await this.page.keyboard.press('Escape');
      return;
    }
    const largest = Math.max(...sizes);
    await options.filter({ hasText: exactText(String(largest)) }).first().click();
    await expect.poll(() => this.pageSize(), { timeout: 10000 }).toBe(largest);
  }

  // ---------------------------------------------------------------------------
  // Row action menu (Edit / Delete)
  // ---------------------------------------------------------------------------

  async openRowMenu(name: string): Promise<void> {
    const row = await this.showRow(name);
    await row.locator('[col-id="action"] button').click();
    await expect(this.rowMenuItems.first()).toBeVisible({ timeout: 10000 });
  }

  async rowMenuLabels(): Promise<string[]> {
    return (await this.rowMenuItems.allInnerTexts()).map((label) => label.trim()).filter(Boolean);
  }

  rowMenuItem(action: RowAction): Locator {
    return this.rowMenuItems.filter({ hasText: exactText(action) }).first();
  }

  async hasRowAction(action: string): Promise<boolean> {
    return (await this.rowMenuItems.filter({ hasText: exactText(action) }).count()) > 0;
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
}
