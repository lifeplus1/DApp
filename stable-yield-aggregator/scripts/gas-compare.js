#!/usr/bin/env node
/*
 * Gas Comparison Script
 * Compares newly generated gas-report.json with baseline and fails on regressions.
 */
const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const BASE_DIR = join(process.cwd(), 'stable-yield-aggregator');
const REPORT_DIR = join(BASE_DIR, 'gas-reports');
const BASELINE = join(REPORT_DIR, 'gas-baseline.json');
const CURRENT = join(REPORT_DIR, 'gas-report.json');
const THRESHOLDS_FILE = join(BASE_DIR, 'gas-thresholds.json');

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

// Optional per-operation thresholds config
// Format: [ { "match": "^Deposit", "allowedIncreasePct": 5, "maxGas": 200000 } ]
let opThresholds = [];
if (existsSync(THRESHOLDS_FILE)) {
  try {
    opThresholds = JSON.parse(readFileSync(THRESHOLDS_FILE, 'utf-8'));
  } catch (e) {
    console.warn('[gas-check] Failed to parse gas-thresholds.json:', e.message);
  }
}

function resolveAllowed(opName, globalAllowed) {
  for (const rule of opThresholds) {
    if (!rule.match) continue;
    try {
      const rx = new RegExp(rule.match);
      if (rx.test(opName)) {
        return { allowedIncreasePct: rule.allowedIncreasePct ?? globalAllowed, maxGas: rule.maxGas };
      }
    } catch (e) {
      console.warn('[gas-check] Invalid regex in thresholds file:', rule.match, e.message);
    }
  }
  return { allowedIncreasePct: globalAllowed };
}

// Map by operation
const baseMap = new Map(baseline.map(e => [e.operation, e]));
const curMap = new Map(current.map(e => [e.operation, e]));

const globalAllowedIncreasePct = parseFloat(process.env.GAS_ALLOWED_INCREASE_PCT || '5');
const failures = [];

for (const [op, curEntry] of curMap.entries()) {
  if (!baseMap.has(op)) continue; // new operation: treat as baseline candidate (could enforce policy later)
  const baseEntry = baseMap.get(op);
  const { allowedIncreasePct, maxGas } = resolveAllowed(op, globalAllowedIncreasePct);
  if (typeof maxGas === 'number' && curEntry.gas > maxGas) {
    failures.push({ operation: op, baseline: baseEntry.gas, current: curEntry.gas, pct: 'N/A', reason: `exceeds maxGas ${maxGas}` });
    continue;
  }
  if (curEntry.gas > baseEntry.gas) {
    const pct = ((curEntry.gas - baseEntry.gas) / baseEntry.gas) * 100;
    if (pct > allowedIncreasePct) {
      failures.push({ operation: op, baseline: baseEntry.gas, current: curEntry.gas, pct: +pct.toFixed(2), allowed: allowedIncreasePct });
    }
  }
}

if (failures.length) {
  console.error('\n[gas-check] Gas regressions detected:');
  failures.forEach(f => {
    if (f.reason) {
      console.error(`  ${f.operation}: ${f.baseline} -> ${f.current} (${f.reason})`);
    } else {
      console.error(`  ${f.operation}: ${f.baseline} -> ${f.current} (+${f.pct}%, allowed ${f.allowed}%)`);
    }
  });
  console.error(`Global allowed increase: ${globalAllowedIncreasePct}% (override with GAS_ALLOWED_INCREASE_PCT env var).`);
  if (opThresholds.length) console.error('Per-operation thresholds applied from gas-thresholds.json.');
  process.exit(2);
}

// Update baseline opportunistically if improvements > 2% (optional tightening)
const improved = [];
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
if (opThresholds.length) {
  console.log('[gas-check] Per-operation thresholds file detected (gas-thresholds.json).');
}
