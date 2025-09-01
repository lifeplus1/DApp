#!/usr/bin/env node
/*
 * Invariant Summary Generator
 * Scans invariant test file for `it(` declarations and produces a markdown checklist.
 */
const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const TEST_FILE = join(process.cwd(), 'stable-yield-aggregator/test/EnhancedRealYieldStrategy.invariants.test.js');
const OUT_DIR = join(process.cwd(), 'stable-yield-aggregator/invariant-reports');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR);

const src = readFileSync(TEST_FILE, 'utf-8');
const regex = /it\("([^"]+)"/g;
const tests = [];
let m;
while ((m = regex.exec(src)) !== null) tests.push(m[1]);

const md = [
  '# 🔐 Invariant Test Coverage',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Checks',
  '',
  ...tests.map(t => `- [ ] ${t}`),
  '',
  `Total invariants: ${tests.length}`,
  ''
].join('\n');

writeFileSync(join(OUT_DIR, 'INVARIANTS-COVERAGE.md'), md);
console.log(`[invariants] Summary generated with ${tests.length} entries.`);
