'use client';

import { create } from 'zustand';
import type { TrainPosition, ArrivalItem, ArrivalBoard } from '@/types/mta';

interface TrainsState {
  // Real-time train positions
  trains: Record<string, TrainPosition>; // keyed by tripId

  // Arrivals by station
  arrivalsByStation: Record<string, ArrivalBoard>;

  // Feed timestamps
  lastFeedUpdate: Record<string, string>; // feedGroupId -> ISO timestamp

  // Actions
  updateTrains: (trains: TrainPosition[]) => void;
  updateArrivals: (stationId: string, data: ArrivalBoard) => void;
  setFeedTimestamp: (groupId: string, timestamp: string) => void;
  clearTrains: () => void;

  // Selectors
  getTrainsByRoute: (routeId: string) => TrainPosition[];
  getArrivalsForStation: (stationId: string) => ArrivalItem[];
}

export const useTrainsStore = create<TrainsState>((set, get) => ({
  trains: {},
  arrivalsByStation: {},
  lastFeedUpdate: {},

  updateTrains: (newTrains) =>
    set((state) => {
      const trains = { ...state.trains };
      for (const train of newTrains) {
        trains[train.tripId] = train;
      }
      return { trains };
    }),

  updateArrivals: (stationId, data) =>
    set((state) => ({
      arrivalsByStation: {
        ...state.arrivalsByStation,
        [stationId]: data,
      },
    })),

  setFeedTimestamp: (groupId, timestamp) =>
    set((state) => ({
      lastFeedUpdate: {
        ...state.lastFeedUpdate,
        [groupId]: timestamp,
      },
    })),

  clearTrains: () => set({ trains: {} }),

  getTrainsByRoute: (routeId) => {
    const { trains } = get();
    const upperRoute = routeId.toUpperCase();
    return Object.values(trains).filter(
      (t) => t.routeId.toUpperCase() === upperRoute
    );
  },

  getArrivalsForStation: (stationId) => {
    const { arrivalsByStation } = get();
    return arrivalsByStation[stationId]?.arrivals || [];
  },
}));
