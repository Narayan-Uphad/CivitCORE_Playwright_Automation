# Project Analysis — MIDC Department Management (Cucumber BDD)

**Project:** `midc-department-cucumber-bdd` v1.0.0
**Analysis date:** 2026-09-29
**Prepared by:** Technical architecture review
**Method:** Direct inspection of `package.json`, `package-lock.json`, `tsconfig.json`, `cucumber.js`,
`.env.example`, `.github/workflows/`, `.vscode/`, the source tree, feature files, plus `npm audit`,
`npm outdated` and `tsc --noEmit`. No conclusion below is inferred from file extensions alone.

---

## Table of contents

- [Part 1 — Executive Summary](#part-1--executive-summary)
- [Part 2 — Technical Deep-Dive](#part-2--technical-deep-dive)
  1. [Languages & Runtime](#1-languages--runtime)
  2. [Frameworks](#2-frameworks)
  3. [Project Structure](#3-project-structure)
  4. [Dependencies](#4-dependencies)
  5. [Build & Tooling](#5-build--tooling)
  6. [Testing](#6-testing)
  7. [CI/CD & DevOps](#7-cicd--devops)
  8. [Code Quality Signals](#8-code-quality-signals)
  9. [Security Observations](#9-security-observations)
  10. [Documentation](#10-documentation)
- [Appendix A — Tooling summary](#appendix-a--tooling-summary)
- [Appendix B — Prioritised action list](#appendix-b--prioritised-action-list)

---

# Part 1 — Executive Summary

*Intended for management and non-technical stakeholders.*

## What this project does

This is an **automated testing suite**, not a product. It automatically drives a real web browser
through the **MIDC / CivitCORE "Department Management" module** of the SmartGov Civit portal —
logging in, creating departments, editing them, searching, deleting and logging out — and verifies
the application behaves correctly at each step. Test cases are written in plain business English
("Given I open the MIDC portal… Then the message 'Department added successfully!' is displayed"),
so business analysts and testers can read and review them without reading code. Every run produces
screenshots, videos and a visual HTML report showing exactly what passed and what failed. It was
converted in September 2026 from an earlier, developer-only Playwright test suite into this
business-readable BDD format.

## Technology family

A **Node.js-based browser test-automation suite** — a quality-assurance tool run by the QA team on
demand, not a deployed application. Nothing in it is customer-facing; it has no server, no database
and no users other than testers.

## Health / maturity

**Growing.**

> The engineering craft is unusually high — clean structure, thorough documentation, rich reporting,
> and up-to-date, vulnerability-free dependencies — but the project is not yet wired into any
> automated pipeline and is not under version control, so it depends on a single person's machine.

## Key risks and gaps, in simple terms

| # | Risk | Plain-English impact |
|---|------|----------------------|
| 1 | **Not under version control** — no Git repository exists in this folder | No history, no code review, no rollback, no team collaboration. The only copy lives in a OneDrive sync folder; an accidental delete or bad sync loses the work. **This is the single biggest risk.** |
| 2 | **Not running automatically** | Tests only find bugs when someone remembers to run them by hand. No nightly run, no run on each release. |
| 3 | **The one CI file present is broken and unrelated** | The single GitHub Actions file is a GitHub Copilot setup template whose last step is an invalid command that would fail. It does not run any tests. |
| 4 | **Live credentials sit in a local file** | Real portal login details are stored in a `.env` file on the developer's machine. It is correctly excluded from source control, but there is no shared secrets vault for team or pipeline use. |
| 5 | **Tests run against the live / shared environment** | The suite creates and deletes real departments on the live portal. A failed run can leave test data behind in a shared system. |
| 6 | **Known unstable tests** | 5 scenarios are permanently switched off, and the last recorded run shows 6 "broken" results out of 43 — roughly 14% unreliable. |
| 7 | **Documentation drift** | The README says "30 scenarios"; there are now 42. Small, but it erodes trust in the docs. |
| 8 | **No code-style enforcement** | No linter or formatter is configured, and the type-checker currently reports 2 errors. |

## Recommendations

| # | Recommendation | Expected business benefit |
|---|----------------|---------------------------|
| 1 | **Put the project into Git today and push it to the company repository.** | Eliminates total-loss risk; enables review and rollback. A few hours of work protects weeks of effort. |
| 2 | **Add a real CI pipeline that runs the suite nightly and on each release candidate**, replacing the broken Copilot template. | Defects are caught within hours instead of during manual UAT; cuts regression-testing effort and shortens release cycles. |
| 3 | **Move credentials into the pipeline's secret store** (GitHub Secrets / Azure Key Vault) and use a dedicated test account on a non-production environment. | Removes credential-leak exposure and stops test data polluting a shared system. |
| 4 | **Fix or formally retire the 5 disabled and 6 unstable scenarios; add a linter and clear the 2 type errors.** | A suite people trust. Flaky tests are worse than no tests, because teams learn to ignore red builds. |
| 5 | **Extend coverage beyond Department Management once the pipeline is stable.** | The framework (page objects, reporting, data generation) is already built, so each new module costs far less than the first one did — high return on the investment already made. |

> ### Bottom Line
> **A well-engineered, business-readable automated test suite for MIDC Department Management —
> strong foundations, but currently unversioned, unautomated and dependent on one machine; a small
> investment in Git, CI and secrets management would turn a good asset into a reliable one.**

---

# Part 2 — Technical Deep-Dive

## 1. Languages & Runtime

| Item | Detail | Source |
|------|--------|--------|
| Primary language | **TypeScript 5.9.3** (latest available 7.0.2), `strict: true`, target ES2022, CommonJS modules | `tsconfig.json`, `package.json` |
| Secondary | **JavaScript (CommonJS)** — config and runner scripts only: `cucumber.js`, `scripts/run-tests.js`, `scripts/open-html-report.js` | — |
| Specification language | **Gherkin** — 11 `.feature` files | `features/` |
| Runtime | **Node.js >= 20** (`engines` field); transpiled at runtime by `ts-node` in `transpileOnly` mode — no build step | `package.json` |
| External runtime requirement | **Java 8+** on `PATH`, required by the Allure CLI to render reports | `README.md` |
| Browser runtime | Chromium (bundled, installed via `postinstall`); Firefox / WebKit supported via the `BROWSER` env var | `src/support/config.ts` |

## 2. Frameworks

| Framework | Version | Why the project uses it |
|-----------|---------|-------------------------|
| **@cucumber/cucumber** | ^12.9.0 | BDD test runner — executes Gherkin scenarios so tests stay readable by non-developers |
| **@playwright/test** | ^1.63.0 | Browser automation library, used as a *library* rather than a test runner — Cucumber owns the run loop |
| **allure-cucumberjs** | ^3.12.2 (3.13.0 available) | Rich HTML reporting with history, trends and severity / story grouping |
| **ts-node** | ^10.9.2 | On-the-fly TypeScript execution — avoids a compile step before every run |

### Architectural pattern

**Page Object Model (POM) + BDD layering**, cleanly separated into four tiers:

```
Gherkin feature (business language)
   -> Step definitions      (src/steps   — translation layer, 106 step definitions)
      -> Page objects       (src/pages   — locators and app interactions)
         -> Playwright API  (browser)
```

Cross-cutting concerns sit in `src/support`:

- a **Custom World** (`world.ts`) owning the browser context, page objects and scenario data;
- **hooks** for lifecycle, artifacts and `@fixme` skipping;
- a **session module** for the shared-login mode.

This is the correct and idiomatic architecture for a Cucumber + Playwright suite. No anti-patterns
were observed.

**Notable design decision — two execution modes:**

| Mode | Behaviour |
|------|-----------|
| Isolated (default) | Fresh browser context per scenario; parallelisable (`PARALLEL=4`) |
| `SHARED_SESSION=1` (`sequential` profile) | One browser, one login, feature files run in a pinned order; retries disabled because replaying a scenario against a moved-on session is unsafe |

Both are documented in code comments and configured as distinct Cucumber profiles.

## 3. Project Structure

| Path | Purpose |
|------|---------|
| `features/` | 11 Gherkin feature files, **42 scenarios**, one per original spec file |
| `src/pages/` | 8 page objects + barrel export: login, home, masters management, department list / dialog / delete-dialog, logout, plus `DepartmentFlows` (multi-step composites) |
| `src/steps/` | 8 step-definition files grouped by domain; **106 step definitions** |
| `src/support/` | `config.ts` (environment), `world.ts` (Custom World), `hooks.ts` (lifecycle / artifacts), `session.ts` (shared session) |
| `src/test-data/` | Static fixtures — `midc.data.ts`, `department.data.ts` |
| `src/utils/` | Configured `expect`, and a `{timestamp}` / `{alias}` template resolver for unique test data |
| `scripts/` | Node runner scripts (clean -> run -> generate Allure; open HTML report) |
| `specs/` | Placeholder for test plans — **contains only a 3-line README stub** |
| `.claude/`, `.github/agents/` | AI agent definitions (Playwright test generator / healer / planner) — tooling, not product code |
| `allure-results/`, `allure-report/`, `reports/` | Generated output; git-ignored, but **currently present on disk** (thousands of files) |

### Entry points

- `npx cucumber-js` -> `cucumber.js` profiles (`default`, `ci`, `sequential`)
- `npm run test:report` -> `scripts/run-tests.js` (clean -> test -> Allure)

**Size:** 2,282 lines of hand-written source across 27 TS/JS files; largest file 246 lines. No
oversized files.

## 4. Dependencies

| Metric | Value |
|--------|-------|
| Direct dependencies | **10**, all `devDependencies` — production dependencies: **0** (correct for a test suite) |
| Total resolved (transitive) | **156** packages (`npm audit`: prod 1, dev 156, optional 1) |
| Installed in `node_modules` | 129 top-level entries |
| Lockfile | `package-lock.json`, **lockfileVersion 3** (npm 7+) — present |
| **Known vulnerabilities** | **0** — `npm audit` reports 0 across all severity levels |
| Duplicate / conflicting versions | **None detected** |
| Deprecated packages | **None flagged** |

### Outdated packages (`npm outdated`)

| Package | Current | Latest | Note |
|---------|---------|--------|------|
| `typescript` | 5.9.3 | 7.0.2 | Two majors behind; upgrade needs evaluation |
| `dotenv` | 16.6.1 | 18.0.4 | Two majors behind; low-risk upgrade |
| `@types/node` | 22.20.4 | 26.6.3 | Should track the Node runtime in use |
| `allure-cucumberjs` | 3.12.2 | 3.13.0 | Minor — safe to take now |

Overall dependency hygiene is **good**: a small surface, zero vulnerabilities, no production
dependencies.

## 5. Build & Tooling

| Aspect | Finding |
|--------|---------|
| Build tool | **None** — no bundler. `ts-node/register` transpiles at runtime (`transpileOnly: true`). `tsconfig` defines `outDir: dist` but no `build` script exists |
| Package manager | **npm** (lockfileVersion 3) |
| **Linting / formatting** | **Not configured** — no ESLint, Prettier, `.editorconfig`, Husky or lint-staged. `dbaeumer.vscode-eslint` is *recommended* in `.vscode/extensions.json`, but no ESLint config or dependency exists |
| Type checking | `npm run typecheck` -> `tsc --noEmit`. Manual only; not enforced anywhere |
| Config management | **Well done** — all settings flow through `src/support/config.ts` with typed readers, validation and defaults; `.env` loaded via dotenv; a thorough, commented `.env.example` is committed; `.env` is git-ignored |
| Secrets handling | Local `.env` file only. No vault / secret-store integration. The README correctly instructs CI to use pipeline secrets, but no CI consumes them |
| Editor tooling | `.vscode/settings.json` binds `*.feature` to the Cucumber language and points `cucumber.glue` at the step definitions — good developer experience |
| MCP | `.mcp.json` declares a `playwright-test` MCP server, **disabled** in `.claude/settings.local.json` |

## 6. Testing

This project *is* the tests, so the question inverts — below is what it covers, and what covers it.

| Aspect | Finding |
|--------|---------|
| Test framework | Cucumber.js 12 + Playwright 1.63 |
| Test type | **End-to-end UI only.** No unit tests, no integration / API tests, and no tests of the framework's own helper code (for example the `TestDataStore` template resolver is untested) |
| Volume | 11 features, **42 scenarios**, 106 step definitions |
| Disabled tests | **5 `@fixme`-tagged scenarios**, skipped by design, mirroring `test.fixme` in the original specs; 2 of them have empty bodies in the source |
| Last recorded results | From `allure-report/widgets/summary.json`: **43 total — 34 passed, 6 broken, 3 skipped, 0 failed.** ~14% broken indicates real instability |
| Retry support | Configurable via the `RETRY` env var with `retryTagFilter: 'not @no-retry'`; **default is 0** |
| Coverage of the application under test | Not measurable — coverage instrumentation cannot reach a remote web app. Functional scope is Department Management only: login, masters navigation, add, nested add, edit, search, delete, negative cases, logout |
| **Wired into CI?** | **No.** The only workflow does not invoke the test suite |
| Documentation drift | The README states "All 30 scenarios (28 run and pass)"; the actual count is 42 across 11 features. `logout.feature` (6 scenarios) postdates `CONVERSION_REPORT.md` and was never folded into the README counts |

## 7. CI/CD & DevOps

| Aspect | Finding |
|--------|---------|
| CI tool | **GitHub Actions** — a single workflow, `.github/workflows/copilot-setup-steps.yml` |
| What it actually does | It is the **GitHub Copilot coding-agent environment-setup template**, not a test pipeline. Triggers are `workflow_dispatch` plus push / PR **limited to changes to the workflow file itself**, so it effectively never runs |
| **Defect in the workflow** | The final step runs `npx run build` — not a valid command (`npx run` does not invoke an npm script), and no `build` script exists in `package.json`. This step would fail on every execution |
| Test stage | **Absent** — no step runs `cucumber-js` |
| Deploy stage | Not applicable — no deployable artifact |
| Containerization | **None** — no Dockerfile, docker-compose or Kubernetes manifests |
| CI-ready configuration | A `ci` Cucumber profile exists and emits JUnit XML to `reports/junit.xml` — ready for a pipeline to consume, but nothing consumes it |
| Version control | **No `.git` directory.** A `.gitignore` exists and is well written, so Git was intended but never initialised. The project lives inside a **OneDrive-synced folder** |
| Deployment target | Not applicable |
| Environment under test | `https://smartgovcivit.com` / `https://admin.smartgovcivit.com` — appears to be a live / shared environment rather than an isolated test instance. Whether a dedicated test environment exists is **not determinable from the current codebase** |

## 8. Code Quality Signals

### Strengths

- **TypeScript `strict: true`**, plus `noUnusedLocals` and `noImplicitReturns` — a deliberately
  tight compiler configuration.
- **Exceptional comment quality.** Comments explain *why*, not *what* — for example why videos are
  externalised rather than base64-inlined, why toasts are polled inside the page, why the
  sequential profile pins file order, and why retries are disabled in shared-session mode. This is
  well above average.
- **No TODO / FIXME / HACK / XXX markers anywhere** in `src/` or `scripts/` (0 occurrences).
- **No large files** — largest is 246 lines; median well under 100.
- **No duplicated logic observed** — shared behaviour is factored into `DepartmentFlows`,
  `TestDataStore` and `utils/assertions.ts`.
- **Robust async handling** — in-page polling for transient toasts, an API-error listener that
  surfaces failed requests in reports, and explicit resource cleanup (`detachSharedPage` removes
  listeners).

### Issues

- **`npm run typecheck` currently fails with 2 errors**, both the same root cause:
  - `src/support/hooks.ts:141` and `src/support/hooks.ts:172` —
    `TS2345: Argument of type 'Video | null | undefined' is not assignable to parameter of type 'Video | undefined'`.
    Playwright's `page.video()` returns `Video | null`; the helper signature does not accept `null`.
    A one-line fix (`?? undefined`, or widening the parameter type).
- **No automated style enforcement** — consistency currently rests on author discipline alone.
- **Generated artifacts are accumulating in the working tree** — `allure-results/` holds thousands
  of per-run JSON / PNG / WEBM files. They are git-ignored, but they bloat the OneDrive sync and
  editor search (partially mitigated by `search.exclude` in the VS Code settings).
- **`specs/` is a 3-line stub** — either populate it or remove it.

## 9. Security Observations

| Check | Finding |
|-------|---------|
| **Hardcoded secrets in source** | **None found.** A scan for credential-shaped assignments across `src/`, `scripts/`, `features/` and `cucumber.js` returned zero hits. No literal usernames or passwords appear in feature files or step definitions. Credentials are read exclusively from environment variables via `getCredentials()` in `src/support/config.ts`, which fails fast with an actionable message when unset — a correct implementation |
| **Real credentials on disk** | A local `.env` **exists and contains populated `MIDC_USERNAME` / `MIDC_PASSWORD` values** for the live portal (values were not read or reproduced during this review). It is correctly listed in `.gitignore`, along with `.env.*` and an exception for `.env.example`. **However:** because there is no Git repository, `.gitignore` currently provides no protection — and the file sits in a **cloud-synced OneDrive folder**, so the credentials are replicated to OneDrive storage and to any device sharing that account |
| **Dependency vulnerabilities** | **0** across all severity levels (`npm audit`) |
| **Auth approach (of the suite)** | Form-based UI login against the Department Login page; no tokens or API keys are handled. Session reuse is in-memory within a run (`SHARED_SESSION`); **no `storageState` file is persisted to disk**, so no session artifacts leak |
| **Logging exposure** | The response listener in `world.ts` captures failed (non-GET, status >= 400) response bodies truncated to 500 characters and attaches them to reports. If the application ever echoes sensitive data in an error body, it would land in an Allure / HTML report. Low risk, but worth noting since reports may be shared |
| **Video / trace artifacts** | Screenshots, videos and traces default to `on` and record the full session **including the login screen** as credentials are typed. Typed characters are masked by the password field, but the username is visible. Reports should be treated as internal-only |
| **Transport** | All configured URLs are HTTPS |
| **Authorization / RBAC** | Not applicable — the suite tests a single user role. Whether the test account is least-privilege is **not determinable from the current codebase** |

## 10. Documentation

### What exists — genuinely strong

- **`README.md`** (7.5 KB) — prerequisites, setup, a full command table, report locations, project
  layout, a guide to writing scenarios with the test-data token syntax, and VS Code troubleshooting.
- **`CONVERSION_REPORT.md`** (9.7 KB) — a test-by-test reconciliation of the Playwright -> Cucumber
  migration, including which tests were dropped and why. Excellent traceability.
- **`.env.example`** — every variable documented, with defaults and a note on quoting special
  characters in passwords.
- **Inline documentation** — file-level JSDoc headers on every support module and page object, with
  rationale comments on non-obvious decisions. Feature files carry `# Source:` provenance comments
  back to the original specs.
- **Gherkin features** themselves double as living business documentation.
- **Traceability tags** — `@TC-xxx` maps to the Allure `testId` label, `@REQ-xx` to the `story`
  label.

### What is missing

- **Documentation is stale on counts** — the README says 30 scenarios; the actual count is 42 across
  11 features. `logout.feature` is absent from both the README layout section and the conversion
  report.
- **No CONTRIBUTING guide** — no documented conventions for adding features, naming tags or
  reviewing changes.
- **No test plan** — `specs/README.md` is a 3-line placeholder, and there is no
  requirements-to-test coverage matrix beyond the `@REQ-xx` tags (only 4 distinct REQ ids are used
  across 42 scenarios).
- **No documented rationale for the 5 `@fixme` scenarios** in the README — the reasons live only in
  the conversion report and inline comments.
- **No CI/CD or environment documentation** — nothing describes how or where this is meant to run
  unattended, or which environment is safe to test against.
- **No API docs** — not applicable; there is no public API surface.
- **No LICENSE or ownership metadata** — only `private: true`.

---

# Appendix A — Tooling summary

| Category | Tool | Version | Status |
|----------|------|---------|--------|
| Language | TypeScript | 5.9.3 | 2 majors behind; 2 type errors present |
| Runtime | Node.js | >= 20 required | OK |
| Test runner | Cucumber.js | 12.9.0 | Current |
| Browser automation | Playwright | 1.63.0 | Current |
| Reporting | Allure + Cucumber HTML + JSON + JUnit | 3.12.2 | Minor update available |
| Package manager | npm | lockfile v3 | OK |
| Build tool | *none* (runtime transpile) | — | By design |
| Linter / formatter | **none** | — | **Gap** |
| CI/CD | GitHub Actions (setup template only) | — | **Gap — and the one file is broken** |
| Containerization | **none** | — | Gap |
| Version control | **none (`.git` absent)** | — | **Critical gap** |
| Secrets | local `.env` | — | Works locally; no vault |
| Vulnerabilities | 0 of 156 packages | — | Good |

---

# Appendix B — Prioritised action list

| Priority | Action | Effort | Addresses |
|----------|--------|--------|-----------|
| P0 | `git init`, commit and push to the company remote. The `.gitignore` is already correct and will do its job the moment a repository exists. | Hours | Risk 1 |
| P0 | Replace `.github/workflows/copilot-setup-steps.yml` with a real workflow that runs `npx cucumber-js -p ci`, reads credentials from GitHub Secrets, and uploads `reports/` and `allure-results/` as artifacts. | 1 day | Risks 2, 3, 4 |
| P1 | Fix the two `Video \| null` type errors in `src/support/hooks.ts:141` and `:172`, then add ESLint + Prettier and gate both on CI. | Hours | Risk 8 |
| P1 | Provision a dedicated, non-production test environment and a least-privilege test account. | Days (needs infra) | Risk 5 |
| P2 | Triage the 5 `@fixme` scenarios and the 6 "broken" results: fix, or retire with a documented reason. | Days | Risk 6 |
| P2 | Refresh the README counts, document the `logout.feature` additions, and add a CONTRIBUTING section covering tag conventions. | Hours | Risk 7 |
| P3 | Take the safe dependency updates (`allure-cucumberjs` 3.13.0, `@types/node`); evaluate the TypeScript and dotenv majors separately. | Hours | — |
| P3 | Add a scheduled cleanup of `allure-results/`, or relocate generated output outside the OneDrive-synced tree. | Hours | — |
| P3 | Populate `specs/` with a real test plan and a requirements-to-test coverage matrix, or remove the stub. | Days | — |

---

*Statements in this document were verified against the codebase on 2026-09-29. Where a fact could
not be established from the code, it is marked "not determinable from the current codebase" rather
than estimated.*
