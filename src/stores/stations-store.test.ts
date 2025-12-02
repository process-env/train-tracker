import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStationsStore } from './stations-store';
import { createMockStop, createMockRoute } from '@/test/factories';

// Mock fetch
global.fetch = vi.fn();

describe('useStationsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset store state between tests
    useStationsStore.setState({
      stations: {},
      routes: {},
      parentStations: [],
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('has empty stations map', () => {
      expect(useStationsStore.getState().stations).toEqual({});
    });

    it('has empty routes map', () => {
      expect(useStationsStore.getState().routes).toEqual({});
    });

    it('has empty parentStations array', () => {
      expect(useStationsStore.getState().parentStations).toEqual([]);
    });

    it('has isLoading false', () => {
      expect(useStationsStore.getState().isLoading).toBe(false);
    });

    it('has null error', () => {
      expect(useStationsStore.getState().error).toBeNull();
    });
  });

  describe('loadStaticData', () => {
    it('sets isLoading to true during fetch', async () => {
      (global.fetch as any).mockImplementation(() =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, json: () => Promise.resolve([]) }), 100)
        )
      );

      const loadPromise = useStationsStore.getState().loadStaticData();

      // Check loading state immediately
      expect(useStationsStore.getState().isLoading).toBe(true);

      await loadPromise;
    });

    it('loads stations and routes', async () => {
      const mockStops = [
        createMockStop({ id: '101', name: 'Station A', parent: '' }),
        createMockStop({ id: '102', name: 'Station B', parent: '' }),
      ];
      const mockRoutes = [
        createMockRoute({ route_id: 'A' }),
        createMockRoute({ route_id: 'B' }),
      ];

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/v1/stops')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStops) });
        }
        if (url.includes('/api/v1/routes')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRoutes) });
        }
        return Promise.reject(new Error('Not found'));
      });

      await useStationsStore.getState().loadStaticData();

      const state = useStationsStore.getState();
      expect(Object.keys(state.stations)).toHaveLength(2);
      expect(Object.keys(state.routes)).toHaveLength(2);
      expect(state.isLoading).toBe(false);
    });

    it('identifies parent stations correctly', async () => {
      const mockStops = [
        createMockStop({ id: '101', parent: '' }), // Parent (numeric ID, no parent)
        createMockStop({ id: '101N', parent: '101' }), // Child
        createMockStop({ id: '101S', parent: '101' }), // Child
        createMockStop({ id: '102', parent: '' }), // Parent
        createMockStop({ id: 'A32', parent: '' }), // Not parent (alphanumeric)
      ];

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/v1/stops')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStops) });
        }
        if (url.includes('/api/v1/routes')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.reject(new Error('Not found'));
      });

      await useStationsStore.getState().loadStaticData();

      const { parentStations } = useStationsStore.getState();
      expect(parentStations).toContain('101');
      expect(parentStations).toContain('102');
      expect(parentStations).not.toContain('101N');
      expect(parentStations).not.toContain('A32');
    });

    it('skips loading if already loaded', async () => {
      // Pre-populate with data
      useStationsStore.setState({
        stations: { '101': createMockStop({ id: '101' }) },
      });

      await useStationsStore.getState().loadStaticData();

      // Fetch should not have been called
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('sets error on fetch failure', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/v1/stops')) {
          return Promise.resolve({ ok: false });
        }
        if (url.includes('/api/v1/routes')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.reject(new Error('Not found'));
      });

      await useStationsStore.getState().loadStaticData();

      const state = useStationsStore.getState();
      expect(state.error).toBe('Failed to fetch data');
      expect(state.isLoading).toBe(false);
    });

    it('handles enriched data gracefully', async () => {
      const mockStops = [createMockStop({ id: '101', name: 'Station A' })];
      const enrichedData = { '101': { enrichedName: 'Station A (Uptown)' } };

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/v1/stops')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStops) });
        }
        if (url.includes('/api/v1/routes')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('stations-enriched.json')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(enrichedData) });
        }
        return Promise.reject(new Error('Not found'));
      });

      await useStationsStore.getState().loadStaticData();

      const { stations } = useStationsStore.getState();
      expect(stations['101'].enrichedName).toBe('Station A (Uptown)');
    });

    it('continues without enriched data on failure', async () => {
      const mockStops = [createMockStop({ id: '101', name: 'Station A' })];

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/v1/stops')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStops) });
        }
        if (url.includes('/api/v1/routes')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('stations-enriched.json')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.reject(new Error('Not found'));
      });

      await useStationsStore.getState().loadStaticData();

      const { stations, error } = useStationsStore.getState();
      expect(stations['101']).toBeDefined();
      expect(error).toBeNull(); // Should not fail
    });
  });

  describe('getStationsByRoute', () => {
    beforeEach(() => {
      useStationsStore.setState({
        stations: {
          '101': createMockStop({ id: '101', routes: 'A,C,E' }),
          '102': createMockStop({ id: '102', routes: 'A,B' }),
          '103': createMockStop({ id: '103', routes: 'B,D' }),
          '104': createMockStop({ id: '104', routes: '' }),
        },
      });
    });

    it('returns stations for a route', () => {
      const stations = useStationsStore.getState().getStationsByRoute('A');
      expect(stations).toHaveLength(2);
    });

    it('is case-insensitive', () => {
      const stations = useStationsStore.getState().getStationsByRoute('a');
      expect(stations).toHaveLength(2);
    });

    it('returns empty array for unknown route', () => {
      const stations = useStationsStore.getState().getStationsByRoute('Z');
      expect(stations).toHaveLength(0);
    });

    it('handles stations with no routes', () => {
      const stations = useStationsStore.getState().getStationsByRoute('A');
      expect(stations.find((s) => s.id === '104')).toBeUndefined();
    });

    it('handles comma-separated routes', () => {
      const stations = useStationsStore.getState().getStationsByRoute('E');
      expect(stations).toHaveLength(1);
      expect(stations[0].id).toBe('101');
    });
  });

  describe('searchStations', () => {
    beforeEach(() => {
      useStationsStore.setState({
        stations: {
          '101': createMockStop({ id: '101', name: 'Times Square' }),
          '102': createMockStop({ id: '102', name: 'Grand Central', enrichedName: 'Grand Central Terminal' }),
          '103': createMockStop({ id: '103', name: 'Penn Station' }),
        },
        parentStations: ['101', '102', '103'],
      });
    });

    it('searches by station name', () => {
      const results = useStationsStore.getState().searchStations('Times');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Times Square');
    });

    it('searches by enriched name', () => {
      const results = useStationsStore.getState().searchStations('Terminal');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Grand Central');
    });

    it('is case-insensitive', () => {
      const results = useStationsStore.getState().searchStations('TIMES');
      expect(results).toHaveLength(1);
    });

    it('returns multiple matches', () => {
      const results = useStationsStore.getState().searchStations('Station');
      expect(results).toHaveLength(1); // Penn Station
    });

    it('returns empty array for no matches', () => {
      const results = useStationsStore.getState().searchStations('xyz');
      expect(results).toHaveLength(0);
    });

    it('limits results to 20', () => {
      // Add more stations
      const manyStations: Record<string, any> = {};
      const parentIds: string[] = [];
      for (let i = 1; i <= 30; i++) {
        const id = String(i);
        manyStations[id] = createMockStop({ id, name: `Station ${i}` });
        parentIds.push(id);
      }

      useStationsStore.setState({
        stations: manyStations,
        parentStations: parentIds,
      });

      const results = useStationsStore.getState().searchStations('Station');
      expect(results).toHaveLength(20);
    });

    it('only searches parent stations', () => {
      useStationsStore.setState({
        stations: {
          '101': createMockStop({ id: '101', name: 'Times Square' }),
          '101N': createMockStop({ id: '101N', name: 'Times Square North' }),
        },
        parentStations: ['101'], // Only 101 is a parent
      });

      const results = useStationsStore.getState().searchStations('Times');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('101');
    });
  });
});
