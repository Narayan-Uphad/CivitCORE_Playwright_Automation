# Conversion Report — Playwright Test → Cucumber BDD

**Date:** 2026-09-24  **Source:** 10 Playwright spec files (`*.spec.ts`)  **Target:** `@cucumber/cucumber` 12 + `@playwright/test` 1.63 + TypeScript

## 1. Test count reconciliation

| # | Source spec | Tests in source | fixme in source | Feature file | Scenarios | @fixme |
|---|---|---|---|---|---|---|
| 1 | add-department.spec.ts | 1 | 0 | add-department.feature | 1 | 0 |
| 2 | add-nested-department.spec.ts | 1 | 1 | _removed_ — duplicate of row 3 | 0 | 0 |
| 3 | add-nested-department-fixed.spec.ts | 1 | 0 | add-nested-department-fixed.feature | 1 | 0 |
| 4 | delete-added-department.spec.ts | 2 | 0 | delete-department.feature | 2 | 0 |
| 5 | department-login-navigation.spec.ts | 3 | 0 | department-login.feature | 3 | 0 |
| 6 | department-management-navigation.spec.ts | 2 | 0 | department-management-navigation.feature | 2 | 0 |
| 7 | department-management-updated.spec.ts | 7 | 0 | department-management-verified.feature | 7 | 0 |
| 8 | department-negative-test-cases.spec.ts | 7 | 4 | department-negative.feature | 7 | 4 |
| 9 | edit-department.spec.ts | 5 | 0 | edit-department.feature | 5 | 0 |
| 10 | masters-management-navigation.spec.ts | 2 | 0 | masters-management.feature | 2 | 0 |
| | **Total** | **31** | **5** | | **30** | **4** |

**Result:** 30 scenarios. The always-skipped `add-nested-department.feature` was removed: it covered the same
behaviour as `add-nested-department-fixed.feature`, which runs and passes, so the duplicate added no coverage.

## 2. Test-by-test checklist

| Source test | Scenario | Status |
|---|---|---|
| Add Department | Add Department | ✅ Converted |
| Add nested department… (fixme) | — | ❌ Removed: duplicate of the "fixed" scenario below, which passes |
| Add nested department… (fixed) | same name | ✅ Converted |
| Delete a single added department | same | ✅ Converted (includes the safety-pattern guards) |
| Delete multiple added departments | same | ✅ Converted (includes the safety-pattern guards) |
| TC01 - Verify MIDC portal loads | same | ✅ Converted |
| TC02 - Open Department Login page | same | ✅ Converted |
| TC03 - Submit Department Login credentials | same | ✅ Converted (the source has no post-login assertion, so none was added) |
| Authorized user lands on Department List… | same | ✅ Converted |
| Search department by name from Department List | same | ✅ Converted (data: `civil`, `Civildemo`, `Civildemo1`) |
| TC-001 \| REQ-01 | same, tags `@TC-001 @REQ-01` | ✅ Converted |
| TC-045 \| REQ-08 | same | ✅ Converted |
| TC-028 \| REQ-05 | same | ✅ Converted |
| TC-009/TC-035 \| REQ-06 | same | ✅ Converted |
| TC-008/TC-034 \| REQ-02,REQ-06 | same | ✅ Converted |
| TC-015 \| REQ-02 | same | ✅ Converted |
| TC-031 \| REQ-06 | same | ✅ Converted |
| TC_N_0001 | same | ✅ Converted |
| TC_N_0002 | same | ✅ Converted |
| TC_N_0004 (fixme) | same, `@fixme` | ✅ Converted (every step kept, skipped as in source) |
| TC_N_0005 (fixme) | same, `@fixme` | ✅ Converted (every step kept, skipped as in source) |
| TC_N_0010 (fixme, empty body) | same, `@fixme`, reason kept as description | ✅ Converted (no steps: the source had none) |
| TC_N_0016 (fixme, empty body) | same, `@fixme`, reason kept as description | ✅ Converted (no steps: the source had none) |
| TC_N_0024 | same | ✅ Converted |
| Edit department name and short name | same | ✅ Converted |
| Edit only the department short name | same | ✅ Converted |
| Edit dialog is prefilled… | same | ✅ Converted |
| Cancelling the edit dialog… | same | ✅ Converted |
| Mandatory fields cannot be cleared… | same | ✅ Converted |
| Open Masters Management after Department Login | same | ✅ Converted |
| Select MIDC from Organization Configuration dropdown | same | ✅ Converted |

## 3. How Playwright concepts were mapped

