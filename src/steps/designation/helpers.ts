/**
 * Shared building blocks of the Designation step definitions (no steps are registered here).
 */
import type { CustomWorld } from '../../support/world';
import type { DesignationFixture } from '../../support/designation-scenario';
import { alreadyAuthenticated, markAuthenticated } from '../../support/session';
import { config, getViewerCredentials } from '../../support/config';
import { MastersManagementPage, PositionPage } from '../../pages';
import { DesignationPages, type FormField, type SubmitOutcome } from '../../pages/designation';
import { expect } from '../../utils/assertions';
import { midcTestData } from '../../test-data/midc.data';
import { designationMessagePattern, normalizeDesignationText, positionContext } from '../../test-data/designation.data';

/** Cucumber marks a step (and the rest of its scenario) as skipped when it returns this. */
export const SKIPPED = 'skipped' as const;

/** Why scenarios that need an Employee linked to a Designation cannot run on the MIDC build. */
export const NO_EMPLOYEE_DATA =
  'Employee scenarios need an Employee linked to a Designation; the MIDC Employee registration has no ' +
  'Designation field, and registering an Employee sends an invitation to a real e-mail address and mobile number.';

/** Logs why a scenario cannot run in this environment and skips it. */
export function skipBecause(world: CustomWorld, reason: string): typeof SKIPPED {
  world.log(`Skipped: ${reason}`);
  return SKIPPED;
}

/** For steps that can only follow a step which always skips; reaching one means the feature changed. */
export function unreachable(step: string): never {
  throw new Error(`"${step}" needs data this environment cannot provide; its scenario should have been skipped earlier.`);
}

export function describeOutcome(outcome: SubmitOutcome | undefined): string {
  if (!outcome) return 'no save was attempted';
  switch (outcome.kind) {
    case 'saved':
      return `${outcome.call.operation} succeeded (HTTP ${outcome.call.status}${outcome.call.id ? `, id ${outcome.call.id}` : ''})`;
    case 'rejected':
      return `${outcome.call.operation} was rejected with HTTP ${outcome.call.status}: ${outcome.call.message}`;
    case 'client-validation':
      return `the form showed validation messages and sent no request: ${outcome.messages.join(' / ')}`;
    default:
      return 'no save request or validation message followed the click';
  }
}

// ---------------------------------------------------------------------------
// Session and navigation
// ---------------------------------------------------------------------------

