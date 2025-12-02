import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTrainPositions } from './use-train-positions';
import { useTrainsStore } from '@/stores';

// Mock fetch
global.fetch = vi.fn();

describe('useTrainPositions', () => {
  const mockStops = [
    { id: '101N', lat: 40.7128, lon: -74.006, name: 'Station A North' },
    { id: '102N', lat: 40.72, lon: -73.99, name: 'Station B North' },
  ];

  const createMockFeedEntity = () => ({
    routeId: 'A',
    tripId: 'trip1',
    stopUpdates: [
      {
        stopId: '101N',
        arrival: { time: new Date(Date.now() - 60000).toISOString() },
        departure: { time: new Date(Date.now() - 55000).toISOString() },
      },
      {
        stopId: '102N',
        arrival: { time: new Date(Date.now() + 120000).toISOString() },
      },
    ],
  });

  beforeEach(() => {
    // Reset store state
    useTrainsStore.setState({
      trains: {},
      arrivalsByStation: {},
      lastFeedUpdate: {},
    });

    vi.clearAllMocks();

    // Setup default fetch mock
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/v1/stops')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStops),
        });
      }
      if (url.includes('/api/v1/feed/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([createMockFeedEntity()]),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('loads stops dictionary on mount', async () => {
    renderHook(() => useTrainPositions(['ACE'], { refreshInterval: 0 }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/stops');
    });
  });

  it('fetches from specified feed groups', async () => {
    renderHook(() => useTrainPositions(['ACE', 'BDFM'], { refreshInterval: 0 }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/feed/ACE');
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/feed/BDFM');
    });
  });

  it('does not fetch feeds when disabled', async () => {
    renderHook(() => useTrainPositions(['ACE'], { enabled: false, refreshInterval: 0 }));

    // Give some time for potential fetch
    await new Promise((r) => setTimeout(r, 100));

    // Should fetch stops but not feeds
    const feedCalls = (global.fetch as any).mock.calls.filter(
      (call: string[]) => call[0].includes('/api/v1/feed/')
    );
    expect(feedCalls.length).toBe(0);
  });

  it('calculates train positions', async () => {
    const { result } = renderHook(() =>
      useTrainPositions(['ACE'], { refreshInterval: 0 })
    );

    await waitFor(() => {
      expect(result.current.trains.length).toBeGreaterThan(0);
    });

    const train = result.current.trains[0];
    expect(train).toHaveProperty('lat');
    expect(train).toHaveProperty('lon');
    expect(train).toHaveProperty('heading');
    expect(train).toHaveProperty('nextStopId');
    expect(train).toHaveProperty('nextStopName');
    expect(train).toHaveProperty('eta');
  });

  it('includes route and trip IDs', async () => {
    const { result } = renderHook(() =>
      useTrainPositions(['ACE'], { refreshInterval: 0 })
    );

    await waitFor(() => {
      expect(result.current.trains.length).toBeGreaterThan(0);
    });

    const train = result.current.trains[0];
    expect(train.routeId).toBe('A');
    expect(train.tripId).toBe('trip1');
  });

  it('handles missing feed data gracefully', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/v1/stops')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStops),
        });
      }
      // Feed returns empty or invalid data
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    const { result } = renderHook(() =>
      useTrainPositions(['ACE'], { refreshInterval: 0 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have empty trains, but no error since feeds succeeded
    expect(result.current.trains).toEqual([]);
  });

  it('updates trains store', async () => {
    renderHook(() => useTrainPositions(['ACE'], { refreshInterval: 0 }));

    await waitFor(() => {
      const { trains } = useTrainsStore.getState();
      expect(Object.keys(trains).length).toBeGreaterThan(0);
    });
  });

  it('sets feed timestamps', async () => {
    renderHook(() => useTrainPositions(['ACE'], { refreshInterval: 0 }));

    await waitFor(() => {
      const { lastFeedUpdate } = useTrainsStore.getState();
      expect(lastFeedUpdate['ACE']).toBeDefined();
    });
  });

  it('provides refetch function', async () => {
    const { result } = renderHook(() =>
      useTrainPositions(['ACE'], { refreshInterval: 0 })
    );

    await waitFor(() => {
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  it('returns trains array', async () => {
    const { result } = renderHook(() =>
      useTrainPositions(['ACE'], { refreshInterval: 0 })
    );

    await waitFor(() => {
      expect(Array.isArray(result.current.trains)).toBe(true);
    });
  });

  it('handles empty feed response', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/v1/stops')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStops),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    const { result } = renderHook(() =>
      useTrainPositions(['ACE'], { refreshInterval: 0 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.trains).toEqual([]);
  });
});
