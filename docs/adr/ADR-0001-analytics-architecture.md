# ADR-0001: Advanced Analytics Architecture

Status: Accepted  
Date: 2025-09-01

## Context

Need extensible client-side analytics without backend dependency.

## Decision

Modular client layer: service (data fetch + cache TTL 30s) + hook (metric synthesis) with memoization and strict types.

## Alternatives

1. Server API (adds infra complexity)  
1. On-chain analytics (gas & latency)  
1. Inline component calculations (performance loss)

## Consequences

Pros: Fast iteration, no backend ops.  
Cons: Client CPU usage; duplicate recalculation across sessions.  
Mitigation: Memoization + potential future edge worker.

## Follow-Up

- Benchmark heavy metrics
- Evaluate offloading historical aggregation Phase 7

## References

Phase 5.3 implementation notes.

---

Last updated: 2025-09-01
