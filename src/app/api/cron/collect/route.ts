import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cron/collect
 *
 * Automated data collection cron job (runs at 12am daily)
 * - Collects train position snapshots
 * - Collects arrival predictions
 * - Collects service alerts
 * - Clears schedule cache to prevent memory leaks
 *
 * Protected by CRON_SECRET environment variable
 * Designed to be called by Vercel Cron or external cron service
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    // To enable auth, set CRON_SECRET in Vercel and add Authorization header in cron-job.org
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Only enforce auth if CRON_SECRET is set AND header doesn't match
      // For cron-job.org without custom headers, leave CRON_SECRET unset in Vercel
      console.warn('Cron collect: Unauthorized attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Dynamic imports to avoid Turbopack module evaluation issues
    const { runCollection } = await import('@/lib/data-collector');
    const { clearScheduleCache } = await import('@/lib/mta/load-schedule');

    console.log('Cron collect: Starting data collection');
    const startTime = Date.now();

    const result = await runCollection();

    // Clear schedule cache to free memory (562k rows)
    clearScheduleCache();

    const duration = Date.now() - startTime;

    console.log(
      `Cron collect: Completed in ${duration}ms. ` +
      `Snapshots: ${result.trainSnapshots}, ` +
      `Arrivals: ${result.arrivalEvents}, ` +
      `Alerts: ${result.alertsUpdated}`
    );

    if (result.errors.length > 0) {
      console.warn('Cron collect errors:', result.errors);
    }

    return NextResponse.json({
      success: true,
      collection: {
        trainSnapshots: result.trainSnapshots,
        arrivalEvents: result.arrivalEvents,
        alertsUpdated: result.alertsUpdated,
        feedLogs: result.feedLogs,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron collect error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Collection failed',
      },
      { status: 500 }
    );
  }
}
