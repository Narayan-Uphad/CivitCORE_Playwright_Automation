# MIDC / CivitCORE — Cucumber BDD (Playwright + TypeScript)

Cucumber BDD suite for the MIDC / CivitCORE portal: Department Management, Designation Management
and Location Category Management.
Feature files describe behaviour in business language; all technical detail (locators,
waits, assertions) lives in TypeScript page objects and step definitions.

## Prerequisites

- Node.js 20 or newer
- Java 8 or newer on `PATH` — required by the Allure CLI to render the Allure HTML report
- Access to `https://smartgovcivit.com` / `https://admin.smartgovcivit.com` from your network
- A valid MIDC Department Login account

## Setup

```bash
npm install                 # also downloads Chromium via the postinstall script
cp .env.example .env        # Windows: copy .env.example .env
```

Edit `.env` and set `MIDC_USERNAME` and `MIDC_PASSWORD`. The `.env` file is git-ignored. In CI, set
these values as secret environment variables instead of using a file.

A password containing shell/`dotenv` special characters (`$`, `@`, `#`, spaces) must be single-quoted
in `.env`, otherwise `$Epl` would be read as an empty variable reference:

```dotenv
MIDC_USERNAME=MIDCAdmin
MIDC_PASSWORD='$Epl@1234'
```

If your network blocks the browser download during `npm install`, run `npm run install:browsers`
later, or set `BROWSER_EXECUTABLE_PATH` to a local Chrome/Chromium.

## Running

| Command | What it runs |
|---|---|
| `npm test` | All scenarios of all three areas (`@fixme` and by-design skipped scenarios are reported as skipped; `@shared-session` ones are excluded) |
| `npm run test:headed` | All scenarios with a visible browser |
| `npm run test:dry-run` | Checks every step has a definition, without opening a browser |
| `npm run test:login` | `@department-login` (TC01–TC03) |
| `npm run test:masters` | `@masters-management` |
| `npm run test:add` | `@add-department` |
| `npm run test:nested` | `@nested-department` |
| `npm run test:edit` | `@edit-department` |
| `npm run test:delete` | `@delete-department` |
| `npm run test:navigation` | `@department-navigation` |
| `npm run test:verified` | `@verified-behavior` (TC-001, TC-045, TC-028, TC-009/035, TC-008/034, TC-015, TC-031) |
| `npm run test:negative` | `@negative` (TC_N_xxxx) |
| `npm run test:search` / `npm run test:logout` | `@search-department` / `@logout` |
| `npm run test:designation` | `@Designation` (isolated sessions) |
| `npm run test:location-category` | `@location_category` (isolated sessions) |
| `npm run test:sequential` | Ordered 11-feature Department run, one shared browser and login |
| `npm run test:designation:sequential` | Login, 9 Designation features, logout in one shared session |
| `npm run test:location-category:sequential` | Location Category features in one shared session |
| `npm run test:chromium` / `test:firefox` / `test:webkit` / `test:all-browsers` | Run via `scripts/run-browsers.js` |
| `npm run test:parallel` | All scenarios on 4 workers |
| `npm run test:report` | Cleans old output, runs all scenarios, then builds the Allure HTML report |
| `npm run typecheck` | TypeScript type check |

Run any tag expression with `npx cucumber-js --tags "@edit-department and not @fixme"`, or a single
test case with `npx cucumber-js --tags @TC_N_0001`. To run a `@fixme` scenario for real, remove
its `@fixme` tag.

`npm run test:report` forwards extra arguments to Cucumber, e.g.
`npm run test:report -- --tags @add-department`.

## Reports

Every run (`npm test`, any `test:*` script) writes all three report artefacts at once:

| Artefact | Path |
|---|---|
| Cucumber HTML report | `reports/html/index.html` (override with `HTML_REPORT`) |
| Screenshots / videos / traces linked by the HTML report | `reports/html/attachment-*` |
| Cucumber JSON | `reports/cucumber-report.json` |
| Allure raw results | `allure-results/` |
| Allure HTML report | `allure-report/index.html` (after `npm run allure:generate`) |
| JUnit XML (`ci` profile only) | `reports/junit.xml` |

| Command | What it does |
|---|---|
| `npm run report:open` | Opens the Cucumber HTML report in the browser |
| `npm run allure:generate` | Renders `allure-results/` into `allure-report/` |
| `npm run allure:open` | Serves and opens `allure-report/` |
| `npm run allure:report` | Generate + open in one step |
| `npm run allure:serve` | Renders and serves the results without keeping `allure-report/` |
| `npm run clean:reports` | Deletes `reports/`, `allure-results/` and `allure-report/` |

Allure grouping comes from the Gherkin tags: `@TC-001` / `@TC_N_0001` become the Allure `testId`
label and `@REQ-01` becomes the `story` label (configured in `formatOptions.labels` in
`cucumber.js`). Change the results directory with `ALLURE_RESULTS_DIR`.

A failed scenario gets a screenshot in both reports and a Playwright trace in
`reports/artifacts/traces`. Open a trace with `npx playwright show-trace <file>`.

