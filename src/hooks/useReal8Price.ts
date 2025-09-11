import { useEffect, useState } from 'react';

// Placeholder: replace endpoint when backend ready.
export function useReal8Price() {
  const [loading, setLoading] = useState(true);
  const [priceUsd, setPriceUsd] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function fetchPrice() {
      setLoading(true);
      setError(null);
      try {
        // Mock price for now:
        await new Promise(r => setTimeout(r, 400));
        if (!ignore) {
          setPriceUsd(0.42); // placeholder
        }
      } catch (e) {
        if (!ignore) {
          setError('Price unavailable');
          setPriceUsd(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchPrice();
    const id = setInterval(fetchPrice, 60_000);
    return () => {
      ignore = true;
      clearInterval(id);
    };
  }, []);

  return { loading, priceUsd, error };
}