import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/v1/analytics/historical
 *
 * Get historical analytics data from collected snapshots
 * Query params:
 * - hours: Number of hours to look back (default: 24)
 */
export async function GET(request: NextRequest) {
  try {
    // Dynamic import to avoid Turbopack module evaluation issues
    const { db } = await import('@/lib/db');

    const searchParams = request.nextUrl.searchParams;
    const hours = parseInt(searchParams.get('hours') || '24', 10);

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

    // Get route-level breakdown for last hour
    const lastHour = new Date();
    lastHour.setHours(lastHour.getHours() - 1);

    const routeBreakdown = await db.trainSnapshot.groupBy({
      by: ['routeId'],
      where: { createdAt: { gte: lastHour } },
      _count: { tripId: true },
      orderBy: { _count: { tripId: 'desc' } },
    }).catch(() => []);

    // Get delay distribution from arrival events (simplified)
    const arrivals = await db.arrivalEvent.findMany({
      where: { recordedAt: { gte: lastHour } },
      select: { delaySeconds: true },
    }).catch(() => []);

    // Bucket delays
    const delayBuckets: Record<string, number> = {
      on_time: 0,
      '0-2 min': 0,
      '2-5 min': 0,
      '5-10 min': 0,
      '10+ min': 0,
      unknown: 0,
    };

    for (const arr of arrivals) {
      if (arr.delaySeconds === null) {
        delayBuckets.unknown++;
      } else if (arr.delaySeconds <= 0) {
        delayBuckets.on_time++;
      } else if (arr.delaySeconds <= 120) {
        delayBuckets['0-2 min']++;
      } else if (arr.delaySeconds <= 300) {
        delayBuckets['2-5 min']++;
      } else if (arr.delaySeconds <= 600) {
        delayBuckets['5-10 min']++;
      } else {
        delayBuckets['10+ min']++;
      }
    }

    const delayDistribution = Object.entries(delayBuckets)
      .filter(([, count]) => count > 0)
      .map(([bucket, count]) => ({ bucket, count }));

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

    return NextResponse.json({
      trainHistory,
      routeBreakdown: routeBreakdown.map((r) => ({
        routeId: r.routeId,
        count: r._count.tripId,
      })),
      delayDistribution,
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
    });
  } catch (error) {
    console.error('Historical analytics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
