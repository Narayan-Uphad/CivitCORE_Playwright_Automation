/**
 * All Designation Management page objects of one browser page, wired to a single
 * DesignationApiMonitor so they share the same master data and API history.
 *
 * One page object per feature file in features/designation_management_features:
 *   access       designation_access_and_permissions.feature
 *   activityLog  designation_activity_log.feature
 *   creation     designation_creation.feature
 *   crossModule  designation_cross_module_consumption.feature
 *   deletion     designation_deletion.feature
 *   list         designation_list_search_view.feature (also the landing screen / navigation)
 *   toaster      designation_toaster_notifications.feature
 *   uiVisual     designation_ui_visual.feature
 *   update       designation_update.feature
 * plus `form`, the Add / Edit dialog shared by creation and update.
 */
import type { Page } from '@playwright/test';
import type { MastersManagementPage } from '../MastersManagementPage';
import type { PositionPage } from '../PositionPage';
import { DesignationAccessPage } from './DesignationAccessPage';
import { DesignationActivityLogPage } from './DesignationActivityLogPage';
import { DesignationApiMonitor } from './DesignationApiMonitor';
import { DesignationCreationPage } from './DesignationCreationPage';
import { DesignationCrossModulePage, type PostLookupContext } from './DesignationCrossModulePage';
import { DesignationDeletionPage } from './DesignationDeletionPage';
import { DesignationFormDialog } from './DesignationFormDialog';
import { DesignationListPage } from './DesignationListPage';
import { DesignationToasterPage } from './DesignationToasterPage';
import { DesignationUiVisualPage } from './DesignationUiVisualPage';
import { DesignationUpdatePage } from './DesignationUpdatePage';

export class DesignationPages {
  readonly api: DesignationApiMonitor;
  readonly list: DesignationListPage;
  readonly form: DesignationFormDialog;
  readonly access: DesignationAccessPage;
  readonly activityLog: DesignationActivityLogPage;
  readonly creation: DesignationCreationPage;
  readonly crossModule: DesignationCrossModulePage;
  readonly deletion: DesignationDeletionPage;
  readonly toaster: DesignationToasterPage;
  readonly uiVisual: DesignationUiVisualPage;
  readonly update: DesignationUpdatePage;

  constructor(
    private readonly page: Page,
    organization: MastersManagementPage,
    position: PositionPage,
    postLookup: PostLookupContext,
  ) {
    this.api = new DesignationApiMonitor(page);
    this.list = new DesignationListPage(page, organization, this.api);
    this.form = new DesignationFormDialog(page, this.api);
    this.access = new DesignationAccessPage(this.list);
    this.activityLog = new DesignationActivityLogPage(page);
    this.creation = new DesignationCreationPage(this.list, this.form, this.api);
    this.crossModule = new DesignationCrossModulePage(position, postLookup);
    this.deletion = new DesignationDeletionPage(page, this.list, this.api);
    this.toaster = new DesignationToasterPage(page);
    this.uiVisual = new DesignationUiVisualPage(this.form, this.deletion);
    this.update = new DesignationUpdatePage(this.list, this.form);
  }

  /** Closes whatever dialog or menu a failed step may have left open, without saving or deleting anything. */
  async dismissOverlays(): Promise<void> {
    if (await this.deletion.isConfirmationOpen()) await this.deletion.cancel().catch(() => undefined);
    if (await this.form.isOpen()) await this.form.cancel().catch(() => undefined);
    await this.list.closeRowMenu();
    // Any other modal (e.g. the Position tab's "Add Position" dialog) would block every later click.
    const otherDialog = this.page.getByRole('dialog');
    if (await otherDialog.isVisible().catch(() => false)) {
      const dismiss = otherDialog.getByRole('button', { name: /^\s*(Cancel|Close)\s*$/ }).first();
      await dismiss.click({ timeout: 5000 }).catch(() => this.page.keyboard.press('Escape'));
      await otherDialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => undefined);
    }
  }
}
