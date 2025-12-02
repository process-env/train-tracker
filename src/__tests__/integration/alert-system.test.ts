import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAlertsStore } from '@/stores';
import { createMockServiceAlert } from '@/test/factories';

/**
 * Integration tests for the alert system
 * Tests alert storage, filtering, and dismissal functionality
 */
describe('Alert System Integration', () => {
  beforeEach(() => {
    useAlertsStore.setState({
      alerts: [],
      lastFetch: null,
      isLoading: false,
      error: null,
      dismissedIds: new Set(),
    });
  });

  describe('alert lifecycle', () => {
    it('stores and retrieves alerts', () => {
      const alerts = [
        createMockServiceAlert({ id: 'alert-1', severity: 'critical' }),
        createMockServiceAlert({ id: 'alert-2', severity: 'warning' }),
        createMockServiceAlert({ id: 'alert-3', severity: 'info' }),
      ];

      useAlertsStore.getState().setAlerts(alerts);

      expect(useAlertsStore.getState().alerts).toHaveLength(3);
    });

    it('filters alerts by severity', () => {
      const alerts = [
        createMockServiceAlert({ id: 'crit-1', severity: 'critical' }),
        createMockServiceAlert({ id: 'warn-1', severity: 'warning' }),
        createMockServiceAlert({ id: 'info-1', severity: 'info' }),
        createMockServiceAlert({ id: 'crit-2', severity: 'critical' }),
      ];

      useAlertsStore.getState().setAlerts(alerts);

      const critical = useAlertsStore.getState().getAlertsBySeverity('critical');
      const warning = useAlertsStore.getState().getAlertsBySeverity('warning');
      const info = useAlertsStore.getState().getAlertsBySeverity('info');

      expect(critical).toHaveLength(2);
      expect(warning).toHaveLength(1);
      expect(info).toHaveLength(1);
    });

    it('filters alerts by route', () => {
      const alerts = [
        createMockServiceAlert({ id: 'a-1', affectedRoutes: ['A', 'C'] }),
        createMockServiceAlert({ id: 'a-2', affectedRoutes: ['A'] }),
        createMockServiceAlert({ id: 'b-1', affectedRoutes: ['1', '2', '3'] }),
      ];

      useAlertsStore.getState().setAlerts(alerts);

      const routeAAlerts = useAlertsStore.getState().getAlertsByRoute('A');
      const routeCAlerts = useAlertsStore.getState().getAlertsByRoute('C');
      const route1Alerts = useAlertsStore.getState().getAlertsByRoute('1');

      expect(routeAAlerts).toHaveLength(2);
      expect(routeCAlerts).toHaveLength(1);
      expect(route1Alerts).toHaveLength(1);
    });
  });

  describe('alert dismissal', () => {
    it('dismisses alert by ID', () => {
      const alerts = [
        createMockServiceAlert({ id: 'alert-1' }),
        createMockServiceAlert({ id: 'alert-2' }),
      ];

      useAlertsStore.getState().setAlerts(alerts);
      useAlertsStore.getState().dismissAlert('alert-1');

      const visible = useAlertsStore.getState().getVisibleAlerts();
      expect(visible).toHaveLength(1);
      expect(visible[0].id).toBe('alert-2');
    });

    it('persists dismissed alerts across updates', () => {
      const initialAlerts = [
        createMockServiceAlert({ id: 'alert-1' }),
        createMockServiceAlert({ id: 'alert-2' }),
      ];

      useAlertsStore.getState().setAlerts(initialAlerts);
      useAlertsStore.getState().dismissAlert('alert-1');

      // Simulate new fetch with same alerts
      useAlertsStore.getState().setAlerts(initialAlerts);

      const visible = useAlertsStore.getState().getVisibleAlerts();
      expect(visible).toHaveLength(1);
      expect(visible[0].id).toBe('alert-2');
    });

    it('clears dismissed alerts on reset', () => {
      const alerts = [createMockServiceAlert({ id: 'alert-1' })];

      useAlertsStore.getState().setAlerts(alerts);
      useAlertsStore.getState().dismissAlert('alert-1');
      useAlertsStore.getState().clearDismissed();

      const visible = useAlertsStore.getState().getVisibleAlerts();
      expect(visible).toHaveLength(1);
    });
  });

  describe('alert counts', () => {
    it('counts alerts by severity correctly', () => {
      const alerts = [
        createMockServiceAlert({ severity: 'critical' }),
        createMockServiceAlert({ severity: 'critical' }),
        createMockServiceAlert({ severity: 'warning' }),
        createMockServiceAlert({ severity: 'info' }),
        createMockServiceAlert({ severity: 'info' }),
        createMockServiceAlert({ severity: 'info' }),
      ];

      useAlertsStore.getState().setAlerts(alerts);

      const counts = useAlertsStore.getState().getAlertCounts();
      expect(counts.critical).toBe(2);
      expect(counts.warning).toBe(1);
      expect(counts.info).toBe(3);
    });

    it('visible alerts excludes dismissed', () => {
      const alerts = [
        createMockServiceAlert({ id: 'c1', severity: 'critical' }),
        createMockServiceAlert({ id: 'c2', severity: 'critical' }),
      ];

      useAlertsStore.getState().setAlerts(alerts);
      useAlertsStore.getState().dismissAlert('c1');

      // getVisibleAlerts excludes dismissed
      const visible = useAlertsStore.getState().getVisibleAlerts();
      expect(visible).toHaveLength(1);

      // getAlertCounts counts all alerts (not just visible)
      const counts = useAlertsStore.getState().getAlertCounts();
      expect(counts.critical).toBe(2); // All alerts, regardless of dismissal
    });
  });
});
