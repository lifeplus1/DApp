import { ethers } from 'ethers'
import { CONTRACTS } from '../constants/contracts'

// Type-safe error handling for DeFi operations
export type DeFiError = 
  | 'insufficient_funds'
  | 'slippage_exceeded' 
  | 'network_error'
  | 'contract_error'
  | 'user_rejected'
  | 'gas_estimation_failed'

export interface DeFiOperationResult<T> {
  success: boolean
  data?: T
  error?: DeFiError
  message?: string
  txHash?: string
}

// Enhanced error handling with user-friendly messages
export const getDeFiErrorMessage = (error: DeFiError): string => {
  const errorMessages: Record<DeFiError, string> = {
    insufficient_funds: 'Insufficient balance to complete this transaction',
    slippage_exceeded: 'Price moved too much during transaction. Try increasing slippage tolerance',
    network_error: 'Network connection error. Please check your connection and try again',
    contract_error: 'Smart contract error. Transaction cannot be processed',
    user_rejected: 'Transaction was cancelled by user',
    gas_estimation_failed: 'Cannot estimate gas fees. Try again later'
  }
  return errorMessages[error]
}

// Type-safe contract interaction wrapper
export class TypeSafeContractWrapper {
  private provider: ethers.Provider
  private signer?: ethers.Signer | undefined

  constructor(provider: ethers.Provider, signer?: ethers.Signer | undefined) {
    this.provider = provider
    this.signer = signer
  }

  // Safe contract method execution with comprehensive error handling
  async safeExecute<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<DeFiOperationResult<T>> {
    try {
      console.log(`🔄 Executing ${operationName}...`)
      const result = await operation()
      console.log(`✅ ${operationName} completed successfully`)
      
      return {
        success: true,
        data: result
      }
    } catch (error: any) {
      console.error(`❌ ${operationName} failed:`, error)
      
      // Parse Web3 errors into user-friendly messages
      const deFiError = this.parseError(error)
      
      return {
        success: false,
        error: deFiError,
        message: getDeFiErrorMessage(deFiError)
      }
    }
  }

  // Enhanced error parsing for Web3 interactions
  private parseError(error: any): DeFiError {
    const errorMessage = error?.message?.toLowerCase() || ''
    const errorCode = error?.code
    
    // User rejected transaction
    if (errorCode === 4001 || errorMessage.includes('user rejected')) {
      return 'user_rejected'
    }
    
    // Insufficient funds
    if (errorMessage.includes('insufficient funds') || 
        errorMessage.includes('insufficient balance')) {
      return 'insufficient_funds'
    }
    
    // Gas estimation failed
    if (errorMessage.includes('cannot estimate gas') ||
        errorMessage.includes('gas required exceeds')) {
      return 'gas_estimation_failed'
    }
    
    // Network errors
    if (errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        errorCode === -32603) {
      return 'network_error'
    }
    
    // Contract revert or other contract errors
    if (errorMessage.includes('revert') ||
        errorMessage.includes('execution reverted')) {
      return 'contract_error'
    }
    
    // Default to contract error
    return 'contract_error'
  }

  // Type-safe BigInt handling for DeFi calculations
  safeBigIntOperation(
    operation: () => bigint,
    fallback: bigint = 0n
  ): bigint {
    try {
      return operation()
    } catch (error) {
      console.warn('BigInt operation failed, using fallback:', error)
      return fallback
    }
  }

  // Safe wei to ether conversion
  safeFormatEther(value: bigint | string): string {
    try {
      return ethers.formatEther(value)
    } catch (error) {
      console.warn('Failed to format ether:', error)
      return '0.0'
    }
  }

  // Safe ether to wei conversion
  safeParseEther(value: string): bigint {
    try {
      return ethers.parseEther(value)
    } catch (error) {
      console.warn('Failed to parse ether:', error)
      return 0n
    }
  }
}

// Typed contract factory for enhanced type safety
export const createTypeSafeContract = <T extends ethers.Contract>(
  address: string,
  abi: any[],
  provider: ethers.Provider,
  signer?: ethers.Signer
): T => {
  const contract = new ethers.Contract(
    address, 
    abi, 
    signer || provider
  ) as T
  
  return contract
}

// Enhanced yield calculation utilities with type safety
export class YieldCalculator {
  // Type-safe APY calculation
  static calculateAPY(
    principal: bigint,
    currentBalance: bigint,
    timeElapsed: number // in seconds
  ): number {
    try {
      if (principal === 0n || timeElapsed === 0) return 0
      
      const profit = currentBalance - principal
      const profitFloat = Number(ethers.formatEther(profit))
      const principalFloat = Number(ethers.formatEther(principal))
      
      const secondsInYear = 365.25 * 24 * 60 * 60
      const annualizedReturn = (profitFloat / principalFloat) * (secondsInYear / timeElapsed)
      
      return annualizedReturn * 100 // Convert to percentage
    } catch (error) {
      console.warn('APY calculation failed:', error)
      return 0
    }
  }

  // Safe yield prediction with fallback
  static predictYield(
    amount: bigint,
    apy: number,
    timeInSeconds: number
  ): bigint {
    try {
      const amountFloat = Number(ethers.formatEther(amount))
      const annualReturn = amountFloat * (apy / 100)
      const timeInYears = timeInSeconds / (365.25 * 24 * 60 * 60)
      const predictedReturn = annualReturn * timeInYears
      
      return ethers.parseEther(predictedReturn.toFixed(18))
    } catch (error) {
      console.warn('Yield prediction failed:', error)
      return 0n
    }
  }
}

// Contract deployment verification utility
export class ContractVerifier {
  private provider: ethers.Provider

  constructor(provider: ethers.Provider) {
    this.provider = provider
  }

  async verifyContract(address: string): Promise<boolean> {
    try {
      const code = await this.provider.getCode(address)
      return code !== '0x'
    } catch (error) {
      console.warn(`Contract verification failed for ${address}:`, error)
      return false
    }
  }

  async verifyAllContracts(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}
    
    for (const [name, address] of Object.entries(CONTRACTS)) {
      results[name] = await this.verifyContract(address)
    }
    
    return results
  }
}

export default TypeSafeContractWrapper
