'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { TrainPosition } from '@/types/mta';
import { useTrainsStore } from '@/stores';

interface UseTrainPositionsOptions {
  refreshInterval?: number;
  enabled?: boolean;
}

export function useTrainPositions(
  _groupIds: string[] = ['ACE', 'BDFM', 'G', 'JZ', 'NQRW', 'L', 'SI', '1234567'],
  options: UseTrainPositionsOptions = {}
) {
  const { refreshInterval = 15000, enabled = true } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const { trains, updateTrains, setFeedTimestamp } = useTrainsStore();

  // Mark as ready on mount
  useEffect(() => {
    setIsReady(true);
  }, []);

  const fetchPositions = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch train positions from server (includes headsigns)
      const response = await fetch('/api/v1/trains');
      if (!response.ok) {
        throw new Error(`Failed to fetch trains: ${response.status}`);
      }

      const data = await response.json();
      const positions: TrainPosition[] = data.trains || [];

      updateTrains(positions);
      setFeedTimestamp('all', data.updatedAt || new Date().toISOString());
    } catch (err) {
      console.error('Failed to fetch train positions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [enabled, updateTrains, setFeedTimestamp]);

  // Initial fetch
  useEffect(() => {
    if (isReady) {
      fetchPositions();
    }
  }, [isReady, fetchPositions]);

  // Set up polling
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    const interval = setInterval(fetchPositions, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPositions, refreshInterval, enabled]);

  return {
    trains: Object.values(trains),
    isLoading,
    error,
    refetch: fetchPositions,
  };
}
