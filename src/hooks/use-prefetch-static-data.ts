'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { mtaApi } from '@/lib/api';
import { queryKeys } from '@/lib/api/query-keys';

export function usePrefetchStaticData() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch static data on app load
    queryClient.prefetchQuery({
      queryKey: queryKeys.stops,
      queryFn: mtaApi.getStops,
      staleTime: Infinity,
    });

    queryClient.prefetchQuery({
      queryKey: queryKeys.routes,
      queryFn: mtaApi.getRoutes,
      staleTime: Infinity,
    });

    queryClient.prefetchQuery({
      queryKey: queryKeys.enrichedStations,
      queryFn: mtaApi.getEnrichedStations,
      staleTime: Infinity,
    });

    // Prefetch historical data for analytics page (cached server-side for 5 min)
    queryClient.prefetchQuery({
      queryKey: queryKeys.historical(24),
      queryFn: () => mtaApi.getHistoricalData(24),
      staleTime: 5 * 60 * 1000, // 5 minutes - matches server cache
    });
  }, [queryClient]);
}
