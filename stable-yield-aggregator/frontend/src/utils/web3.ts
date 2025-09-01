import { BrowserProvider, ethers } from 'ethers';
import type { EthereumProvider, NetworkInfo } from '../types/ethereum';

export const SEPOLIA_NETWORK: NetworkInfo = {
  chainId: '0xaa36a7',
  chainName: 'Sepolia Test Network',
  rpcUrls: ['https://sepolia.infura.io/v3/'],
  blockExplorerUrls: ['https://sepolia.etherscan.io/']
};

export const formatTokenAmount = (amount: bigint, decimals: number = 6): string => {
  return parseFloat(ethers.formatUnits(amount, decimals)).toLocaleString();
};

export const parseTokenAmount = (amount: string, decimals: number = 6): bigint => {
  return ethers.parseUnits(amount, decimals);
};

export const truncateAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const switchToSepolia = async (ethereum: EthereumProvider): Promise<void> => {
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_NETWORK.chainId }],
    });
  } catch (switchError) {
    const error = switchError as { code: number };
    if (error.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: SEPOLIA_NETWORK.chainId,
          chainName: SEPOLIA_NETWORK.chainName,
          rpcUrls: SEPOLIA_NETWORK.rpcUrls,
          blockExplorerUrls: SEPOLIA_NETWORK.blockExplorerUrls,
          nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18
          }
        }],
      });
    } else {
      throw switchError;
    }
  }
};

export const validateNetwork = async (provider: BrowserProvider): Promise<boolean> => {
  const network = await provider.getNetwork();
  return network.chainId === 11155111n;
};

export const handleWeb3Error = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message.includes('user rejected')) {
      return 'Transaction was rejected by user';
    }
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }
    if (error.message.includes('gas')) {
      return 'Gas estimation failed - check transaction parameters';
    }
    return error.message;
  }
  return 'Unknown error occurred';
};
