#!/usr/bin/env node
/*
 * Invariant Summary Generator
 * Scans invariant test file for `it(` declarations and produces a markdown checklist.
 */
const { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } = require('node:fs');
const { join } = require('node:path');

const ROOT = process.cwd();
const TEST_DIR = join(ROOT, 'stable-yield-aggregator/test');
const OUT_DIR = join(ROOT, 'stable-yield-aggregator/invariant-reports');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR);

// Pattern: any file ending with .invariants.test.js
const files = readdirSync(TEST_DIR).filter(f => /\.invariants\.test\.js$/.test(f));
if (!files.length) {
  console.warn('[invariants] No invariant test files found (*.invariants.test.js).');
  process.exit(0);
}

const testRegex = /it\("([^"]+)"/g;
const all = [];
for (const file of files) {
  const src = readFileSync(join(TEST_DIR, file), 'utf-8');
  let m;
  while ((m = testRegex.exec(src)) !== null) {
    all.push({ file, name: m[1] });
  }
}

// Group by file
const byFile = all.reduce((acc, t) => {
  acc[t.file] = acc[t.file] || [];
  acc[t.file].push(t.name);
  return acc;
}, {});

const mdSections = Object.entries(byFile).map(([file, tests]) => {
  return [
    `### ${file}`,
    '',
    ...tests.map(t => `- [ ] ${t}`),
    ''
  ].join('\n');
});

const md = [
  '# 🔐 Invariant Test Coverage',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Files',
  '',
  ...Object.keys(byFile).map(f => `- ${f} (${byFile[f].length})`),
  '',
  '## Details',
  '',
  ...mdSections,
  `Total invariant checks: ${all.length}`,
  ''
].join('\n');

writeFileSync(join(OUT_DIR, 'INVARIANTS-COVERAGE.md'), md);
writeFileSync(join(OUT_DIR, 'invariants-summary.json'), JSON.stringify({ generated: new Date().toISOString(), total: all.length, files: byFile }, null, 2));
console.log(`[invariants] Summary generated with ${all.length} entries across ${Object.keys(byFile).length} file(s).`);
