/**
 * Access, navigation and permissions (feature: designation_access_and_permissions.feature).
 *
 * FRD path "System Configuration > Master > Designation" is, in MIDC,
 * Masters Management > Organization configuration > Designation tab (see DesignationListPage.open).
 */
import { expect } from '../../utils/assertions';
import { normalizeDesignationText } from '../../test-data/designation.data';
import type { DesignationListPage, RowAction } from './DesignationListPage';

export class DesignationAccessPage {
  constructor(private readonly list: DesignationListPage) {}

  /** The Designation List is the landing view: grid shown, no dialog open. */
  async expectLandingView(): Promise<void> {
    await this.list.expectListVisible();
    await expect(this.list.designationTab).toBeVisible();
    await expect(this.list.columnHeader('Designation Name')).toBeVisible();
    await expect(this.list.dialog).toBeHidden();
  }

  async expectTreeGrid(): Promise<void> {
    await expect(this.list.grid).toHaveAttribute('role', 'treegrid');
  }

  /** Filters to `childName` and checks it is rendered one level below `parentName`, which is a tree group. */
  async expectChildIndentedUnderParent(parentName: string, childName: string): Promise<void> {
    await this.list.filterBy('Designation Name', childName);
    const rows = await this.list.gridRows();
    const indexOf = (name: string) => rows.findIndex((row) => normalizeDesignationText(row.name) === normalizeDesignationText(name));
    const parentRow = indexOf(parentName);
    const childRow = indexOf(childName);
    expect(parentRow, `parent "${parentName}" is shown`).toBeGreaterThanOrEqual(0);
    expect(childRow, `child "${childName}" is shown under its parent`).toBeGreaterThan(parentRow);
    expect(rows[parentRow].isGroup, 'the parent row is an expandable tree group').toBe(true);
    expect(rows[childRow].level, 'the child is indented one level below its parent').toBe(rows[parentRow].level + 1);
  }

  async expectAddActionAvailable(): Promise<void> {
    await expect(this.list.addButton).toBeVisible({ timeout: 30000 });
    await expect(this.list.addButton).toBeEnabled();
  }

  async expectAddActionUnavailable(): Promise<void> {
    await this.list.expectListVisible();
    if (await this.list.addButton.isVisible()) await expect(this.list.addButton).toBeDisabled();
  }

  /** Expects the open row menu to offer every one of `actions`. */
  async expectRowActions(actions: RowAction[]): Promise<void> {
    const offered = await this.list.rowMenuLabels();
    const missing = actions.filter((action) => !offered.some((label) => label.toLowerCase() === action.toLowerCase()));
    expect(missing, `row actions offered: [${offered.join(', ')}]`).toEqual([]);
  }

  /** Expects the open row menu's Delete action to be offered and enabled. */
  async expectDeleteActionEnabled(): Promise<void> {
    const item = this.list.rowMenuItem('Delete');
    await expect(item).toBeVisible();
    await expect(item).not.toHaveAttribute('aria-disabled', 'true');
    await expect(item).not.toHaveClass(/disabled/);
  }
}
