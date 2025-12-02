import { useRef, useCallback, useEffect } from 'react';
import type maplibregl from 'maplibre-gl';

export interface TrainAnimState {
  marker: maplibregl.Marker;
  popup: maplibregl.Popup;
  fromLng: number;
  fromLat: number;
  toLng: number;
  toLat: number;
  startTime: number;
  isDwelling: boolean;
  routeId: string;
  nextStopName: string;
  eta: string;
  direction: 'N' | 'S' | null;
}

interface UseMapAnimationOptions {
  refreshInterval: number;
}

interface UseMapAnimationReturn {
  trainAnimsRef: React.MutableRefObject<Map<string, TrainAnimState>>;
  lerp: (start: number, end: number, t: number) => number;
  /** Call this to restart animation after updating train positions */
  scheduleAnimation: () => void;
}

/**
 * Hook to manage train animation loop using requestAnimationFrame
 * Provides smooth linear interpolation between position updates
 * Optimized to pause when all trains are dwelling (stopped at stations)
 */
export function useMapAnimation(
  mapLoaded: boolean,
  options: UseMapAnimationOptions
): UseMapAnimationReturn {
  const trainAnimsRef = useRef<Map<string, TrainAnimState>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  // Linear interpolation helper
  const lerp = useCallback((start: number, end: number, t: number) => {
    return start + (end - start) * t;
  }, []);

  // Check if any trains need animation (not dwelling and not at final position)
  const hasMovingTrains = useCallback(() => {
    const now = performance.now();
    for (const anim of trainAnimsRef.current.values()) {
      if (anim.isDwelling) continue;
      const elapsed = now - anim.startTime;
      const progress = elapsed / options.refreshInterval;
      // If progress < 1, train is still moving
      if (progress < 1) return true;
    }
    return false;
  }, [options.refreshInterval]);

  // Animation loop for constant linear train movement
  const animateTrains = useCallback(() => {
    const now = performance.now();
    let anyMoving = false;

    trainAnimsRef.current.forEach((anim) => {
      // Skip dwelling trains - they stay at their current position
      if (anim.isDwelling) return;

      const elapsed = now - anim.startTime;
      // Linear progress over the full refresh interval
      const progress = Math.min(elapsed / options.refreshInterval, 1);

      if (progress < 1) {
        anyMoving = true;
      }

      const currentLng = lerp(anim.fromLng, anim.toLng, progress);
      const currentLat = lerp(anim.fromLat, anim.toLat, progress);

      anim.marker.setLngLat([currentLng, currentLat]);
    });

    // Only continue animation loop if there are trains still moving
    if (anyMoving) {
      animationFrameRef.current = requestAnimationFrame(animateTrains);
    } else {
      isAnimatingRef.current = false;
    }
  }, [lerp, options.refreshInterval]);

  // Schedule animation (call after train positions are updated)
  const scheduleAnimation = useCallback(() => {
    if (!mapLoaded) return;

    // Don't start if already animating
    if (isAnimatingRef.current) return;

    // Check if there are trains to animate
    if (!hasMovingTrains()) return;

    isAnimatingRef.current = true;
    animationFrameRef.current = requestAnimationFrame(animateTrains);
  }, [mapLoaded, hasMovingTrains, animateTrains]);

  // Start animation loop when map loads (initial start)
  useEffect(() => {
    if (mapLoaded && trainAnimsRef.current.size > 0) {
      scheduleAnimation();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        isAnimatingRef.current = false;
      }
    };
  }, [mapLoaded, scheduleAnimation]);

  return {
    trainAnimsRef,
    lerp,
    scheduleAnimation,
  };
}
