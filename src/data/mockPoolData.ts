import type { PoolDef } from '../types/pools';
import { generatePoolId } from '../utils/poolCalculations';
import { POOL_ASSETS } from '../constants/poolAssets';

export const createMockPoolData = (): PoolDef[] => [
  {
    poolId: generatePoolId(POOL_ASSETS.REAL8, POOL_ASSETS.XLM),
    assetA: POOL_ASSETS.REAL8,
    assetB: POOL_ASSETS.XLM,
    tvl: 125430.50,
    apy: 8.5,
    userShare: 0,
    totalShares: 1_000_000,
    reserveA: '50000000000000', // 5M REAL8
    reserveB: '125430500000000', // ~25M XLM
    priceA: 0.025, // REAL8 price in USD
    priceB: 0.12, // XLM price in USD
    fee: 0.3,
    volume24h: 15000
  },
  {
    poolId: generatePoolId(POOL_ASSETS.REAL8, POOL_ASSETS.USDC),
    assetA: POOL_ASSETS.REAL8,
    assetB: POOL_ASSETS.USDC,
    tvl: 2450000.75,
    apy: 5.2,
    userShare: 0,
    totalShares: 5_000_000,
    reserveA: '98000000000000', // 9.8M REAL8
    reserveB: '2450000750000', // 2.45M USDC
    priceA: 0.025,
    priceB: 1.00,
    fee: 0.3,
    volume24h: 85000
  },
  {
    poolId: generatePoolId(POOL_ASSETS.REAL8, POOL_ASSETS.EURC),
    assetA: POOL_ASSETS.REAL8,
    assetB: POOL_ASSETS.EURC,
    tvl: 430000.10,
    apy: 4.9,
    userShare: 0,
    totalShares: 750_000,
    reserveA: '17200000000000', // 1.72M REAL8
    reserveB: '390909100000', // ~391K EURC
    priceA: 0.025,
    priceB: 1.10,
    fee: 0.3,
    volume24h: 12000
  },
  {
    poolId: generatePoolId(POOL_ASSETS.REAL8, POOL_ASSETS.SLVR),
    assetA: POOL_ASSETS.REAL8,
    assetB: POOL_ASSETS.SLVR,
    tvl: 98500.42,
    apy: 7.3,
    userShare: 0,
    totalShares: 400_000,
    reserveA: '3940000000000', // 394K REAL8
    reserveB: '3186400000000', // ~3.19M SLVR
    priceA: 0.025,
    priceB: 0.031,
    fee: 0.3,
    volume24h: 5500
  },
  {
    poolId: generatePoolId(POOL_ASSETS.REAL8, POOL_ASSETS.GOLD),
    assetA: POOL_ASSETS.REAL8,
    assetB: POOL_ASSETS.GOLD,
    tvl: 152300.00,
    apy: 6.1,
    userShare: 0,
    totalShares: 500_000,
    reserveA: '6092000000000', // 609K REAL8
    reserveB: '76150000000', // ~76K GOLD
    priceA: 0.025,
    priceB: 2000,
    fee: 0.3,
    volume24h: 8200
  }
];