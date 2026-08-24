#!/usr/bin/env node
'use strict';

const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EVIDENCE = path.join(ROOT, '.rc-evidence', 'visual-system-v1');
const scripts = [
  's1b_runtime.js',
  's1a_stale_review_regression.js',
  's1b_foundation.js',
  'sprint03_interested.js',
  'interested_retrieval_b.js',
  'action_destination.js',
  'action_destination_runtime.js',
  'security_accessibility_release_hardening.js',
  'a11y_responsive.js'
];

fs.mkdirSync(EVIDENCE, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  scripts: [],
  summary: { scriptsPass: 0, scriptsFail: 0, assertionsPass: 0, assertionsFail: 0 }
};

for (const script of scripts) {
  const started = Date.now();
  console.log(`\n===== ${script} =====`);
  const run = cp.spawnSync(process.execPath, [path.join(__dirname, script)], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    timeout: 180000
  });
  const output = `${run.stdout || ''}${run.stderr || ''}`;
  process.stdout.write(output);
  const passLines = (output.match(/^PASS\s+/gm) || []).length;
  const failLines = (output.match(/^FAIL\s+/gm) || []).length;
  const summaryMatch = output.match(/(\d+)\/(\d+) PASS\s*$/m);
  const assertionsPass = summaryMatch ? Number(summaryMatch[1]) : passLines;
  const assertionsTotal = summaryMatch ? Number(summaryMatch[2]) : passLines + failLines;
  const item = {
    script,
    status: run.status === 0 ? 'PASS' : 'FAIL',
    exitCode: run.status,
    signal: run.signal || null,
    durationMs: Date.now() - started,
    assertionsPass,
    assertionsFail: Math.max(0, assertionsTotal - assertionsPass),
    output
  };
  report.scripts.push(item);
  report.summary[run.status === 0 ? 'scriptsPass' : 'scriptsFail'] += 1;
  report.summary.assertionsPass += item.assertionsPass;
  report.summary.assertionsFail += item.assertionsFail;
}

const markdown = [
  '# V3 Visual System V1 — Authority Regression',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  `Scripts: ${report.summary.scriptsPass} PASS / ${report.summary.scriptsFail} FAIL`,
  `Assertions: ${report.summary.assertionsPass} PASS / ${report.summary.assertionsFail} FAIL`,
  '',
  '| Script | Result | Assertions | Duration |',
  '|---|---:|---:|---:|',
  ...report.scripts.map((item) =>
    `| ${item.script} | ${item.status} | ${item.assertionsPass} pass / ${item.assertionsFail} fail | ${(item.durationMs / 1000).toFixed(1)}s |`),
  ''
].join('\n');

fs.writeFileSync(path.join(EVIDENCE, 'authority-regression.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(EVIDENCE, 'authority-regression.md'), markdown);
console.log(`\n${report.summary.scriptsPass}/${scripts.length} suites PASS; ` +
  `${report.summary.assertionsPass} assertions PASS, ${report.summary.assertionsFail} FAIL`);
process.exitCode = report.summary.scriptsFail ? 1 : 0;
