#!/usr/bin/env node
/*
 * Gas Report Aggregator
 * Runs designated gas test files and emits consolidated markdown & JSON reports.
 */
const { spawnSync } = require('node:child_process');
const { mkdirSync, writeFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const ROOT = process.cwd();
const AGG_DIR = join(ROOT, 'stable-yield-aggregator');
process.chdir(AGG_DIR);

const OUT_DIR = join(AGG_DIR, 'gas-reports');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR);

// List of mocha grep patterns or explicit test files that produce gas logs
const TARGETS = [
  'test/EnhancedRealYieldStrategy.gas.test.js'
];

function runGasTest(target) {
  console.log(`\n[gas] Running ${target}`);
  const res = spawnSync('npx', ['hardhat', 'test', target], { stdio: 'pipe', encoding: 'utf-8' });
  if (res.status !== 0) {
    console.error(res.stdout);
    console.error(res.stderr);
    throw new Error(`Gas test failed: ${target}`);
  }
  return res.stdout + '\n' + res.stderr;
}

const entries = [];
for (const t of TARGETS) {
  const out = runGasTest(t);
  // Parse lines like: "Operation........ |  123456 gas | description"
  const regex = /^(.+?)\s+\|\s+(\d+) gas \| (.*)$/gm;
  let match;
  while ((match = regex.exec(out)) !== null) {
    entries.push({ operation: match[1].trim(), gas: Number(match[2]), description: match[3].trim() });
  }
}

entries.sort((a,b)=> a.gas - b.gas);

const md = [
  '# ⛽ Gas Usage Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '| Operation | Gas | Description |',
  '|-----------|-----|-------------|',
  ...entries.map(e => `| ${e.operation} | ${e.gas} | ${e.description} |`),
  '',
  '## Summary',
  '',
  `Total operations measured: ${entries.length}`,
  `Median gas: ${entries.length ? entries[Math.floor(entries.length/2)].gas : 0}`,
  ''
].join('\n');

writeFileSync(join(OUT_DIR, 'GAS-REPORT.md'), md);
writeFileSync(join(OUT_DIR, 'gas-report.json'), JSON.stringify(entries, null, 2));
console.log(`\n[gas] Report written to gas-reports/GAS-REPORT.md`);
