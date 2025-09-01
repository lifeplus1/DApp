#!/usr/bin/env node
/*
 * Gas Comparison Script
 * Compares newly generated gas-report.json with baseline and fails on regressions.
 */
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const BASE_DIR = join(process.cwd(), 'stable-yield-aggregator');
const REPORT_DIR = join(BASE_DIR, 'gas-reports');
const BASELINE = join(REPORT_DIR, 'gas-baseline.json');
const CURRENT = join(REPORT_DIR, 'gas-report.json');

if (!existsSync(CURRENT)) {
  console.error('[gas-check] Current gas report not found. Run gas:report first.');
  process.exit(1);
}

if (!existsSync(BASELINE)) {
  console.log('[gas-check] Baseline missing. Creating baseline from current report.');
  const cur = readFileSync(CURRENT, 'utf-8');
  writeFileSync(BASELINE, cur);
  console.log('[gas-check] Baseline established.');
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf-8'));
const current = JSON.parse(readFileSync(CURRENT, 'utf-8'));

// Map by operation
const baseMap = new Map(baseline.map(e => [e.operation, e]));
const curMap = new Map(current.map(e => [e.operation, e]));

const allowedIncreasePct = parseFloat(process.env.GAS_ALLOWED_INCREASE_PCT || '5');
let failures = [];

for (const [op, curEntry] of curMap.entries()) {
  if (baseMap.has(op)) {
    const baseEntry = baseMap.get(op);
    if (curEntry.gas > baseEntry.gas) {
      const pct = ((curEntry.gas - baseEntry.gas) / baseEntry.gas) * 100;
      if (pct > allowedIncreasePct) {
        failures.push({ operation: op, baseline: baseEntry.gas, current: curEntry.gas, pct: +pct.toFixed(2) });
      }
    }
  }
}

if (failures.length) {
  console.error('\n[gas-check] Gas regressions detected:');
  failures.forEach(f => console.error(`  ${f.operation}: ${f.baseline} -> ${f.current} (+${f.pct}%)`));
  console.error(`Allowed increase: ${allowedIncreasePct}% (override with GAS_ALLOWED_INCREASE_PCT env var).`);
  process.exit(2);
}

// Update baseline opportunistically if improvements > 2% (optional tightening)
let improved = [];
for (const [op, curEntry] of curMap.entries()) {
  if (baseMap.has(op)) {
    const baseEntry = baseMap.get(op);
    if (curEntry.gas < baseEntry.gas) {
      const pct = ((baseEntry.gas - curEntry.gas) / baseEntry.gas) * 100;
      if (pct > 2) {
        improved.push(op);
        baseEntry.gas = curEntry.gas;
      }
    }
  }
}
if (improved.length) {
  writeFileSync(BASELINE, JSON.stringify([...baseMap.values()], null, 2));
  console.log(`[gas-check] Baseline tightened for: ${improved.join(', ')}`);
}

console.log('[gas-check] No gas regressions.');
