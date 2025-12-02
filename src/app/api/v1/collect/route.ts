import { NextRequest, NextResponse } from 'next/server';
import { runCollection, cleanupOldData } from '@/lib/data-collector';

/**
 * POST /api/v1/collect
 *
 * Trigger a data collection cycle. Collects:
 * - Train position snapshots
 * - Arrival predictions
 * - Service alerts
 *
 * Optionally clean up old data with ?cleanup=true&days=30
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shouldCleanup = searchParams.get('cleanup') === 'true';
    const daysToKeep = parseInt(searchParams.get('days') || '30', 10);

    // Run collection
    const result = await runCollection();

    // Optionally cleanup old data
    let cleanupResult = null;
    if (shouldCleanup) {
      cleanupResult = await cleanupOldData(daysToKeep);
    }

    return NextResponse.json({
      success: true,
      collection: {
        trainSnapshots: result.trainSnapshots,
        arrivalEvents: result.arrivalEvents,
        alertsUpdated: result.alertsUpdated,
        feedLogs: result.feedLogs,
        durationMs: result.duration,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
      cleanup: cleanupResult
        ? {
            trainSnapshotsDeleted: cleanupResult.trainSnapshots,
            arrivalEventsDeleted: cleanupResult.arrivalEvents,
            feedLogsDeleted: cleanupResult.feedLogs,
            daysKept: daysToKeep,
          }
        : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Collection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/collect/stats
 *
 * Get collection statistics
 */
export async function GET() {
  try {
    const { db } = await import('@/lib/db');

    // Get counts and recent activity
    const [
      totalSnapshots,
      totalArrivals,
      totalAlerts,
      activeAlerts,
      recentPolls,
      oldestSnapshot,
      newestSnapshot,
    ] = await Promise.all([
      db.trainSnapshot.count(),
      db.arrivalEvent.count(),
      db.alertLog.count(),
      db.alertLog.count({ where: { isActive: true } }),
      db.feedPollLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          feedGroupId: true,
          status: true,
          entityCount: true,
          latencyMs: true,
          createdAt: true,
        },
      }),
      db.trainSnapshot.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      db.trainSnapshot.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    // Calculate data range
    const dataRange = oldestSnapshot && newestSnapshot
      ? {
          from: oldestSnapshot.createdAt.toISOString(),
          to: newestSnapshot.createdAt.toISOString(),
          days: Math.ceil(
            (newestSnapshot.createdAt.getTime() - oldestSnapshot.createdAt.getTime()) /
              (1000 * 60 * 60 * 24)
          ),
        }
      : null;

    return NextResponse.json({
      counts: {
        trainSnapshots: totalSnapshots,
        arrivalEvents: totalArrivals,
        alertsTotal: totalAlerts,
        alertsActive: activeAlerts,
      },
      dataRange,
      recentPolls: recentPolls.map((p) => ({
        feedGroupId: p.feedGroupId,
        status: p.status,
        entityCount: p.entityCount,
        latencyMs: p.latencyMs,
        timestamp: p.createdAt.toISOString(),
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
