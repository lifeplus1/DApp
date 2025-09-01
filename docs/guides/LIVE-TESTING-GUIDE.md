# 🚀 Live Testing Guide (Canonical)

> Canonical manual testing reference for the DeFi Yield & Analytics Platform. Last Updated: 2025-09-01

This consolidates previous duplicates. Future updates should ONLY modify this file.

## 🎯 Scope

Validated user flows for multi-strategy portfolio + live yield + advanced analytics (Phase 5.3 baseline).

## 🧭 Quick Links

- Platform Overview: `../current/PLATFORM-OVERVIEW.md`
- Status & Metrics: `../current/PROJECT-STATUS-CONSOLIDATED.md`
- Next Steps / Roadmap: `../current/NEXT-STEPS.md`

## ✅ Environment

| Component | Status | URL |
|-----------|--------|-----|
| Frontend Dev | ✅ | <http://localhost:5173> |
| Frontend Alt (analytics dev) | ✅ | <http://localhost:5174> |
| Network | Sepolia | <https://sepolia.etherscan.io> |

## 📋 Pre-Test Checklist

1. Node 18+ & dependencies installed
2. Contracts deployed or addresses loaded
3. Wallet (MetaMask) on Sepolia with test ETH
4. `.env` configured (RPC, keys)
5. Dev server running (vite)

## 🧪 Core Test Scenarios

### 1. Platform Load

Expect: No console errors, skeleton loaders visible, responsive layout works down to 360px.

### 2. Wallet Connection & Network Detection

Expect: Auto prompt if wrong network; network badge turns green; contract interactions enabled.

### 3. Deposit / Withdraw Flow

Steps: Connect → Enter amount → Deposit → Confirm → Verify updated balances.
Edge: Zero amount (blocked), insufficient balance (error message), network switch mid-process (graceful abort).

### 4. Harvest / Rebalance Operations

Expect: Pending state indicator, event-driven update, metrics refresh within 30s cycle.

### 5. Live Yield Dashboard

Check: Real APY vs cached value drift < 30s; fallback to mock flagged clearly if subgraph unreachable.

### 6. Advanced Analytics Dashboard

Metrics: Volatility, Sharpe, Drawdown, Risk Score. Confirm stable values across refresh; verify memoization (no excessive re-renders in profiler).

### 7. Error Boundary Validation

Simulate: Force network error (disconnect), corrupt data payload (mock). Expect: Friendly fallback + retry control.

### 8. Mobile Experience

Viewport set 375px. All grid components stack; charts readable; no horizontal scroll.

### 9. Performance Smoke

Profiler: Interaction commit <100ms. No memory leak after 5 min repeated refresh.

### 10. Security / Permission Edge

Attempt unauthorized function (if UI exposes). Expect rejection & clear message.

## 🧾 Logging & Observability

Log levels: info (refresh), warn (fallback), error (boundary capture). Avoid noisy console spam. Consider future integration with Sentry.

## 📈 KPIs During Testing

| KPI | Target |
|-----|--------|
| Interaction latency | <100ms |
| Refresh interval drift | <5s |
| Error boundary coverage | 100% dashboard roots |
| Mobile layout regressions | 0 |

## 🔄 Regression Matrix (Abbreviated)

| Area | Critical | High | Medium |
|------|----------|------|--------|
| Wallet Connect | ✅ |  |  |
| Deposit | ✅ |  |  |
| Withdraw | ✅ |  |  |
| Live APY Refresh | ✅ |  |  |
| Analytics Calculations | ✅ |  |  |
| Responsive Layout |  | ✅ |  |
| Error Fallbacks |  | ✅ |  |

## 🧪 Future Additions

- Automated Cypress flows
- Lighthouse performance budget enforcement
- Synthetic subgraph outage simulation script

---

Canonical guide. Modify only here.

Last updated: 2025-09-01
