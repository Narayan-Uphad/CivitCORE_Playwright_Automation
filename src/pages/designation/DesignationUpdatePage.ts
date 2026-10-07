/**
 * Designation update (feature: designation_update.feature).
 *
 * Opens a Designation's Edit form from its row menu. Editing and saving live in the shared
 * DesignationFormDialog.
 */
import { escapeRegExp, expect } from '../../utils/assertions';
import type { DesignationFormDialog } from './DesignationFormDialog';
import type { DesignationListPage } from './DesignationListPage';

export class DesignationUpdatePage {
  constructor(
    private readonly list: DesignationListPage,
    private readonly form: DesignationFormDialog,
  ) {}

  async open(name: string): Promise<void> {
    await this.list.chooseRowAction(name, 'Edit');
    await expect(this.form.title).toHaveText(/Edit Designation/, { timeout: 20000 });
    await expect(this.form.nameInput).not.toHaveValue('', { timeout: 20000 });
  }

  /**
   * Re-opens a Designation to review it and closes it again without saving. The MIDC row menu has
   * no View action (see F_0005 / F_0022), so its Edit form is used as the details screen when needed.
   * Returns the action that was used.
   */
  async reopenForReview(name: string): Promise<'View' | 'Edit'> {
    await this.list.openRowMenu(name);
    const action = (await this.list.hasRowAction('View')) ? 'View' : 'Edit';
    await this.list.rowMenuItem(action).click();
    await expect(this.form.nameInput).toHaveValue(new RegExp(`^\\s*${escapeRegExp(name)}\\s*$`, 'i'), { timeout: 20000 });
    await this.form.cancel();
    return action;
  }
}
