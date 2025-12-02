/**
 * Shared formatting utilities for MTA data display
 */

/**
 * Extract direction from stop ID suffix
 * MTA child stop IDs end with 'N' (northbound) or 'S' (southbound)
 * e.g., "101N" -> "N", "101S" -> "S", "101" -> null
 */
export function getDirectionFromStopId(stopId: string): 'N' | 'S' | null {
  if (!stopId) return null;
  const lastChar = stopId.slice(-1).toUpperCase();
  if (lastChar === 'N') return 'N';
  if (lastChar === 'S') return 'S';
  return null;
}

/**
 * Format ETA for display as relative time
 * @param eta - ISO date string
 * @param format - 'short' returns "1 min", 'long' returns "1 minute"
 */
export function formatEta(eta: string, format: 'short' | 'long' = 'short'): string {
  if (!eta) return 'Unknown';
  try {
    const etaDate = new Date(eta);
    // Check for invalid date
    if (isNaN(etaDate.getTime())) return eta;

    const now = new Date();
    const diffMs = etaDate.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins <= 0) return format === 'short' ? 'Arriving' : 'Arriving now';
    if (diffMins === 1) return format === 'short' ? '1 min' : '1 minute';
    return format === 'short' ? `${diffMins} mins` : `${diffMins} minutes`;
  } catch {
    return eta;
  }
}

/**
 * Format ETA as absolute time (e.g., "3:45 PM")
 */
export function formatTime(eta: string): string {
  if (!eta) return '--:--';
  try {
    const date = new Date(eta);
    // Check for invalid date
    if (isNaN(date.getTime())) return '--:--';

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '--:--';
  }
}

/**
 * Get human-readable direction label
 */
export function getDirectionLabel(direction: 'N' | 'S' | null): string {
  if (direction === 'N') return 'Northbound';
  if (direction === 'S') return 'Southbound';
  return 'Unknown';
}

/**
 * Get appropriate text color for a background color
 * Returns black for yellow backgrounds (NQRW line), white for all others
 */
export function getTextColorForBackground(bgColor: string): string {
  return bgColor === '#FCCC0A' ? '#000' : '#fff';
}

/**
 * Truncate string with ellipsis if longer than maxLength
 */
export function truncateWithEllipsis(str: string, maxLength: number): string {
  if (!str) return '';
  return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
}
