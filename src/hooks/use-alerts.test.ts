import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAlerts } from './use-alerts';
import { useAlertsStore } from '@/stores';
import { createMockServiceAlert } from '@/test/factories';

// Mock fetch
global.fetch = vi.fn();

describe('useAlerts', () => {
  const mockAlerts = [
    createMockServiceAlert({ id: 'alert1', severity: 'critical' }),
    createMockServiceAlert({ id: 'alert2', severity: 'warning' }),
  ];

  beforeEach(() => {
    // Reset store state
    useAlertsStore.setState({
      alerts: [],
      lastFetch: null,
      isLoading: false,
      error: null,
      dismissedIds: new Set(),
    });

    vi.clearAllMocks();

    // Default mock for fetch
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ alerts: mockAlerts }),
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('fetches alerts on mount', async () => {
    renderHook(() => useAlerts({ refreshInterval: 0 }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/alerts');
    });
  });

  it('does not fetch when disabled', async () => {
    renderHook(() => useAlerts({ enabled: false, refreshInterval: 0 }));

    // Give some time for potential fetch
    await new Promise((r) => setTimeout(r, 50));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('updates store with fetched alerts', async () => {
    renderHook(() => useAlerts({ refreshInterval: 0 }));

    await waitFor(() => {
      expect(useAlertsStore.getState().alerts).toHaveLength(2);
    });
  });

  it('adds route filter to URL when routeIds provided', async () => {
    renderHook(() => useAlerts({ routeIds: ['A', 'C'], refreshInterval: 0 }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/alerts?route=A,C');
    });
  });

  it('sets error on fetch failure', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      statusText: 'Server Error',
    });

    const { result } = renderHook(() => useAlerts({ refreshInterval: 0 }));

    await waitFor(() => {
      expect(result.current.error).toContain('Server Error');
    });
  });

  it('sets error on network failure', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAlerts({ refreshInterval: 0 }));

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });
  });

  it('returns alert counts', async () => {
    const { result } = renderHook(() => useAlerts({ refreshInterval: 0 }));

    await waitFor(() => {
      expect(result.current.counts).toEqual({
        critical: 1,
        warning: 1,
        info: 0,
      });
    });
  });

  it('provides refetch function', async () => {
    const { result } = renderHook(() => useAlerts({ refreshInterval: 0 }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('handles unmount without errors', async () => {
    const { unmount, result } = renderHook(() => useAlerts({ refreshInterval: 0 }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Unmount should not throw
    expect(() => unmount()).not.toThrow();
  });
});
