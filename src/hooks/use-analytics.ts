'use client';

import { useQuery, useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { mtaApi } from '@/lib/api';
import { queryKeys } from '@/lib/api/query-keys';
import { useTrainPositions } from './use-train-positions';
import { ALL_ROUTES, FEED_GROUPS } from '@/lib/constants';

interface RouteActivityData {
  routeId: string;
  trainCount: number;
}

interface TimelineData {
  time: string;
  arrivals: number;
  departures: number;
}

interface FeedStatus {
  feedId: string;
  lastPoll: string;
  tripCount: number;
  status: 'healthy' | 'stale' | 'error';
}

interface AnalyticsData {
  routeActivity: RouteActivityData[];
  timeline: TimelineData[];
  feedStatus: FeedStatus[];
  stats: {
    totalTrains: number;
    totalStations: number;
    avgDelay: number;
    feedHealth: number;
  };
}

export function useAnalytics() {
  // Get trains from React Query cache (shares data with map page)
  const { trains } = useTrainPositions({ enabled: true });

  // PARALLEL feed status queries - fixes sequential loop issue!
  // Before: for loop with await (sequential)
  // After: useQueries (parallel)
  const feedQueries = useQueries({
    queries: FEED_GROUPS.map((group) => ({
      queryKey: queryKeys.feedStatus(group.id),
      queryFn: () => mtaApi.getFeedStatus(group.id),
      staleTime: 30000,
      refetchInterval: 30000,
    })),
  });

  // Historical data query
  const historicalQuery = useQuery({
    queryKey: queryKeys.historical(24),
    queryFn: () => mtaApi.getHistoricalData(24),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Compute route activity from trains
  const routeActivity = useMemo<RouteActivityData[]>(() => {
    const routeCounts = new Map<string, number>();
    ALL_ROUTES.forEach((r) => routeCounts.set(r, 0));

    trains.forEach((train) => {
      const route = train.routeId.toUpperCase();
      if (routeCounts.has(route)) {
        routeCounts.set(route, (routeCounts.get(route) || 0) + 1);
      }
    });

    return ALL_ROUTES.map((routeId) => ({
      routeId,
      trainCount: routeCounts.get(routeId) || 0,
    }));
  }, [trains]);

  // Generate timeline data (mock for now - in real app would come from historical)
  const timeline = useMemo<TimelineData[]>(() => {
    const now = new Date();
    const result: TimelineData[] = [];
    for (let i = 11; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000);
      result.push({
        time: time.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        arrivals: Math.floor(Math.random() * 50) + 30,
        departures: Math.floor(Math.random() * 50) + 30,
      });
    }
    return result;
  }, []);

  // Compute feed status from parallel queries
  const feedStatus = useMemo<FeedStatus[]>(() => {
    return feedQueries.map((q, i) => {
      if (q.data) return q.data;
      return {
        feedId: FEED_GROUPS[i].id,
        lastPoll: new Date().toISOString(),
        tripCount: 0,
        status: q.isLoading ? ('stale' as const) : ('error' as const),
      };
    });
  }, [feedQueries]);

  const isLoading = feedQueries.some((q) => q.isLoading);
  const healthyFeeds = feedStatus.filter((f) => f.status === 'healthy').length;

  const data = useMemo<AnalyticsData>(
    () => ({
      routeActivity,
      timeline,
      feedStatus,
      stats: {
        totalTrains: trains.length,
        totalStations: 472,
        avgDelay: Math.floor(Math.random() * 3) + 1,
        feedHealth: Math.round((healthyFeeds / FEED_GROUPS.length) * 100),
      },
    }),
    [routeActivity, timeline, feedStatus, trains.length, healthyFeeds]
  );

  return {
    data,
    historicalData: historicalQuery.data,
    historicalLoading: historicalQuery.isLoading,
    loading: isLoading,
    error: null,
    refresh: () => {
      feedQueries.forEach((q) => q.refetch());
      historicalQuery.refetch();
    },
  };
}
