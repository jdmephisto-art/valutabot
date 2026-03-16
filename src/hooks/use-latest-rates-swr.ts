'use client';

import useSWR from 'swr';
import { Firestore } from 'firebase/firestore';
import { getLatestRates, updateAllRatesInCloud } from '@/lib/currencies';

/**
 * Custom hook using SWR for efficient client-side caching of exchange rates.
 * Optimized to handle cold starts and prevent empty data flickering.
 */
export function useLatestRatesSWR(pairs: string[], firestore: Firestore) {
  const fetcher = async () => {
    const result = await getLatestRates(pairs, firestore);
    
    // If we have pairs but got no values, throw error to trigger SWR retry logic
    if (pairs.length > 0 && result.every(r => r.rate === undefined)) {
        throw new Error('Rates not ready');
    }
    return result;
  };

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    pairs.length > 0 ? ['latest-rates', pairs.join(','), firestore.app.name] : null,
    fetcher,
    {
      refreshInterval: 60000, 
      revalidateOnFocus: false, 
      dedupingInterval: 30000, 
      errorRetryCount: 3, // Max 3 quick retries on failure
      errorRetryInterval: 2000, // Wait 2s before retrying
      shouldRetryOnError: true,
    }
  );

  const forceRefresh = async () => {
    await updateAllRatesInCloud(firestore);
    mutate();
  };

  return {
    rates: data || [],
    isLoading: isLoading || (!data && !error),
    isValidating,
    isError: error,
    forceRefresh
  };
}
