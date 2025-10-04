import { useMemo } from 'react';

interface BalanceLine {
  asset_type: string;
  balance: string;
  asset_code?: string;
  asset_issuer?: string;
  liquidity_pool_id?: string;
  limit?: string;
  buying_liabilities?: string;
  selling_liabilities?: string;
  is_authorized?: boolean;
  is_authorized_to_maintain_liabilities?: boolean;
  is_clawback_enabled?: boolean;
}

export interface TrustlineCheckResult {
  hasTrustline: (assetCode: string, assetIssuer: string | null | undefined) => boolean;
  missingTrustlines: (assets: Array<{ code: string; issuer: string | null | undefined }>) => Array<{ code: string; issuer: string | null | undefined }>;
  getAllMissingAssetCodes: (assets: Array<{ code: string; issuer: string | null | undefined }>) => string[];
}

/**
 * Hook to check if the user has trustlines for specific assets
 * @param balances - Array of balance lines from WalletContext
 * @returns Object with trustline checking functions
 */
export const useTrustlineCheck = (balances: BalanceLine[] | undefined): TrustlineCheckResult => {
  return useMemo(() => {
    /**
     * Check if user has a trustline for a specific asset
     */
    const hasTrustline = (assetCode: string, assetIssuer: string | null | undefined): boolean => {
      // No balances available
      if (!balances || balances.length === 0) {
        return false;
      }
      
      // XLM (native) always has a "trustline" - it's the native asset
      if (assetCode === 'XLM' && (!assetIssuer || assetIssuer === '')) {
        return true;
      }
      
      // Check if the asset exists in balances
      return balances.some(balance => {
        // Check for native asset
        if (balance.asset_type === 'native') {
          return assetCode === 'XLM' && (!assetIssuer || assetIssuer === '');
        }
        
        // Check for custom asset (must match both code and issuer)
        return balance.asset_code === assetCode && 
               balance.asset_issuer === assetIssuer;
      });
    };

    /**
     * Get list of assets that are missing trustlines
     */
    const missingTrustlines = (
      assets: Array<{ code: string; issuer: string | null | undefined }>
    ): Array<{ code: string; issuer: string | null | undefined }> => {
      return assets.filter(asset => !hasTrustline(asset.code, asset.issuer));
    };

    /**
     * Get array of missing asset codes (for display purposes)
     */
    const getAllMissingAssetCodes = (
      assets: Array<{ code: string; issuer: string | null | undefined }>
    ): string[] => {
      const missing = missingTrustlines(assets);
      return missing.map(asset => asset.code);
    };

    return { 
      hasTrustline, 
      missingTrustlines,
      getAllMissingAssetCodes
    };
  }, [balances]);
};