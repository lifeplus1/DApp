Gas Baselines
=============

This directory stores versioned historical gas benchmark baseline JSON files.

Conventions:

- Latest canonical baseline: benchmark-baseline.json (mirrors artifact)
- Historical snapshots: YYYYMMDD-HHMM-baseline.json
- Added/updated only on main branch after successful benchmark run.

Governance:

- Regressions >5% fail PR until justified and threshold updated via ADR.
- Snapshots enable longitudinal cost trend analysis.

Automation hook (future): CI job can commit updated baseline & append dated snapshot.
