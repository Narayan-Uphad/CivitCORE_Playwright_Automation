/**
 * Custom Cucumber World: one isolated browser context + page per scenario
 * (the equivalent of Playwright Test's per-test `page` fixture), the page
 * objects that the original `test-fixtures` injected, and scenario-scoped
 * generated test data.
 *
 * With SHARED_SESSION=1 the World does not create anything: it attaches to the single
 * context/page opened once in BeforeAll, so every scenario reuses the same logged-in session.
 */
import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { Browser, BrowserContext, Page, Response } from '@playwright/test';
import { config } from './config';
import { createBrowserContext, openSharedPage, requireSharedPage } from './session';
import {
  DeleteConfirmationDialog,
  DepartmentDialog,
  DepartmentFlows,
  DepartmentListPage,
  DepartmentLoginPage,
  DesignationPages,
  LogoutPage,
  MastersManagementPage,
  MidcHomePage,
  PositionPage,
} from '../pages';
import { TestDataStore } from '../utils/test-data-generator';
import { DesignationScenario } from './designation-scenario';
import { midcTestData } from '../test-data/midc.data';
import { positionContext } from '../test-data/designation.data';

export interface PageObjects {
  midcHomePage: MidcHomePage;
  departmentLoginPage: DepartmentLoginPage;
  mastersManagementPage: MastersManagementPage;
  departmentListPage: DepartmentListPage;
  departmentDialog: DepartmentDialog;
  deleteConfirmationDialog: DeleteConfirmationDialog;
  departmentFlows: DepartmentFlows;
  logoutPage: LogoutPage;
  /** Designation Management page objects, one per feature file (see src/pages/designation). */
  designation: DesignationPages;
  positionPage: PositionPage;
}

/**
 * Selector of the transient toaster the app uses for success / error notifications.
 * The `[role="alert"]` container is rendered empty; the message text lives in a sibling
 * element whose class contains "toast", so both are matched.
 */
const TOAST_SELECTOR = '[class*="toast" i], [role="alert"]';

export class CustomWorld extends World {
  context?: BrowserContext;
  private currentPage?: Page;
  private pageObjects?: PageObjects;
  testData = new TestDataStore();
  /** Values carried between Designation steps of a single scenario. */
  readonly designation = new DesignationScenario();
  tracingStarted = false;
  /** True when this World borrowed the run-wide context, which the After hook must not close. */
  usesSharedContext = false;

  constructor(options: IWorldOptions) {
    super(options);
  }

  async openContext(browser: Browser): Promise<void> {
    this.context = await createBrowserContext(browser);

    if (config.trace !== 'off') {
      await this.context.tracing.start({ screenshots: true, snapshots: true, sources: false });
      this.tracingStarted = true;
    }

    this.bindPage(await this.context.newPage());
  }

  /**
   * SHARED_SESSION mode: reuse the run-wide context (and therefore the login), but take a
   * fresh page so Playwright records one video file per scenario.
   */
  async attachSharedContext(): Promise<void> {
    const page = await openSharedPage();
    this.context = requireSharedPage().context;
    this.usesSharedContext = true;
    this.bindPage(page);
  }

  private responseListener?: (response: Response) => void;

  private bindPage(page: Page): void {
    this.currentPage = page;
    this.pageObjects = CustomWorld.buildPageObjects(page);
    // A failed save shows a generic red alert, so the API error is recorded for the report.
    this.responseListener = (response: Response) => {
      if (response.status() < 400 || response.request().method() === 'GET') return;
      response
        .text()
        .then((body) => this.apiErrors.push(`${response.status()} ${response.url()} ${body.slice(0, 500)}`))
        .catch(() => undefined);
    };
    page.on('response', this.responseListener);
  }

  /** Shared-session mode: the page outlives the scenario, so its listener must be removed. */
  detachSharedPage(): void {
    if (this.currentPage && this.responseListener) {
      this.currentPage.off('response', this.responseListener);
    }
    this.responseListener = undefined;
  }

  /** Failed API responses observed during the scenario, surfaced when an expected message never appears. */
  readonly apiErrors: string[] = [];

  /** Toast messages captured during the current scenario. */
  readonly seenToasts: string[] = [];

  /**
   * The app's toaster auto-dismisses after ~3 s, which can elapse before the next step runs.
   * Callers that trigger a toast record it here so a later step can still assert it.
   */
  async captureToast(timeoutMs = 10000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    do {
      if ((await this.readToasts()).length > 0) return;
    } while (Date.now() < deadline);

    const lastError = this.apiErrors.at(-1);
    this.log(`No message appeared within ${timeoutMs} ms.${lastError ? ` Last API error: ${lastError}` : ''}`);
  }

