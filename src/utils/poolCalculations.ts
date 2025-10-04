import type { PoolDef, AssetDef } from '../types/pools';

export const generatePoolId = (assetA: AssetDef, assetB: AssetDef): string => {
  const aKey = assetA.code === 'XLM' ? 'XLM' : `${assetA.code}:${assetA.issuer}`;
  const bKey = assetB.code === 'XLM' ? 'XLM' : `${assetB.code}:${assetB.issuer}`;
  return aKey < bKey ? `${aKey}/${bKey}` : `${bKey}/${aKey}`;
};

export const getPoolSharePercentage = (userShare: number, totalShares: number): number => {
  return totalShares > 0 ? (userShare / totalShares) * 100 : 0;
};

export const getUserPoolValue = (pool: PoolDef): number => {
  const sharePercentage = getPoolSharePercentage(pool.userShare, pool.totalShares);
  return (pool.tvl * sharePercentage) / 100;
};

export const calculateTVL = (
  reserveA: string, 
  reserveB: string, 
  priceA: number, 
  priceB: number
): number => {
  const reserveAValue = parseFloat(reserveA) * priceA;
  const reserveBValue = parseFloat(reserveB) * priceB;
  return reserveAValue + reserveBValue;
};

export const estimateAPY = (tvl: number): number => {
  return tvl > 1000 ? 3 + Math.random() * 8 : 0;
};

export const estimate24hVolume = (tvl: number): number => {
  return tvl * 0.1; // Estimate 24h volume as 10% of TVL
};

// FIXED: Handle all asset types correctly
export const parseAssetFromReserve = (asset: string, real8Issuer: string): AssetDef => {
  console.log('🔍 Parsing asset:', asset);
  
  if (asset === 'native') {
    console.log('✅ Parsed as native XLM');
    return { code: 'XLM', issuer: null };
  }
  
  if (asset.includes(':')) {
    const [code, issuer] = asset.split(':');
    console.log(`✅ Parsed as ${code} with issuer ${issuer}`);
    return { code, issuer };
  }
  
  // Fallback for any unexpected format
  console.warn('⚠️ Unexpected asset format:', asset);
  return { code: asset, issuer: null };
};

export const getTotalPoolsValue = (pools: PoolDef[]): number => {
  return pools.reduce((sum, pool) => sum + pool.tvl, 0);
};

export const getAverageAPY = (pools: PoolDef[]): number => {
  if (pools.length === 0) return 0;
  const totalAPY = pools.reduce((sum, pool) => sum + pool.apy, 0);
  return totalAPY / pools.length;
};

export const getTotalVolume = (pools: PoolDef[]): number => {
  return pools.reduce((sum, pool) => sum + pool.volume24h, 0);
};