import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAlertsStore } from './alerts-store';
import { createMockServiceAlert } from '@/test/factories';

describe('useAlertsStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

    // Reset store state between tests
    useAlertsStore.setState({
      alerts: [],
      lastFetch: null,
      isLoading: false,
      error: null,
      dismissedIds: new Set(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('has empty alerts array', () => {
      expect(useAlertsStore.getState().alerts).toEqual([]);
    });

    it('has null lastFetch', () => {
      expect(useAlertsStore.getState().lastFetch).toBeNull();
    });

    it('has isLoading false', () => {
      expect(useAlertsStore.getState().isLoading).toBe(false);
    });

    it('has null error', () => {
      expect(useAlertsStore.getState().error).toBeNull();
    });

    it('has empty dismissedIds Set', () => {
      expect(useAlertsStore.getState().dismissedIds.size).toBe(0);
    });
  });

  describe('setAlerts', () => {
    it('sets alerts array', () => {
      const alerts = [
        createMockServiceAlert({ id: 'alert1' }),
        createMockServiceAlert({ id: 'alert2' }),
      ];

      useAlertsStore.getState().setAlerts(alerts);

      expect(useAlertsStore.getState().alerts).toHaveLength(2);
    });

    it('sets lastFetch timestamp', () => {
      useAlertsStore.getState().setAlerts([createMockServiceAlert()]);

      expect(useAlertsStore.getState().lastFetch).toBe('2024-01-15T12:00:00.000Z');
    });

    it('clears error', () => {
      useAlertsStore.setState({ error: 'Previous error' });
      useAlertsStore.getState().setAlerts([]);

      expect(useAlertsStore.getState().error).toBeNull();
    });

    it('replaces existing alerts', () => {
      useAlertsStore.getState().setAlerts([createMockServiceAlert({ id: 'alert1' })]);
      useAlertsStore.getState().setAlerts([createMockServiceAlert({ id: 'alert2' })]);

      const { alerts } = useAlertsStore.getState();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('alert2');
    });
  });

  describe('setLoading', () => {
    it('sets isLoading to true', () => {
      useAlertsStore.getState().setLoading(true);
      expect(useAlertsStore.getState().isLoading).toBe(true);
    });

    it('sets isLoading to false', () => {
      useAlertsStore.setState({ isLoading: true });
      useAlertsStore.getState().setLoading(false);
      expect(useAlertsStore.getState().isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('sets error message', () => {
      useAlertsStore.getState().setError('Something went wrong');
      expect(useAlertsStore.getState().error).toBe('Something went wrong');
    });

    it('sets isLoading to false', () => {
      useAlertsStore.setState({ isLoading: true });
      useAlertsStore.getState().setError('Error');
      expect(useAlertsStore.getState().isLoading).toBe(false);
    });

    it('clears error when passed null', () => {
      useAlertsStore.setState({ error: 'Previous error' });
      useAlertsStore.getState().setError(null);
      expect(useAlertsStore.getState().error).toBeNull();
    });
  });

  describe('dismissAlert', () => {
    it('adds alert ID to dismissedIds', () => {
      useAlertsStore.getState().dismissAlert('alert1');
      expect(useAlertsStore.getState().dismissedIds.has('alert1')).toBe(true);
    });

    it('preserves previously dismissed IDs', () => {
      useAlertsStore.getState().dismissAlert('alert1');
      useAlertsStore.getState().dismissAlert('alert2');

      const { dismissedIds } = useAlertsStore.getState();
      expect(dismissedIds.has('alert1')).toBe(true);
      expect(dismissedIds.has('alert2')).toBe(true);
    });

    it('handles dismissing same alert twice', () => {
      useAlertsStore.getState().dismissAlert('alert1');
      useAlertsStore.getState().dismissAlert('alert1');

      expect(useAlertsStore.getState().dismissedIds.size).toBe(1);
    });
  });

  describe('clearDismissed', () => {
    it('clears all dismissed IDs', () => {
      useAlertsStore.getState().dismissAlert('alert1');
      useAlertsStore.getState().dismissAlert('alert2');

      useAlertsStore.getState().clearDismissed();

      expect(useAlertsStore.getState().dismissedIds.size).toBe(0);
    });
  });

  describe('getActiveAlerts', () => {
    it('returns alerts with no active periods', () => {
      const alert = createMockServiceAlert({ activePeriods: [] });
      useAlertsStore.getState().setAlerts([alert]);

      const active = useAlertsStore.getState().getActiveAlerts();
      expect(active).toHaveLength(1);
    });

    it('returns alerts within active period', () => {
      const alert = createMockServiceAlert({
        activePeriods: [
          { start: '2024-01-15T10:00:00Z', end: '2024-01-15T14:00:00Z' },
        ],
      });
      useAlertsStore.getState().setAlerts([alert]);

      const active = useAlertsStore.getState().getActiveAlerts();
      expect(active).toHaveLength(1);
    });

    it('excludes alerts before active period', () => {
      const alert = createMockServiceAlert({
        activePeriods: [
          { start: '2024-01-15T13:00:00Z', end: '2024-01-15T14:00:00Z' },
        ],
      });
      useAlertsStore.getState().setAlerts([alert]);

      const active = useAlertsStore.getState().getActiveAlerts();
      expect(active).toHaveLength(0);
    });

    it('excludes alerts after active period', () => {
      const alert = createMockServiceAlert({
        activePeriods: [
          { start: '2024-01-15T10:00:00Z', end: '2024-01-15T11:00:00Z' },
        ],
      });
      useAlertsStore.getState().setAlerts([alert]);

      const active = useAlertsStore.getState().getActiveAlerts();
      expect(active).toHaveLength(0);
    });

    it('includes alerts with no end time', () => {
      const alert = createMockServiceAlert({
        activePeriods: [{ start: '2024-01-15T10:00:00Z', end: undefined }],
      });
      useAlertsStore.getState().setAlerts([alert]);

      const active = useAlertsStore.getState().getActiveAlerts();
      expect(active).toHaveLength(1);
    });

    it('handles multiple active periods', () => {
      const alert = createMockServiceAlert({
        activePeriods: [
          { start: '2024-01-14T10:00:00Z', end: '2024-01-14T14:00:00Z' },
          { start: '2024-01-15T10:00:00Z', end: '2024-01-15T14:00:00Z' },
        ],
      });
      useAlertsStore.getState().setAlerts([alert]);

      const active = useAlertsStore.getState().getActiveAlerts();
      expect(active).toHaveLength(1);
    });
  });

  describe('getVisibleAlerts', () => {
    it('returns active alerts not dismissed', () => {
      useAlertsStore.getState().setAlerts([
        createMockServiceAlert({ id: 'alert1' }),
        createMockServiceAlert({ id: 'alert2' }),
      ]);

      useAlertsStore.getState().dismissAlert('alert1');

      const visible = useAlertsStore.getState().getVisibleAlerts();
      expect(visible).toHaveLength(1);
      expect(visible[0].id).toBe('alert2');
    });

    it('returns empty array when all dismissed', () => {
      useAlertsStore.getState().setAlerts([
        createMockServiceAlert({ id: 'alert1' }),
      ]);
      useAlertsStore.getState().dismissAlert('alert1');

      const visible = useAlertsStore.getState().getVisibleAlerts();
      expect(visible).toHaveLength(0);
    });
  });

  describe('getCriticalAlerts', () => {
    it('returns only critical severity alerts', () => {
      useAlertsStore.getState().setAlerts([
        createMockServiceAlert({ id: 'alert1', severity: 'critical' }),
        createMockServiceAlert({ id: 'alert2', severity: 'warning' }),
        createMockServiceAlert({ id: 'alert3', severity: 'info' }),
      ]);

      const critical = useAlertsStore.getState().getCriticalAlerts();
      expect(critical).toHaveLength(1);
      expect(critical[0].severity).toBe('critical');
    });

    it('returns empty array when no critical alerts', () => {
      useAlertsStore.getState().setAlerts([
        createMockServiceAlert({ severity: 'warning' }),
        createMockServiceAlert({ severity: 'info' }),
      ]);

      const critical = useAlertsStore.getState().getCriticalAlerts();
      expect(critical).toHaveLength(0);
    });
  });

  describe('getAlertsByRoute', () => {
    it('filters alerts by affected route', () => {
      useAlertsStore.getState().setAlerts([
        createMockServiceAlert({ id: 'alert1', affectedRoutes: ['A', 'C', 'E'] }),
        createMockServiceAlert({ id: 'alert2', affectedRoutes: ['B', 'D'] }),
        createMockServiceAlert({ id: 'alert3', affectedRoutes: ['A', '1'] }),
      ]);

      const aAlerts = useAlertsStore.getState().getAlertsByRoute('A');
      expect(aAlerts).toHaveLength(2);
    });

    it('is case-insensitive', () => {
      useAlertsStore.getState().setAlerts([
        createMockServiceAlert({ affectedRoutes: ['A'] }),
      ]);

      const alerts = useAlertsStore.getState().getAlertsByRoute('a');
      expect(alerts).toHaveLength(1);
    });

    it('returns empty array for no matches', () => {
      useAlertsStore.getState().setAlerts([
        createMockServiceAlert({ affectedRoutes: ['A', 'B'] }),
      ]);

      const alerts = useAlertsStore.getState().getAlertsByRoute('Z');
      expect(alerts).toHaveLength(0);
    });
  });

  describe('getAlertsBySeverity', () => {
    it('filters alerts by severity', () => {
      useAlertsStore.getState().setAlerts([
        createMockServiceAlert({ severity: 'critical' }),
        createMockServiceAlert({ severity: 'warning' }),
        createMockServiceAlert({ severity: 'warning' }),
        createMockServiceAlert({ severity: 'info' }),
      ]);

      expect(useAlertsStore.getState().getAlertsBySeverity('critical')).toHaveLength(1);
      expect(useAlertsStore.getState().getAlertsBySeverity('warning')).toHaveLength(2);
      expect(useAlertsStore.getState().getAlertsBySeverity('info')).toHaveLength(1);
    });
  });

  describe('getAlertCounts', () => {
    it('returns counts by severity', () => {
      useAlertsStore.getState().setAlerts([
        createMockServiceAlert({ severity: 'critical' }),
        createMockServiceAlert({ severity: 'critical' }),
        createMockServiceAlert({ severity: 'warning' }),
        createMockServiceAlert({ severity: 'info' }),
        createMockServiceAlert({ severity: 'info' }),
        createMockServiceAlert({ severity: 'info' }),
      ]);

      const counts = useAlertsStore.getState().getAlertCounts();
      expect(counts).toEqual({
        critical: 2,
        warning: 1,
        info: 3,
      });
    });

    it('returns zeros when no alerts', () => {
      const counts = useAlertsStore.getState().getAlertCounts();
      expect(counts).toEqual({
        critical: 0,
        warning: 0,
        info: 0,
      });
    });

    it('only counts active alerts', () => {
      useAlertsStore.getState().setAlerts([
        createMockServiceAlert({
          severity: 'critical',
          activePeriods: [{ start: '2024-01-15T13:00:00Z', end: '2024-01-15T14:00:00Z' }],
        }),
        createMockServiceAlert({
          severity: 'critical',
          activePeriods: [], // Always active
        }),
      ]);

      const counts = useAlertsStore.getState().getAlertCounts();
      expect(counts.critical).toBe(1); // Only the always-active one
    });
  });
});
