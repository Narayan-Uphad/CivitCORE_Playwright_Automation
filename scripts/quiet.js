#!/usr/bin/env node
/**
 * quiet.js - run any command, show only the result.
 *
 * Usage:  node scripts/quiet.js <command> [args...]
 *         npm run quiet -- npm ci
 *         npm run quiet -- npm run typecheck
 *
 * Prints: PASS/FAIL + exit code + duration, the error lines (capped), and the
 * installed/declared package version. Full output goes to reports/quiet/<ts>.log
 * so nothing is lost. Exit code is passed through, so it is safe in CI.
 *
 * Same idea as a filter hook that greps test output for FAIL/ERROR lines and
 * truncates the rest: keep the signal, drop the noise.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_ERROR_LINES = Number(process.env.QUIET_MAX_LINES || 30);
const ERROR_RE = /\b(error|err!|fail(ed|ure)?|fatal|exception|cannot find|not found|missing|ELIFECYCLE|TS\d{4})\b/i;
// Strip ANSI colour codes before matching.
const ANSI_RE = /\u001b\[[0-9;]*[A-Za-z]/g;

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('Usage: node scripts/quiet.js <command> [args...]');
  process.exit(2);
}

function packageVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    return `${pkg.name}@${pkg.version}`;
  } catch {
    return 'n/a (no readable package.json)';
  }
}

const logDir = path.join(process.cwd(), 'reports', 'quiet');
fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, `${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
const log = fs.createWriteStream(logFile);
const lines = [];
const started = Date.now();

// shell:true so npm/npx (.cmd shims) resolve on Windows. Args are the user's own CLI input.
const child = spawn([cmd, ...args].join(' '), { shell: true, env: process.env });
let buf = '';
const onData = (chunk) => {
  log.write(chunk);
  buf += chunk.toString();
  const parts = buf.split(/\r?\n/);
  buf = parts.pop();
  lines.push(...parts.map((l) => l.replace(ANSI_RE, '')));
};
child.stdout.on('data', onData);
child.stderr.on('data', onData);

child.on('error', (err) => {
  console.error(`FAIL  could not start "${cmd}": ${err.message}`);
  process.exit(127);
});

child.on('close', (code) => {
  if (buf) lines.push(buf.replace(ANSI_RE, ''));
  log.end();

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const ok = code === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  exit=${code}  ${secs}s  ${[cmd, ...args].join(' ')}`);

  const errors = lines.filter((l) => ERROR_RE.test(l));
  if (errors.length) {
    const shown = ok ? [] : errors.slice(0, MAX_ERROR_LINES);
    if (shown.length) {
      console.log(`Errors (${shown.length} of ${errors.length}):`);
      shown.forEach((l) => console.log(`  ${l.trim()}`));
    } else {
      console.log(`Warnings matched: ${errors.length} (see log)`);
    }
  }
  console.log(`Package: ${packageVersion()}`);
  console.log(`Full log: ${path.relative(process.cwd(), logFile)}`);
  process.exit(code === null ? 1 : code);
});
