import { useEffect, useState } from 'react';

interface SupplyData {
  totalSupply: number | null;
  circulating: number | null;
  updatedAt?: string;
}

export function useReal8Supply() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SupplyData>({
    totalSupply: null,
    circulating: null
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Placeholder supply fetch
        await new Promise(r => setTimeout(r, 300));
        if (!ignore) {
          setData({
            totalSupply: 100_000_000,
            circulating: 12_345_678,
            updatedAt: new Date().toISOString()
          });
        }
      } catch {
        if (!ignore) setError('Supply data unavailable');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    const id = setInterval(load, 300_000);
    return () => {
      ignore = true;
      clearInterval(id);
    };
  }, []);

  return { loading, data, error };
}