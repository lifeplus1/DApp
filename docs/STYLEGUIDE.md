# Documentation & Writing Style Guide

## Purpose

Consistent, concise, auditable documentation for Phase 6 launch readiness.

## Scope

Applies to all Markdown in root and `docs/` plus contract NatSpec summaries.

## Headings

- Single H1 per file.
- Blank line before and after every heading.
- Use Title Case for H1/H2, sentence case for lower levels.

## Timestamps

- Use `Last updated: YYYY-MM-DD` (UTC) near footer (before final newline).
- Automation: `./docs-automation.sh timestamps` refreshes known files.

## Tables

- Always leading & trailing pipes.
- Header separator aligns with number of columns.

## Lists

- Blank line before list unless first after a heading paragraph.
- Use `-` dash for unordered; use ordered lists only for strict sequences.

## Code Fences

- Provide language: `solidity`, `typescript`, `bash`, `text`.
- Prefer illustrative excerpts over full files; link to source if long.

## Badges / Status

- Only in README or top-level status docs.
- Phase badge must match canonical `PROJECT-STATUS-CONSOLIDATED.md`.

## ADRs

Filename: `ADR-<seq>-<slug>.md` (4-digit sequence).
Sections required: Context, Decision, Alternatives, Consequences, Follow-Up, Status, Date.
Status values: Proposed | Accepted | Superseded | Rejected.

## Contract Addresses

Canonical file: `docs/current/CONTRACT-ADDRESSES.md` (auto-regenerated).
Manual edits discouraged; run `./docs-automation.sh addresses`.

## Security Docs

`SECURITY-OVERVIEW.md` contains high-level posture, threat matrix, invariants; deeper details may link to strategy-specific docs.

## Changelog

Keep reverse chronological.
Sections per release: Added / Changed / Deprecated / Removed / Fixed / Security.
Footer: `Last generated:` or `Last updated:` line only.

## Commit References

Inline with backticks (e.g., `abc1234`) when highlighting a specific change.

## Link Style

- Relative links for internal docs.
- Absolute HTTPS for external references.
- No bare URLs—always anchor text.

## Glossary Terms

Define first usage if domain-specific (e.g., “Sharpe ratio”). Optional central GLOSSARY.md future.

## Lint Enforcement

Use `markdownlint` defaults + custom rules: require trailing newline, no emphasis-as-heading, table pipe style.

CI: `docs.yml` runs link-check + timestamp refresh. Future: add markdownlint job (`npx markdownlint '**/*.md'`).

## Frontmatter

Not used (keep plain Markdown). Timestamp lives in footer.

## Glossary (Planned)

Add `docs/GLOSSARY.md` when term count > 15 recurring domain definitions.

---
Last updated: 2025-09-01
