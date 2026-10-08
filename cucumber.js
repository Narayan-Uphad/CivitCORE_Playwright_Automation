/**
 * Cucumber configuration.
 * Profiles:  npx cucumber-js                -> default (all scenarios; @fixme scenarios are reported as skipped)
 *            npx cucumber-js -p ci          -> default + JUnit report, fail-fast off, retry from RETRY env
 *            npx cucumber-js -p sequential  -> the 11 feature files below, in the listed order, sharing
 *                                              ONE browser + ONE login (see `npm run test:sequential`)
 *            npx cucumber-js -p designation-sequential
 *                                           -> login, the 9 Designation features, logout, in that order,
 *                                              sharing ONE browser + ONE login
 *                                              (see `npm run test:designation:sequential`)
 *            npx cucumber-js -p location-category-sequential
 *                                           -> login, the 8 Location Category features, logout, in that order,
 *                                              sharing ONE browser + ONE login
 *                                              (see `npm run test:location-category:sequential`)
 *
 * A single run produces:
 *   reports/html/index.html        Cucumber HTML report (open with `npm run report:open`)
 *   reports/html/attachment-*      Screenshots / videos / traces the report links to
 *   reports/cucumber-report.json   Cucumber JSON
 *   reports/artifacts/             Screenshot / video / trace files per scenario
 *   allure-results/                Allure raw results (render with `npm run allure:report`)
 */
require('dotenv').config({ quiet: true });

const os = require('node:os');

const parallel = Number(process.env.PARALLEL ?? 1);
const retry = Number(process.env.RETRY ?? 0);
const htmlReport = process.env.HTML_REPORT ?? 'reports/html/index.html';
const jsonReport = process.env.JSON_REPORT ?? 'reports/cucumber-report.json';
const junitReport = process.env.JUNIT_REPORT ?? 'reports/junit.xml';
// `progress-bar` redraws in place, which is unreadable when several browser runs share one
// terminal; `npm run test:all-browsers` therefore asks for the line-oriented `progress`.
const progressFormat = process.env.PROGRESS_FORMAT ?? 'progress-bar';

const common = {
  paths: ['features/**/*.feature'],
  requireModule: ['ts-node/register'],
  require: ['src/support/**/*.ts', 'src/steps/**/*.ts'],
  format: [
    progressFormat,
    'summary',
    `html:${htmlReport}`,
    `json:${jsonReport}`,
    'allure-cucumberjs/reporter',
  ],
  formatOptions: {
    snippetInterface: 'async-await',
    html: {
      // Videos and traces are megabytes each; inlining them as base64 makes the single-file
      // report too large to open. They are written next to index.html and linked instead.
      externalAttachments: ['image/*', 'video/*', 'application/zip'],
    },
    // Allure formatter options; the other formatters ignore them.
    resultsDir: process.env.ALLURE_RESULTS_DIR ?? 'allure-results',
    labels: [
      { pattern: [/@(TC[-_][\w-]+)/], name: 'testId' },
      { pattern: [/@(REQ-\d+)/], name: 'story' },
      { pattern: [/@severity:(.*)/], name: 'severity' },
    ],
    environmentInfo: {
      base_url: process.env.BASE_URL ?? 'https://smartgovcivit.com',
      admin_url: process.env.ADMIN_URL ?? 'https://admin.smartgovcivit.com',
      browser: process.env.BROWSER ?? 'chromium',
      headless: process.env.HEADLESS ?? 'true',
      node_version: process.version,
      os_platform: os.platform(),
      os_release: os.release(),
    },
  },
  parallel,
  retry,
  retryTagFilter: retry > 0 ? 'not @no-retry' : undefined,
  // @shared-session scenarios only make sense inside the ordered `sequential` run.
  tags: 'not @shared-session',
  strict: true,
};

/**
 * Ordered run. Cucumber executes `paths` in the order they are given (it only sorts when a
 * glob is expanded), so listing the files explicitly pins login first and logout last.
 */
const sequentialPaths = [
  'features/department_management_features/department-login.feature',
  'features/department_management_features/masters-management.feature',
  'features/department_management_features/department-management-navigation.feature',
  'features/department_management_features/add-department.feature',
  'features/department_management_features/add-nested-department-fixed.feature',
  'features/department_management_features/department-management-verified.feature',
  'features/department_management_features/edit-department.feature',
  'features/department_management_features/department-negative.feature',
  'features/department_management_features/search-department.feature',
  'features/department_management_features/delete-department.feature',
  'features/department_management_features/logout.feature',
];

/** Ordered Designation run: login, the 9 Designation features, logout (same shared session). */
const designationSequentialPaths = [
  'features/department_management_features/department-login.feature',
  'features/designation_management_features/designation_access_and_permissions.feature',
  'features/designation_management_features/designation_creation.feature',
  'features/designation_management_features/designation_cross_module_consumption.feature',
  'features/designation_management_features/designation_list_search_view.feature',
  'features/designation_management_features/designation_update.feature',
  'features/designation_management_features/designation_deletion.feature',
  'features/designation_management_features/designation_toaster_notifications.feature',
  'features/designation_management_features/designation_ui_visual.feature',
  'features/designation_management_features/designation_activity_log.feature',
  'features/department_management_features/logout.feature',
];

/** Ordered Location Category run: login, the 8 Location Category features, logout (same shared session). */
const locationCategorySequentialPaths = [
  'features/department_management_features/department-login.feature',
  'features/location_category_features/location_category_hierarchy_list.feature',
  'features/location_category_features/location_category_permissions.feature',
  'features/location_category_features/location_category_search_view.feature',
  'features/location_category_features/location_category_creation.feature',
  'features/location_category_features/location_category_update.feature',
  'features/location_category_features/location_category_location_association.feature',
  'features/location_category_features/location_category_deletion.feature',
  'features/location_category_features/location_category_audit_log.feature',
  'features/department_management_features/logout.feature',
];

const sequential = {
  ...common,
  paths: sequentialPaths,
  // The shared browser/login cannot be split across workers, and retrying a scenario
  // would replay it against a session another scenario has already moved on from.
  parallel: 0,
  retry: 0,
  retryTagFilter: undefined,
  order: 'defined',
  // Every @isolated-session logout scenario ends the session mid-run; the shared run
  // instead finishes with the single @shared-session logout scenario.
  tags: 'not @isolated-session',
};

module.exports = {
  default: common,
  ci: {
    ...common,
    format: [...common.format, `junit:${junitReport}`],
  },
  sequential,
  'designation-sequential': {
    ...sequential,
    paths: designationSequentialPaths,
  },
  'location-category-sequential': {
    ...sequential,
    paths: locationCategorySequentialPaths,
  },
};
