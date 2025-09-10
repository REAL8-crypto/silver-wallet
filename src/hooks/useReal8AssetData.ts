import { useEffect, useState } from 'react';
import { REAL8 } from '../constants/real8Asset';

interface Real8AssetData {
  priceUsd: number | null;
  totalSupply: number | null;
  circulating: number | null;
  updatedAt: string | null;
}

export function useReal8AssetData() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Real8AssetData>({
    priceUsd: null,
    totalSupply: null,
    circulating: null,
    updatedAt: null
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        const updatedAt = new Date().toISOString();
        let priceUsd: number | null = null;
        let totalSupply: number | null = null;
        let circulating: number | null = null;

        // Fetch supply data from Horizon
        try {
          const horizonUrl = `https://horizon.stellar.org/assets?asset_code=${REAL8.CODE}&asset_issuer=${REAL8.ISSUER}`;
          const horizonResponse = await fetch(horizonUrl);
          
          if (horizonResponse.ok) {
            const horizonData = await horizonResponse.json();
            if (horizonData.records && horizonData.records.length > 0) {
              const assetRecord = horizonData.records[0];
              totalSupply = parseFloat(assetRecord.amount) || null;
              // Use totalSupply as circulating if no better metric available
              circulating = totalSupply;
            }
          }
        } catch (e) {
          console.warn('Failed to fetch Horizon data:', e);
        }

        // Attempt to fetch price from stellar.expert
        try {
          const expertUrl = `https://api.stellar.expert/explorer/public/asset/${REAL8.CODE}-${REAL8.ISSUER}`;
          const expertResponse = await fetch(expertUrl);
          
          if (expertResponse.ok) {
            const expertData = await expertResponse.json();
            if (expertData.price?.usd) {
              priceUsd = parseFloat(expertData.price.usd);
            } else if (expertData.price) {
              priceUsd = parseFloat(expertData.price);
            }
          }
        } catch (e) {
          console.warn('Failed to fetch stellar.expert price data:', e);
        }

        if (!ignore) {
          setData({
            priceUsd,
            totalSupply,
            circulating,
            updatedAt
          });
        }
      } catch (e) {
        if (!ignore) {
          setError('Failed to fetch asset data');
          console.error('Asset data fetch error:', e);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchData();
    const id = setInterval(fetchData, 60_000); // Refresh every 60 seconds
    
    return () => {
      ignore = true;
      clearInterval(id);
    };
  }, []);

  return { loading, data, error };
}