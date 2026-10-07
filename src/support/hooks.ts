/**
 * Lifecycle hooks.
 *
 * Default mode (SHARED_SESSION off):
 *  - One browser per worker process (BeforeAll / AfterAll).
 *  - One fresh BrowserContext + Page per scenario (same isolation as Playwright Test).
 *
 * Shared-session mode (SHARED_SESSION=1, used by `npm run test:sequential`):
 *  - BeforeAll launches the browser AND logs in once; every scenario reuses that context
 *    (and therefore the login) but takes its own page, so each gets its own video file.
 *  - AfterAll logs out once and only then closes the browser.
 *
 * In both modes @fixme scenarios are skipped, mirroring `test.fixme(...)` in the original specs,
 * and screenshot / trace / video artefacts are saved under ARTIFACTS_DIR and attached to the
 * Cucumber HTML and Allure reports (see SCREENSHOT / TRACE / VIDEO).
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  After,
  AfterAll,
  Before,
  BeforeAll,
  setDefaultTimeout,
  Status,
  type ITestCaseHookParameter,
} from '@cucumber/cucumber';
import { chromium, firefox, webkit, type Browser, type Video } from '@playwright/test';
import { config } from './config';
import {
  closeSharedPage,
  loginSharedSession,
  logoutSharedSession,
  openSharedSession,
  returnToLandingPage,
  sharedSession,
} from './session';
import type { CustomWorld } from './world';

setDefaultTimeout(config.stepTimeoutMs);

let browser: Browser | undefined;

function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 120);
}

BeforeAll(async function () {
  const launcher = { chromium, firefox, webkit }[config.browser];
  browser = await launcher.launch({
    headless: config.headless,
    slowMo: config.slowMo,
    executablePath: config.executablePath,
  });

  if (config.sharedSession) {
    await openSharedSession(browser);
    await loginSharedSession();
  }
});

// Must stay the first Before hook: `test.fixme()` in Playwright means "do not run".
Before({ tags: '@fixme', name: 'Skip @fixme scenarios (test.fixme)' }, function (this: CustomWorld) {
  this.log('Skipped: scenario is marked @fixme (test.fixme in the original Playwright spec).');
  return 'skipped';
});

Before({ tags: 'not @fixme', name: 'Provide a browser page' }, async function (this: CustomWorld) {
  if (!browser) throw new Error('Browser was not launched in BeforeAll.');

  if (!config.sharedSession) {
    await this.openContext(browser);
    return;
  }

  await this.attachSharedContext();
  // A previous feature may have navigated away (e.g. into the Admin Portal).
  await returnToLandingPage(this.page);
});

function keepArtifact(mode: 'off' | 'on' | 'retain-on-failure', failed: boolean): boolean {
  return mode === 'on' || (mode === 'retain-on-failure' && failed);
}

async function captureScreenshot(world: CustomWorld, baseName: string, failed: boolean): Promise<void> {
  if (!keepArtifact(config.screenshot, failed) || !world.hasPage || world.page.isClosed()) return;
  const screenshotPath = path.join(config.artifactsDir, 'screenshots', `${baseName}.png`);
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  const screenshot = await world.page.screenshot({ fullPage: true, path: screenshotPath });
  if (config.attachArtifacts) {
    world.attach(screenshot, { mediaType: 'image/png', fileName: `${baseName}.png` });
  }
  world.log(`Screenshot saved: ${screenshotPath}`);
}

/** Saves and attaches the page video. Must run after the page (or context) has been closed. */
async function captureVideo(
  world: CustomWorld,
  video: Video | undefined,
  baseName: string,
  failed: boolean,
): Promise<void> {
  if (!video) return;
  try {
    if (keepArtifact(config.video, failed)) {
      const videoPath = path.join(config.artifactsDir, 'videos', `${baseName}.webm`);
      fs.mkdirSync(path.dirname(videoPath), { recursive: true });
      await video.saveAs(videoPath);
      if (config.attachArtifacts) {
        world.attach(fs.readFileSync(videoPath), { mediaType: 'video/webm', fileName: `${baseName}.webm` });
      }
      world.log(`Video saved: ${videoPath}`);
    }
    await video.delete().catch(() => undefined);
  } catch (error) {
    world.log(`Video collection failed: ${(error as Error).message}`);
  }
}

