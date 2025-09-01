#!/usr/bin/env node
/**
 * Runs fees-benchmark.js twice (pre & post change simulation) is outside of scope here;
 * Instead this script ingests two JSON objects (baseline & current) and reports regressions.
 * Expected input files passed via --baseline file1.json --current file2.json where each contains { label: gasUsed } pairs.
 */
const fs = require('fs');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i+1] && !argv[i+1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

function load(file) {
  return JSON.parse(fs.readFileSync(file,'utf8'));
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.baseline || !args.current) {
    console.error('Usage: node scripts/fees-benchmark-compare.js --baseline baseline.json --current current.json');
    process.exit(1);
  }
  const baseline = load(args.baseline);
  const current = load(args.current);
  const allowedPct = Number(args.threshold || '5'); // default 5%
  const report = [];
  let regressions = 0;
  for (const k of Object.keys(current)) {
    if (typeof current[k] !== 'number') continue;
    const base = baseline[k];
    if (typeof base !== 'number') continue;
    const diff = current[k] - base;
    const pct = base === 0 ? 0 : (diff / base) * 100;
    const status = pct > allowedPct ? 'REGRESSION' : 'OK';
    if (status === 'REGRESSION') regressions++;
    report.push({ label: k, base, current: current[k], diff, pct: Number(pct.toFixed(2)), status });
  }
  const out = { allowedPct, regressions, report };
  console.log(JSON.stringify(out, null, 2));
  if (regressions > 0) process.exit(2);
}

main();