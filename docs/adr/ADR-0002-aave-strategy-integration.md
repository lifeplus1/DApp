# ADR-0002: Aave Strategy Integration Architecture

Status: Proposed

Date: 2025-09-01

Supersedes: None

Superseded-By: None

## Context

Phase 6 requires integrating an Aave-based lending strategy to complement existing Uniswap / Curve / Compound positions. Goals: stable lending yield, collateral efficiency, composability with PortfolioManager, and audit readiness. Constraints: gas efficiency, isolation of protocol risk, consistent APY calculation semantics, emergency withdrawal capability, minimal re-deployment churn.

## Decision

Adopt a dedicated `AaveStrategy` contract wrapping Aave V3 pool interactions with:

- Pull-based deposits from `PortfolioManager` (single asset USDC)
- Internal accounting based on aToken balance (principal + yield)
- Harvest mechanism claiming incentives (if enabled) and converting to underlying
- APY retrieval using on-chain liquidity rate (scaled) normalized to platform basis points
- Emergency functions: pause & force withdraw to PortfolioManager

## Alternatives Considered

1. Direct integration inside `PortfolioManager` (rejected: violates SRP, harder audits)
1. Adapter pattern via generic `LendingAdapter` (deferred: premature abstraction until second lending protocol)
1. Off-chain APY oracle (rejected: increased trust surface, latency, failure modes)

## Rationale

Separate strategy keeps upgrade and audit blast radius small and aligns with existing modular strategies. Native on-chain APY is deterministic and minimal gas overhead. Incentive harvesting isolated for clear gas benchmarking.

## Consequences

Positive: modularity, easier audits, test isolation, consistent interface.  
Negative: additional contract to deploy & maintain; duplicate safety logic across strategies.  
Risk: Aave parameter changes require monitoring; incentive token price volatility affects realized APY.

## Implementation Sketch

- Functions: `deposit`, `withdraw`, `totalAssets`, `getAPY`, `harvest`, `isActive`
- Use Aave pool `supply`/`withdraw` with reentrancy guard
- Track performance fee & incentive claiming

## Testing & Invariants

- Invariants: `totalAssets >= totalDeposits`, monotonic yield, withdrawal proportionality
- Gas benchmarks: deposit, withdraw, harvest, APY view

## Migration / Rollout

1. Deploy AaveStrategy
1. Register in PortfolioManager with target allocation
1. Progressive funding & monitoring

## Follow-ups

- ADR-0003: Invariant Testing Framework Consolidation
- ADR-0004: Gas Benchmarking & Regression Policy

Last updated: 2025-09-01