/**
 * `ALLURE_FIXTURE_IGNORE` is the reserved hook name that makes allure-cucumberjs attach to the
 * test result itself instead of creating a separate tear-down fixture; without it the video and
 * screenshot end up on a "Collect artefacts" fixture that the Allure test page does not show.
 */
After({ name: 'ALLURE_FIXTURE_IGNORE' }, async function (this: CustomWorld, { pickle, result }: ITestCaseHookParameter) {
  if (!this.context) return;
  const failed = result?.status === Status.FAILED;
  const baseName = `${safeFileName(pickle.name)}_${Date.now()}`;
  const video = this.hasPage && !this.page.isClosed() ? this.page.video() : undefined;

  // In shared-session mode the context (and the login) survives until AfterAll; only this
  // scenario's page is closed, which is what finalises its video file.
  if (this.usesSharedContext) {
    try {
      await captureScreenshot(this, baseName, failed);
    } catch (error) {
      this.log(`Artefact collection failed: ${(error as Error).message}`);
    }
    this.detachSharedPage();
    await closeSharedPage();
    await captureVideo(this, video, baseName, failed);
    return;
  }

  try {
    await captureScreenshot(this, baseName, failed);

    if (this.tracingStarted) {
      if (keepArtifact(config.trace, failed)) {
        const tracePath = path.join(config.artifactsDir, 'traces', `${baseName}.zip`);
        fs.mkdirSync(path.dirname(tracePath), { recursive: true });
        await this.context.tracing.stop({ path: tracePath });
        if (config.attachArtifacts && fs.existsSync(tracePath)) {
          this.attach(fs.readFileSync(tracePath), {
            mediaType: 'application/zip',
            fileName: `${baseName}-trace.zip`,
          });
        }
        this.log(`Trace saved: ${tracePath} (open with: npx playwright show-trace "${tracePath}")`);
      } else {
        await this.context.tracing.stop();
      }
    }
  } catch (error) {
    // Artefact collection must never mask the real scenario result.
    this.log(`Artefact collection failed: ${(error as Error).message}`);
  } finally {
    await this.context.close();
  }

  // The video file is only finalised once the context is closed.
  await captureVideo(this, video, baseName, failed);
});

AfterAll(async function () {
  if (config.sharedSession) {
    // Order matters: log out of the portal, save the run-wide artefacts, then close the browser.
    await logoutSharedSession();
    await saveSharedSessionArtifacts();
  }
  await browser?.close();
  browser = undefined;
});

async function saveSharedSessionArtifacts(): Promise<void> {
  const { context, tracingStarted } = sharedSession;
  if (!context) return;
  const baseName = `shared-session_${Date.now()}`;

  try {
    if (tracingStarted) {
      if (config.trace === 'off') {
        await context.tracing.stop();
      } else {
        const tracePath = path.join(config.artifactsDir, 'traces', `${baseName}.zip`);
        fs.mkdirSync(path.dirname(tracePath), { recursive: true });
        await context.tracing.stop({ path: tracePath });
        console.log(`Trace saved: ${tracePath} (open with: npx playwright show-trace "${tracePath}")`);
      }
    }
  } catch (error) {
    console.warn(`Shared session trace collection failed: ${(error as Error).message}`);
  }

  // Per-scenario videos are saved by the After hook; the logout page is the only one left here.
  await context.close().catch(() => undefined);

  sharedSession.context = undefined;
  sharedSession.page = undefined;
  sharedSession.tracingStarted = false;
}
