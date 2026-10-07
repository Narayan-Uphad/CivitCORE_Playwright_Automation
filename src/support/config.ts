/**
 * Central runtime configuration. Every value comes from environment variables
 * (loaded from `.env` via dotenv) so that no URL override, secret or timeout is
 * hard-coded in step definitions or page objects.
 */
import * as dotenv from 'dotenv';

dotenv.config({ quiet: true } as dotenv.DotenvConfigOptions);

type BrowserName = 'chromium' | 'firefox' | 'webkit';

function readString(name: string, fallback = ''): string {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? fallback : value.trim();
}

function readNumber(name: string, fallback: number): number {
  const raw = readString(name);
  if (raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Environment variable ${name} must be a non-negative number, received "${raw}".`);
  }
  return parsed;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = readString(name).toLowerCase();
  if (raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw);
}

function readBrowser(): BrowserName {
  const raw = readString('BROWSER', 'chromium').toLowerCase();
  if (raw === 'chromium' || raw === 'firefox' || raw === 'webkit') return raw;
  throw new Error(`Unsupported BROWSER "${raw}". Use chromium, firefox or webkit.`);
}

type ArtifactMode = 'off' | 'on' | 'retain-on-failure';

function readArtifactMode(name: string, fallback: ArtifactMode): ArtifactMode {
  const raw = readString(name, fallback).toLowerCase();
  if (raw === 'off' || raw === 'on' || raw === 'retain-on-failure') return raw;
  // Accept the boolean spellings that VIDEO/TRACE used before.
  if (['1', 'true', 'yes'].includes(raw)) return 'on';
  if (['0', 'false', 'no'].includes(raw)) return 'off';
  throw new Error(`Unsupported ${name} "${raw}". Use off, on or retain-on-failure.`);
}

const baseUrl = readString('BASE_URL', 'https://smartgovcivit.com').replace(/\/+$/, '');

export const config = {
  baseUrl,
  homeUrl: readString('MIDC_HOME_URL', `${baseUrl}/`),
  adminUrl: readString('ADMIN_URL', 'https://admin.smartgovcivit.com').replace(/\/+$/, ''),

  browser: readBrowser(),
  headless: readBoolean('HEADLESS', true),
  slowMo: readNumber('SLOW_MO_MS', 0),
  viewport: {
    width: readNumber('VIEWPORT_WIDTH', 1280),
    height: readNumber('VIEWPORT_HEIGHT', 720),
  },
  executablePath: readString('BROWSER_EXECUTABLE_PATH') || undefined,

  expectTimeoutMs: readNumber('EXPECT_TIMEOUT_MS', 5000),
  actionTimeoutMs: readNumber('ACTION_TIMEOUT_MS', 0),
  navigationTimeoutMs: readNumber('NAVIGATION_TIMEOUT_MS', 30000),
  stepTimeoutMs: readNumber('STEP_TIMEOUT_MS', 120000),
  authErrorProbeTimeoutMs: readNumber('AUTH_ERROR_PROBE_TIMEOUT_MS', 10000),

  screenshot: readArtifactMode('SCREENSHOT', readBoolean('SCREENSHOT_ON_FAILURE', true) ? 'on' : 'off'),
  trace: readArtifactMode('TRACE', 'on'),
  video: readArtifactMode('VIDEO', 'on'),
  artifactsDir: readString('ARTIFACTS_DIR', 'reports/artifacts'),
  /** Embed screenshot / video / trace files in the Cucumber HTML and Allure reports. */
  attachArtifacts: readBoolean('ATTACH_ARTIFACTS', true),

  /** One browser context + one login for the whole run (see `npm run test:sequential`). */
  sharedSession: readBoolean('SHARED_SESSION', false),

  /** Assert FRD message copy verbatim instead of the app's equivalent (see designation.data.ts). */
  strictFrdMessages: readBoolean('STRICT_FRD_MESSAGES', false),
} as const;

/**
 * Credentials are resolved lazily so that scenarios which never log in
 * (e.g. TC01 / TC02) can run without them, while any login attempt without
 * credentials fails fast with an actionable message instead of typing blanks.
 */
export function getCredentials(): { username: string; password: string } {
  const username = readString('MIDC_USERNAME');
  const password = process.env.MIDC_PASSWORD ?? '';
  if (!username || !password) {
    throw new Error(
      'Department Login credentials are not configured. Set MIDC_USERNAME and MIDC_PASSWORD ' +
        'in your .env file (see .env.example) or as CI secret environment variables.',
    );
  }
  return { username, password };
}

/**
 * Optional credentials of a view-only Designation Management user (MIDC_VIEWER_USERNAME /
 * MIDC_VIEWER_PASSWORD). Scenarios that need such a user are skipped when they are not set.
 */
export function getViewerCredentials(): { username: string; password: string } | undefined {
  const username = readString('MIDC_VIEWER_USERNAME');
  const password = process.env.MIDC_VIEWER_PASSWORD ?? '';
  return username && password ? { username, password } : undefined;
}
