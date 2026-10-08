/**
 * All Location Category page objects of one browser page, wired to a single LocationCategoryApi so they
 * share the same master data and API history.
 *
 *   list         hierarchy list, search, pagination, row actions (hierarchy_list / search_view / permissions)
 *   form         Add / Edit dialog (creation / update)
 *   deletion     delete confirmation (deletion)
 *   location     Location tab: association with Locations (location_association, deletion dependencies)
 *   activityLog  entry-point probe (audit_log)
 *   api          getHierarchy / create / update / delete traffic and authenticated replay
 */
import type { Page } from '@playwright/test';
import type { MastersManagementPage } from '../MastersManagementPage';
import { LocationCategoryActivityLogPage } from './LocationCategoryActivityLogPage';
import { LocationCategoryApi } from './LocationCategoryApi';
import { LocationCategoryDeletionPage } from './LocationCategoryDeletionPage';
import { LocationCategoryFormDialog } from './LocationCategoryFormDialog';
import { LocationCategoryListPage } from './LocationCategoryListPage';
import { LocationCategoryLocationPage } from './LocationCategoryLocationPage';

export class LocationCategoryPages {
  readonly api: LocationCategoryApi;
  readonly list: LocationCategoryListPage;
  readonly form: LocationCategoryFormDialog;
  readonly deletion: LocationCategoryDeletionPage;
  readonly location: LocationCategoryLocationPage;
  readonly activityLog: LocationCategoryActivityLogPage;

  constructor(
    private readonly page: Page,
    organization: MastersManagementPage,
  ) {
    this.api = new LocationCategoryApi(page);
    this.list = new LocationCategoryListPage(page, organization, this.api);
    this.form = new LocationCategoryFormDialog(page, this.api);
    this.deletion = new LocationCategoryDeletionPage(page, this.list, this.api);
    this.location = new LocationCategoryLocationPage(page, this.list, organization, this.api);
    this.activityLog = new LocationCategoryActivityLogPage(page);
  }

  /** Closes whatever dialog or menu a failed step may have left open, without saving or deleting anything. */
  async dismissOverlays(): Promise<void> {
    if (await this.deletion.isConfirmationOpen()) await this.deletion.cancel().catch(() => undefined);
    if (await this.form.isOpen()) await this.form.cancel().catch(() => undefined);
    await this.location.closeForm().catch(() => undefined);
    await this.list.closeRowMenu();
    const otherDialog = this.page.getByRole('dialog');
    if (await otherDialog.isVisible().catch(() => false)) {
      const dismiss = otherDialog.getByRole('button', { name: /^\s*(Cancel|Close)\s*$/ }).first();
      await dismiss.click({ timeout: 5000 }).catch(() => this.page.keyboard.press('Escape'));
      await otherDialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => undefined);
    }
  }
}
