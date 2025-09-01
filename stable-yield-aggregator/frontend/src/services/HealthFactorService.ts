import { ethers } from 'ethers';
import { AAVE_V3_UI_DATA_PROVIDER } from '../config/aave';

export interface HealthFactorSample {
  timestamp: number;
  healthFactor: number; // normalized (e.g., 1.00 = 1x)
  status?: 'healthy' | 'warning' | 'critical';
}

const UI_DATA_PROVIDER_ABI = [
  // Minimal fragment for getUserAccountData(pool,address)
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase,uint256 totalDebtBase,uint256 availableBorrowsBase,uint256 currentLiquidationThreshold,uint256 ltv,uint256 healthFactor)'
];

export class HealthFactorService {
  private pollingMs: number;
  private listeners: Array<(s: HealthFactorSample) => void> = [];
  private timer: NodeJS.Timeout | undefined;
  private provider: ethers.Provider;
  private user: string;
  private uiDataProvider?: ethers.Contract;
  private buffer: HealthFactorSample[] = [];
  private maxSamples: number;
  private warnThreshold: number;
  private criticalThreshold: number;
  private lastStatus?: 'healthy' | 'warning' | 'critical';
  private statusListeners: Array<(s: HealthFactorSample) => void> = [];

  constructor(provider: ethers.Provider, userAddress: string, pollingMs: number = 30000, options?: {
    maxSamples?: number;
    warnThreshold?: number; // e.g. 1.6
    criticalThreshold?: number; // e.g. 1.5
  }) {
    this.provider = provider;
    this.user = userAddress;
    this.pollingMs = pollingMs;
    this.maxSamples = options?.maxSamples ?? 2880; // 24h @30s = 2880, adjustable
    this.warnThreshold = options?.warnThreshold ?? 1.6;
    this.criticalThreshold = options?.criticalThreshold ?? 1.5;
  }

  onSample(cb: (s: HealthFactorSample) => void) {
    this.listeners.push(cb);
  }

  onStatusChange(cb: (s: HealthFactorSample) => void) {
    this.statusListeners.push(cb);
  }

  getSamples(): HealthFactorSample[] { return this.buffer; }

  private classify(hf: number): 'healthy' | 'warning' | 'critical' {
    if (hf <= this.criticalThreshold) return 'critical';
    if (hf <= this.warnThreshold) return 'warning';
    return 'healthy';
  }

  start() {
    if (this.timer) return;
    const poll = async () => {
      try {
        if (!this.uiDataProvider) {
          const network = await this.provider.getNetwork();
            const addr = AAVE_V3_UI_DATA_PROVIDER[Number(network.chainId)];
            if (addr && addr !== '0x0000000000000000000000000000000000000000') {
              this.uiDataProvider = new ethers.Contract(addr, UI_DATA_PROVIDER_ABI, this.provider);
            }
        }
        let hf = 0;
        if (this.uiDataProvider) {
          const result = await this.uiDataProvider.getUserAccountData?.(this.user);
          // healthFactor returned with 18 decimals
          if (result && result.healthFactor) {
            hf = Number(ethers.formatUnits(result.healthFactor, 18));
          }
        } else {
          // fallback simulation if provider unknown
          const base = 1.8;
          const variance = (Math.sin(Date.now() / 600000) * 0.05);
          hf = base + variance;
        }
        const status = this.classify(hf);
        const sample: HealthFactorSample = { timestamp: Date.now(), healthFactor: Number(hf.toFixed(3)), status };
        this.buffer.push(sample);
        if (this.buffer.length > this.maxSamples) this.buffer.shift();
        this.listeners.forEach(l => l(sample));
        if (status !== this.lastStatus) {
          this.lastStatus = status;
          this.statusListeners.forEach(l => l(sample));
        }
      } catch (_e) {
        // swallow for now; could emit error callback / metric increment
      }
    };
    poll();
    this.timer = setInterval(poll, this.pollingMs);
  }

  stop() {
    if (this.timer) {
  clearInterval(this.timer);
  this.timer = undefined;
    }
  }
}
