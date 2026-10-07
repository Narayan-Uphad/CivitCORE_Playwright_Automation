#!/usr/bin/env node
/** Opens the Cucumber HTML report in the default browser. */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const configured = process.env.HTML_REPORT ?? 'reports/html/index.html';
// Falls back to the previous single-file location so an already-generated report still opens.
const candidates = [configured, 'reports/cucumber-report.html'].map((file) => path.resolve(root, file));
const reportPath = candidates.find((file) => fs.existsSync(file));

if (!reportPath) {
  console.error(`Report not found: ${candidates[0]}\nRun "npm test" or "npm run test:report" first.`);
  process.exit(1);
}

const [command, args] =
  process.platform === 'win32'
    ? ['cmd', ['/c', 'start', '', reportPath]]
    : process.platform === 'darwin'
      ? ['open', [reportPath]]
      : ['xdg-open', [reportPath]];

spawn(command, args, { detached: true, stdio: 'ignore' }).unref();