export async function ensureLoggedIn(world: CustomWorld, credentials = midcTestData.credentials): Promise<void> {
  if (alreadyAuthenticated()) return;
  const masters = world.pages.mastersManagementPage;
  if (await masters.mastersManagementLink.isVisible().catch(() => false)) return;
  if (await world.pages.designation.list.organizationConfigurationIcon.isVisible().catch(() => false)) return;

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

/** Signs in as the role a feature names; returns "skipped" when that role is not configured. */
export async function logInAs(world: CustomWorld, role: string): Promise<typeof SKIPPED | undefined> {
  if (/^admin/i.test(role)) {
    await ensureLoggedIn(world);
    return undefined;
  }
  if (/^viewer/i.test(role)) {
    // The shared session is signed in as Admin; ensureLoggedIn would reuse it and the Viewer
    // assertions would run against Admin permissions.
    if (config.sharedSession) {
      return skipBecause(world, 'a Viewer login cannot run inside the shared Admin session; run it without SHARED_SESSION.');
    }
    const viewer = getViewerCredentials();
    if (!viewer) {
      return skipBecause(world, 'no view-only user is configured; set MIDC_VIEWER_USERNAME and MIDC_VIEWER_PASSWORD to run it.');
    }
    await ensureLoggedIn(world, viewer);
    return undefined;
  }
  throw new Error(`No credentials are defined for the "${role}" role.`);
}

export async function ensureOnDesignationScreen(world: CustomWorld): Promise<void> {
  const list = world.pages.designation.list;
  if (await list.isListVisible()) return;
  await ensureLoggedIn(world);
  await list.open(midcTestData.organizationName);
}

/** Back to the list, discarding any open form, menu or confirmation dialog. */
export async function returnToList(world: CustomWorld): Promise<void> {
  const designation = world.pages.designation;
  await designation.dismissOverlays();
  if (!(await designation.list.isListVisible())) await designation.list.open(midcTestData.organizationName);
  await designation.list.clearFilters();
}

// ---------------------------------------------------------------------------
// Form input
// ---------------------------------------------------------------------------

export function formField(label: string): FormField {
  if (/^abbreviation$/i.test(label.trim())) return 'Abbreviation';
  if (/^designation name$/i.test(label.trim())) return 'Designation Name';
  throw new Error(`"${label}" is not a text field of the Designation form.`);
}

/** Turns an FRD value from a feature file into this scenario's unique value. */
export function uniqueValue(world: CustomWorld, field: FormField, value: string): string {
  return field === 'Abbreviation' ? world.designation.data.abbreviation(value) : world.designation.data.name(value);
}

/** Types into the open form and remembers the value, so the stored record can be compared with it. */
export async function typeIntoForm(world: CustomWorld, field: FormField, value: string): Promise<void> {
  await world.pages.designation.form.type(field, value);
  if (field === 'Abbreviation') world.designation.entered.abbreviation = value;
  else world.designation.entered.name = value;
}

/** Lists every difference between what was typed into the form and what the app stored. */
export function differencesFromEntered(world: CustomWorld, id: number): string[] {
  const record = world.pages.designation.api.recordById(id);
  if (!record) return [`Designation #${id} is not in the Designation master`];
  const { name, abbreviation, parent } = world.designation.entered;
  const problems: string[] = [];
  if (name !== undefined && normalizeDesignationText(record.name) !== normalizeDesignationText(name)) {
    problems.push(`Designation Name "${name.trim()}" was entered but "${record.name}" was stored`);
  }
  if (abbreviation !== undefined && normalizeDesignationText(record.shortName) !== normalizeDesignationText(abbreviation)) {
    problems.push(`Abbreviation "${abbreviation.trim()}" was entered but "${record.shortName}" was stored`);
  }
  if (parent && record.parentId !== parent.id) {
    problems.push(`Reporting To "${parent.name}" (#${parent.id}) was selected but the record reports to #${record.parentId}`);
  }
  return problems;
}

/** Id of the Designation the last save created / updated; fails when that save did not succeed. */
export function successfulSaveId(world: CustomWorld, operation: 'Create' | 'Update'): number {
  const outcome = world.designation.lastOutcome;
  expect(outcome?.kind === 'saved' && outcome.call.operation === operation, `the ${operation} succeeded: ${describeOutcome(outcome)}`).toBe(true);
  if (outcome?.kind !== 'saved' || outcome.call.id === undefined) throw new Error('The save response carried no Designation id.');
  return outcome.call.id;
}

// ---------------------------------------------------------------------------
// Saving and messages
// ---------------------------------------------------------------------------

/** Saves the open form, records the outcome and the toaster it produced. */
export async function submitForm(world: CustomWorld): Promise<SubmitOutcome> {
  const designation = world.pages.designation;
  // Messages asserted after a save belong to that save, not to a toast still showing from before it.
  const toastsBefore = await world.visibleToasts();
  const outcome = await designation.form.submit();
  world.designation.lastOutcome = outcome;
  if (outcome.kind === 'saved' || outcome.kind === 'rejected') await world.captureNewToast(toastsBefore);
  else world.seenToasts.length = 0;
  world.log(`Save: ${describeOutcome(outcome)}`);

  if (outcome.kind === 'saved' && outcome.call.operation === 'Create' && outcome.call.id !== undefined) {
    const record = designation.api.recordById(outcome.call.id);
    if (record) world.designation.target = { id: record.id, name: record.name, shortName: record.shortName };
  }
  return outcome;
}

/** Asserts a message was shown (inline in the form, or as a toaster) since the last action. */
export async function expectMessage(world: CustomWorld, message: string): Promise<void> {
  const pattern = designationMessagePattern(message);
  const inline = world.pages.designation.form.message(pattern);
  const shown = async () => (await world.sawMessage(pattern, 0)) || (await inline.isVisible().catch(() => false));
  await expect
    .poll(shown, {
      timeout: 15000,
      message:
        `"${message}" is displayed (accepted: ${pattern}). ` +
        `Toasters seen: ${JSON.stringify(world.seenToasts)}; last save: ${describeOutcome(world.designation.lastOutcome)}`,
    })
    .toBe(true);
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

/** Creates a Designation through the Add form and returns it as stored by the app. */
export async function createDesignation(
  world: CustomWorld,
  name: string,
  abbreviation: string,
  parent?: DesignationFixture,
): Promise<DesignationFixture> {
  const { api, creation, form } = world.pages.designation;
  await returnToList(world);
  await creation.open();
  await form.type('Designation Name', name);
  await form.type('Abbreviation', abbreviation);
  if (parent) await form.selectParent(parent.name);
  const outcome = await form.submit();
  await world.captureToast();
  if (outcome.kind !== 'saved' || outcome.call.id === undefined) {
    throw new Error(`Could not create the test Designation "${name}": ${describeOutcome(outcome)}`);
  }
  const id = outcome.call.id;
  await api.waitForMaster((records) => records.some((record) => record.id === id), `Designation ${id} is listed`);
  await form.expectClosed();
  const record = api.recordById(id)!;
  world.log(`Test Designation created: #${id} "${record.name}" (${record.shortName})`);
  return { id, name: record.name, shortName: record.shortName };
}

export interface FixtureOptions {
  abbreviation?: string;
  parent?: DesignationFixture;
  /** False for helper records (e.g. a parent) that must not become the scenario's subject. */
  asTarget?: boolean;
}

/**
 * Returns the scenario's Designation for an FRD name, creating it with unique data the first time.
 * Nothing pre-existing is reused, so a scenario never depends on (or alters) shared master data.
 */
export async function ensureDesignation(world: CustomWorld, frdName: string, options: FixtureOptions = {}): Promise<DesignationFixture> {
  const scenario = world.designation;
  const existing = scenario.fixture(frdName) ?? (options.abbreviation ? scenario.fixture(options.abbreviation) : undefined);
  if (existing) {
    if (options.asTarget !== false) scenario.target = existing;
    return existing;
  }
  await ensureOnDesignationScreen(world);
  const name = scenario.data.name(frdName);
  const abbreviation = options.abbreviation
    ? scenario.data.abbreviation(options.abbreviation)
    : scenario.data.abbreviationFor(frdName, scenario.fixtureCount);
  const previousTarget = scenario.target;
  const fixture = scenario.remember(await createDesignation(world, name, abbreviation, options.parent), frdName, options.abbreviation);
  if (options.asTarget === false) scenario.target = previousTarget;
  return fixture;
}

export function requireTarget(world: CustomWorld): DesignationFixture {
  const target = world.designation.target;
  if (!target) throw new Error('No Designation was identified by an earlier step of this scenario.');
  return target;
}

/** Looks up a Designation an earlier step created under its FRD name or abbreviation. */
export function requireFixture(world: CustomWorld, frdNameOrAbbreviation: string): DesignationFixture {
  const fixture = world.designation.fixture(frdNameOrAbbreviation);
  if (!fixture) throw new Error(`"${frdNameOrAbbreviation}" was not created by an earlier step.`);
  return fixture;
}

/** Opens the Edit form of a fixture and resets the "entered values" bookkeeping. */
export async function openEditFor(world: CustomWorld, fixture: DesignationFixture): Promise<void> {
  await returnToList(world);
  await world.pages.designation.update.open(fixture.name);
  world.designation.editing = fixture;
  world.designation.target = fixture;
  world.designation.entered = {};
}

export async function openAddFor(world: CustomWorld): Promise<void> {
  await returnToList(world);
  await world.pages.designation.creation.open();
  world.designation.editing = undefined;
  world.designation.entered = {};
}

/**
 * Picks a Reporting To value. When the feature never created that Designation, it is created now
 * and the open form is restored with everything that had been typed into it.
 */
export async function selectReportingTo(world: CustomWorld, frdParent: string): Promise<void> {
  const form = world.pages.designation.form;
  const scenario = world.designation;
  let parent = scenario.fixture(frdParent);
  if (!parent) {
    const editing = scenario.editing;
    const entered = { ...scenario.entered };
    await form.cancel();
    parent = await ensureDesignation(world, frdParent, { asTarget: false });
    if (editing) await openEditFor(world, editing);
    else await openAddFor(world);
    if (entered.name !== undefined) await form.type('Designation Name', entered.name);
    if (entered.abbreviation !== undefined) await form.type('Abbreviation', entered.abbreviation);
    scenario.entered = entered;
  }
  await form.selectParent(parent.name);
  scenario.entered.parent = parent;
}

/** Deletes a Designation from a second tab of the same session, while the first tab keeps its open form. */
export async function deleteFromAnotherTab(world: CustomWorld, name: string): Promise<void> {
  const tab = await world.page.context().newPage();
  try {
    await tab.goto(`${config.adminUrl}/`);
    const masters = new MastersManagementPage(tab);
    const designation = new DesignationPages(tab, masters, new PositionPage(tab, masters), {
      organization: midcTestData.organizationName,
      ...positionContext,
    });
    await designation.list.open(midcTestData.organizationName);
    const call = await designation.deletion.deleteDesignation(name);
    expect(call.status, `"${name}" was deleted from the second tab: ${call.message}`).toBeLessThan(300);
  } finally {
    await tab.close();
  }
}

// ---------------------------------------------------------------------------
// Posts (MIDC Positions)
// ---------------------------------------------------------------------------

/** Adds Posts (MIDC Positions) of a Designation in the configured office and returns to the Designation list. */
export async function addPosts(world: CustomWorld, fixture: DesignationFixture, count: number): Promise<void> {
  const { crossModule, list } = world.pages.designation;
  await returnToList(world);
  await crossModule.openPostLookup();
  await crossModule.changePosts(fixture.name, count);
  world.designation.addedPositions.set(fixture.id, (world.designation.addedPositions.get(fixture.id) ?? 0) + count);
  world.log(`Added ${count} Position(s) of "${fixture.name}" in ${crossModule.office}.`);
  await list.open(midcTestData.organizationName);
}
