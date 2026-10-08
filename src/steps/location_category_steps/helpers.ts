/**
 * Shared building blocks of the Location Category step definitions (no steps are registered here).
 *
 * Feature files use FRD vocabulary and an 8-record baseline that the live master does not contain;
 * location-category.data.ts maps the vocabulary and `ensureCategory` creates a unique copy of a baseline
 * category (through the API) the first time a scenario refers to it. The clean-up hook removes every copy.
 */
import type { CustomWorld } from '../../support/world';
import type { CategoryFixture } from '../../support/location-category-scenario';
import { alreadyAuthenticated, markAuthenticated } from '../../support/session';
import { config, getRoleCredentials } from '../../support/config';
import type { LocationCategoryRecord, SubmitOutcome } from '../../pages/location_category';
import { expect } from '../../utils/assertions';
import { midcTestData } from '../../test-data/midc.data';
import {
  baselineCategory,
  baselineNames,
  locationCategoryMessagePattern,
  normalizeLocationCategoryText,
} from '../../test-data/location-category.data';

/** Cucumber marks a step (and the rest of its scenario) as skipped when it returns this. */
export const SKIPPED = 'skipped' as const;

/** Logs why a scenario cannot run in this environment and skips it. */
export function skipBecause(world: CustomWorld, reason: string): typeof SKIPPED {
  world.log(`Skipped: ${reason}`);
  return SKIPPED;
}

/** For steps that can only follow a step which always skips; reaching one means the feature changed. */
export function unreachable(step: string): never {
  throw new Error(`"${step}" needs data this environment cannot provide; its scenario should have been skipped earlier.`);
}

export const NO_VIEW_SCREEN =
  'the MIDC build has no View / Detail screen for Location Categories (the row menu offers Edit and Delete only) ' +
  'and never shows the system-generated ID.';

// ---------------------------------------------------------------------------
// Session and navigation
// ---------------------------------------------------------------------------

export async function ensureLoggedIn(world: CustomWorld, credentials = midcTestData.credentials): Promise<void> {
  if (alreadyAuthenticated()) return;
  const masters = world.pages.mastersManagementPage;
  if (await masters.mastersManagementLink.isVisible().catch(() => false)) return;
  if (await world.pages.locationCategory.list.organizationConfigurationIcon.isVisible().catch(() => false)) return;

  await world.pages.midcHomePage.open();
  await world.pages.midcHomePage.openDepartmentLogin();
  await world.pages.departmentLoginPage.expectLoaded();
  // Credentials come from the environment (.env / CI secrets) and are never logged.
  await world.pages.departmentLoginPage.login(credentials.username, credentials.password);
  if (await world.pages.departmentLoginPage.hasAuthenticationError()) {
    throw new Error('Department Login failed: the portal reported an authentication error.');
  }
  markAuthenticated(world.page);
}

/**
 * Signs in as the role a feature names. Admin uses the configured credentials; any other role needs
 * MIDC_<ROLE>_USERNAME / _PASSWORD and a fresh (non-shared) session, otherwise the scenario is skipped.
 */
export async function logInAs(world: CustomWorld, role: string): Promise<typeof SKIPPED | undefined> {
  if (/^admin/i.test(role)) {
    await ensureLoggedIn(world);
    return undefined;
  }
  // The shared session is signed in as Admin; ensureLoggedIn would reuse it and the role assertions
  // would run against Admin permissions.
  if (config.sharedSession) {
    return skipBecause(world, `a ${role} login cannot run inside the shared Admin session; run it without SHARED_SESSION.`);
  }
  const credentials = getRoleCredentials(role);
  if (!credentials) {
    const key = role.toUpperCase().replace(/[^A-Z]/g, '');
    return skipBecause(world, `no ${role} user is configured; set MIDC_${key}_USERNAME and MIDC_${key}_PASSWORD to run it.`);
  }
  await ensureLoggedIn(world, credentials);
  return undefined;
}

/** Logged in and the page has made at least one authenticated API request (needed for fixtures and API scenarios). */
export async function ensureSession(world: CustomWorld): Promise<void> {
  const { api, list } = world.pages.locationCategory;
  if (api.hasSession()) return;
  await ensureLoggedIn(world);
  await list.open(midcTestData.organizationName);
}

