'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { FeedEntity, TrainPosition } from '@/types/mta';
import { useTrainsStore } from '@/stores';

interface UseTrainPositionsOptions {
  refreshInterval?: number;
  enabled?: boolean;
}

// Calculate train positions client-side from feed data
function calculatePositions(
  feedEntities: FeedEntity[],
  stopsDict: Record<string, { lat: number; lon: number; name: string }>
): TrainPosition[] {
  const now = Date.now();
  const positions: TrainPosition[] = [];

  for (const entity of feedEntities) {
    const { routeId, tripId, stopUpdates } = entity;

    if (!routeId || !tripId || !stopUpdates || stopUpdates.length < 2) {
      continue;
    }

    // Find stops the train is between
    let prevStop: (typeof stopUpdates)[0] | null = null;
    let nextStop: (typeof stopUpdates)[0] | null = null;

    for (let i = 0; i < stopUpdates.length; i++) {
      const stop = stopUpdates[i];
      const arrivalTime = stop.arrival?.time
        ? new Date(stop.arrival.time).getTime()
        : null;

      if (arrivalTime && arrivalTime > now) {
        nextStop = stop;
        prevStop = stopUpdates[i - 1] || null;
        break;
      }
    }

    if (!prevStop?.stopId || !nextStop?.stopId) continue;

    const prevStopData = stopsDict[prevStop.stopId];
    const nextStopData = stopsDict[nextStop.stopId];

    if (!prevStopData || !nextStopData) continue;

    const prevTime = prevStop.departure?.time || prevStop.arrival?.time;
    const nextTime = nextStop.arrival?.time;

    if (!prevTime || !nextTime) continue;

    const prevTimeMs = new Date(prevTime).getTime();
    const nextTimeMs = new Date(nextTime).getTime();
    const totalDuration = nextTimeMs - prevTimeMs;

    if (totalDuration <= 0) continue;

    const elapsed = now - prevTimeMs;
    const progress = Math.max(0, Math.min(1, elapsed / totalDuration));

    const lat = prevStopData.lat + (nextStopData.lat - prevStopData.lat) * progress;
    const lon = prevStopData.lon + (nextStopData.lon - prevStopData.lon) * progress;

    // Calculate heading
    const dLon = ((nextStopData.lon - prevStopData.lon) * Math.PI) / 180;
    const lat1Rad = (prevStopData.lat * Math.PI) / 180;
    const lat2Rad = (nextStopData.lat * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    let heading = (Math.atan2(y, x) * 180) / Math.PI;
    heading = (heading + 360) % 360;

    positions.push({
      tripId,
      routeId,
      lat,
      lon,
      heading,
      nextStopId: nextStop.stopId,
      nextStopName: nextStopData.name || nextStop.stopId,
      eta: nextTime,
    });
  }

  return positions;
}

export function useTrainPositions(
  groupIds: string[] = ['ACE', 'BDFM', 'G', 'JZ', 'NQRW', 'L', 'SI', '1234567'],
  options: UseTrainPositionsOptions = {}
) {
  const { refreshInterval = 15000, enabled = true } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stopsDict, setStopsDict] = useState<
    Record<string, { lat: number; lon: number; name: string }>
  >({});

  // Use refs to store stable values that don't cause re-renders
  const groupIdsRef = useRef(groupIds);
  groupIdsRef.current = groupIds;

  const { trains, updateTrains, setFeedTimestamp } = useTrainsStore();

  // Load stops dictionary
  useEffect(() => {
    async function loadStops() {
      try {
        const response = await fetch('/api/v1/stops');
        if (response.ok) {
          const stops = await response.json();
          const dict: Record<string, { lat: number; lon: number; name: string }> = {};
          for (const stop of stops) {
            dict[stop.id] = { lat: stop.lat, lon: stop.lon, name: stop.name };
          }
          setStopsDict(dict);
        }
      } catch (err) {
        console.error('Failed to load stops:', err);
      }
    }
    loadStops();
  }, []);

  const fetchPositions = useCallback(async () => {
    if (!enabled || Object.keys(stopsDict).length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const allPositions: TrainPosition[] = [];

      await Promise.all(
        groupIdsRef.current.map(async (groupId) => {
          try {
            const response = await fetch(`/api/v1/feed/${groupId}`);
            if (!response.ok) return;

            const feedEntities: FeedEntity[] = await response.json();
            const positions = calculatePositions(feedEntities, stopsDict);
            allPositions.push(...positions);

            setFeedTimestamp(groupId, new Date().toISOString());
          } catch (err) {
            console.error(`Failed to fetch ${groupId}:`, err);
          }
        })
      );

      updateTrains(allPositions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [stopsDict, enabled, updateTrains, setFeedTimestamp]);

  // Initial fetch
  useEffect(() => {
    if (Object.keys(stopsDict).length > 0) {
      fetchPositions();
    }
  }, [stopsDict, fetchPositions]);

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
