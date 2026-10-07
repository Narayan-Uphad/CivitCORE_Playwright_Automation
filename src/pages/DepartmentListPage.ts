/**
 * Department tab / Department List (AG Grid) on Organization Configuration.
 * All locators are copied verbatim from the original specs.
 */
import type { Locator, Page } from '@playwright/test';
import { escapeRegExp, expect, ROW_COUNT_POLL } from '../utils/assertions';

export class DepartmentListPage {
  readonly departmentTab: Locator;
  readonly departmentGrid: Locator;
  /** `getByRole('button', { name: 'Add Department', exact: true })` */
  readonly addDepartmentButton: Locator;
  /** `getByRole('button', { name: 'Add Department' })` (non-exact, as in the navigation / verified specs) */
  readonly addDepartmentButtonAnyMatch: Locator;
  readonly departmentNameFilter: Locator;
  /** `.ag-center-cols-container [role="row"]` — the data rows of the grid. */
  readonly dataRows: Locator;
  /** department-management-updated.spec.ts TC-045 */
  readonly paginationSummary: Locator;
  readonly nonEmptyRows: Locator;
  readonly unselectAllButton: Locator;
  readonly bulkDeleteButton: Locator;

  constructor(private readonly page: Page) {
    this.departmentTab = page.locator('div:has-text("Department")').nth(1);
    this.departmentGrid = page.locator('[role="treegrid"]');
    this.addDepartmentButton = page.getByRole('button', { name: 'Add Department', exact: true });
    this.addDepartmentButtonAnyMatch = page.getByRole('button', { name: 'Add Department' });
    this.departmentNameFilter = page.getByRole('textbox', { name: 'Department Name Filter Input' });
    this.dataRows = page.locator('.ag-center-cols-container [role="row"]');
    // The "1 to 10 of 219" summary is split across child nodes, so getByText cannot match it.
    this.paginationSummary = page.locator('.ag-paging-panel');
    this.nonEmptyRows = page.locator('div[role="row"]').filter({ hasText: /.+/ });
    this.unselectAllButton = page.getByRole('button', { name: 'Unselect All' });
    this.bulkDeleteButton = page.locator('button.project-save-button').filter({ hasText: /^Delete/ }).first();
  }

  columnHeader(name: string | RegExp): Locator {
    return this.page.getByRole('columnheader', { name });
  }

  /** Floating filter of a grid column, e.g. "Dept Code" -> "Dept Code Filter Input". */
  columnFilter(columnName: string): Locator {
    return this.page.getByRole('textbox', { name: `${columnName} Filter Input` });
  }

  /** First matching grid row; searched across every row so pinned-column values match too. */
  rowMatching(text: string): Locator {
    return this.page
      .locator('[role="row"]')
      .filter({ hasText: new RegExp(escapeRegExp(text), 'i') })
      .first();
  }

  /** `page.locator('[role="gridcell"]').filter({ hasText }).first()` */
  gridCellContaining(text: string): Locator {
    return this.page.locator('[role="gridcell"]').filter({ hasText: text }).first();
  }

  /**
   * Department name cell of a data row. Scoped to the grid body because the floating
   * filter row is also exposed as a `gridcell` and matches the text typed into it.
   * The app normalises stored casing, so the name is matched case-insensitively.
   */
  departmentRowCellNamed(name: string): Locator {
    return this.departmentNameCell(this.dataRows)
      .filter({ hasText: new RegExp(`^\\s*${name}\\s*$`, 'i') })
      .first();
  }

  rowsContaining(text: string): Locator {
    return this.dataRows.filter({ hasText: text });
  }

  /** Department name cell of a data row. */
  departmentNameCell(row: Locator): Locator {
    return row.locator('[col-id="ag-Grid-AutoColumn"]');
  }

  rowActionButton(row: Locator): Locator {
    return row.locator('[col-id="Action"] button').last();
  }

  /** The row action menu is plain markup, not an ARIA menu. */
  rowMenuItem(label: string): Locator {
    return this.page.locator('.menu-item').filter({ hasText: new RegExp(`^${label}$`, 'i') }).first();
  }

  /** Selection checkboxes live in the pinned-left column, aligned by row-index. */
  pinnedRowCheckbox(rowIndex: string | null): Locator {
    return this.page.locator(
      `.ag-pinned-left-cols-container [role="row"][row-index="${rowIndex}"] input[type="checkbox"]`,
    );
  }

  async openDepartmentTab(timeout?: number): Promise<void> {
    await expect(this.departmentTab).toBeVisible({ timeout });
    await this.departmentTab.click();
  }

  /** Same as the `filterByDepartmentName` helper in the edit / delete specs. */
  async filterByDepartmentName(value: string): Promise<void> {
    await expect(this.departmentNameFilter).toBeVisible({ timeout: 20000 });
    await this.departmentNameFilter.fill(value);
  }

  async expectRowCount(count: number): Promise<void> {
    await expect.poll(async () => this.dataRows.count(), ROW_COUNT_POLL).toBe(count);
  }

  async expectRowCountAbove(count: number): Promise<void> {
    await expect.poll(async () => this.dataRows.count(), ROW_COUNT_POLL).toBeGreaterThan(count);
  }

  async filterByColumn(columnName: string, value: string): Promise<void> {
    const filter = this.columnFilter(columnName);
    await expect(filter).toBeVisible({ timeout: 20000 });
    await filter.fill(value);
  }

  /** Same as the `expectDepartmentsAbsent` helper in delete-added-department.spec.ts. */
  async expectDepartmentsAbsent(filterValue: string): Promise<void> {
    await this.filterByDepartmentName(filterValue);
    await this.expectRowCount(0);

    // Re-apply the filter to make sure the empty result is not a transient re-render.
    await this.filterByDepartmentName('');
    await this.filterByDepartmentName(filterValue);
    await this.expectRowCount(0);
  }

  async visibleDepartmentNames(): Promise<string[]> {
    return (await this.departmentNameCell(this.dataRows).allInnerTexts()).map((text) => text.trim());
  }

  async firstRowDepartmentName(): Promise<string> {
    return (await this.departmentNameCell(this.dataRows.first()).innerText()).trim();
  }

  async selectFirstRows(count: number): Promise<void> {
    for (let index = 0; index < count; index += 1) {
      const rowIndex = await this.dataRows.nth(index).getAttribute('row-index');
      await this.pinnedRowCheckbox(rowIndex).check({ force: true });
    }
  }
}
