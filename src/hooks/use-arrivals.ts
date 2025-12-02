'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ArrivalBoard } from '@/types/mta';
import { useTrainsStore } from '@/stores';

interface UseArrivalsOptions {
  refreshInterval?: number;
  enabled?: boolean;
}

export function useArrivals(
  groupId: string,
  stopId: string,
  options: UseArrivalsOptions = {}
) {
  const { refreshInterval = 30000, enabled = true } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { arrivalsByStation, updateArrivals } = useTrainsStore();
  const arrivals = arrivalsByStation[stopId];

  const fetchArrivals = useCallback(async () => {
    if (!enabled || !groupId || !stopId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/arrivals/${groupId}/${stopId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch arrivals');
      }

      const data: ArrivalBoard = await response.json();
      updateArrivals(stopId, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [groupId, stopId, enabled, updateArrivals]);

  // Initial fetch
  useEffect(() => {
    fetchArrivals();
  }, [fetchArrivals]);

  // Set up polling
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    const interval = setInterval(fetchArrivals, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchArrivals, refreshInterval, enabled]);

  return {
    arrivals,
    isLoading,
    error,
    refetch: fetchArrivals,
  };
}
