#!/usr/bin/env node
/**
 * Cross-browser runner: runs the same Cucumber suite once per Playwright browser.
 *
 * Each browser gets its own report / artifact / Allure directory so that runs executing at the
 * same time never overwrite each other's output:
 *
 *   reports/<browser>/html/index.html        Cucumber HTML report
 *   reports/<browser>/cucumber-report.json   Cucumber JSON
 *   reports/<browser>/artifacts/             screenshots / videos / traces
 *   allure-results/<browser>/                Allure raw results
 *
 * Usage:
 *   node scripts/run-browsers.js                          all three, in parallel
 *   node scripts/run-browsers.js chromium                 one browser
 *   node scripts/run-browsers.js --serial firefox webkit  one after the other
 *   node scripts/run-browsers.js chromium -- --tags @smoke extra cucumber-js arguments
 *
 * Exit code is 0 only when every browser run passed, so CI fails on any failing browser.
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const SUPPORTED = ['chromium', 'firefox', 'webkit'];
const root = path.resolve(__dirname, '..');
// Spawned with this Node binary rather than through `npx`, so no shell is involved and the
// arguments cannot be re-interpreted by cmd.exe. The bin is addressed by path because the
// package's "exports" map does not expose it to require.resolve.
const cucumberBin = path.join(root, 'node_modules', '@cucumber', 'cucumber', 'bin', 'cucumber.js');
if (!fs.existsSync(cucumberBin)) {
  console.error(`cucumber-js was not found at ${cucumberBin}. Run "npm install" first.`);
  process.exit(1);
}

const argv = process.argv.slice(2);
const separator = argv.indexOf('--');
const ownArgs = separator === -1 ? argv : argv.slice(0, separator);
const cucumberArgs = separator === -1 ? [] : argv.slice(separator + 1);

const serial = ownArgs.includes('--serial');
const requested = ownArgs.filter((arg) => !arg.startsWith('-'));
const browsers = requested.length > 0 ? requested : SUPPORTED;

const unsupported = browsers.filter((name) => !SUPPORTED.includes(name));
if (unsupported.length > 0) {
  console.error(`Unsupported browser(s): ${unsupported.join(', ')}. Use ${SUPPORTED.join(', ')}.`);
  process.exit(1);
}

/** Prefixes every line so three interleaved runs stay readable. */
function pipe(stream, browser, target) {
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) target.write(`[${browser}] ${line}\n`);
  });
  stream.on('end', () => {
    if (buffer) target.write(`[${browser}] ${buffer}\n`);
  });
}

function runBrowser(browser) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cucumberBin, ...cucumberArgs], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        BROWSER: browser,
        // Progress bars redraw with carriage returns, which turns into noise once three runs
        // share one terminal; the line-oriented `progress` formatter does not.
        PROGRESS_FORMAT: 'progress',
        HTML_REPORT: `reports/${browser}/html/index.html`,
        JSON_REPORT: `reports/${browser}/cucumber-report.json`,
        JUNIT_REPORT: `reports/${browser}/junit.xml`,
        ARTIFACTS_DIR: `reports/${browser}/artifacts`,
        ALLURE_RESULTS_DIR: `allure-results/${browser}`,
      },
    });

    pipe(child.stdout, browser, process.stdout);
    pipe(child.stderr, browser, process.stderr);
    child.on('error', (error) => {
      console.error(`[${browser}] failed to start: ${error.message}`);
      resolve({ browser, status: 1 });
    });
    child.on('close', (code) => resolve({ browser, status: code ?? 1 }));
  });
}

(async () => {
  console.log(`Running ${browsers.join(', ')} ${serial ? 'one after the other' : 'in parallel'}.`);

  const results = [];
  if (serial) {
    for (const browser of browsers) results.push(await runBrowser(browser));
  } else {
    results.push(...(await Promise.all(browsers.map(runBrowser))));
  }

  console.log('\nCross-browser summary');
  for (const { browser, status } of results) {
    console.log(`  ${status === 0 ? 'PASS' : 'FAIL'}  ${browser.padEnd(8)} reports/${browser}/html/index.html`);
  }

  process.exit(results.some((result) => result.status !== 0) ? 1 : 0);
})();
