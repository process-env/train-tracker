'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTrainsStore } from '@/stores';
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
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { trains } = useTrainsStore();

  const fetchAnalytics = useCallback(async () => {
    try {
      // Calculate route activity from current trains
      const routeCounts = new Map<string, number>();
      ALL_ROUTES.forEach((r) => routeCounts.set(r, 0));

      const trainsList = Object.values(trains);
      trainsList.forEach((train) => {
        const route = train.routeId.toUpperCase();
        if (routeCounts.has(route)) {
          routeCounts.set(route, (routeCounts.get(route) || 0) + 1);
        }
      });

      const routeActivity: RouteActivityData[] = ALL_ROUTES.map((routeId) => ({
        routeId,
        trainCount: routeCounts.get(routeId) || 0,
      }));

      // Generate mock timeline data (in real app, this would come from DB)
      const now = new Date();
      const timeline: TimelineData[] = [];
      for (let i = 11; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 5 * 60 * 1000);
        timeline.push({
          time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          arrivals: Math.floor(Math.random() * 50) + 30,
          departures: Math.floor(Math.random() * 50) + 30,
        });
      }

      // Fetch feed status from API
      const feedStatus: FeedStatus[] = [];
      for (const group of FEED_GROUPS) {
        try {
          const response = await fetch(`/api/v1/feed/${group.id}`);
          if (response.ok) {
            const feedData = await response.json();
            feedStatus.push({
              feedId: group.id,
              lastPoll: new Date().toISOString(),
              tripCount: Array.isArray(feedData) ? feedData.length : 0,
              status: 'healthy',
            });
          } else {
            feedStatus.push({
              feedId: group.id,
              lastPoll: new Date().toISOString(),
              tripCount: 0,
              status: 'error',
            });
          }
        } catch {
          feedStatus.push({
            feedId: group.id,
            lastPoll: new Date().toISOString(),
            tripCount: 0,
            status: 'error',
          });
        }
      }

      const healthyFeeds = feedStatus.filter((f) => f.status === 'healthy').length;

      const totalTrains = Object.keys(trains).length;

      setData({
        routeActivity,
        timeline,
        feedStatus,
        stats: {
          totalTrains,
          totalStations: 472, // NYC subway has ~472 stations
          avgDelay: Math.floor(Math.random() * 3) + 1, // Mock delay
          feedHealth: Math.round((healthyFeeds / FEED_GROUPS.length) * 100),
        },
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [trains]);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  return { data, loading, error, refresh: fetchAnalytics };
}