| Playwright Test | Cucumber equivalent |
|---|---|
| `test.describe` | `Feature` (one per spec file) plus a feature tag |
| `test.beforeEach` / repeated login preamble | `Background` |
| `test(...)` | `Scenario` |
| `test.fixme(...)` | `@fixme` tag. A `Before` hook returns `skipped`, so the scenario does not run |
| `test.skip(true, reason)` after `hasAuthenticationError()` | Step `the scenario is skipped if Department Login authentication fails, because "<reason>"` returns `skipped`. The original reason text is kept for each spec |
| Fixtures `page`, `midcHomePage`, `departmentLoginPage`, `mastersManagementPage` | `CustomWorld` (`this.page`, `this.pages.*`): a fresh context and page per scenario |
| Local helper functions (`addDepartment`, `createDepartment`, `openEditDialog`, `confirmDeleteDialog`, `expectDepartmentsAbsent`, `filterByDepartmentName`, `goToDepartmentList`, `openAddDepartmentModal`) | Page object methods (`DepartmentFlows`, `DepartmentListPage`, `DeleteConfirmationDialog`, `DepartmentDialog`) |
| `Date.now()` data | `{timestamp}` templates in feature data tables (see README) |
| `expect(...)`, `expect.poll(...)` | The same `@playwright/test` `expect`, with the same matchers, poll intervals `[500, 1000, 2000]` and timeouts |
| `test.setTimeout(240000)` (edit/delete) | Cucumber timeouts apply per step. The two longest composite steps get 240 s, and the default per step is 120 s (`STEP_TIMEOUT_MS`) |

## 4. Assumptions and items to review ⚠️

1. **The fixtures, page objects and `midc.data.ts` were not supplied.** The specs import
   `../fixtures/test-fixtures` and `../test-data/midc.data`, but those files were not provided.
   `MidcHomePage`, `DepartmentLoginPage` and `MastersManagementPage` were rebuilt with **the same
   public API** the specs call. Their locators come from the self-contained
   `department-management-updated.spec.ts` and `add-nested-department.spec.ts`. If you still have
   the originals, drop them into `src/pages/` in place of these files; no step definition needs
   to change. These methods are best guesses and should be checked against the originals:
   - `MidcHomePage.expectLoaded()`: the text of the "welcome heading" is unknown. It accepts any
     heading that starts with "Welcome" and also checks the Department Login link.
   - `DepartmentLoginPage.hasAuthenticationError()`: it waits for either the Masters Management
     link or an error message matching `authenticationErrorPattern` in
     `src/test-data/department.data.ts`.
   - `MastersManagementPage.expectOrganizationSelected()`: it checks that the "Select Organization
     Name" placeholder is gone and the selected organization name is shown.
   - `midcTestData.homeUrl` defaults to `BASE_URL + "/"`. Override it with `MIDC_HOME_URL`.
2. **The `department-management-updated.spec.ts` suite** used inline locators rather than page
   objects. It now reuses the page-object steps. The rebuilt page objects use exactly those
   locators, so its behaviour is unchanged. As in the source, it has **no** authentication-error
   skip.
3. **Small, safe differences in waiting:**
   - `I filter the department grid by name` always waits up to 20 s for the filter to be visible.
     That is the `filterByDepartmentName` helper from the edit and delete specs. In
     add-department and the nested specs, the source called `.fill()` directly, and `.fill()`
     also waits for visibility.
   - `I select "CIRCLE" as the Department Prod Code` always waits up to 15 s for the dropdown to
     be visible. The nested specs called `selectOption` directly, which also waits for the
     dropdown.

   No expected result, condition or test data was changed.
4. **Default assertion timeout.** The original `playwright.config.ts` was not supplied. Assertions
   without an explicit timeout use `EXPECT_TIMEOUT_MS`, which defaults to 5 s (the Playwright
   default). Action timeout is `ACTION_TIMEOUT_MS`, which defaults to no limit (also the
   Playwright default). Change both in `.env` if your original config used other values.
5. **Masters Management feature has no `Background`.** Gherkin does not apply a Background to a
   scenario with no steps of its own. "Open Masters Management after Department Login" consists
   only of the shared login flow, so under a Background it would have passed without running
   anything. Both of its scenarios therefore list their steps in full.

## 5. Security and compliance changes

- **Hard-coded credentials removed.** `department-management-updated.spec.ts` contained a literal
  username and password. They are **not** reproduced anywhere in this project. Credentials are
  read only from `MIDC_USERNAME` / `MIDC_PASSWORD` (`.env`, which is git-ignored, or CI secrets),
  are never written to logs, and a login attempt fails fast if they are missing.
  **Recommendation:** rotate that account's password, because it was committed in source, and
  remove it from Git history.
- `.env.example` contains placeholders only. `.gitignore` excludes `.env*`, reports and traces.
- Traces and screenshots can contain on-screen data. They are kept only for failed scenarios by
  default (`TRACE=retain-on-failure`), under git-ignored `reports/`.

## 6. Verification performed

| Check | Result |
|---|---|
| `tsc --noEmit` (strict) | ✅ Passes |
| `cucumber-js --dry-run` | ✅ 31 scenarios, 569 steps, 0 undefined, 0 ambiguous |
| Scenarios per source spec (table §1) | ✅ 31 / 31 |
| Framework smoke run in real Chromium: World, hooks, configured `expect`, data templates, `@fixme` skip with and without steps, screenshot and trace on failure | ✅ Passed |
| Execution against the live MIDC application | ⚠️ Not possible from the conversion sandbox (the site cannot be reached from there). Run `npm test` from your network with valid credentials. |
