import fs from 'fs/promises';
import path from 'path';
import { parse as csvParse } from 'csv-parse/sync';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const STOP_TIMES_CSV = path.join(DATA_DIR, 'stop_times.txt');
const TRIPS_CSV = path.join(DATA_DIR, 'trips.txt');

// ============================================================================
// Types
// ============================================================================

interface ScheduleEntry {
  arrivalMinutes: number; // Minutes from midnight
  departureMinutes: number;
  stopSequence: number;
}

// ============================================================================
// Cache
// ============================================================================

// Key: "tripIdSuffix:stopId" → ScheduleEntry
let scheduleCache: Map<string, ScheduleEntry> | null = null;

// Key: "tripIdSuffix" → routeId
let tripRouteCache: Map<string, string> | null = null;

// ============================================================================
// Utilities
// ============================================================================

/**
 * Parse GTFS time string (HH:MM:SS) to minutes from midnight.
 * GTFS allows times > 24:00:00 for trips past midnight.
 */
function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

/**
 * Extract trip ID suffix for matching GTFS-RT trip IDs.
 * Full format: "AFA25GEN-1038-Sunday-00_000600_1..S03R"
 * Suffix: "000600_1..S03R"
 */
function extractTripSuffix(fullTripId: string): string | null {
  const match = fullTripId.match(/-00_(.+)$/);
  return match ? match[1] : null;
}

/**
 * Normalize stop ID by removing N/S suffix for matching.
 * "101N" or "101S" → "101"
 */
function normalizeStopId(stopId: string): string {
  return stopId.replace(/[NS]$/, '');
}

// ============================================================================
// Data Loading
// ============================================================================

/**
 * Load schedule data and build lookup cache.
 */
async function loadScheduleData(): Promise<void> {
  if (scheduleCache && tripRouteCache) return;

  console.log('Loading schedule data for delay calculation...');
  const startTime = Date.now();

  // Load trips first to get route mapping
  const tripsText = await fs.readFile(TRIPS_CSV, 'utf8');
  const tripsRows = csvParse(tripsText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  tripRouteCache = new Map();
  for (const row of tripsRows) {
    const suffix = extractTripSuffix(row.trip_id);
    if (suffix) {
      tripRouteCache.set(suffix, row.route_id);
    }
    tripRouteCache.set(row.trip_id, row.route_id);
  }

  // Load stop_times
  const stopTimesText = await fs.readFile(STOP_TIMES_CSV, 'utf8');
  const stopTimesRows = csvParse(stopTimesText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  scheduleCache = new Map();
  for (const row of stopTimesRows) {
    const suffix = extractTripSuffix(row.trip_id);
    const baseStopId = normalizeStopId(row.stop_id);

    const entry: ScheduleEntry = {
      arrivalMinutes: parseTimeToMinutes(row.arrival_time),
      departureMinutes: parseTimeToMinutes(row.departure_time),
      stopSequence: parseInt(row.stop_sequence, 10),
    };

    // Store by both full trip ID and suffix
    const fullKey = `${row.trip_id}:${baseStopId}`;
    const suffixKey = suffix ? `${suffix}:${baseStopId}` : null;

    scheduleCache.set(fullKey, entry);
    if (suffixKey) {
      scheduleCache.set(suffixKey, entry);
    }

    // Also store with original stop ID (with N/S)
    const fullKeyOriginal = `${row.trip_id}:${row.stop_id}`;
    const suffixKeyOriginal = suffix ? `${suffix}:${row.stop_id}` : null;
    scheduleCache.set(fullKeyOriginal, entry);
    if (suffixKeyOriginal) {
      scheduleCache.set(suffixKeyOriginal, entry);
    }
  }

  console.log(`Schedule data loaded in ${Date.now() - startTime}ms (${scheduleCache.size} entries)`);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get the scheduled arrival time for a trip at a specific stop.
 *
 * @param tripId - GTFS-RT trip ID (e.g., "000600_1..S03R")
 * @param stopId - Stop ID (e.g., "101N" or "101")
 * @param referenceDate - Date to construct the full timestamp
 * @returns Scheduled arrival as Date, or null if not found
 */
export async function getScheduledArrival(
  tripId: string,
  stopId: string,
  referenceDate: Date
): Promise<Date | null> {
  await loadScheduleData();

  const baseStopId = normalizeStopId(stopId);

  // Try different key combinations
  const keys = [
    `${tripId}:${stopId}`,
    `${tripId}:${baseStopId}`,
  ];

  let entry: ScheduleEntry | undefined;
  for (const key of keys) {
    entry = scheduleCache!.get(key);
    if (entry) break;
  }

  if (!entry) return null;

  // Construct full Date from minutes and reference date
  const scheduled = new Date(referenceDate);
  scheduled.setHours(0, 0, 0, 0);
  scheduled.setMinutes(entry.arrivalMinutes);

  return scheduled;
}

/**
 * Calculate delay in seconds between actual arrival and scheduled arrival.
 *
 * @param tripId - GTFS-RT trip ID
 * @param stopId - Stop ID
 * @param actualArrival - Actual/predicted arrival time
 * @returns Delay in seconds (positive = late), or null if schedule not found
 */
export async function calculateDelay(
  tripId: string,
  stopId: string,
  actualArrival: Date
): Promise<number | null> {
  const scheduled = await getScheduledArrival(tripId, stopId, actualArrival);

  if (!scheduled) return null;

  // Calculate delay in seconds
  const delayMs = actualArrival.getTime() - scheduled.getTime();
  return Math.round(delayMs / 1000);
}

/**
 * Calculate delays for multiple arrivals efficiently.
 *
 * @param arrivals - Array of arrival events
 * @returns Map of arrival index to delay seconds
 */
export async function calculateDelaysBatch(
  arrivals: Array<{ tripId: string; stationId: string; predictedArrival: Date }>
): Promise<Map<number, number>> {
  await loadScheduleData();

  const results = new Map<number, number>();

  for (let i = 0; i < arrivals.length; i++) {
    const arr = arrivals[i];
    const delay = await calculateDelay(arr.tripId, arr.stationId, arr.predictedArrival);
    if (delay !== null) {
      results.set(i, delay);
    }
  }

  return results;
}

/**
 * Clear cache (for testing).
 */
export function clearScheduleCache(): void {
  scheduleCache = null;
  tripRouteCache = null;
}
