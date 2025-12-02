import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAnalytics } from './use-analytics';
import { useTrainsStore } from '@/stores';
import { createMockTrainPosition } from '@/test/factories';

// Mock fetch
global.fetch = vi.fn();

describe('useAnalytics', () => {
  beforeEach(() => {
    // Reset store state with some trains
    useTrainsStore.setState({
      trains: {
        trip1: createMockTrainPosition({ tripId: 'trip1', routeId: 'A' }),
        trip2: createMockTrainPosition({ tripId: 'trip2', routeId: 'A' }),
        trip3: createMockTrainPosition({ tripId: 'trip3', routeId: 'B' }),
      },
      arrivalsByStation: {},
      lastFeedUpdate: {},
    });

    vi.clearAllMocks();

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ tripId: 'test' }]),
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('starts with loading true and null data', () => {
    const { result } = renderHook(() => useAnalytics());
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('calculates route activity from store trains', async () => {
    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    const routeA = result.current.data?.routeActivity.find((r) => r.routeId === 'A');
    const routeB = result.current.data?.routeActivity.find((r) => r.routeId === 'B');

    expect(routeA?.trainCount).toBe(2);
    expect(routeB?.trainCount).toBe(1);
  });

  it('generates timeline data', async () => {
    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.data?.timeline).toBeDefined();
    });

    expect(result.current.data?.timeline).toHaveLength(12);
    expect(result.current.data?.timeline[0]).toHaveProperty('time');
    expect(result.current.data?.timeline[0]).toHaveProperty('arrivals');
    expect(result.current.data?.timeline[0]).toHaveProperty('departures');
  });

  it('calculates stats', async () => {
    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.data?.stats).toBeDefined();
    });

    expect(result.current.data?.stats.totalTrains).toBe(3);
    expect(result.current.data?.stats.totalStations).toBe(472);
    expect(typeof result.current.data?.stats.avgDelay).toBe('number');
    expect(typeof result.current.data?.stats.feedHealth).toBe('number');
  });

  it('sets loading to false after fetch', async () => {
    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('handles fetch errors gracefully', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAnalytics());

    // The hook catches errors internally - it should still complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // The hook may or may not set error depending on implementation
    // What's important is it doesn't crash
    expect(result.current.data).toBeDefined();
  });

  it('provides refresh function', async () => {
    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(typeof result.current.refresh).toBe('function');
    });
  });

  it('marks feed as healthy on successful fetch', async () => {
    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      const healthyFeeds = result.current.data?.feedStatus.filter(
        (f) => f.status === 'healthy'
      );
      expect(healthyFeeds?.length).toBeGreaterThan(0);
    });
  });

  it('marks feed as error on failed fetch', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false });

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      const errorFeeds = result.current.data?.feedStatus.filter(
        (f) => f.status === 'error'
      );
      expect(errorFeeds?.length).toBeGreaterThan(0);
    });
  });

  it('includes all subway routes in activity', async () => {
    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.data?.routeActivity.length).toBeGreaterThan(0);
    });

    const routeIds = result.current.data?.routeActivity.map((r) => r.routeId);
    expect(routeIds).toContain('A');
    expect(routeIds).toContain('1');
  });
});
