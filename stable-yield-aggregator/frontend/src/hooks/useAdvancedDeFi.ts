import { useState, useCallback, useRef } from 'react'
import { ethers } from 'ethers'
import { TypeSafeContractWrapper, DeFiOperationResult, DeFiError, YieldCalculator } from '../lib/contractUtils'
import { CONTRACTS, VAULT_ABI, ENHANCED_STRATEGY_ABI } from '../constants/contracts'

interface UseAdvancedDeFiProps {
  provider?: ethers.Provider
  signer?: ethers.Signer
}

interface DeFiState {
  isLoading: boolean
  error: DeFiError | null
  lastTxHash?: string
  balance: string
  totalDeposited: string
  currentYield: string
  estimatedAPY: number
}

interface YieldMetrics {
  currentAPY: number
  totalEarned: string
  dailyEarnings: string
  projectedMonthlyEarnings: string
}

export const useAdvancedDeFi = ({ provider, signer }: UseAdvancedDeFiProps) => {
  const [state, setState] = useState<DeFiState>({
    isLoading: false,
    error: null,
    balance: '0',
    totalDeposited: '0', 
    currentYield: '0',
    estimatedAPY: 0
  })

  const contractWrapperRef = useRef<TypeSafeContractWrapper>()
  
  // Initialize contract wrapper when provider/signer changes
  if (provider && !contractWrapperRef.current) {
    contractWrapperRef.current = new TypeSafeContractWrapper(provider, signer)
  }

  const updateState = useCallback((updates: Partial<DeFiState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    updateState({ isLoading: loading, error: null })
  }, [updateState])

  const setError = useCallback((error: DeFiError, message?: string) => {
    updateState({ isLoading: false, error })
    console.error(`DeFi Error: ${error} - ${message}`)
  }, [updateState])

  // Type-safe deposit function with comprehensive error handling
  const deposit = useCallback(async (amount: string): Promise<DeFiOperationResult<string>> => {
    if (!contractWrapperRef.current || !provider || !signer) {
      return { success: false, error: 'network_error', message: 'Wallet not connected' }
    }

    setLoading(true)

    const result = await contractWrapperRef.current.safeExecute(async () => {
      const vault = new ethers.Contract(CONTRACTS.vault, VAULT_ABI, signer)
      const amountWei = contractWrapperRef.current!.safeParseEther(amount)
      
      // Estimate gas first with safe method call
      const gasEstimate = await vault.deposit?.estimateGas?.(amountWei) || 100000n
      const gasLimit = gasEstimate + (gasEstimate / 10n) // Add 10% buffer
      
      const tx = await vault.deposit?.(amountWei, { gasLimit })
      if (tx) await tx.wait()
      
      return tx?.hash || 'unknown'
    }, `deposit ${amount} tokens`)

    if (result.success) {
      updateState({ 
        isLoading: false, 
        lastTxHash: result.data,
        error: null 
      })
      // Refresh balances after successful deposit
      await refreshBalances()
    } else {
      setError(result.error!, result.message)
    }

    return result
  }, [provider, signer, setLoading, setError, updateState])

  // Type-safe withdraw function
  const withdraw = useCallback(async (amount: string): Promise<DeFiOperationResult<string>> => {
    if (!contractWrapperRef.current || !provider || !signer) {
      return { success: false, error: 'network_error', message: 'Wallet not connected' }
    }

    setLoading(true)

    const result = await contractWrapperRef.current.safeExecute(async () => {
      const vault = new ethers.Contract(CONTRACTS.vault, VAULT_ABI, signer)
      const amountWei = contractWrapperRef.current!.safeParseEther(amount)
      
      const gasEstimate = await vault.withdraw?.estimateGas?.(amountWei) || 100000n
      const gasLimit = gasEstimate + (gasEstimate / 10n)
      
      const tx = await vault.withdraw?.(amountWei, { gasLimit })
      if (tx) await tx.wait()
      
      return tx?.hash || 'unknown'
    }, `withdraw ${amount} tokens`)

    if (result.success) {
      updateState({ 
        isLoading: false, 
        lastTxHash: result.data,
        error: null 
      })
      await refreshBalances()
    } else {
      setError(result.error!, result.message)
    }

    return result
  }, [provider, signer, setLoading, setError, updateState])

  // Advanced yield metrics calculation
  const calculateYieldMetrics = useCallback((): YieldMetrics => {
    if (!contractWrapperRef.current) {
      return {
        currentAPY: 0,
        totalEarned: '0',
        dailyEarnings: '0',
        projectedMonthlyEarnings: '0'
      }
    }

    const totalDepositedWei = contractWrapperRef.current.safeParseEther(state.totalDeposited)
    const currentBalanceWei = contractWrapperRef.current.safeParseEther(state.balance)
    
    // Calculate earnings
    const totalEarnedWei = currentBalanceWei > totalDepositedWei 
      ? currentBalanceWei - totalDepositedWei 
      : 0n
    
    const totalEarned = contractWrapperRef.current.safeFormatEther(totalEarnedWei)
    
    // Calculate daily earnings (assuming current APY)
    const dailyAPY = state.estimatedAPY / 365
    const dailyEarningsWei = YieldCalculator.predictYield(
      totalDepositedWei, 
      dailyAPY, 
      24 * 60 * 60 // 1 day in seconds
    )
    const dailyEarnings = contractWrapperRef.current.safeFormatEther(dailyEarningsWei)
    
    // Calculate monthly projection
    const monthlyEarningsWei = YieldCalculator.predictYield(
      totalDepositedWei,
      state.estimatedAPY,
      30 * 24 * 60 * 60 // 30 days in seconds
    )
    const projectedMonthlyEarnings = contractWrapperRef.current.safeFormatEther(monthlyEarningsWei)

    return {
      currentAPY: state.estimatedAPY,
      totalEarned,
      dailyEarnings,
      projectedMonthlyEarnings
    }
  }, [state.totalDeposited, state.balance, state.estimatedAPY])

  // Refresh all balances and metrics
  const refreshBalances = useCallback(async (): Promise<void> => {
    if (!contractWrapperRef.current || !provider || !signer) return

    const result = await contractWrapperRef.current.safeExecute(async () => {
      const vault = new ethers.Contract(CONTRACTS.vault, VAULT_ABI, provider)
      const strategy = new ethers.Contract(CONTRACTS.enhancedUniswapStrategy, ENHANCED_STRATEGY_ABI, provider)
      
      const userAddress = await signer.getAddress()
      
      // Get user balance from vault
      const userBalance = await vault.balanceOf?.(userAddress) || 0n
      const balance = contractWrapperRef.current!.safeFormatEther(userBalance)
      
      // Get strategy APY
      const apyBasisPoints = await strategy.getAPY?.() || 0n
      const estimatedAPY = Number(apyBasisPoints) / 100 // Convert from basis points
      
      return { balance, estimatedAPY }
    }, 'refresh balances')

    if (result.success && result.data) {
      updateState({
        balance: result.data.balance,
        estimatedAPY: result.data.estimatedAPY,
        error: null
      })
    }
  }, [provider, signer, updateState])

  // Get real-time strategy performance
  const getStrategyPerformance = useCallback(async () => {
    if (!contractWrapperRef.current || !provider) return null

    const result = await contractWrapperRef.current.safeExecute(async () => {
      const strategy = new ethers.Contract(CONTRACTS.enhancedUniswapStrategy, ENHANCED_STRATEGY_ABI, provider)
      
      const [apy, tvl, isActive] = await Promise.all([
        strategy.getAPY?.() || 0n,
        strategy.getTVL?.() || 0n,
        strategy.isActive?.() || false
      ])
      
      return {
        apy: Number(apy) / 100, // Convert from basis points
        tvl: contractWrapperRef.current!.safeFormatEther(tvl),
        isActive
      }
    }, 'get strategy performance')

    return result.success ? result.data : null
  }, [provider])

  return {
    // State
    ...state,
    
    // Actions
    deposit,
    withdraw,
    refreshBalances,
    
    // Metrics
    yieldMetrics: calculateYieldMetrics(),
    getStrategyPerformance,
    
    // Utilities
    isConnected: !!provider && !!signer,
    contractWrapper: contractWrapperRef.current
  }
}
