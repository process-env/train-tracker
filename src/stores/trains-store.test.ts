import { describe, it, expect, beforeEach } from 'vitest';
import { useTrainsStore } from './trains-store';
import { createMockTrainPosition, createMockArrival } from '@/test/factories';

describe('useTrainsStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useTrainsStore.setState({
      trains: {},
      arrivalsByStation: {},
      lastFeedUpdate: {},
    });
  });

  describe('initial state', () => {
    it('has empty trains map', () => {
      expect(useTrainsStore.getState().trains).toEqual({});
    });

    it('has empty arrivalsByStation map', () => {
      expect(useTrainsStore.getState().arrivalsByStation).toEqual({});
    });

    it('has empty lastFeedUpdate map', () => {
      expect(useTrainsStore.getState().lastFeedUpdate).toEqual({});
    });
  });

  describe('updateTrains', () => {
    it('adds new trains to store', () => {
      const train1 = createMockTrainPosition({ tripId: 'trip1', routeId: 'A' });
      const train2 = createMockTrainPosition({ tripId: 'trip2', routeId: 'B' });

      useTrainsStore.getState().updateTrains([train1, train2]);

      const { trains } = useTrainsStore.getState();
      expect(trains['trip1']).toEqual(train1);
      expect(trains['trip2']).toEqual(train2);
    });

    it('updates existing trains', () => {
      const train = createMockTrainPosition({ tripId: 'trip1', routeId: 'A', lat: 40.7 });
      useTrainsStore.getState().updateTrains([train]);

      const updatedTrain = createMockTrainPosition({ tripId: 'trip1', routeId: 'A', lat: 40.8 });
      useTrainsStore.getState().updateTrains([updatedTrain]);

      const { trains } = useTrainsStore.getState();
      expect(trains['trip1'].lat).toBe(40.8);
    });

    it('preserves existing trains when adding new ones', () => {
      const train1 = createMockTrainPosition({ tripId: 'trip1', routeId: 'A' });
      useTrainsStore.getState().updateTrains([train1]);

      const train2 = createMockTrainPosition({ tripId: 'trip2', routeId: 'B' });
      useTrainsStore.getState().updateTrains([train2]);

      const { trains } = useTrainsStore.getState();
      expect(Object.keys(trains)).toHaveLength(2);
      expect(trains['trip1']).toBeDefined();
      expect(trains['trip2']).toBeDefined();
    });

    it('handles empty array', () => {
      useTrainsStore.getState().updateTrains([]);
      expect(useTrainsStore.getState().trains).toEqual({});
    });
  });

  describe('updateArrivals', () => {
    it('sets arrivals for a station', () => {
      const arrivals = [
        createMockArrival({ tripId: 'trip1', stopId: '101N' }),
        createMockArrival({ tripId: 'trip2', stopId: '101N' }),
      ];

      useTrainsStore.getState().updateArrivals('101', {
        stopId: '101',
        stopName: 'Times Square',
        updatedAt: new Date().toISOString(),
        now: new Date().toISOString(),
        arrivals,
      });

      const { arrivalsByStation } = useTrainsStore.getState();
      expect(arrivalsByStation['101']).toBeDefined();
      expect(arrivalsByStation['101'].arrivals).toHaveLength(2);
    });

    it('replaces arrivals for same station', () => {
      const arrivals1 = [createMockArrival({ tripId: 'trip1' })];
      const arrivals2 = [createMockArrival({ tripId: 'trip2' })];

      useTrainsStore.getState().updateArrivals('101', {
        stopId: '101',
        stopName: 'Times Square',
        updatedAt: new Date().toISOString(),
        now: new Date().toISOString(),
        arrivals: arrivals1,
      });

      useTrainsStore.getState().updateArrivals('101', {
        stopId: '101',
        stopName: 'Times Square',
        updatedAt: new Date().toISOString(),
        now: new Date().toISOString(),
        arrivals: arrivals2,
      });

      const { arrivalsByStation } = useTrainsStore.getState();
      expect(arrivalsByStation['101'].arrivals).toHaveLength(1);
      expect(arrivalsByStation['101'].arrivals[0].tripId).toBe('trip2');
    });

    it('preserves arrivals for other stations', () => {
      useTrainsStore.getState().updateArrivals('101', {
        stopId: '101',
        stopName: 'Times Square',
        updatedAt: new Date().toISOString(),
        now: new Date().toISOString(),
        arrivals: [createMockArrival()],
      });

      useTrainsStore.getState().updateArrivals('102', {
        stopId: '102',
        stopName: 'Penn Station',
        updatedAt: new Date().toISOString(),
        now: new Date().toISOString(),
        arrivals: [createMockArrival()],
      });

      const { arrivalsByStation } = useTrainsStore.getState();
      expect(arrivalsByStation['101']).toBeDefined();
      expect(arrivalsByStation['102']).toBeDefined();
    });
  });

  describe('setFeedTimestamp', () => {
    it('sets timestamp for a feed group', () => {
      const timestamp = '2024-01-15T10:30:00Z';
      useTrainsStore.getState().setFeedTimestamp('ACE', timestamp);

      const { lastFeedUpdate } = useTrainsStore.getState();
      expect(lastFeedUpdate['ACE']).toBe(timestamp);
    });

    it('preserves timestamps for other feed groups', () => {
      useTrainsStore.getState().setFeedTimestamp('ACE', '2024-01-15T10:00:00Z');
      useTrainsStore.getState().setFeedTimestamp('BDFM', '2024-01-15T10:01:00Z');

      const { lastFeedUpdate } = useTrainsStore.getState();
      expect(lastFeedUpdate['ACE']).toBe('2024-01-15T10:00:00Z');
      expect(lastFeedUpdate['BDFM']).toBe('2024-01-15T10:01:00Z');
    });

    it('updates existing timestamp', () => {
      useTrainsStore.getState().setFeedTimestamp('ACE', '2024-01-15T10:00:00Z');
      useTrainsStore.getState().setFeedTimestamp('ACE', '2024-01-15T10:05:00Z');

      const { lastFeedUpdate } = useTrainsStore.getState();
      expect(lastFeedUpdate['ACE']).toBe('2024-01-15T10:05:00Z');
    });
  });

  describe('clearTrains', () => {
    it('removes all trains', () => {
      const train1 = createMockTrainPosition({ tripId: 'trip1' });
      const train2 = createMockTrainPosition({ tripId: 'trip2' });
      useTrainsStore.getState().updateTrains([train1, train2]);

      useTrainsStore.getState().clearTrains();

      expect(useTrainsStore.getState().trains).toEqual({});
    });

    it('preserves arrivals and timestamps', () => {
      useTrainsStore.getState().updateTrains([createMockTrainPosition({ tripId: 'trip1' })]);
      useTrainsStore.getState().updateArrivals('101', {
        stopId: '101',
        stopName: 'Times Square',
        updatedAt: new Date().toISOString(),
        now: new Date().toISOString(),
        arrivals: [createMockArrival()],
      });
      useTrainsStore.getState().setFeedTimestamp('ACE', '2024-01-15T10:00:00Z');

      useTrainsStore.getState().clearTrains();

      const state = useTrainsStore.getState();
      expect(state.trains).toEqual({});
      expect(state.arrivalsByStation['101']).toBeDefined();
      expect(state.lastFeedUpdate['ACE']).toBeDefined();
    });
  });

  describe('getTrainsByRoute', () => {
    it('filters trains by route ID', () => {
      useTrainsStore.getState().updateTrains([
        createMockTrainPosition({ tripId: 'trip1', routeId: 'A' }),
        createMockTrainPosition({ tripId: 'trip2', routeId: 'A' }),
        createMockTrainPosition({ tripId: 'trip3', routeId: 'B' }),
      ]);

      const aTrains = useTrainsStore.getState().getTrainsByRoute('A');
      expect(aTrains).toHaveLength(2);
      expect(aTrains.every((t) => t.routeId === 'A')).toBe(true);
    });

    it('is case-insensitive', () => {
      useTrainsStore.getState().updateTrains([
        createMockTrainPosition({ tripId: 'trip1', routeId: 'A' }),
      ]);

      const trains = useTrainsStore.getState().getTrainsByRoute('a');
      expect(trains).toHaveLength(1);
    });

    it('returns empty array for no matches', () => {
      useTrainsStore.getState().updateTrains([
        createMockTrainPosition({ tripId: 'trip1', routeId: 'A' }),
      ]);

      const trains = useTrainsStore.getState().getTrainsByRoute('Z');
      expect(trains).toEqual([]);
    });

    it('returns empty array when no trains', () => {
      const trains = useTrainsStore.getState().getTrainsByRoute('A');
      expect(trains).toEqual([]);
    });
  });

  describe('getArrivalsForStation', () => {
    it('returns arrivals for station', () => {
      const arrivals = [
        createMockArrival({ tripId: 'trip1' }),
        createMockArrival({ tripId: 'trip2' }),
      ];

      useTrainsStore.getState().updateArrivals('101', {
        stopId: '101',
        stopName: 'Times Square',
        updatedAt: new Date().toISOString(),
        now: new Date().toISOString(),
        arrivals,
      });

      const result = useTrainsStore.getState().getArrivalsForStation('101');
      expect(result).toHaveLength(2);
    });

    it('returns empty array for unknown station', () => {
      const result = useTrainsStore.getState().getArrivalsForStation('unknown');
      expect(result).toEqual([]);
    });

    it('returns empty array when arrivals is undefined', () => {
      useTrainsStore.setState({
        arrivalsByStation: {
          '101': { stopId: '101', stopName: null, updatedAt: '', now: '' } as any, // Missing arrivals property
        },
      });

      const result = useTrainsStore.getState().getArrivalsForStation('101');
      expect(result).toEqual([]);
    });
  });
});
