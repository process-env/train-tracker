import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useArrivals } from './use-arrivals';
import { useTrainsStore } from '@/stores';
import { createMockArrival } from '@/test/factories';

// Mock fetch
global.fetch = vi.fn();

describe('useArrivals', () => {
  const mockArrivalBoard = {
    stationId: '101N',
    updatedAt: '2024-01-15T12:00:00Z',
    arrivals: [
      createMockArrival({ tripId: 'trip1', routeId: 'A' }),
      createMockArrival({ tripId: 'trip2', routeId: 'C' }),
    ],
  };

  beforeEach(() => {
    // Reset store state
    useTrainsStore.setState({
      trains: {},
      arrivalsByStation: {},
      lastFeedUpdate: {},
    });

    vi.clearAllMocks();

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockArrivalBoard),
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('fetches arrivals with correct URL', async () => {
    renderHook(() => useArrivals('ACE', '101N', { refreshInterval: 0 }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/arrivals/ACE/101N');
    });
  });

  it('does not fetch when disabled', async () => {
    renderHook(() =>
      useArrivals('ACE', '101N', { enabled: false, refreshInterval: 0 })
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not fetch when groupId is empty', async () => {
    renderHook(() => useArrivals('', '101N', { refreshInterval: 0 }));

    await new Promise((r) => setTimeout(r, 50));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not fetch when stopId is empty', async () => {
    renderHook(() => useArrivals('ACE', '', { refreshInterval: 0 }));

    await new Promise((r) => setTimeout(r, 50));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('updates store with arrivals', async () => {
    renderHook(() => useArrivals('ACE', '101N', { refreshInterval: 0 }));

    await waitFor(() => {
      const { arrivalsByStation } = useTrainsStore.getState();
      expect(arrivalsByStation['101N']).toBeDefined();
      expect(arrivalsByStation['101N'].arrivals).toHaveLength(2);
    });
  });

  it('sets error on fetch failure', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false });

    const { result } = renderHook(() =>
      useArrivals('ACE', '101N', { refreshInterval: 0 })
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch arrivals');
    });
  });

  it('sets error on network failure', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useArrivals('ACE', '101N', { refreshInterval: 0 })
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });
  });

  it('provides refetch function', async () => {
    const { result } = renderHook(() =>
      useArrivals('ACE', '101N', { refreshInterval: 0 })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('returns arrivals from store', async () => {
    const { result } = renderHook(() =>
      useArrivals('ACE', '101N', { refreshInterval: 0 })
    );

    await waitFor(() => {
      expect(result.current.arrivals).toBeDefined();
      expect(result.current.arrivals?.arrivals).toHaveLength(2);
    });
  });

  it('returns undefined when no arrivals', () => {
    const { result } = renderHook(() =>
      useArrivals('ACE', '999N', { enabled: false, refreshInterval: 0 })
    );
    expect(result.current.arrivals).toBeUndefined();
  });

  it('refetches when stopId changes', async () => {
    const { rerender } = renderHook(
      ({ stopId }) => useArrivals('ACE', stopId, { refreshInterval: 0 }),
      { initialProps: { stopId: '101N' } }
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/arrivals/ACE/101N');
    });

    rerender({ stopId: '102S' });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/arrivals/ACE/102S');
    });
  });
});
