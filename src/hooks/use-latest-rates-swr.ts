
'use client';

import useSWR from 'swr';
import { Firestore } from 'firebase/firestore';
import { getLatestRates, updateAllRatesInCloud } from '@/lib/currencies';

/**
 * Custom hook using SWR for efficient client-side caching of exchange rates.
 * It prevents UI flickering and ensures data is available instantly on view switches.
 */
export function useLatestRatesSWR(pairs: string[], firestore: Firestore) {
  const fetcher = async () => {
    // We fetch from the local library which is synced with Firestore cache
    return getLatestRates(pairs, firestore);
  };

  const { data, error, isLoading, mutate } = useSWR(
    pairs.length > 0 ? ['latest-rates', pairs.join(','), firestore.app.name] : null,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: false, // Don't spam API on window focus
      dedupingInterval: 30000, // Dedupe identical requests within 30s
      fallbackData: [],
    }
  );

  const forceRefresh = async () => {
    // This triggers a full cloud update across all sources
    await updateAllRatesInCloud(firestore);
    mutate();
  };

  return {
    rates: data || [],
    isLoading,
    isError: error,
    forceRefresh
  };
}
