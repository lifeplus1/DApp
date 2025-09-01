#!/usr/bin/env node
/**
 * Enhanced Fee / Yield analytics aggregator.
 * CLI flags:
 *  --controller <address>
 *  --from <blockNumber>
 *  --to <blockNumber>
 *  --strategies <addr1,addr2,...> (optional, auto-detect events if omitted)
 *  --out <filename.json>
 * Usage example:
 *  npx hardhat run scripts/fees-analytics.js --network localhost --controller 0x... --strategies 0xA,.. --from 100 --to 200
 */
const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const feeControllerAddress = (args.controller || process.env.FEE_CONTROLLER || '').toLowerCase();
  if (!feeControllerAddress) {
    console.error('Missing --controller or FEE_CONTROLLER env');
    process.exit(1);
  }

  const provider = ethers.provider;
  const latest = await provider.getBlockNumber();
  const fromBlock = args.from ? Number(args.from) : Math.max(0, latest - 100_000);
  const toBlock = args.to ? Number(args.to) : latest;

  // Event ABIs
  const feeIface = new ethers.Interface([
    'event FeesAccrued(address indexed strategy,address indexed token,uint256 amount)',
    'event FeesWithdrawn(address indexed recipient,address indexed token,uint256 amount)',
    'event FeesWithdrawnPerStrategy(address indexed strategy,address indexed token,uint256 amount)'
  ]);
  const _aaveIface = new ethers.Interface([
    'event PerformanceFeeCollected(uint256 feeAmount,uint256 timestamp)'
  ]);
  const _curveIface = new ethers.Interface([
    'event YieldHarvested(uint256 crvAmount,uint256 timestamp)'
  ]);

  // Pull logs for controller first
  const feeLogs = await provider.getLogs({ address: feeControllerAddress, fromBlock, toBlock });

  const summary = {
    meta: { controller: feeControllerAddress, from: fromBlock, to: toBlock, generatedAt: new Date().toISOString() },
    accrued: {},
    withdrawnTotal: {},
    perStrategy: {},
    yield: { totalFeeEvents: 0n, totalStrategyFeeEmissions: 0n },
    ratios: { globalFeeToYieldPct: null },
    distributions: { count: 0 }
  };

  for (const l of feeLogs) {
    try {
      const parsed = feeIface.parseLog(l);
      if (parsed.name === 'FeesAccrued') {
        const [strategy, token, amount] = parsed.args;
        const tokenKey = token.toLowerCase();
        summary.accrued[tokenKey] = (summary.accrued[tokenKey] || 0n) + amount;
        (summary.perStrategy[strategy] ||= {});
        summary.perStrategy[strategy][tokenKey] = (summary.perStrategy[strategy][tokenKey] || 0n) + amount;
        summary.yield.totalFeeEvents += 1n;
      } else if (parsed.name === 'FeesWithdrawn') {
        const [, token, amount] = parsed.args;
        const tokenKey = token.toLowerCase();
        summary.withdrawnTotal[tokenKey] = (summary.withdrawnTotal[tokenKey] || 0n) + amount;
      }
    } catch (_) { /* skip */ }
  }

  // Strategy addresses (optional) for yield ratio estimation using their fee events
  let strategyAddresses = [];
  if (args.strategies) {
    strategyAddresses = args.strategies.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  } else {
    // derive from perStrategy keys
    strategyAddresses = Object.keys(summary.perStrategy);
  }

  // Attempt to infer performance fee bps (assume 10% default if not found). We'll sum fee amounts and approximate gross yield.
  // For each strategy: grossYield ≈ feeAccrued * (1e4 / feeBps).
  let aggregateGrossYield = 0n;
  let aggregateFees = 0n;
  const assumedFeeBps = BigInt(process.env.ASSUMED_FEE_BPS || '1000');
  for (const strat of strategyAddresses) {
    const tokenMap = summary.perStrategy[strat];
    if (!tokenMap) continue;
    for (const tokenKey of Object.keys(tokenMap)) {
      const fees = tokenMap[tokenKey];
      aggregateFees += fees;
      // approximate gross
      const gross = fees * 10000n / (assumedFeeBps === 0n ? 1n : assumedFeeBps);
      aggregateGrossYield += gross;
    }
  }
  if (aggregateGrossYield > 0n) {
    const feePct = Number((aggregateFees * 1_000_000n) / aggregateGrossYield) / 10_000; // percentage with 4 decimals
    summary.ratios.globalFeeToYieldPct = feePct; // e.g. 10.0
  }

  const outFile = args.out || 'fee-analytics-summary.json';
  const outPath = path.join(process.cwd(), outFile);
  const replacer = (_, v) => typeof v === 'bigint' ? v.toString() : v;
  fs.writeFileSync(outPath, JSON.stringify(summary, replacer, 2));
  console.log('Analytics written to', outPath);
}

main().catch(e => { console.error(e); process.exit(1); });
