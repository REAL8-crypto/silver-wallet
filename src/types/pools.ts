export type PoolPosition = {
  id: string;
  assetA: { code: string; issuer: string | null };
  assetB: { code: string; issuer: string | null };
  reserveA: string;
  reserveB: string;
  totalShares: string;
  userShares: string;
  lastUpdated: Date;
};

export type PoolDef = {
  poolId: string;
  assetA: { code: string; issuer: string | null };
  assetB: { code: string; issuer: string | null };
  tvl: number;
  apy: number;
  userShare: number;
  totalShares: number;
  reserveA: string;
  reserveB: string;
  priceA: number;
  priceB: number;
  fee: number;
  volume24h: number;
  liquidityPoolId?: string;
};

export type PoolDialogData = {
  poolId: string;
  action: 'join' | 'add' | 'remove';
  amountA: string;
  amountB: string;
  slippage: string;
};

export type AssetDef = {
  code: string;
  issuer: string | null;
};

export type PriceMap = Record<string, number>;