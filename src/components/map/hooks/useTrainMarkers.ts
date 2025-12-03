import { useEffect, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import { getRouteColor, MAP_CONSTANTS } from '@/lib/constants';
import { getDirectionFromStopId, formatEta, getDirectionLabel, getTextColorForBackground } from '@/lib/mta/format';
import { useUIStore } from '@/stores';
import type { TrainPosition } from '@/types/mta';
import type { TrainAnimState } from './useMapAnimation';

export interface UseTrainMarkersOptions {
  trains: TrainPosition[];
  selectedRouteIds: string[];
  selectedTrainId: string | null;
  setSelectedTrain: (tripId: string | null) => void;
  refreshInterval: number;
  scheduleAnimation: () => void;
}

export interface UseTrainMarkersReturn {
  /** Number of trains currently displayed on the map */
  visibleTrainCount: number;
}

/**
 * Hook to manage train markers with smooth animation
 * Handles creation, updates, animation state, and cleanup
 */
export function useTrainMarkers(
  map: maplibregl.Map | null,
  mapLoaded: boolean,
  trainAnimsRef: React.MutableRefObject<Map<string, TrainAnimState>>,
  lerp: (start: number, end: number, t: number) => number,
  options: UseTrainMarkersOptions
): UseTrainMarkersReturn {
  const {
    trains,
    selectedRouteIds,
    selectedTrainId,
    setSelectedTrain,
    refreshInterval,
    scheduleAnimation,
  } = options;

  // Helper to calculate distance between two points (simple Euclidean for small distances)
  const getDistance = useCallback((lng1: number, lat1: number, lng2: number, lat2: number) => {
    return Math.sqrt(Math.pow(lng2 - lng1, 2) + Math.pow(lat2 - lat1, 2));
  }, []);

  // Update train markers with constant linear motion
  useEffect(() => {
    if (!mapLoaded || !map) return;

    // Filter trains by selected routes
    const filteredTrains = selectedRouteIds.length > 0
      ? trains.filter((t) => selectedRouteIds.includes(t.routeId.toUpperCase()))
      : trains;

    const currentTripIds = new Set(filteredTrains.map((t) => t.tripId));
    const now = performance.now();

    // Remove old markers, popups, and animations
    trainAnimsRef.current.forEach((anim, tripId) => {
      if (!currentTripIds.has(tripId)) {
        anim.popup.remove();
        anim.marker.remove();
        trainAnimsRef.current.delete(tripId);
      }
    });

    // Update or create markers with animation
    filteredTrains.forEach((train) => {
      const existingAnim = trainAnimsRef.current.get(train.tripId);

      if (existingAnim) {
        // Get current interpolated position as new start point
        const elapsed = now - existingAnim.startTime;
        const progress = Math.min(elapsed / refreshInterval, 1);

        const currentLng = lerp(existingAnim.fromLng, existingAnim.toLng, progress);
        const currentLat = lerp(existingAnim.fromLat, existingAnim.toLat, progress);

        // Check if train is dwelling (moved very little)
        const distance = getDistance(currentLng, currentLat, train.lon, train.lat);
        const isDwelling = distance < MAP_CONSTANTS.DWELLING_THRESHOLD;

        // Update animation to lerp from current position to new target
        existingAnim.fromLng = currentLng;
        existingAnim.fromLat = currentLat;
        existingAnim.toLng = train.lon;
        existingAnim.toLat = train.lat;
        existingAnim.startTime = now;
        existingAnim.isDwelling = isDwelling;

        // Update popup content with latest train data
        const direction = getDirectionFromStopId(train.nextStopId);
        const color = getRouteColor(train.routeId);

        existingAnim.nextStopName = train.nextStopName;
        existingAnim.eta = train.eta;
        existingAnim.direction = direction;

        existingAnim.popup.setHTML(createPopupHTML(train, color));
      } else {
        // Create new marker
        const color = getRouteColor(train.routeId);
        const direction = getDirectionFromStopId(train.nextStopId);

        const el = document.createElement('div');
        el.className = 'train-marker';
        el.style.cssText = `
          width: 22px;
          height: 22px;
          background-color: ${color};
          border: 2px solid white;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          color: ${getTextColorForBackground(color)};
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          cursor: pointer;
        `;
        el.textContent = train.routeId;

        // Create popup with train metadata
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: MAP_CONSTANTS.POPUP_OFFSET_TRAIN,
          className: 'train-popup',
        }).setHTML(createPopupHTML(train, color));

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([train.lon, train.lat])
          .addTo(map);

        // Show popup on hover
        el.addEventListener('mouseenter', () => {
          marker.setPopup(popup).togglePopup();
        });
        el.addEventListener('mouseleave', () => {
          popup.remove();
        });

        // Click to select train and show detail panel
        // Use getState() to avoid stale closure - always get fresh selectedTrainId
        el.addEventListener('click', () => {
          const currentSelectedId = useUIStore.getState().selectedTrainId;
          setSelectedTrain(train.tripId === currentSelectedId ? null : train.tripId);
        });

        // Add animation state - new trains start as not dwelling
        trainAnimsRef.current.set(train.tripId, {
          marker,
          popup,
          fromLng: train.lon,
          fromLat: train.lat,
          toLng: train.lon,
          toLat: train.lat,
          startTime: now,
          isDwelling: false,
          routeId: train.routeId,
          nextStopName: train.nextStopName,
          eta: train.eta,
          direction,
        });
      }
    });

    // Restart animation loop after position updates
    scheduleAnimation();
  }, [mapLoaded, map, trains, selectedRouteIds, lerp, getDistance, refreshInterval, selectedTrainId, setSelectedTrain, trainAnimsRef, scheduleAnimation]);

  // Memoize visible train count for consistent return value
  const visibleTrainCount = useMemo(() => {
    if (selectedRouteIds.length === 0) return trains.length;
    return trains.filter((t) => selectedRouteIds.includes(t.routeId.toUpperCase())).length;
  }, [trains, selectedRouteIds]);

  return { visibleTrainCount };
}

/**
 * Creates HTML for train popup
 */
function createPopupHTML(train: TrainPosition, color: string): string {
  // Use headsign if available, otherwise fall back to direction label
  const direction = getDirectionFromStopId(train.nextStopId);
  const destinationLabel = train.headsign || getDirectionLabel(direction);

  return `
    <div style="padding: 8px 12px; background: #1a1a1a; border-radius: 6px; min-width: 160px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="
          width: 24px;
          height: 24px;
          background-color: ${color};
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          color: ${getTextColorForBackground(color)};
        ">${train.routeId}</div>
        <span style="color: #888; font-size: 12px;">${destinationLabel}</span>
      </div>
      <div style="color: white; font-size: 13px; margin-bottom: 4px;">
        <strong>Next:</strong> ${train.nextStopName || 'Unknown'}
      </div>
      <div style="color: #4ade80; font-size: 13px; font-weight: 500;">
        ETA: ${formatEta(train.eta)}
      </div>
    </div>
  `;
}