## Project layout

```
features/
  department_management_features/   Department Gherkin features (one per original spec file)
  designation_management_features/  Designation features (FRD vocabulary)
  location_category_features/       Location Category features (FRD vocabulary)
src/
  pages/                       Page objects
    MidcHomePage.ts            ┐ Rebuilt from the specs; same public API as the
    DepartmentLoginPage.ts     │ original fixture page objects (see CONVERSION_REPORT.md)
    MastersManagementPage.ts   ┘
    DepartmentListPage.ts      Department grid: tab, filter, rows, row menu, bulk actions
    DepartmentDialog.ts        Add / Edit Department dialog
    DeleteConfirmationDialog.ts
    DepartmentFlows.ts         Multi-step helpers from the specs (addDepartment, createDepartment, openEditDialog)
    designation/               Designation page objects (see below)
    location_category/         Location Category page objects (see below)
  steps/                       Step definitions, grouped by domain
  support/
    config.ts                  Reads all environment settings (.env)
    world.ts                   Custom World: browser context, page, page objects, test data
    hooks.ts                   Browser lifecycle, @fixme skipping, screenshots and traces
    session.ts                 Shared-session login and landing-page handling (SHARED_SESSION=1)
  test-data/                   midc.data.ts (same shape as the original), department.data.ts
  utils/                       Configured expect, test-data template resolver
cucumber.js                    Cucumber profiles
```

## Designation Management

`features/designation_management_features/` is written in FRD (CivitCORE) vocabulary. Run it with
`npm run test:designation` (tag `@Designation`).

- **Layout**: one page object and one step file per feature file. Steps used by more than one
  feature live in `src/steps/designation/common.steps.ts` (Cucumber step text is global).

  | Feature file | Page object (`src/pages/designation/`) | Steps (`src/steps/designation/`) |
  |---|---|---|
  | `designation_access_and_permissions` | `DesignationAccessPage` | `access-and-permissions.steps.ts` |
  | `designation_activity_log` | `DesignationActivityLogPage` | `activity-log.steps.ts` |
  | `designation_creation` | `DesignationCreationPage` | `creation.steps.ts` |
  | `designation_cross_module_consumption` | `DesignationCrossModulePage` (wraps `PositionPage`) | `cross-module-consumption.steps.ts` |
  | `designation_deletion` | `DesignationDeletionPage` | `deletion.steps.ts` |
  | `designation_list_search_view` | `DesignationListPage` (also navigation) | `list-search-view.steps.ts` |
  | `designation_toaster_notifications` | `DesignationToasterPage` | `toaster-notifications.steps.ts` |
  | `designation_ui_visual` | `DesignationUiVisualPage` | `ui-visual.steps.ts` |
  | `designation_update` | `DesignationUpdatePage` | `update.steps.ts` |

  Shared pieces: `DesignationFormDialog` (Add / Edit dialog used by creation and update),
  `DesignationApiMonitor` (Designation API traffic and master data), `DesignationPages` (all of the
  above for one browser page, exposed as `world.pages.designation`), `helpers.ts` and `hooks.ts`
  (test-data clean-up).
- **Vocabulary**: `src/test-data/designation.data.ts` maps FRD terms onto the MIDC build:
  Abbreviation = *Designation Short Name*, Reporting To = *Nest Designation Under* + *Select Parent
  Designation*, Save = *Add / Update Designation*, Back = *Cancel*, Post = a *Position* of the
  Designation (Organization configuration > Position, office from `POSITION_OFFICE_CATEGORY` /
  `POSITION_OFFICE`).
