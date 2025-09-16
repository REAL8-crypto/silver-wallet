import { useEffect, useState } from 'react';

// Curated asset list for grid (with corrected USDC issuer, etc)
export const PAIRS = [
  { code: 'XLM', issuer: null },
  { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' },
  { code: 'EURC', issuer: 'GAP5LETOV7D2P7I4B6VJ3K6QJ5W6W3VJIVBSH6D6C6X4K7R6GAV7EURC' },
  { code: 'SLVR', issuer: 'GA8SLVRXXX8SLVRXXX8SLVRXXX8SLVRXXX8SLVRXXX8SLVRXXX8SLVRXXX' },
  { code: 'GOLD', issuer: 'GA8GOLDXXX8GOLDXXX8GOLDXXX8GOLDXXX8GOLDXXX8GOLDXXX8GOLDXXX' },
];

type PriceResult = {
  [code: string]: number | null;
};

export const useReal8Pairs = () => {
  const [prices, setPrices] = useState<PriceResult>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = async () => {
    try {
      // Simulated fetch - replace with real Horizon calls
      setPrices({
        XLM: 137.5,
        USDC: 8.25,
        EURC: 7.95,
        SLVR: 0.56,
        GOLD: 0.0012,
      });
      setLastUpdated(new Date().toISOString());
      setError(null);
    } catch (e) {
      setError('Failed to fetch prices');
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  return { prices, lastUpdated, error };
};
