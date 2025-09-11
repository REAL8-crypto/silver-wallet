// Simulation utilities for liquidity pool operations
import { MappedPoolData } from './pools';

export interface SimulationInput {
  amountA: string; // Amount of asset A to deposit
  amountB: string; // Amount of asset B to deposit
  poolData: MappedPoolData;
  existingShares?: string; // User's existing shares in the pool
}

export interface SimulationResult {
  mintedShares: string;
  newOwnershipPercentage: number;
  effectivePrice: number;
  slippage: number;
  estimatedRewards: number; // Placeholder for future APY calculation
}

export interface SlippageCheck {
  reserveRatioChange: number; // Percentage change in reserve ratio
  totalSharesChange: number; // Percentage change in total shares
  exceedsTolerance: boolean;
  summary: {
    metric: string;
    before: string;
    now: string;
    changePercent: string;
  }[];
}

/**
 * Calculate the number of LP tokens that would be minted for a deposit
 * Uses the constant product formula: x * y = k
 */
export function simulatePoolJoin(input: SimulationInput): SimulationResult {
  const { amountA, amountB, poolData, existingShares = '0' } = input;
  
  const depositA = parseFloat(amountA);
  const depositB = parseFloat(amountB);
  const reserveA = parseFloat(poolData.reserveA.amount);
  const reserveB = parseFloat(poolData.reserveB.amount);
  const totalShares = parseFloat(poolData.totalShares);
  const userExistingShares = parseFloat(existingShares);
  
  // Handle edge case of empty pool
  if (totalShares === 0 || (reserveA === 0 && reserveB === 0)) {
    const mintedShares = Math.sqrt(depositA * depositB);
    return {
      mintedShares: mintedShares.toString(),
      newOwnershipPercentage: 100, // First depositor owns 100%
      effectivePrice: depositB / depositA,
      slippage: 0,
      estimatedRewards: 0
    };
  }
  
  // Calculate proportional deposit amounts
  // For proportional deposit: depositA / reserveA = depositB / reserveB
  const ratioA = depositA / reserveA;
  const ratioB = depositB / reserveB;
  
  // Use the smaller ratio to determine actual deposit amounts (prevents imbalanced deposits)
  const ratio = Math.min(ratioA, ratioB);
  const actualDepositA = reserveA * ratio;
  const actualDepositB = reserveB * ratio;
  
  // Calculate minted shares: mintedShares = totalShares * ratio
  const mintedShares = totalShares * ratio;
  
  // Calculate new ownership percentage
  const newTotalShares = totalShares + mintedShares;
  const newUserShares = userExistingShares + mintedShares;
  const newOwnershipPercentage = (newUserShares / newTotalShares) * 100;
  
  // Calculate effective price and slippage
  const currentPrice = reserveB / reserveA;
  const effectivePrice = actualDepositB / actualDepositA;
  const slippage = Math.abs((effectivePrice - currentPrice) / currentPrice) * 100;
  
  return {
    mintedShares: mintedShares.toString(),
    newOwnershipPercentage,
    effectivePrice,
    slippage,
    estimatedRewards: 0 // Placeholder - would calculate based on APY and pool fee
  };
}

/**
 * Check if pool state has changed beyond tolerance since last snapshot
 */
export function checkSlippageProtection(
  beforeSnapshot: MappedPoolData,
  currentSnapshot: MappedPoolData,
  tolerance: number // Percentage (e.g., 0.5 for 0.5%)
): SlippageCheck {
  // Calculate reserve ratio changes
  const beforeRatio = parseFloat(beforeSnapshot.reserveB.amount) / parseFloat(beforeSnapshot.reserveA.amount);
  const currentRatio = parseFloat(currentSnapshot.reserveB.amount) / parseFloat(currentSnapshot.reserveA.amount);
  const reserveRatioChange = Math.abs((currentRatio - beforeRatio) / beforeRatio) * 100;
  
  // Calculate total shares changes (indicates other deposits/withdrawals)
  const beforeShares = parseFloat(beforeSnapshot.totalShares);
  const currentShares = parseFloat(currentSnapshot.totalShares);
  const totalSharesChange = Math.abs((currentShares - beforeShares) / beforeShares) * 100;
  
  const exceedsTolerance = reserveRatioChange > tolerance || totalSharesChange > tolerance;
  
  const summary = [
    {
      metric: 'Reserve Ratio',
      before: beforeRatio.toFixed(6),
      now: currentRatio.toFixed(6),
      changePercent: `${reserveRatioChange.toFixed(2)}%`
    },
    {
      metric: 'Total Shares',
      before: beforeShares.toLocaleString(),
      now: currentShares.toLocaleString(),
      changePercent: `${totalSharesChange.toFixed(2)}%`
    }
  ];
  
  return {
    reserveRatioChange,
    totalSharesChange,
    exceedsTolerance,
    summary
  };
}

/**
 * Calculate optimal deposit amounts for balanced liquidity provision
 */
export function calculateOptimalDeposit(
  maxAmountA: string,
  maxAmountB: string,
  poolData: MappedPoolData
): { amountA: string; amountB: string; isOptimal: boolean } {
  const maxA = parseFloat(maxAmountA);
  const maxB = parseFloat(maxAmountB);
  const reserveA = parseFloat(poolData.reserveA.amount);
  const reserveB = parseFloat(poolData.reserveB.amount);
  
  if (reserveA === 0 || reserveB === 0) {
    // Empty pool - can use any ratio
    return {
      amountA: maxAmountA,
      amountB: maxAmountB,
      isOptimal: true
    };
  }
  
  // Calculate the optimal ratio
  const currentRatio = reserveB / reserveA;
  
  // Determine limiting factor
  const amountAForMaxB = maxB / currentRatio;
  const amountBForMaxA = maxA * currentRatio;
  
  if (amountAForMaxB <= maxA) {
    // B is the limiting factor
    return {
      amountA: amountAForMaxB.toString(),
      amountB: maxAmountB,
      isOptimal: true
    };
  } else {
    // A is the limiting factor
    return {
      amountA: maxAmountA,
      amountB: amountBForMaxA.toString(),
      isOptimal: true
    };
  }
}

/**
 * Estimate impermanent loss for a position
 */
export function estimateImpermanentLoss(
  initialPriceRatio: number,
  currentPriceRatio: number
): number {
  if (initialPriceRatio === 0) return 0;
  
  const priceChange = currentPriceRatio / initialPriceRatio;
  const holdValue = 2 * Math.sqrt(priceChange);
  const lpValue = 1 + priceChange;
  
  return ((holdValue - lpValue) / lpValue) * 100;
}

/**
 * Format numbers for display in the UI
 */
export function formatPoolAmount(amount: string | number, decimals: number = 6): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (num === 0) return '0';
  if (num < 0.000001) return '< 0.000001';
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  
  return num.toFixed(decimals);
}

/**
 * Calculate APY based on fee earnings (placeholder for future implementation)
 */
export function calculatePoolAPY(
  poolData: MappedPoolData,
  volumeData?: { daily?: number; weekly?: number }
): number {
  // Placeholder implementation
  // In a real implementation, this would use:
  // - Historical volume data
  // - Fee earnings over time
  // - Pool TVL changes
  
  // For now, return a mock APY based on pool size (smaller pools = higher risk/reward)
  const tvl = poolData.syntheticTvl;
  if (tvl < 100000) return 8.5;
  if (tvl < 500000) return 6.5;
  if (tvl < 1000000) return 5.5;
  if (tvl < 2000000) return 4.5;
  return 3.5;
}