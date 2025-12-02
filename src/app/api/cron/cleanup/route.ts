import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cron/cleanup
 *
 * Automated data cleanup cron job
 * - Removes train snapshots older than 30 days
 * - Removes arrival events older than 30 days
 * - Removes feed poll logs older than 30 days
 *
 * Protected by CRON_SECRET environment variable
 * Designed to be called by Vercel Cron or external cron service
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In development, allow without secret
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.warn('Cron cleanup: Unauthorized attempt');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Dynamic import to avoid Turbopack module evaluation issues
    const { cleanupOldData } = await import('@/lib/data-collector');

    // Default retention: 30 days
    const daysToKeep = parseInt(process.env.DATA_RETENTION_DAYS || '30', 10);

    console.log(`Cron cleanup: Starting cleanup (keeping ${daysToKeep} days)`);
    const startTime = Date.now();

    const result = await cleanupOldData(daysToKeep);

    const duration = Date.now() - startTime;

    console.log(
      `Cron cleanup: Completed in ${duration}ms. ` +
      `Deleted: ${result.trainSnapshots} snapshots, ` +
      `${result.arrivalEvents} arrivals, ` +
      `${result.feedLogs} feed logs`
    );

    return NextResponse.json({
      success: true,
      deleted: {
        trainSnapshots: result.trainSnapshots,
        arrivalEvents: result.arrivalEvents,
        feedLogs: result.feedLogs,
      },
      daysKept: daysToKeep,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron cleanup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Cleanup failed',
      },
      { status: 500 }
    );
  }
}
