'use client';

import { create } from 'zustand';
import type { ServiceAlert, AlertSeverity } from '@/types/mta';

interface AlertsState {
  // Alert data
  alerts: ServiceAlert[];

  // Metadata
  lastFetch: string | null;
  isLoading: boolean;
  error: string | null;

  // UI state - dismissed alerts (session only)
  dismissedIds: Set<string>;

  // Actions
  setAlerts: (alerts: ServiceAlert[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  dismissAlert: (id: string) => void;
  clearDismissed: () => void;

  // Selectors
  getActiveAlerts: () => ServiceAlert[];
  getVisibleAlerts: () => ServiceAlert[];
  getCriticalAlerts: () => ServiceAlert[];
  getAlertsByRoute: (routeId: string) => ServiceAlert[];
  getAlertsBySeverity: (severity: AlertSeverity) => ServiceAlert[];
  getAlertCounts: () => { critical: number; warning: number; info: number };
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [],
  lastFetch: null,
  isLoading: false,
  error: null,
  dismissedIds: new Set(),

  setAlerts: (alerts) =>
    set({
      alerts,
      lastFetch: new Date().toISOString(),
      error: null,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  dismissAlert: (id) =>
    set((state) => {
      const dismissedIds = new Set(state.dismissedIds);
      dismissedIds.add(id);
      return { dismissedIds };
    }),

  clearDismissed: () => set({ dismissedIds: new Set() }),

  // Get all active alerts (within active period)
  getActiveAlerts: () => {
    const { alerts } = get();
    const now = new Date();

    return alerts.filter((alert) => {
      // If no active periods, consider it always active
      if (!alert.activePeriods.length) return true;

      return alert.activePeriods.some((period) => {
        const start = new Date(period.start);
        const end = period.end ? new Date(period.end) : null;

        if (now < start) return false;
        if (end && now > end) return false;
        return true;
      });
    });
  },

  // Get alerts that haven't been dismissed
  getVisibleAlerts: () => {
    const { dismissedIds } = get();
    const activeAlerts = get().getActiveAlerts();
    return activeAlerts.filter((alert) => !dismissedIds.has(alert.id));
  },

  // Get only critical severity alerts
  getCriticalAlerts: () => {
    return get().getActiveAlerts().filter((a) => a.severity === 'critical');
  },

  // Get alerts affecting a specific route
  getAlertsByRoute: (routeId) => {
    const upperRoute = routeId.toUpperCase();
    return get()
      .getActiveAlerts()
      .filter((alert) =>
        alert.affectedRoutes.some((r) => r.toUpperCase() === upperRoute)
      );
  },

  // Get alerts by severity
  getAlertsBySeverity: (severity) => {
    return get().getActiveAlerts().filter((a) => a.severity === severity);
  },

  // Get counts by severity
  getAlertCounts: () => {
    const activeAlerts = get().getActiveAlerts();
    return {
      critical: activeAlerts.filter((a) => a.severity === 'critical').length,
      warning: activeAlerts.filter((a) => a.severity === 'warning').length,
      info: activeAlerts.filter((a) => a.severity === 'info').length,
    };
  },
}));
