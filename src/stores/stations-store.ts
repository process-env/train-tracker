'use client';

import { create } from 'zustand';
import type { Stop, Route } from '@/types/mta';

interface StationsState {
  // Data
  stations: Record<string, Stop>;
  routes: Record<string, Route>;
  parentStations: string[]; // IDs of parent stations only

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  loadStaticData: () => Promise<void>;
  getStationsByRoute: (routeId: string) => Stop[];
  searchStations: (query: string) => Stop[];
}

export const useStationsStore = create<StationsState>((set, get) => ({
  stations: {},
  routes: {},
  parentStations: [],
  isLoading: false,
  error: null,

  loadStaticData: async () => {
    const { stations } = get();
    if (Object.keys(stations).length > 0) return; // Already loaded

    set({ isLoading: true, error: null });

    try {
      // Load stops, routes, and enriched station names in parallel
      const [stopsRes, routesRes, enrichedRes] = await Promise.all([
        fetch('/api/v1/stops'),
        fetch('/api/v1/routes'),
        fetch('/data/stations-enriched.json').catch(() => null),
      ]);

      if (!stopsRes.ok || !routesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const stops: Stop[] = await stopsRes.json();
      const routes: Route[] = await routesRes.json();

      // Parse enriched data (optional, graceful fallback)
      let enrichedData: Record<string, { enrichedName: string }> = {};
      if (enrichedRes?.ok) {
        try {
          enrichedData = await enrichedRes.json();
        } catch {
          // Enriched data failed to parse, continue without it
        }
      }

      const stationsDict: Record<string, Stop> = {};
      const parentIds: string[] = [];

      for (const stop of stops) {
        // Merge enriched name if available
        const enrichment = enrichedData[stop.id];
        stationsDict[stop.id] = {
          ...stop,
          enrichedName: enrichment?.enrichedName,
        };
        // Parent stations have no parent and ID is just numbers
        if (!stop.parent && /^\d+$/.test(stop.id)) {
          parentIds.push(stop.id);
        }
      }

      const routesDict = Object.fromEntries(
        routes.map((r) => [r.route_id, r])
      );

      set({
        stations: stationsDict,
        routes: routesDict,
        parentStations: parentIds,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  getStationsByRoute: (routeId: string) => {
    const { stations } = get();
    const upperRoute = routeId.toUpperCase();
    return Object.values(stations).filter((s) => {
      if (!s.routes) return false;
      const routes = s.routes.split(/[,\s]+/).map((r) => r.toUpperCase());
      return routes.includes(upperRoute);
    });
  },

  searchStations: (query: string) => {
    const { stations, parentStations } = get();
    const lowerQuery = query.toLowerCase();
    return parentStations
      .map((id) => stations[id])
      .filter((s) => s && (
        s.name.toLowerCase().includes(lowerQuery) ||
        s.enrichedName?.toLowerCase().includes(lowerQuery)
      ))
      .slice(0, 20);
  },
}));
