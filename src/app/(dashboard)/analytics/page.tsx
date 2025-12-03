'use client';

import { useState, useEffect, useCallback } from 'react';
import { Train, MapPin, Clock, Activity, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RouteActivityChart,
  ArrivalsTimelineChart,
  FeedStatusCard,
  StatsCard,
  AlertStatusCard,
  HistoricalDataCard,
  TrainHistoryChart,
  DelayDistributionChart,
} from '@/components/analytics';
import { useAnalytics } from '@/hooks/use-analytics';
import { useTrainPositions } from '@/hooks';

interface HistoricalData {
  trainHistory: Array<{ time: string; trainCount: number; routeCount: number }>;
  delayDistribution: Array<{ bucket: string; count: number }>;
  collectionStats: {
    totalSnapshots: number;
    totalArrivals: number;
    totalAlerts: number;
    lastCollection: string | null;
    lastStatus: string | null;
    dataRange: { from: string; to: string; hours: number } | null;
  } | null;
}

export default function AnalyticsPage() {
  // Start fetching train positions
  useTrainPositions();

  const { data, loading, error, refresh } = useAnalytics();

  // Historical data state
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);

  // Fetch historical data
  const fetchHistoricalData = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/analytics/historical?hours=24');
      if (res.ok) {
        const data = await res.json();
        setHistoricalData(data);
      }
    } catch (err) {
      console.error('Failed to fetch historical data:', err);
    }
  }, []);

  // Load historical data on mount
  useEffect(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <p className="text-destructive">Error: {error}</p>
          <Button onClick={refresh}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Real-time subway system metrics and performance
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
          </>
        ) : data ? (
          <>
            <StatsCard
              title="Active Trains"
              value={data.stats.totalTrains}
              icon={Train}
              description="Currently running"
            />
            <StatsCard
              title="Stations"
              value={data.stats.totalStations}
              icon={MapPin}
              description="Across all lines"
            />
            <StatsCard
              title="Avg Delay"
              value={`${data.stats.avgDelay} min`}
              icon={Clock}
              description="System-wide"
            />
            <StatsCard
              title="Feed Health"
              value={`${data.stats.feedHealth}%`}
              icon={Activity}
              description="Data sources active"
            />
          </>
        ) : null}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Route Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Train Count by Route</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px]" />
            ) : data ? (
              <RouteActivityChart data={data.routeActivity} />
            ) : null}
          </CardContent>
        </Card>

        {/* Arrivals Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Arrivals & Departures (Last Hour)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px]" />
            ) : data ? (
              <ArrivalsTimelineChart data={data.timeline} />
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feed Status */}
        {loading ? (
          <Skeleton className="h-[300px]" />
        ) : data ? (
          <FeedStatusCard feeds={data.feedStatus} />
        ) : null}

        {/* Alert Status */}
        <AlertStatusCard />
      </div>

      {/* Historical Data Section */}
      <div className="border-t pt-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">Historical Data</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Collection Stats */}
          <HistoricalDataCard stats={historicalData?.collectionStats || null} />

          {/* Delay Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Delay Distribution (Last Hour)</CardTitle>
            </CardHeader>
            <CardContent>
              <DelayDistributionChart data={historicalData?.delayDistribution || []} compact />
            </CardContent>
          </Card>

          {/* Train History Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Train Activity (Last 24 Hours)</CardTitle>
            </CardHeader>
            <CardContent>
              <TrainHistoryChart data={historicalData?.trainHistory || []} compact />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
