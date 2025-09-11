// Horizon Integration utilities for liquidity pools

// Types for Horizon API responses
export interface HorizonReserve {
  asset: string;
  amount: string;
}

export interface HorizonLiquidityPool {
  id: string;
  total_shares: string;
  reserves: HorizonReserve[];
  fee_bp: number;
  last_modified_ledger: number;
}

export interface MappedPoolData {
  id: string;
  totalShares: string;
  reserveA: { asset: string; amount: string }; // REAL8 always first
  reserveB: { asset: string; amount: string }; // Other asset
  feeBp: number;
  lastModified: number;
  priceRatioReal8PerOther: number;
  priceRatioOtherPerReal8: number;
  syntheticTvl: number; // Approximate USD value
  mock: boolean;
}

export interface UserPoolBalance {
  poolId: string;
  shares: string;
  percentage: number;
}

// Asset definitions (REAL8 base pairs)
export const POOL_ASSETS = {
  REAL8: { code: 'REAL8', issuer: 'GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD' },
  XLM:   { code: 'XLM', issuer: null }, // native
  USDC:  { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' },
  EURC:  { code: 'EURC', issuer: 'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2' },
  SLVR:  { code: 'SLVR', issuer: 'GBZVELEQD3WBN3R3VAG64HVBDOZ76ZL6QPLSFGKWPFED33Q3234NSLVR' },
  GOLD:  { code: 'GOLD', issuer: 'GBC5ZGK6MQU3XG5Y72SXPA7P5R5NHYT2475SNEJB2U3EQ6J56QLVGOLD' }
} as const;

// Target pairs (REAL8 always first)
export const TARGET_PAIRS = [
  { assetA: POOL_ASSETS.REAL8, assetB: POOL_ASSETS.XLM, id: 'REAL8-XLM' },
  { assetA: POOL_ASSETS.REAL8, assetB: POOL_ASSETS.USDC, id: 'REAL8-USDC' },
  { assetA: POOL_ASSETS.REAL8, assetB: POOL_ASSETS.EURC, id: 'REAL8-EURC' },
  { assetA: POOL_ASSETS.REAL8, assetB: POOL_ASSETS.SLVR, id: 'REAL8-SLVR' },
  { assetA: POOL_ASSETS.REAL8, assetB: POOL_ASSETS.GOLD, id: 'REAL8-GOLD' }
];

// Network configuration
export const HORIZON_CONFIG = {
  PUBLIC: 'https://horizon.stellar.org',
  TESTNET: 'https://horizon-testnet.stellar.org'
};

/**
 * Build canonical asset string for Horizon query
 * native => 'native', credit => 'code:ISSUER'
 */
export function buildAssetParam(asset: { code: string; issuer: string | null }): string {
  if (asset.issuer === null) {
    return 'native';
  }
  return `${asset.code}:${asset.issuer}`;
}

/**
 * Create cache key for a pair
 */
export function getPairCacheKey(assetA: { code: string; issuer: string | null }, assetB: { code: string; issuer: string | null }): string {
  const a = buildAssetParam(assetA);
  const b = buildAssetParam(assetB);
  // Ensure consistent ordering for cache
  return a < b ? `${a},${b}` : `${b},${a}`;
}

/**
 * Fetch liquidity pool data for a specific asset pair from Horizon
 */
export async function fetchLiquidityPoolPair(
  server: any,
  assetA: { code: string; issuer: string | null },
  assetB: { code: string; issuer: string | null }
): Promise<MappedPoolData | null> {
  try {
    const paramA = buildAssetParam(assetA);
    const paramB = buildAssetParam(assetB);
    
    // Query Horizon for the pool
    const response = await server.liquidityPools()
      .forReserves(paramA, paramB)
      .limit(1)
      .call();

    if (!response.records || response.records.length === 0) {
      return null; // Pool not found
    }

    if (response.records.length > 1) {
      console.warn('[fetchLiquidityPoolPair] Multiple pools found for pair, using first');
    }

    const pool: HorizonLiquidityPool = response.records[0];
    
    // Map reserves to ensure REAL8 is always first
    let reserveA: HorizonReserve;
    let reserveB: HorizonReserve;
    
    const real8Param = buildAssetParam(POOL_ASSETS.REAL8);
    const real8Reserve = pool.reserves.find(r => r.asset === real8Param);
    
    if (!real8Reserve) {
      console.warn('[fetchLiquidityPoolPair] REAL8 reserve not found in pool');
      return null;
    }
    
    reserveA = real8Reserve;
    reserveB = pool.reserves.find(r => r.asset !== real8Param)!;
    
    // Compute price ratios
    const amountA = parseFloat(reserveA.amount);
    const amountB = parseFloat(reserveB.amount);
    
    const priceRatioReal8PerOther = amountB / amountA; // How much OTHER per 1 REAL8
    const priceRatioOtherPerReal8 = amountA / amountB; // How much REAL8 per 1 OTHER
    
    // Synthetic TVL (approximation: assume $1 per asset for now)
    const syntheticTvl = amountA + amountB;
    
    return {
      id: pool.id,
      totalShares: pool.total_shares,
      reserveA: reserveA,
      reserveB: reserveB,
      feeBp: pool.fee_bp,
      lastModified: pool.last_modified_ledger,
      priceRatioReal8PerOther,
      priceRatioOtherPerReal8,
      syntheticTvl,
      mock: false
    };
    
  } catch (error) {
    console.error('[fetchLiquidityPoolPair] Error fetching pool:', error);
    throw error;
  }
}

/**
 * Fetch user's liquidity pool balances
 */
export async function fetchAccountPoolBalances(
  server: any,
  publicKey: string
): Promise<UserPoolBalance[]> {
  try {
    const account = await server.loadAccount(publicKey);
    const poolBalances: UserPoolBalance[] = [];
    
    for (const balance of account.balances) {
      if (balance.asset_type === 'liquidity_pool_shares') {
        // Get pool info to calculate percentage
        try {
          const poolResponse = await server.liquidityPools()
            .liquidityPoolId(balance.liquidity_pool_id)
            .call();
            
          const shares = parseFloat(balance.balance);
          const totalShares = parseFloat(poolResponse.total_shares);
          const percentage = totalShares > 0 ? (shares / totalShares) * 100 : 0;
          
          poolBalances.push({
            poolId: balance.liquidity_pool_id,
            shares: balance.balance,
            percentage
          });
        } catch (poolError) {
          console.warn('[fetchAccountPoolBalances] Failed to fetch pool info for', balance.liquidity_pool_id, poolError);
        }
      }
    }
    
    return poolBalances;
  } catch (error) {
    console.error('[fetchAccountPoolBalances] Error fetching balances:', error);
    throw error;
  }
}

/**
 * Create mock pool data as fallback
 */
export function createMockPoolData(
  pairId: string,
  assetA: { code: string; issuer: string | null },
  assetB: { code: string; issuer: string | null }
): MappedPoolData {
  // Mock data based on the original static values
  const mockData: Record<string, Partial<MappedPoolData>> = {
    'REAL8-XLM': { syntheticTvl: 125430.50, totalShares: '1000000' },
    'REAL8-USDC': { syntheticTvl: 2450000.75, totalShares: '5000000' },
    'REAL8-EURC': { syntheticTvl: 430000.10, totalShares: '750000' },
    'REAL8-SLVR': { syntheticTvl: 98500.42, totalShares: '400000' },
    'REAL8-GOLD': { syntheticTvl: 152300.00, totalShares: '500000' }
  };
  
  const mock = mockData[pairId] || { syntheticTvl: 100000, totalShares: '1000000' };
  
  return {
    id: `mock-${pairId}`,
    totalShares: mock.totalShares!,
    reserveA: { asset: buildAssetParam(assetA), amount: (mock.syntheticTvl! / 2).toString() },
    reserveB: { asset: buildAssetParam(assetB), amount: (mock.syntheticTvl! / 2).toString() },
    feeBp: 30, // Default 30 basis points
    lastModified: 0,
    priceRatioReal8PerOther: 1.0,
    priceRatioOtherPerReal8: 1.0,
    syntheticTvl: mock.syntheticTvl!,
    mock: true
  };
}

/**
 * Simple cache with timestamp
 */
class PoolCache {
  private cache = new Map<string, { data: MappedPoolData; timestamp: number }>();
  private readonly TTL = 30000; // 30 seconds

  set(key: string, data: MappedPoolData): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): MappedPoolData | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const poolCache = new PoolCache();