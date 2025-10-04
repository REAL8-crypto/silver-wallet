import { useCallback } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import type { PoolDef } from '../types/pools';
import { POOL_ASSETS, CURRENT_PRICES, RECOGNIZED_ASSETS } from '../constants/poolAssets';
import { 
  generatePoolId, 
  calculateTVL, 
  estimateAPY, 
  estimate24hVolume,
  parseAssetFromReserve
} from '../utils/poolCalculations';

export const usePoolDiscovery = (
  serverRef: React.RefObject<StellarSdk.Horizon.Server | null>,
  publicKey: string | null,
  balances: any[]
) => {
  const discoverLiquidityPools = useCallback(async (): Promise<PoolDef[]> => {
    console.log('🔍 Starting pool discovery...');
    console.log('Server available:', !!serverRef.current);
    console.log('Public key:', publicKey ? 'Connected' : 'Not connected');
    console.log('Balances count:', balances.length);

    if (!serverRef.current) {
      console.warn('❌ Stellar server not available');
      return [];
    }

    try {
      const discoveredPools: PoolDef[] = [];
      const real8Asset = new StellarSdk.Asset(POOL_ASSETS.REAL8.code, POOL_ASSETS.REAL8.issuer!);
      
      console.log('🎯 Searching for REAL8 pools...');
      console.log('REAL8 Asset:', POOL_ASSETS.REAL8.code, POOL_ASSETS.REAL8.issuer);

      // Get ALL pools containing REAL8
      const allREAL8Pools = await serverRef.current.liquidityPools()
        .forAssets(real8Asset)
        .limit(50)
        .call();

      console.log(`📊 Found ${allREAL8Pools.records.length} REAL8 pools on Stellar`);

      // Process each found pool
      for (const pool of allREAL8Pools.records) {
        try {
          console.log(`\n🔄 Processing pool ${pool.id}`);
          console.log('Pool data:', {
            id: pool.id,
            total_shares: pool.total_shares,
            fee_bp: pool.fee_bp,
            reserves_count: pool.reserves.length
          });

          const reserves = pool.reserves;
          
          // Parse assets from reserves
          const assetA = parseAssetFromReserve(reserves[0].asset, POOL_ASSETS.REAL8.issuer!);
          const assetB = parseAssetFromReserve(reserves[1].asset, POOL_ASSETS.REAL8.issuer!);
          
          const reserveA = reserves[0].amount;
          const reserveB = reserves[1].amount;
          const poolId = generatePoolId(assetA, assetB);
          
          console.log('Assets:', assetA.code, '/', assetB.code);
          console.log('Reserves:', reserveA, '/', reserveB);

          // Calculate TVL from real reserves
          const priceA = CURRENT_PRICES[assetA.code] || 0;
          const priceB = CURRENT_PRICES[assetB.code] || 0;
          const tvl = calculateTVL(reserveA, reserveB, priceA, priceB);
          
          console.log('Prices:', priceA, '/', priceB);
          console.log('Calculated TVL:', tvl);

          // Calculate user's share if they have positions
          let userShares = 0;
          if (publicKey && balances.length > 0) {
            const lpBalance = balances.find(balance => 
              balance.asset_type === 'liquidity_pool_shares' && 
              balance.liquidity_pool_id === pool.id
            );
            
            if (lpBalance) {
              userShares = parseFloat(lpBalance.balance);
              console.log('User has shares:', userShares);
            }
          }

          // Check if assets are recognized
          const assetARecognized = RECOGNIZED_ASSETS.includes(assetA.code as any);
          const assetBRecognized = RECOGNIZED_ASSETS.includes(assetB.code as any);
          console.log('Assets recognized:', assetARecognized, '/', assetBRecognized);

          // Only include pools with recognized assets
          if (assetARecognized && assetBRecognized) {
            const poolDef: PoolDef = {
              poolId,
              assetA,
              assetB,
              tvl,
              apy: estimateAPY(tvl),
              userShare: userShares,
              totalShares: parseFloat(pool.total_shares),
              reserveA,
              reserveB,
              priceA,
              priceB,
              fee: pool.fee_bp / 100,
              volume24h: estimate24hVolume(tvl),
              liquidityPoolId: pool.id
            };

            discoveredPools.push(poolDef);
            console.log(`✅ Added pool: ${assetA.code}/${assetB.code} (TVL: $${tvl.toLocaleString()})`);
          } else {
            console.log(`❌ Skipped unrecognized assets: ${assetA.code}/${assetB.code}`);
          }
          
        } catch (error) {
          console.error('❌ Error processing pool:', pool.id, error);
        }
      }

      console.log(`\n🔍 Adding placeholder pools for missing pairs...`);

      // Add any missing pairs as "not created yet"
      const existingPairs = discoveredPools.map(p => p.poolId);
      const expectedPairs = [
        generatePoolId(POOL_ASSETS.REAL8, POOL_ASSETS.XLM),
        generatePoolId(POOL_ASSETS.REAL8, POOL_ASSETS.USDC),
        generatePoolId(POOL_ASSETS.REAL8, POOL_ASSETS.EURC),
        generatePoolId(POOL_ASSETS.REAL8, POOL_ASSETS.SLVR),
        generatePoolId(POOL_ASSETS.REAL8, POOL_ASSETS.GOLD)
      ];

      for (const expectedPair of expectedPairs) {
        if (!existingPairs.includes(expectedPair)) {
          const pairAssets = [POOL_ASSETS.XLM, POOL_ASSETS.USDC, POOL_ASSETS.EURC, POOL_ASSETS.SLVR, POOL_ASSETS.GOLD];
          const pairedAsset = pairAssets.find(asset => 
            generatePoolId(POOL_ASSETS.REAL8, asset) === expectedPair
          );

          if (pairedAsset) {
            discoveredPools.push({
              poolId: expectedPair,
              assetA: POOL_ASSETS.REAL8,
              assetB: pairedAsset,
              tvl: 0,
              apy: 0,
              userShare: 0,
              totalShares: 0,
              reserveA: '0',
              reserveB: '0',
              priceA: CURRENT_PRICES[POOL_ASSETS.REAL8.code],
              priceB: CURRENT_PRICES[pairedAsset.code],
              fee: 0.30,
              volume24h: 0,
              liquidityPoolId: undefined
            });
            console.log(`📝 Added placeholder for: REAL8/${pairedAsset.code}`);
          }
        }
      }

      const activePools = discoveredPools.filter(p => p.tvl > 0);
      console.log(`\n🎉 Discovery complete!`);
      console.log(`Total pools: ${discoveredPools.length}`);
      console.log(`Active pools (TVL > 0): ${activePools.length}`);
      console.log(`Total TVL: $${activePools.reduce((sum, p) => sum + p.tvl, 0).toLocaleString()}`);

      return discoveredPools;
      
    } catch (error: unknown) {
      console.error('❌ Failed to discover liquidity pools:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      return [];
    }
  }, [publicKey, balances, serverRef]);

  return { discoverLiquidityPools };
};