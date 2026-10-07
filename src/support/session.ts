/**
 * Shared-session support (SHARED_SESSION=1, used by `npm run test:sequential`).
 *
 * In shared mode a single BrowserContext + Page is created once in BeforeAll and reused by
 * every scenario of the ordered run, so the portal is logged into once and logged out of once.
 * When SHARED_SESSION is off the suite keeps its original behaviour: a fresh, isolated context
 * per scenario.
 */
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { config } from './config';
import { DepartmentLoginPage, LogoutPage, MidcHomePage } from '../pages';
import { midcTestData } from '../test-data/midc.data';

interface SharedSessionState {
  context?: BrowserContext;
  page?: Page;
  tracingStarted: boolean;
  authenticated: boolean;
  /** URL of the post-login landing page, used to return there between features. */
  landingUrl?: string;
}

export const sharedSession: SharedSessionState = {
  tracingStarted: false,
  authenticated: false,
};

/** True while the shared session is signed in, i.e. steps may skip their pre-login work. */
export function alreadyAuthenticated(): boolean {
  return config.sharedSession && sharedSession.authenticated;
}

export function markAuthenticated(page: Page): void {
  if (!config.sharedSession) return;
  sharedSession.authenticated = true;
  sharedSession.landingUrl = page.url();
}

export function markLoggedOut(): void {
  sharedSession.authenticated = false;
}

/**
 * Brings the shared page back to the authenticated landing page if a feature navigated away.
 *
 * `landingUrl` is pinned once at login and is never re-recorded from a scenario's end URL:
 * features routinely finish inside the Admin Portal (admin.smartgovcivit.com), and returning
 * *there* lands on a page that has no "Masters Management" link, which breaks every later
 * Background and the final logout.
 */
export async function returnToLandingPage(page: Page): Promise<void> {
  const mastersManagementLink = page.getByRole('link', { name: 'Masters Management' });
  if (await mastersManagementLink.isVisible().catch(() => false)) return;
  await page.goto(sharedSession.landingUrl ?? config.homeUrl);
  // goto resolves before the portal's nav bar paints; waiting here fails fast with a clear
  // error instead of surfacing inside an unrelated Background step.
  await mastersManagementLink.waitFor({ state: 'visible', timeout: config.navigationTimeoutMs });
}

export async function createBrowserContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: config.viewport,
    ignoreHTTPSErrors: false,
    recordVideo:
      config.video === 'off' ? undefined : { dir: `${config.artifactsDir}/videos`, size: config.viewport },
  });
  context.setDefaultTimeout(config.actionTimeoutMs);
  context.setDefaultNavigationTimeout(config.navigationTimeoutMs);
  return context;
}

/** Creates the one context that every scenario of the ordered run shares. */
export async function openSharedSession(browser: Browser): Promise<Page> {
  const context = await createBrowserContext(browser);
  if (config.trace !== 'off') {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
    sharedSession.tracingStarted = true;
  }
  sharedSession.context = context;
  return openSharedPage();
}

/**
 * Opens a fresh page inside the shared context.
 *
 * Playwright records one video per *page*, so a scenario only gets its own video file if it
 * owns its own page. The session (cookies / storage) lives in the context, so a new page is
 * still authenticated.
 */
export async function openSharedPage(): Promise<Page> {
  if (!sharedSession.context) {
    throw new Error('Shared session was not opened. Is SHARED_SESSION enabled and BeforeAll registered?');
  }
  if (!sharedSession.page || sharedSession.page.isClosed()) {
    sharedSession.page = await sharedSession.context.newPage();
  }
  return sharedSession.page;
}

/** Closes the scenario's page; Playwright only finalises a video file once its page is closed. */
export async function closeSharedPage(): Promise<void> {
  const page = sharedSession.page;
  sharedSession.page = undefined;
  if (page && !page.isClosed()) await page.close().catch(() => undefined);
}

export function requireSharedPage(): { context: BrowserContext; page: Page } {
  if (!sharedSession.context || !sharedSession.page) {
    throw new Error('Shared session was not opened. Is SHARED_SESSION enabled and BeforeAll registered?');
  }
  return { context: sharedSession.context, page: sharedSession.page };
}

/** Performs the Department Login flow once on the shared page. */
export async function loginSharedSession(): Promise<void> {
  if (sharedSession.authenticated) return;
  const { page } = requireSharedPage();
  const home = new MidcHomePage(page);
  const login = new DepartmentLoginPage(page);

  await home.open();
  await home.openDepartmentLogin();
  await login.expectLoaded();
  await login.login(midcTestData.credentials.username, midcTestData.credentials.password);
  if (await login.hasAuthenticationError()) {
    throw new Error('Shared session login failed: the portal reported an authentication error.');
  }
  markAuthenticated(page);
}

/** Final logout of the run; never throws so that the browser is always closed afterwards. */
export async function logoutSharedSession(): Promise<void> {
  if (!sharedSession.authenticated || !sharedSession.context) {
    markLoggedOut();
    return;
  }
  try {
    // The last scenario closed its page to finalise its video, so a page is opened for the logout.
    const page = await openSharedPage();
    await returnToLandingPage(page);
    const logoutPage = new LogoutPage(page);
    await logoutPage.logout();
    await logoutPage.expectLoggedOut();
  } catch (error) {
    console.warn(`Shared session logout failed: ${(error as Error).message}`);
  } finally {
    // Whatever happened in the UI, the stored credentials must not survive the run.
    await sharedSession.context?.clearCookies().catch(() => undefined);
    markLoggedOut();
  }
}
