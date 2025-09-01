// Aave V3 UI Data Provider & Pool Addresses with env override support
// If an env override is provided (e.g. VITE_AAVE_UI_DATA_PROVIDER_SEPOLIA) it will replace the default mapping.

interface EnvMeta {
  env?: Record<string,string | undefined> & {
    VITE_AAVE_UI_DATA_PROVIDER_SEPOLIA?: string;
    VITE_AAVE_POOL_ADDRESSES_PROVIDER_SEPOLIA?: string;
  };
}
// Narrow import.meta typing instead of using any
const meta = (import.meta as unknown as EnvMeta);
const sepoliaUiOverride = meta.env?.VITE_AAVE_UI_DATA_PROVIDER_SEPOLIA;
const sepoliaPoolOverride = meta.env?.VITE_AAVE_POOL_ADDRESSES_PROVIDER_SEPOLIA;

export const AAVE_V3_UI_DATA_PROVIDER: Record<number,string> = {
  // Mainnet (canonical)
  1: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
  // Sepolia (populate with known deployment; placeholder can be overridden by env)
  11155111: sepoliaUiOverride || '0x0000000000000000000000000000000000000000'
};

export const AAVE_V3_POOL_ADDRESSES_PROVIDER: Record<number,string> = {
  1: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
  11155111: sepoliaPoolOverride || '0x0000000000000000000000000000000000000000'
};
