/**
 * Reusable multi-step business flows that the original specs implemented as
 * local helper functions (`addDepartment`, `createDepartment`).
 */
import type { Page } from '@playwright/test';
import { expect } from '../utils/assertions';
import { departmentMessages } from '../test-data/department.data';
import { DepartmentDialog } from './DepartmentDialog';
import { DepartmentListPage } from './DepartmentListPage';

export class DepartmentFlows {
  constructor(
    private readonly page: Page,
    private readonly list: DepartmentListPage,
    private readonly dialog: DepartmentDialog,
  ) {}

  /**
   * `addDepartment` helper from edit-department.spec.ts / delete-added-department.spec.ts
   * (no success-toast assertion).
   */
  async addDepartment(name: string, shortName: string, prodCode: string): Promise<void> {
    await expect(this.list.addDepartmentButton).toBeVisible({ timeout: 20000 });
    await this.list.addDepartmentButton.click();

    await expect(this.dialog.dialog).toBeVisible();
    await this.dialog.departmentNameInput.fill(name);
    await this.dialog.departmentShortNameInput.fill(shortName);
    await this.dialog.selectProdCode(prodCode);

    await this.dialog.submitAddDepartmentButton.click();
    await expect(this.dialog.dialog).not.toBeVisible({ timeout: 30000 });
  }

  /**
   * `createDepartment` helper from department-negative-test-cases.spec.ts
   * (asserts the success toaster before the dialog closes).
   */
  async createDepartmentSuccessfully(name: string, shortName: string, prodCode: string): Promise<void> {
    await expect(this.list.addDepartmentButton).toBeVisible({ timeout: 20000 });
    await this.list.addDepartmentButton.click();
    await expect(this.dialog.dialog).toBeVisible({ timeout: 20000 });

    await this.dialog.departmentNameInput.fill(name);
    await this.dialog.departmentShortNameInput.fill(shortName);
    await this.dialog.selectProdCode(prodCode);

    await this.dialog.submitAddDepartmentButton.click();
    await expect(this.page.getByText(departmentMessages.added)).toBeVisible({ timeout: 30000 });
    await expect(this.dialog.dialog).not.toBeVisible({ timeout: 30000 });
  }

  /**
   * `openEditDialog` helper from edit-department.spec.ts: filters the grid down to
   * the single department and opens its Edit dialog.
   */
  async openEditDialog(departmentName: string): Promise<void> {
    await this.list.filterByDepartmentName(departmentName);
    await this.list.expectRowCount(1);

    await this.list.rowActionButton(this.list.dataRows.first()).click();

    // The row action menu is plain markup, not an ARIA menu.
    const editMenuItem = this.list.rowMenuItem('Edit');
    await expect(editMenuItem).toBeVisible({ timeout: 20000 });
    await editMenuItem.click();

    await expect(this.dialog.dialog).toBeVisible({ timeout: 15000 });

    // Values are prefilled asynchronously and would overwrite anything typed too early.
    await expect(this.dialog.departmentNameInput).toHaveValue(new RegExp(`^${departmentName}$`, 'i'), {
      timeout: 20000,
    });
  }
}