- **Message copy**: where the app words a message differently from the FRD (e.g. "Designation added
  successfully!" for "Designation created successfully."), the alias table in the same file is used.
  Set `STRICT_FRD_MESSAGES=true` to assert the FRD wording verbatim.
- **Test data**: every Designation Name / Abbreviation in a feature gets a per-scenario suffix
  (`... Bdd12345678`), so scenarios are re-runnable and parallel-safe. `src/steps/designation/hooks.ts`
  deletes everything a scenario created (and the Positions it added) afterwards. If a run is killed,
  leftovers can be found by filtering the Designation grid for `Bdd`.
- **Designation IDs** are not shown in the UI; the steps read them from the Designation API responses.
- **Skipped by design** (reason is logged in the report): the Viewer-role scenario unless
  `MIDC_VIEWER_USERNAME` / `MIDC_VIEWER_PASSWORD` are set; Employee scenarios (the Employee form has no
  Designation field and registering an Employee sends real invitations); Activity Log scenarios (no
  such screen); the CivitBUILD scenario.

## Location Category Management

`features/location_category_features/` is written in FRD vocabulary. Run it with
`npm run test:location-category` (tag `@location_category`; scope other tag filters with it, because the
`@TC_CivitCORE_*` ids are shared with the Designation features) or, in one shared login,
`npm run test:location-category:sequential`.

- **Layout**: page objects in `src/pages/location_category/`, steps in `src/steps/location_category_steps/`.
  Steps used by more than one feature are in `common.steps.ts`; `helpers.ts` holds the building blocks and
  `hooks.ts` the clean-up.

  | Feature file | Steps (`src/steps/location_category_steps/`) | Page objects (`src/pages/location_category/`) |
  |---|---|---|
  | `location_category_hierarchy_list` | `hierarchy-list.steps.ts` | `LocationCategoryListPage` (also navigation) |
  | `location_category_permissions` | `permissions.steps.ts` | `LocationCategoryListPage`, `LocationCategoryApi` |
  | `location_category_search_view` | `search-view.steps.ts` | `LocationCategoryListPage` |
  | `location_category_creation` | `creation.steps.ts` | `LocationCategoryFormDialog`, `LocationCategoryApi` |
  | `location_category_update` | `update.steps.ts` | `LocationCategoryFormDialog`, `LocationCategoryApi` |
  | `location_category_location_association` | `location-association.steps.ts` | `LocationCategoryLocationPage` |
  | `location_category_deletion` | `deletion.steps.ts` | `LocationCategoryDeletionPage`, `LocationCategoryLocationPage` |
  | `location_category_audit_log` | `audit-log.steps.ts` | `LocationCategoryActivityLogPage` |

  All of them hang off `world.pages.locationCategory` (`LocationCategoryPages`), with per-scenario state in
  `world.locationCategory` (`src/support/location-category-scenario.ts`).
- **Vocabulary** (`src/test-data/location-category.data.ts`): Location Category Name = *Location Category*,
  Parent Category = *Nest Location Under* + *Select Parent Location Category*, Save = *Add / Update Location
  Category*. The form also requires a *Location Category Code* and a *Prod Code*, which the FRD does not
  mention; the steps fill them. The row menu has **Edit and Delete only** (no View / Detail screen, no
  system-generated ID on screen), and the grid has per-column filters instead of one search box.
- **Test data**: the live master holds real categories and none of the FRD baseline (Country ... Depot), so
  each scenario creates its own copy of a baseline category the first time it is named (through the API, parents
  first) and the clean-up hook removes them (Locations first, then categories, deepest first). Names carry a
  per-scenario suffix (`Zone Bdd12345678`); short names carry a 4-digit suffix when they have room (the field
  accepts 10 characters although its message says 20). Real data is never edited or deleted. If a run is killed,
  leftovers can be found by filtering the Location Category grid for `Bdd`.
- **Optional users**: View-only / Editor / NoAccess / Auditor scenarios need `MIDC_VIEWER_*`, `MIDC_EDITOR_*`,
  `MIDC_NOACCESS_*`, `MIDC_AUDITOR_*` credentials (see `.env.example`); without them (or in a shared session)
  they are skipped with the reason in the report.
- **Skipped by design** (reason is logged): scenarios that need a View / Detail screen or the Location Category
  ID in the UI; the Activity Log feature (no such screen; the `@audit_log` hook fails instead of skipping once an
  entry point appears); scenarios that need a second user.

## Writing scenarios

Unique test data is generated inside the feature file, using the same `Date.now()` rules as the
original specs:

```gherkin
Given the following unique test data is generated:
  | alias     | template               | max length |
  | runId     | DelMulti{timestamp}    |            |
  | deptA     | {runId}A               |            |
  | shortName | AD{timestamp}          | 20         |
  | short4    | Civil{timestamp:last4} |            |
When I enter "{deptA:upper}" as the Department Name
```

| Token | Result |
|---|---|
| `{timestamp}` | `Date.now()` |
| `{timestamp:last4}` | `Date.now().toString().slice(-4)` |
| `{alias}` | A value generated earlier in the scenario |
| `{alias:upper}` / `{alias:lower}` | That value upper-cased / lower-cased |
| `max length` column | `.slice(0, N)` |

Timeouts from the original code appear as an optional `within N seconds` suffix. Without the
suffix, the default assertion timeout applies (`EXPECT_TIMEOUT_MS`, 5 s).

## VS Code

Install the recommended extensions when VS Code prompts you — **`CucumberOpen.cucumber-official` is
required**: it contributes the `cucumber` language that `.vscode/settings.json` associates with
`*.feature`, and with it comes the Gherkin syntax colouring, the semantic highlighting of steps and
the cucumber logo file icon in the Explorer. Without it, `.feature` files render as plain
uncoloured text with a generic document icon.

The extension also provides step autocompletion and Go to Definition from `.feature` files to step
definitions; `.vscode/settings.json` already points it at the step definition files via
`cucumber.glue`.

If feature files still look colourless after installing it:

1. Reload the window (**Developer: Reload Window**).
2. Check the status bar language mode of an open `.feature` file — it must read **Cucumber**.
3. Keep `editor.semanticHighlighting.enabled` at `true`; the extension colours Gherkin through
   semantic tokens.

The cucumber file icon requires a file icon theme that does not override `.feature` (the default
Seti theme and **Minimal** both fall back to the language icon). A third-party icon theme that maps
`.feature` itself will show its own icon instead.
