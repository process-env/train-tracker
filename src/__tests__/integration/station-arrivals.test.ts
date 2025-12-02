import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStationsStore, useTrainsStore } from '@/stores';
import { createMockStop, createMockArrivalBoard, createMockTrainPosition } from '@/test/factories';

/**
 * Integration tests for station arrivals system
 * Tests station data, arrival predictions, and station-train relationships
 */
describe('Station Arrivals Integration', () => {
  beforeEach(() => {
    // Reset stores using setState
    useStationsStore.setState({
      stations: {},
      routes: {},
      parentStations: [],
      isLoading: false,
      error: null,
    });
    useTrainsStore.setState({
      trains: {},
      arrivalsByStation: {},
      lastFeedUpdate: {},
    });
    vi.clearAllMocks();
  });

  describe('station data', () => {
    it('stores and retrieves stations via setState', () => {
      const stations = {
        '101': createMockStop({ id: '101', name: 'Times Square' }),
        '102': createMockStop({ id: '102', name: 'Penn Station' }),
        '103': createMockStop({ id: '103', name: '14 St' }),
      };

      useStationsStore.setState({ stations, parentStations: ['101', '102', '103'] });

      expect(Object.keys(useStationsStore.getState().stations)).toHaveLength(3);
    });

    it('gets stations by route', () => {
      const stations = {
        '101': createMockStop({ id: '101', routes: 'A,C,E' }),
        '102': createMockStop({ id: '102', routes: 'A,C,E,1,2,3' }),
        '103': createMockStop({ id: '103', routes: '1,2,3' }),
      };

      useStationsStore.setState({ stations });

      const aceStations = useStationsStore.getState().getStationsByRoute('A');
      expect(aceStations).toHaveLength(2);
    });

    it('searches stations by name', () => {
      const stations = {
        '101': createMockStop({ id: '101', name: 'Times Square-42 St' }),
        '102': createMockStop({ id: '102', name: '42 St-Port Authority' }),
        '103': createMockStop({ id: '103', name: 'Grand Central-42 St' }),
        '104': createMockStop({ id: '104', name: 'Penn Station' }),
      };

      useStationsStore.setState({
        stations,
        parentStations: ['101', '102', '103', '104'],
      });

      const results = useStationsStore.getState().searchStations('42');
      expect(results.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('arrival predictions', () => {
    it('stores arrivals for station', () => {
      const board = createMockArrivalBoard({
        stopId: '101',
        arrivals: [
          { stopId: '101N', routeId: 'A', whenISO: '2024-01-01T12:00:00Z' } as any,
          { stopId: '101S', routeId: 'A', whenISO: '2024-01-01T12:05:00Z' } as any,
          { stopId: '101N', routeId: 'C', whenISO: '2024-01-01T12:10:00Z' } as any,
        ],
      });

      useTrainsStore.getState().updateArrivals('101', board);

      const stationData = useTrainsStore.getState().arrivalsByStation['101'];
      expect(stationData.arrivals).toHaveLength(3);
    });

    it('retrieves arrivals for station', () => {
      const board = createMockArrivalBoard({
        stopId: '101',
        arrivals: [
          { stopId: '101N', routeId: 'A' } as any,
          { stopId: '101S', routeId: 'A' } as any,
        ],
      });

      useTrainsStore.getState().updateArrivals('101', board);

      const arrivals = useTrainsStore.getState().getArrivalsForStation('101');
      expect(arrivals).toHaveLength(2);
    });

    it('returns empty array for unknown station', () => {
      const arrivals = useTrainsStore.getState().getArrivalsForStation('unknown');
      expect(arrivals).toHaveLength(0);
    });
  });

  describe('station-train relationship', () => {
    it('associates trains with their next stop', () => {
      const positions = [
        createMockTrainPosition({
          tripId: 'trip-1',
          routeId: 'A',
          nextStopId: '101N',
          nextStopName: 'Times Square',
        }),
      ];

      useTrainsStore.getState().updateTrains(positions);

      const trains = useTrainsStore.getState().trains;
      expect(trains['trip-1'].nextStopId).toBe('101N');
    });

    it('tracks multiple trains approaching same station', () => {
      const positions = [
        createMockTrainPosition({
          tripId: 'trip-1',
          routeId: 'A',
          nextStopId: '101N',
        }),
        createMockTrainPosition({
          tripId: 'trip-2',
          routeId: 'C',
          nextStopId: '101N',
        }),
      ];

      useTrainsStore.getState().updateTrains(positions);

      const allTrains = Object.values(useTrainsStore.getState().trains);
      const approaching101 = allTrains.filter((t) => t.nextStopId === '101N');

      expect(approaching101).toHaveLength(2);
    });

    it('filters trains by route', () => {
      const positions = [
        createMockTrainPosition({ tripId: 'trip-a', routeId: 'A' }),
        createMockTrainPosition({ tripId: 'trip-c', routeId: 'C' }),
        createMockTrainPosition({ tripId: 'trip-1', routeId: '1' }),
      ];

      useTrainsStore.getState().updateTrains(positions);

      const routeATrains = useTrainsStore.getState().getTrainsByRoute('A');
      expect(routeATrains).toHaveLength(1);
      expect(routeATrains[0].tripId).toBe('trip-a');
    });
  });
});
