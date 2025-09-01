import { useEffect, useState } from 'react';
import { HealthFactorService, HealthFactorSample } from '../services/HealthFactorService';
import { ethers } from 'ethers';

export function useHealthFactor(address: string | undefined) {
  const [samples, setSamples] = useState<HealthFactorSample[]>([]);
  const [latest, setLatest] = useState<HealthFactorSample | null>(null);
  const [status, setStatus] = useState<'healthy'|'warning'|'critical'|undefined>();

  useEffect(() => {
    if (!address) return;
    const provider = new ethers.JsonRpcProvider(process.env.VITE_RPC_URL || 'http://localhost:8545');
  interface HFEnvMeta { env?: { VITE_HEALTH_FACTOR_WARN?: string; VITE_HEALTH_FACTOR_CRITICAL?: string; }; }
  const meta = (import.meta as unknown as HFEnvMeta);
  const warn = Number(meta.env?.VITE_HEALTH_FACTOR_WARN ?? 1.6);
  const critical = Number(meta.env?.VITE_HEALTH_FACTOR_CRITICAL ?? 1.5);
    const service = new HealthFactorService(provider, address, 30000, { warnThreshold: warn, criticalThreshold: critical, maxSamples: 2880 });
    service.onSample((s) => {
      setLatest(s);
      setSamples(prev => [...prev.slice(-47), s]); // keep last 48 samples (~24h @30s)
    });
    service.onStatusChange((s) => setStatus(s.status));
    service.start();
    return () => service.stop();
  }, [address]);

  return { latest, samples, status };
}
