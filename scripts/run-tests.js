#!/usr/bin/env node
/**
 * One-shot runner: clean previous reports -> run every scenario -> build the Allure HTML report.
 *
 * The Allure report is generated even when scenarios fail (that is the whole point of a report),
 * and the process still exits with Cucumber's exit code so CI fails on a failing suite.
 *
 * Usage: npm run test:report -- [any cucumber-js arguments]
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const allureResultsDir = process.env.ALLURE_RESULTS_DIR ?? 'allure-results';
const allureReportDir = process.env.ALLURE_REPORT_DIR ?? 'allure-report';
const cucumberArgs = process.argv.slice(2);

function run(command, args, label) {
  process.stdout.write(`\n> ${label}\n`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: true });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

for (const dir of ['reports', allureResultsDir, allureReportDir]) {
  fs.rmSync(path.join(root, dir), { recursive: true, force: true });
}

const cucumberStatus = run('npx', ['cucumber-js', ...cucumberArgs], 'cucumber-js');

const resultsPath = path.join(root, allureResultsDir);
if (!fs.existsSync(resultsPath) || fs.readdirSync(resultsPath).length === 0) {
  console.error(`\nNo Allure results were written to "${allureResultsDir}". Skipping report generation.`);
  process.exit(cucumberStatus);
}

const allureStatus = run(
  'npx',
  ['allure', 'generate', allureResultsDir, '--clean', '-o', allureReportDir],
  'allure generate',
);

console.log('\nReports');
console.log(`  HTML   : ${process.env.HTML_REPORT ?? 'reports/html/index.html'}  (open with: npm run report:open)`);
console.log(`  JSON   : ${path.join('reports', 'cucumber-report.json')}`);
console.log(`  Allure : ${path.join(allureReportDir, 'index.html')}  (open with: npm run allure:open)`);

process.exit(cucumberStatus !== 0 ? cucumberStatus : allureStatus);
