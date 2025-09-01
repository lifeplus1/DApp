# ADR-0004: Gas Benchmarking & Regression Policy

Status: Proposed

Date: 2025-09-01

Supersedes: None

Superseded-By: None

## Context

Gas efficiency materially affects user cost and competitiveness. Current gas tests log usage but do not enforce regression thresholds automatically. Phase 6 introduces automated reporting and comparison; we need a formal policy for maintaining and tightening gas baselines.

## Decision

Introduce a structured gas policy enforced in CI:

- Canonical report: `stable-yield-aggregator/gas-reports/gas-report.json` + markdown summary
- Baseline file: `gas-baseline.json` (committed) auto-created if absent
- Threshold: Maximum allowed per-operation gas increase = 5% (override via `GAS_ALLOWED_INCREASE_PCT`)
- Automatic tightening: >2% improvement updates baseline to lock gains
- Scope: Core operations (deposit, withdraw, harvest, strategy view functions, simulation totals)
- Failure Action: CI job fails on regression; developer must justify or optimize

## Alternatives Considered

1. Manual review only (rejected: error-prone, inconsistent)
1. Absolute hard limits per function (rejected initially: rigidity, needs empirical tuning)
1. Historical rolling average (deferred: added complexity without clear benefit yet)

## Rationale

Percent-based threshold scales with complexity while encouraging sustained optimization. Automatic tightening prevents silent regressions later.

## Consequences

Positive: Early detection of gas bloat, measurable optimization culture.  
Negative: Occasional friction when legitimate feature growth increases gas (requires baseline update).  
Risk: Over-tightening if transient variance misinterpreted (mitigate by explicit baseline commit review).

## Implementation Sketch

- Script `gas-report.js` (existing) generates JSON & MD
- Script `gas-compare.js` enforces thresholds and updates improvements
- CI sequence: generate report -> compare -> fail on regressions
- Developer workflow: After intentional acceptable increase, manually adjust baseline by re-running & committing updated file with rationale in PR description

## Future Enhancements

- Add per-operation custom thresholds (e.g. stricter on `deposit`)
- Integrate gas diff summary comment via GitHub Action
- Add cost projection (USD) using oracle feed

## Follow-ups

- ADR-0005 (potential): Fee Model Optimization & Distribution Strategy

Last updated: 2025-09-01
