import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTrainsStore } from '@/stores';
import { createMockTrainPosition, createMockArrivalBoard } from '@/test/factories';

/**
 * Integration tests for the train tracking system
 * Tests the flow from feed data to store updates
 */
describe('Train Tracking Integration', () => {
  beforeEach(() => {
    // Reset store using setState
    useTrainsStore.setState({
      trains: {},
      arrivalsByStation: {},
      lastFeedUpdate: {},
    });
    vi.clearAllMocks();
  });

  describe('train position updates', () => {
    it('updates store with new train positions', () => {
      const positions = [createMockTrainPosition({ tripId: 'trip-1', routeId: 'A' })];

      useTrainsStore.getState().updateTrains(positions);

      const trains = useTrainsStore.getState().trains;
      expect(trains['trip-1']).toBeDefined();
      expect(trains['trip-1'].routeId).toBe('A');
    });

    it('updates existing train position', () => {
      const initial = [
        createMockTrainPosition({
          tripId: 'trip-1',
          lat: 40.7,
          lon: -73.9,
        }),
      ];
      const updated = [
        createMockTrainPosition({
          tripId: 'trip-1',
          lat: 40.8,
          lon: -73.8,
        }),
      ];

      useTrainsStore.getState().updateTrains(initial);
      useTrainsStore.getState().updateTrains(updated);

      const train = useTrainsStore.getState().trains['trip-1'];
      expect(train.lat).toBe(40.8);
      expect(train.lon).toBe(-73.8);
    });

    it('clears all trains', () => {
      const positions = [
        createMockTrainPosition({ tripId: 'trip-1' }),
        createMockTrainPosition({ tripId: 'trip-2' }),
      ];

      useTrainsStore.getState().updateTrains(positions);
      expect(Object.keys(useTrainsStore.getState().trains)).toHaveLength(2);

      useTrainsStore.getState().clearTrains();

      const trains = useTrainsStore.getState().trains;
      expect(Object.keys(trains)).toHaveLength(0);
    });

    it('tracks multiple routes simultaneously', () => {
      const positions = [
        createMockTrainPosition({ tripId: 'trip-a', routeId: 'A' }),
        createMockTrainPosition({ tripId: 'trip-c', routeId: 'C' }),
        createMockTrainPosition({ tripId: 'trip-1', routeId: '1' }),
      ];

      useTrainsStore.getState().updateTrains(positions);

      const trains = useTrainsStore.getState().trains;
      expect(Object.keys(trains)).toHaveLength(3);

      const byRoute = useTrainsStore.getState().getTrainsByRoute('A');
      expect(byRoute).toHaveLength(1);
      expect(byRoute[0].routeId).toBe('A');
    });
  });

  describe('arrival predictions', () => {
    it('stores arrival data by station', () => {
      const board = createMockArrivalBoard({
        stopId: '101',
        arrivals: [
          { stopId: '101N', routeId: 'A', whenISO: '2024-01-01T12:00:00Z' } as any,
          { stopId: '101S', routeId: 'A', whenISO: '2024-01-01T12:05:00Z' } as any,
        ],
      });

      useTrainsStore.getState().updateArrivals('101', board);

      const stationData = useTrainsStore.getState().arrivalsByStation['101'];
      expect(stationData.arrivals).toHaveLength(2);
    });

    it('replaces arrivals on update', () => {
      const board1 = createMockArrivalBoard({
        stopId: '101',
        arrivals: [{ stopId: '101N', routeId: 'A' } as any],
      });
      const board2 = createMockArrivalBoard({
        stopId: '101',
        arrivals: [
          { stopId: '101N', routeId: 'C' } as any,
          { stopId: '101N', routeId: 'E' } as any,
        ],
      });

      useTrainsStore.getState().updateArrivals('101', board1);
      useTrainsStore.getState().updateArrivals('101', board2);

      const arrivals = useTrainsStore.getState().arrivalsByStation['101'].arrivals;
      expect(arrivals).toHaveLength(2);
      expect(arrivals[0].routeId).toBe('C');
    });
  });

  describe('feed updates', () => {
    it('tracks last feed update time', () => {
      const timestamp = new Date().toISOString();
      useTrainsStore.getState().setFeedTimestamp('ACE', timestamp);

      const lastUpdate = useTrainsStore.getState().lastFeedUpdate['ACE'];
      expect(lastUpdate).toBe(timestamp);
    });

    it('tracks multiple feed groups', () => {
      const now = new Date();
      const timestamp1 = now.toISOString();
      const timestamp2 = new Date(now.getTime() + 1000).toISOString();

      useTrainsStore.getState().setFeedTimestamp('ACE', timestamp1);
      useTrainsStore.getState().setFeedTimestamp('BDFM', timestamp2);

      expect(useTrainsStore.getState().lastFeedUpdate['ACE']).toBe(timestamp1);
      expect(useTrainsStore.getState().lastFeedUpdate['BDFM']).toBe(timestamp2);
    });
  });
});
