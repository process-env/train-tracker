import { NextRequest, NextResponse } from 'next/server';
import { parseQueryParams, historicalQuerySchema } from '@/lib/validation/schemas';
import { calculateDelaysBatch } from '@/lib/mta/schedule-lookup';
import {
  calculateEconomicImpact,
  calculateEnvironmentalImpact,
  calculateDelayDistribution,
  delayDistributionToChartData,
} from '@/lib/analytics/impact-calculator';

/**
 * GET /api/v1/analytics/historical
 *
 * Get historical analytics data from collected snapshots
 * Query params:
 * - hours: Number of hours to look back (default: 24, max: 168)
 *
 * Performance: Results are cached server-side for 5 minutes to reduce DB load
 */

// Server-side cache for historical data
interface CacheEntry {
  data: Record<string, unknown>;
  timestamp: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedResponse(key: string): Record<string, unknown> | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedResponse(key: string, data: Record<string, unknown>): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Validate query params
    const validation = parseQueryParams(searchParams, historicalQuerySchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { hours } = validation.data;

    // Check cache first
    const cacheKey = `historical-${hours}`;
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Dynamic import to avoid Turbopack module evaluation issues
    const { db } = await import('@/lib/db');

    const since = new Date();
    since.setHours(since.getHours() - hours);

    // Get snapshots and group by hour in JS (simpler than raw SQL)
    const snapshots = await db.trainSnapshot.findMany({
      where: { createdAt: { gte: since } },
      select: { tripId: true, routeId: true, createdAt: true },
    }).catch(() => []);

    // Group by hour
    const hourlyData = new Map<string, { trains: Set<string>; routes: Set<string> }>();
    for (const snap of snapshots) {
      const hourKey = new Date(snap.createdAt).toISOString().slice(0, 13) + ':00:00.000Z';
      if (!hourlyData.has(hourKey)) {
        hourlyData.set(hourKey, { trains: new Set(), routes: new Set() });
      }
      const data = hourlyData.get(hourKey)!;
      data.trains.add(snap.tripId);
      data.routes.add(snap.routeId);
    }

    const trainHistory = Array.from(hourlyData.entries())
      .map(([time, data]) => ({
        time,
        trainCount: data.trains.size,
        routeCount: data.routes.size,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    // Get route-level breakdown for the query period
    type RouteBreakdownItem = { routeId: string; _count: { tripId: number } };
    let routeBreakdown: RouteBreakdownItem[] = [];
    try {
      routeBreakdown = await db.trainSnapshot.groupBy({
        by: ['routeId'],
        where: { createdAt: { gte: since } },
        _count: { tripId: true },
        orderBy: { _count: { tripId: 'desc' } },
      }) as RouteBreakdownItem[];
    } catch {
      routeBreakdown = [];
    }

    // Get arrivals for delay calculation (include routeId for 3-tier fallback)
    // Use `since` (hours param) not hardcoded lastHour - data may be older
    const arrivals = await db.arrivalEvent.findMany({
      where: { recordedAt: { gte: since } },
      select: {
        tripId: true,
        stationId: true,
        routeId: true, // Needed for 3-tier fallback lookup
        predictedArrival: true,
        delaySeconds: true, // May already be calculated
      },
    }).catch(() => []);

    // Calculate delays: use pre-calculated if available, otherwise compute from schedule
    const delayValues: number[] = [];

    // Separate arrivals that need calculation
    const needsCalculation = arrivals.filter((a) => a.delaySeconds === null);
    const hasCalculation = arrivals.filter((a) => a.delaySeconds !== null);

    // Add pre-calculated delays
    for (const arr of hasCalculation) {
      delayValues.push(arr.delaySeconds!);
    }

    // Calculate delays for those without (compare to GTFS schedule using 3-tier fallback)
    if (needsCalculation.length > 0) {
      const batchInput = needsCalculation.map((arr) => ({
        tripId: arr.tripId,
        stationId: arr.stationId,
        routeId: arr.routeId, // Pass routeId for shape/direction fallback
        predictedArrival: new Date(arr.predictedArrival),
      }));

      const calculatedDelays = await calculateDelaysBatch(batchInput);
      for (const delay of calculatedDelays.values()) {
        delayValues.push(delay);
      }
    }

    // Use impact calculator for bucketing
    const delayStats = delayValues.length > 0
      ? calculateDelayDistribution(delayValues)
      : null;

    const delayDistribution = delayStats
      ? delayDistributionToChartData(delayStats)
      : [];

    // Get collection stats
    const [totalSnapshots, totalArrivals, totalAlerts, lastCollection] =
      await Promise.all([
        db.trainSnapshot.count(),
        db.arrivalEvent.count(),
        db.alertLog.count(),
        db.feedPollLog.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true, status: true },
        }),
      ]);

    // Get data range
    const [oldest, newest] = await Promise.all([
      db.trainSnapshot.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      db.trainSnapshot.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    // === All-Time Impact Metrics ===
    // Calculate impact based on ALL collected data
    const allTimeUniqueTrips = await db.trainSnapshot.findMany({
      distinct: ['tripId'],
      select: { tripId: true },
    }).catch(() => []);

    // Calculate impact metrics using all-time data
    const economicImpact = calculateEconomicImpact(totalSnapshots, allTimeUniqueTrips.length);
    const environmentalImpact = calculateEnvironmentalImpact(economicImpact.estimatedRiders);

    const responseData = {
      trainHistory,
      routeBreakdown: routeBreakdown.map((r) => ({
        routeId: r.routeId,
        count: r._count.tripId,
      })),
      delayDistribution,
      delayStats: delayStats ? {
        total: delayStats.total,
        onTimePercentage: delayStats.onTimePercentage,
      } : null,
      impactMetrics: {
        economic: economicImpact,
        environmental: environmentalImpact,
        period: 'all-time',
      },
      collectionStats: {
        totalSnapshots,
        totalArrivals,
        totalAlerts,
        lastCollection: lastCollection?.createdAt?.toISOString() || null,
        lastStatus: lastCollection?.status || null,
        dataRange: oldest && newest
          ? {
              from: oldest.createdAt.toISOString(),
              to: newest.createdAt.toISOString(),
              hours: Math.round(
                (newest.createdAt.getTime() - oldest.createdAt.getTime()) /
                  (1000 * 60 * 60)
              ),
            }
          : null,
      },
      timestamp: new Date().toISOString(),
    };

    // Cache the response
    setCachedResponse(cacheKey, responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Historical analytics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
