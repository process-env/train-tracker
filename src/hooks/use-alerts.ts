'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAlertsStore } from '@/stores';
import type { ServiceAlert } from '@/types/mta';

interface UseAlertsOptions {
  /** Refresh interval in milliseconds (default: 60000 = 1 minute) */
  refreshInterval?: number;
  /** Whether to fetch alerts (default: true) */
  enabled?: boolean;
  /** Filter by route IDs */
  routeIds?: string[];
}

interface UseAlertsReturn {
  alerts: ServiceAlert[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  counts: { critical: number; warning: number; info: number };
}

export function useAlerts(options: UseAlertsOptions = {}): UseAlertsReturn {
  const { refreshInterval = 60000, enabled = true, routeIds } = options;

  const {
    alerts,
    isLoading,
    error,
    setAlerts,
    setLoading,
    setError,
    getActiveAlerts,
    getAlertCounts,
  } = useAlertsStore();

  // Use ref for stable route filter
  const routeIdsRef = useRef(routeIds);
  routeIdsRef.current = routeIds;

  const fetchAlerts = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);

    try {
      // Build URL with optional route filter
      let url = '/api/v1/alerts';
      if (routeIdsRef.current?.length) {
        url += `?route=${routeIdsRef.current.join(',')}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.statusText}`);
      }

      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, [enabled, setAlerts, setLoading, setError]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchAlerts();
    }
  }, [enabled, fetchAlerts]);

  // Polling - pause when page is hidden
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(fetchAlerts, refreshInterval);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Fetch immediately when becoming visible, then resume polling
        fetchAlerts();
        startPolling();
      }
    };

    // Start polling
    startPolling();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchAlerts, refreshInterval, enabled]);

  return {
    alerts: getActiveAlerts(),
    isLoading,
    error,
    refetch: fetchAlerts,
    counts: getAlertCounts(),
  };
}
