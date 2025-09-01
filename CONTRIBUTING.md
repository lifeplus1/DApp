# 🤝 Contributing Guide

## 🔄 Workflow Summary

1. Fork & branch from `main` using naming: `feat/<scope>-<short>`, `fix/<scope>-<issue>`, `docs/<area>-<change>`
2. Ensure: tests pass, lint passes, type-check clean.
3. Update docs if public APIs, contract addresses, or user workflows change.
4. Create PR with: summary, motivation, test evidence, docs impact checklist.
5. Await automated checks + at least one reviewer approval.

## ✅ Quality Gates

| Gate | Command | Requirement |
|------|---------|-------------|
| TypeScript | `npx tsc --noEmit` (root + frontend) | 0 errors |
| Lint | `npm run lint` (add script if missing) | 0 errors, warnings triaged |
| Tests | `npm test` | No new failures |
| Build | `npm run build` (frontend) | Successful |
| Contracts | `npx hardhat compile` | No warnings (target) |

## 🧪 Testing Standards

- Unit tests required for new strategy logic & hooks
- Integration tests for multi-contract interactions
- Edge cases: zero balances, network disconnect, failed fetch, reentrancy guarded paths
- Prefer deterministic tests (avoid real network unless integration profile)

## 📚 Documentation Requirements

| Change Type | Doc Updates |
|-------------|-------------|
| New Contract | Update `PROJECT-STATUS-CONSOLIDATED.md`, add to `CONTRACT-ADDRESSES.md` |
| Public Function Signature Change | Update strategy doc & ADR if architectural |
| New Feature (User Visible) | README + relevant guide |
| Breaking Change | Add CHANGELOG entry + migration notes |
| Phase Completion | Archive phase docs & update roadmap |

## 🏗 Architectural Decisions (ADRs)

Create ADR for: new analytics pipeline, storage pattern changes, protocol integration patterns, security model shifts. File in `docs/adr/ADR-<seq>-<slug>.md`.

Template:

```text
# ADR-000X: Title
Status: Proposed / Accepted / Superseded
Date: YYYY-MM-DD

## Context
## Decision
## Alternatives
## Consequences
## Links
```

## 🔐 Security Guidelines

- Use OpenZeppelin audited contracts only
- No inline assembly unless ADR-approved
- Validate external inputs, cap loop iterations
- Reentrancy: checks-effects-interactions + modifiers
- Emit events for state mutations

## 🌐 Frontend Guidelines

- Strict mode compliant, no `any`
- Hooks: stable deps arrays, memoize expensive selectors
- Error boundaries wrap all route-level components
- Responsive: follow design tokens / breakpoints defined in `ResponsiveUtils`

## 📦 Dependency Policy

- Prefer minimal additions; justify with benefit vs maintenance
- Pin versions (caret only for dev tooling where safe)
- Security updates prioritized (weekly scan)

## 🧾 Commit Message Conventions

Format (Conventional Commits superset):

```
<type>(<scope>): <short description>

<body>

<footer>
```

Types: feat, fix, docs, chore, refactor, perf, test, build, ci, revert.

## 🗂 Branch Protection Recommendations

- Require status checks: build, test, lint
- Require linear history (optional squash)
- At least one approval (two for security-sensitive changes)

## 🛠 Tooling Enhancements (Planned)

- Pre-commit hooks: lint + type-check on staged files
- Docs linter: broken links, stale dates
- Contract size & gas diff reporter in CI

## 🙋 Getting Help

Open a GitHub Discussion or tag maintainers in PR. Provide: reproduction steps, expected vs actual behavior, environment details.

---

Last updated: 2025-09-01