/** On the Location Category list, reloaded when fixtures were created through the API since it was last loaded. */
export async function ensureOnList(world: CustomWorld): Promise<void> {
  const { list } = world.pages.locationCategory;
  await ensureLoggedIn(world);
  if (world.locationCategory.needsRefresh) {
    await world.pages.locationCategory.dismissOverlays();
    await list.refresh(midcTestData.organizationName);
    world.locationCategory.needsRefresh = false;
    return;
  }
  if (!(await list.isListVisible())) await list.open(midcTestData.organizationName);
}

/** Reloads the page when categories were created through the API, so lookups built at page load list them. */
export async function reloadIfFixturesAreNew(world: CustomWorld): Promise<void> {
  if (!world.locationCategory.needsRefresh) return;
  await world.page.reload();
  world.locationCategory.needsRefresh = false;
}

/** Back to the list, discarding any open form, menu or confirmation dialog and any filter. */
export async function returnToList(world: CustomWorld): Promise<void> {
  await world.pages.locationCategory.dismissOverlays();
  await ensureOnList(world);
  await world.pages.locationCategory.list.clearFilters();
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function initials(name: string): string {
  const letters = name
    .replace(/[^A-Za-z ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
  return letters || 'LC';
}

/**
 * The scenario's own copy of the FRD category `frdName` ("Zone" -> "Zone Bdd1234567"), created through the API
 * under its FRD parent (also a copy). Later references return the same copy.
 */
export async function ensureCategory(world: CustomWorld, frdName: string, parentFrd?: string): Promise<CategoryFixture> {
  const scenario = world.locationCategory;
  const existing = scenario.fixture(frdName);
  if (existing) {
    scenario.target = existing;
    return existing;
  }
  await ensureSession(world);
  const baseline = baselineCategory(frdName);
  const parentName = parentFrd ?? baseline?.parent;
  const parent = parentName ? await ensureCategory(world, parentName) : undefined;

  const name = scenario.data.name(frdName);
  const shortName = scenario.data.shortName(baseline?.shortName ?? initials(frdName));
  const result = await world.pages.locationCategory.api.create({
    catName: name,
    catShortName: shortName,
    catCode: scenario.data.code(),
    parentID: parent?.id ?? null,
  });
  if (result.status >= 300 || result.id === undefined) {
    throw new Error(`Could not create the test category "${name}": ${result.status} ${result.message}`);
  }
  scenario.needsRefresh = true;
  return scenario.remember({ id: result.id, frd: frdName, name, shortName, parentFrd: parentName });
}

/** Copies of all eight FRD baseline categories, parents first. */
export async function ensureBaseline(world: CustomWorld): Promise<CategoryFixture[]> {
  const created: CategoryFixture[] = [];
  for (const name of baselineNames) created.push(await ensureCategory(world, name));
  return created;
}

export function requireFixture(world: CustomWorld, frdName: string): CategoryFixture {
  const fixture = world.locationCategory.fixture(frdName);
  if (!fixture) throw new Error(`No test copy of "${frdName}" exists in this scenario; an earlier step should have created it.`);
  return fixture;
}

export function requireTarget(world: CustomWorld): CategoryFixture {
  const target = world.locationCategory.target;
  if (!target) throw new Error('No Location Category has been selected by an earlier step of this scenario.');
  return target;
}

/** Master record as the grid last loaded it (re-read after every save). */
export function storedRecord(world: CustomWorld, id: number): LocationCategoryRecord | undefined {
  return world.pages.locationCategory.api.recordById(id);
}

/** The master straight from the API (independent of what the grid has loaded). */
export async function freshMaster(world: CustomWorld): Promise<LocationCategoryRecord[]> {
  return world.pages.locationCategory.api.fetchMaster();
}

export function sameText(actual: string | undefined, expected: string): boolean {
  return normalizeLocationCategoryText(actual ?? '') === normalizeLocationCategoryText(expected);
}

/** Unique copy of a name the feature types ("Substation" -> "Substation Bdd..."), leaving blanks untouched. */
export function uniqueName(world: CustomWorld, value: string): string {
  return world.locationCategory.data.name(value);
}

export function uniqueShortName(world: CustomWorld, value: string): string {
  return world.locationCategory.data.shortName(value);
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

export async function openAddForm(world: CustomWorld): Promise<void> {
  const { form, list } = world.pages.locationCategory;
  if (await form.isOpen()) return;
  await ensureOnList(world);
  await list.addButton.click();
  await expect(form.nameInput).toBeVisible({ timeout: 20000 });
  world.locationCategory.entered = {};
  world.locationCategory.editing = undefined;
}

export async function openEditFor(world: CustomWorld, fixture: CategoryFixture): Promise<void> {
  const { form, list } = world.pages.locationCategory;
  await returnToList(world);
  await list.chooseRowAction(fixture.name, 'Edit');
  await expect(form.nameInput).toBeVisible({ timeout: 20000 });
  await expect(form.nameInput).toHaveValue(/\S/);
  world.locationCategory.entered = {};
  world.locationCategory.editing = fixture;
  world.locationCategory.target = fixture;
}

/** Submits the open form (Add mode first supplies the Code / Prod Code the FRD does not know) and records what happened. */
export async function submitForm(world: CustomWorld): Promise<SubmitOutcome> {
  const { form } = world.pages.locationCategory;
  if ((await form.mode()) === 'add') await form.fillRequiredExtras(world.locationCategory.data.code());
  const previous = await world.visibleToasts();
  const outcome = await form.submit();
  world.locationCategory.lastOutcome = outcome;
  if (outcome.kind !== 'saved') {
    // What the form held when the save was refused makes the cause obvious in the report.
    const values = await form.currentValues().catch(() => 'unreadable');
    world.log(`Save refused (${describeOutcome(outcome)}); form held ${values}`);
  }
  if (outcome.kind === 'saved' || outcome.kind === 'rejected') await world.captureNewToast(previous, 10000);
  return outcome;
}

export function describeOutcome(outcome: SubmitOutcome | undefined): string {
  if (!outcome) return 'nothing was submitted';
  switch (outcome.kind) {
    case 'saved':
      return `saved (#${outcome.call.id}): ${outcome.call.message}`;
    case 'rejected':
      return `rejected by the API (${outcome.call.status}): ${outcome.call.message}`;
    case 'client-validation':
      return `blocked by form validation: ${outcome.messages.join(' | ')}`;
    case 'disabled':
      return 'the Save button is disabled until a field changes';
    case 'no-response':
      return 'no request was sent and no validation message was shown';
  }
}

/** The id of the record the last Create / Update saved; fails with the outcome when the save did not succeed. */
export function successfulSaveId(world: CustomWorld, operation: 'Create' | 'Update'): number {
  const outcome = world.locationCategory.lastOutcome;
  if (outcome?.kind !== 'saved' || outcome.call.operation !== operation || outcome.call.id === undefined) {
    throw new Error(`Expected the ${operation} to succeed, but ${describeOutcome(outcome)}.`);
  }
  return outcome.call.id;
}

/** Save did not go through: validation stopped it or the API refused it. */
export function expectSaveBlocked(world: CustomWorld): void {
  const outcome = world.locationCategory.lastOutcome;
  expect(outcome && outcome.kind !== 'saved', `the save is blocked, but ${describeOutcome(outcome)}`).toBe(true);
}

/**
 * The FRD message is shown: as a toast, as an inline form message, or at least as the API's own error text
 * (the grid shows the API message verbatim, so the three are the same string in practice).
 */
export async function expectMessage(world: CustomWorld, message: string): Promise<void> {
  const pattern = locationCategoryMessagePattern(message);
  const outcome = world.locationCategory.lastOutcome;
  const apiText =
    outcome?.kind === 'rejected' ? outcome.call.message : outcome?.kind === 'client-validation' ? outcome.messages.join(' ') : '';
  const onScreen = async (): Promise<boolean> =>
    (await world.sawMessage(pattern, 0)) || (await world.page.getByText(pattern).first().isVisible().catch(() => false));
  await expect
    .poll(async () => (await onScreen()) || pattern.test(apiText), {
      timeout: 15000,
      message: `message "${message}" is displayed; toasters: ${JSON.stringify(world.seenToasts)}; API: "${apiText}"`,
    })
    .toBe(true);
}

/** No category named `name` (any case) exists in the master. */
export async function expectNoCategoryNamed(world: CustomWorld, name: string): Promise<void> {
  const found = (await freshMaster(world)).filter((record) => sameText(record.name, name));
  expect(
    found.map((record) => record.name),
    `no category "${name}" exists`,
  ).toEqual([]);
}
