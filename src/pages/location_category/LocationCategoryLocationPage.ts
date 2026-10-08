/**
 * Location tab, as far as Location Category needs it (feature: location_category_location_association.feature,
 * plus the Location-dependency scenarios of location_category_deletion.feature).
 *
 * A Location refers to its Location Category through the "Location Category" select of the Add / Edit
 * Location form (field id `locCateg`), stored as `locCatId`; the Location grid shows the Category by name.
 * Locations a scenario creates are recorded by id so the clean-up hook can remove them
 * (DELETE location/3.0/delete/<id>).
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from '../../utils/assertions';
import { API_ORG_ID } from '../../test-data/location-category.data';
import type { MastersManagementPage } from '../MastersManagementPage';
import { SUBMIT_TIMEOUT, type ApiResult, type LocationCategoryApi } from './LocationCategoryApi';
import { exactText, type LocationCategoryListPage } from './LocationCategoryListPage';

export interface LocationSaveResult {
  status: number;
  message: string;
  id?: number;
}

export interface LocationRecord {
  id: number;
  name: string;
  code: string;
  categoryId: number | null;
  categoryName: string;
}

interface LocationNode {
  id: number;
  displayName?: string;
  locCode?: string;
  locCatId?: number | null;
  locCategoryName?: string;
  location?: LocationNode[];
}

const LOCATION_MUTATION = /\/location\/3\.0\/(create|update|delete)\b/i;

export class LocationCategoryLocationPage {
  readonly tab: Locator;
  readonly addButton: Locator;
  readonly grid: Locator;
  readonly dataRows: Locator;
  readonly nameFilter: Locator;
  readonly dialog: Locator;
  readonly nameInput: Locator;
  readonly codeInput: Locator;
  readonly categorySelect: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly rowMenuItems: Locator;
  /** Ids of Locations this page created, oldest first. */
  readonly createdIds: number[] = [];
  /** Body of the last Location create request the page sent. */
  lastCreateBody?: string;

  constructor(
    private readonly page: Page,
    private readonly list: LocationCategoryListPage,
    private readonly organization: MastersManagementPage,
    private readonly api: LocationCategoryApi,
  ) {
    this.tab = list.locationTab;
    this.addButton = page.getByRole('button', { name: 'Add Location', exact: true });
    this.grid = page.getByRole('treegrid').filter({ has: page.getByRole('columnheader', { name: 'Category', exact: true }) });
    this.dataRows = this.grid.locator('.ag-center-cols-container [role="row"]');
    this.nameFilter = page.getByRole('textbox', { name: /Location Name Filter Input|Location Filter Input/i });
    this.dialog = page.getByRole('dialog');
    this.nameInput = this.dialog.locator('#LocationName');
    this.codeInput = this.dialog.locator('#LocationAbb');
    this.categorySelect = this.dialog.locator('#locCateg');
    this.submitButton = this.dialog.getByRole('button', { name: /^(Add|Update) Location$/ });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
    this.rowMenuItems = page.locator('.menu-item').filter({ hasText: /\S/ });

    page.on('response', (response) => {
      if (!/\/location\/3\.0\/create\b/i.test(response.url()) || response.request().method() === 'GET') return;
      this.lastCreateBody = response.request().postData() ?? undefined;
      response
        .json()
        .then((body: { data?: unknown }) => {
          if (response.status() < 300 && typeof body.data === 'number') this.createdIds.push(body.data);
        })
        .catch(() => undefined);
    });
  }

  async open(organizationName: string): Promise<void> {
    if (await this.organization.mastersManagementLink.isVisible().catch(() => false)) {
      await this.organization.openMastersManagement();
      await this.organization.expectAdminPortalLoaded();
    }
    if (!(await this.tab.isVisible().catch(() => false))) {
      await expect(this.list.organizationConfigurationIcon).toBeVisible({ timeout: 30000 });
      await this.list.organizationConfigurationIcon.click();
    }
    await this.tab.click();
    await expect(this.list.organizationPlaceholder.or(this.addButton).first()).toBeVisible({ timeout: 30000 });
    if (await this.list.organizationPlaceholder.isVisible()) await this.organization.selectOrganization(organizationName);
    await expect(this.addButton).toBeVisible({ timeout: 30000 });
    await expect(this.dataRows.first()).toBeVisible({ timeout: 30000 });
  }

  async isOpen(): Promise<boolean> {
    return this.addButton.isVisible().catch(() => false);
  }

  async openAddForm(): Promise<void> {
    await this.addButton.click();
    await expect(this.nameInput).toBeVisible({ timeout: 20000 });
  }

  /** Options of the form's Location Category select (placeholder removed). */
  async categoryOptions(): Promise<string[]> {
    // The options arrive after the form opens; read them once their number has stopped changing.
    let previous = -1;
    await expect
      .poll(
        async () => {
          const count = await this.categorySelect.locator('option').count();
          const settled = count > 1 && count === previous;
          previous = count;
          return settled;
        },
        { timeout: 20000, intervals: [700] },
      )
      .toBe(true);
    const options = await this.categorySelect.locator('option').allInnerTexts();
    return options.map((option) => option.trim()).filter((option) => option !== '' && !/^select\b/i.test(option));
  }

  async closeForm(): Promise<void> {
    if (await this.nameInput.isVisible().catch(() => false)) {
      await this.cancelButton.click();
      await expect(this.nameInput).toBeHidden({ timeout: 20000 });
    }
  }

  async fill(name: string, code: string, category?: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.codeInput.fill(code);
    if (category) await this.categorySelect.selectOption({ label: category });
  }

  /** Clicks Add / Update Location and reports the response, or status 0 when no request was sent (form validation). */
  async save(): Promise<LocationSaveResult> {
    const response = this.page.waitForResponse((candidate) => LOCATION_MUTATION.test(candidate.url()) && candidate.request().method() !== 'GET', {
      timeout: SUBMIT_TIMEOUT,
    });
    response.catch(() => undefined);
    await this.submitButton.click({ timeout: 10000 });
    const saved = await response.catch(() => null);
    if (!saved) return { status: 0, message: 'no request was sent (client-side validation?)' };
    const body = (await saved.json().catch(() => ({}))) as { data?: unknown; message?: string; error?: { message?: string } };
    const result = { status: saved.status(), message: body.message ?? body.error?.message ?? '', id: typeof body.data === 'number' ? body.data : undefined };
    if (result.status < 300) await expect(this.nameInput).toBeHidden({ timeout: 20000 });
    return result;
  }

  /** Fills and saves the Add Location form. */
  async create(name: string, code: string, category: string): Promise<LocationSaveResult> {
    await this.openAddForm();
    await this.fill(name, code, category);
    return this.save();
  }

  // ---------------------------------------------------------------------------
  // Grid
  // ---------------------------------------------------------------------------

  row(name: string): Locator {
    return this.dataRows.filter({ has: this.page.locator('[role="gridcell"]', { hasText: exactText(name) }) }).first();
  }

  async showRow(name: string): Promise<Locator> {
    await expect(this.nameFilter).toBeVisible({ timeout: 20000 });
    await this.nameFilter.fill(name);
    const row = this.row(name);
    await expect(row, `Location "${name}" is listed`).toBeVisible({ timeout: 20000 });
    return row;
  }

  /** Opens the Edit Location form of a Location (the form then shows its current category). */
  async startEdit(name: string): Promise<void> {
    const row = await this.showRow(name);
    await row.locator('[col-id="action"] button, [col-id="Action"] button').first().click();
    await this.rowMenuItems.filter({ hasText: exactText('Edit') }).first().click();
    await expect(this.categorySelect).toBeVisible({ timeout: 20000 });
  }

  async chooseCategory(label: string): Promise<void> {
    await this.categorySelect.selectOption({ label });
  }

  // ---------------------------------------------------------------------------
  // API
  // ---------------------------------------------------------------------------

  /** The Location master, straight from the API (about 2,700 rows on the live build, so use sparingly). */
  async fetchLocations(): Promise<LocationRecord[]> {
    const result = await this.api.send('POST', 'location/3.0/getHierarchy', { specifiedOrgOnly: false, orgID: API_ORG_ID });
    if (result.status >= 300 || !Array.isArray(result.body)) throw new Error(`Location getHierarchy failed: ${result.status} ${result.message}`);
    const flatten = (nodes: LocationNode[]): LocationRecord[] =>
      nodes.flatMap((node) => [
        {
          id: node.id,
          name: (node.displayName ?? '').trim(),
          code: (node.locCode ?? '').trim(),
          categoryId: node.locCatId ?? null,
          categoryName: node.locCategoryName ?? '',
        },
        ...flatten(node.location ?? []),
      ]);
    return flatten(result.body as LocationNode[]);
  }

  async fetchLocation(id: number): Promise<LocationRecord | undefined> {
    return (await this.fetchLocations()).find((record) => record.id === id);
  }

  async post(path: string, data: unknown): Promise<ApiResult> {
    return this.api.send('POST', path, data);
  }

  /** Removes a Location through the API (clean-up only). */
  async remove(id: number): Promise<{ status: number; message: string }> {
    const result = await this.api.send('DELETE', `location/3.0/delete/${id}`);
    return { status: result.status, message: result.message };
  }
}
