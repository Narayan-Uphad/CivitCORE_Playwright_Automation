# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Cucumber BDD suite (Playwright + TypeScript) for the MIDC / CivitCORE portal (`smartgovcivit.com`, admin at `admin.smartgovcivit.com`). Two feature areas: Department Management (`features/department_management_features/`) and Designation Management (`features/designation_management_features/`, written in FRD vocabulary). It is converted from original Playwright Test specs (`CONVERSION_REPORT.md`); `seed.spec.ts` and `specs/` are leftovers for the Playwright planner/generator/healer agents (`.claude/agents/`, `.github/agents/`), not part of the Cucumber run.

Tests run against a live environment and need real credentials: copy `.env.example` to `.env` and set `MIDC_USERNAME` / `MIDC_PASSWORD` (single-quote passwords containing `$ @ #`). Never commit `.env`. Node >= 20; Java is needed only for rendering Allure reports.

## Commands

```bash
npm test                         # all scenarios (@shared-session ones are excluded by default)
npm run test:dry-run             # verifies every step has a definition, no browser
npm run typecheck                # tsc --noEmit (no linter is configured)
npm run test:headed              # visible browser (HEADLESS=false)

# One tag / one scenario
npx cucumber-js --tags "@edit-department and not @fixme"
npx cucumber-js --tags @TC_N_0001
npx cucumber-js features/department_management_features/add-department.feature:12   # by file:line

npm run test:sequential          # ordered 11-feature Department run, ONE shared browser + login
npm run test:designation:sequential   # login -> 9 Designation features -> logout, shared session
npm run test:designation         # @Designation, isolated sessions
npm run test:parallel            # PARALLEL=4 workers
npm run test:chromium|firefox|webkit | test:all-browsers   # scripts/run-browsers.js
npm run test:report              # clean, run, build Allure report (extra args forwarded to cucumber)
npm run allure:report | report:open | clean:reports
```

Other `test:*` scripts in `package.json` are just tag filters (`@add-department`, `@negative`, ...). Every run writes the Cucumber HTML report (`reports/html/index.html`), JSON, per-scenario artifacts (`reports/artifacts/`) and `allure-results/`; the `ci` profile adds JUnit.

## Architecture

- **`cucumber.js`** defines the profiles. `default` loads `features/**/*.feature` with `ts-node/register` (transpile-only, so `npm run typecheck` is the only type check) and requires `src/support/**` and `src/steps/**`. `sequential` / `designation-sequential` pin file order explicitly (login first, logout last), force `parallel: 0`, `retry: 0`, and flip the tag filter from `not @shared-session` to `not @isolated-session`. When adding a feature file that belongs in an ordered run, add it to the path list there.
- **Two session modes** (`src/support/hooks.ts`, `session.ts`, `world.ts`): by default each scenario gets a fresh BrowserContext + page. With `SHARED_SESSION=1` one context is created and logged in during `BeforeAll`, every scenario borrows it (the After hook must not close it), and `AfterAll` logs out. `session.ts` pins `landingUrl` at login and `returnToLandingPage` restores it between features, because features may end in the admin portal, which has no "Masters Management" link. Steps use `alreadyAuthenticated()` to skip login work.
- **`CustomWorld`** (`src/support/world.ts`) owns the context/page, all page objects (`world.pages.*`, Designation ones under `world.pages.designation`), `TestDataStore`, and toast capture. All environment settings come from `src/support/config.ts`; do not read `process.env` elsewhere.
- **Page objects** in `src/pages/` hold all locators/waits; step files in `src/steps/` stay thin. Cucumber step text is **global** across files, so steps shared by several Designation features live in `src/steps/designation/common.steps.ts`. Designation has one page object and one step file per feature file (mapping table in `README.md`).
- **Test data**: `src/test-data/designation.data.ts` maps FRD terms to the MIDC UI wording (and aliases app messages that differ from the FRD; `STRICT_FRD_MESSAGES=true` asserts FRD wording verbatim). Designation names get a per-scenario `Bdd<digits>` suffix and `src/steps/designation/hooks.ts` deletes created Designations and Positions afterwards; after a killed run, leftovers can be found by filtering the grid for `Bdd`.
- **Tags** drive behaviour: `@fixme` scenarios are skipped in a hook, `@TC-*`/`@TC_N_*` become the Allure `testId`, `@REQ-*` the `story`, `@severity:*` the severity; `@no-retry` is excluded from `RETRY>0`.

## Gotchas

- **Never mutate the toaster DOM from tests** (e.g. `setAttribute` via `page.evaluate` to mark stale toasts). It stops later toasts from rendering on this portal. Toast detection in `world.ts` is read-only and tells stale from new by text (repeated text counts as new once it has disappeared and reappeared).
- `README.md` lists the Department features dir as `department_management_feature/`; the real directory is `department_management_features/`.
- Video, trace and screenshot default to `on`; set `VIDEO` / `TRACE` / `SCREENSHOT` to `retain-on-failure` or `off` for faster local runs.

## Effort routing

| Task type                             | Model  | Effort |
|---------------------------------------|--------|--------|
| Lookup / list files / grep / search   | Haiku  | medium |
| Coding tasks (general implementation) | Sonnet | high   |
| Test scaffolding, routine edits       | Sonnet | medium |
| Code review, debugging                | Sonnet | high   |

Rules of thumb:

- Default to the lowest tier that can do the job correctly; escalate only when a task turns out to need more reasoning.
- Delegate pure lookups (find/list/grep) to a Haiku subagent rather than doing them yourself at high effort.