  /** Toast texts on screen right now (without waiting); pass to `captureNewToast` before an action. */
  async visibleToasts(): Promise<string[]> {
    // Read-only on purpose: writing to the toaster's DOM (e.g. marking elements) stops the app's toasts.
    const texts = await this.page
      .evaluate(
        (selector) => Array.from(document.querySelectorAll(selector)).map((element) => (element.textContent ?? '').trim()),
        TOAST_SELECTOR,
      )
      .catch(() => [] as string[]);
    return texts.filter(Boolean);
  }

  /**
   * Like `captureToast`, but ignores toasts that were already showing before the action
   * (an earlier "added" toast can still be on screen when a "deleted" toast is expected).
   */
  async captureNewToast(previous: string[], timeoutMs = 10000): Promise<void> {
    this.seenToasts.length = 0;
    // A toast is new when its text was not showing before, or when a text that was showing went away
    // and came back (the same message twice in a row, e.g. two "added" toasts).
    const gone = new Set<string>();
    const deadline = Date.now() + timeoutMs;
    do {
      const visible = await this.readToasts();
      const fresh = visible.filter((text) => !previous.includes(text) || gone.has(text));
      if (fresh.length > 0) {
        this.seenToasts.splice(0, this.seenToasts.length, ...fresh);
        return;
      }
      for (const text of previous) if (!visible.includes(text)) gone.add(text);
    } while (Date.now() < deadline);
    // What was seen is kept: a new toast replacing an identical one in place cannot be told apart.
    this.log(`No new message appeared within ${timeoutMs} ms.`);
  }

  /**
   * Reads toast text with `textContent`, which also works while the toaster animates in or out.
   * Polling runs inside the page so a toast cannot slip through between two Node round-trips.
   */
  private async readToasts(): Promise<string[]> {
    const texts = await this.page
      .evaluate(
        (selector) =>
          new Promise<string[]>((resolve) => {
            const read = (): string[] =>
              Array.from(document.querySelectorAll(selector))
                .map((element) => (element.textContent ?? '').trim())
                .filter(Boolean);
            const immediate = read();
            if (immediate.length > 0) {
              resolve(immediate);
              return;
            }
            const deadline = Date.now() + 900;
            const timer = setInterval(() => {
              const found = read();
              if (found.length > 0 || Date.now() > deadline) {
                clearInterval(timer);
                resolve(found);
              }
            }, 30);
          }),
        TOAST_SELECTOR,
      )
      .catch(() => [] as string[]);
    const found = texts.map((text) => text.trim()).filter(Boolean);
    for (const text of found) {
      if (!this.seenToasts.includes(text)) this.seenToasts.push(text);
    }
    return found;
  }

  /** True when the message is on screen now, or was recorded earlier in this scenario. */
  async sawMessage(expected: string | RegExp, timeoutMs: number): Promise<boolean> {
    const matches = (value: string): boolean =>
      typeof expected === 'string' ? value.includes(expected) : expected.test(value);

    const deadline = Date.now() + timeoutMs;
    do {
      if (this.seenToasts.some(matches)) return true;
      if ((await this.readToasts()).some(matches)) return true;
      await this.page.waitForTimeout(200);
    } while (Date.now() < deadline);

    return this.seenToasts.some(matches);
  }

  get page(): Page {
    if (!this.currentPage) throw new Error('Browser page is not initialised. Is the Before hook registered?');
    return this.currentPage;
  }

  get pages(): PageObjects {
    if (!this.pageObjects) throw new Error('Page objects are not initialised. Is the Before hook registered?');
    return this.pageObjects;
  }

  get hasPage(): boolean {
    return this.currentPage !== undefined;
  }

  /** Resolves {alias}/{timestamp} tokens in a step argument. */
  resolve(value: string): string {
    return this.testData.resolve(value);
  }

  private static buildPageObjects(page: Page): PageObjects {
    const departmentListPage = new DepartmentListPage(page);
    const departmentDialog = new DepartmentDialog(page);
    const mastersManagementPage = new MastersManagementPage(page);
    const positionPage = new PositionPage(page, mastersManagementPage);
    return {
      midcHomePage: new MidcHomePage(page),
      departmentLoginPage: new DepartmentLoginPage(page),
      mastersManagementPage,
      departmentListPage,
      departmentDialog,
      deleteConfirmationDialog: new DeleteConfirmationDialog(page),
      departmentFlows: new DepartmentFlows(page, departmentListPage, departmentDialog),
      logoutPage: new LogoutPage(page),
      designation: new DesignationPages(page, mastersManagementPage, positionPage, {
        organization: midcTestData.organizationName,
        ...positionContext,
      }),
      positionPage,
    };
  }
}

setWorldConstructor(CustomWorld);
