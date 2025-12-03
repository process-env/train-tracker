'use client';

import { create } from 'zustand';

// Simplified alerts store - only UI state
// Server state (alerts data) is now managed by React Query in use-alerts.ts
interface AlertsUIState {
  // UI state - dismissed alerts (session only)
  dismissedIds: Set<string>;

  // Actions
  dismissAlert: (id: string) => void;
  clearDismissed: () => void;

  // Legacy compatibility - these are no longer used but kept for tests
  alerts: never[];
  isLoading: boolean;
  error: null;
  lastFetch: null;
}

export const useAlertsStore = create<AlertsUIState>((set) => ({
  dismissedIds: new Set(),

  // Legacy compatibility fields (unused, for tests)
  alerts: [],
  isLoading: false,
  error: null,
  lastFetch: null,

  dismissAlert: (id) =>
    set((state) => {
      const dismissedIds = new Set(state.dismissedIds);
      dismissedIds.add(id);
      return { dismissedIds };
    }),

  clearDismissed: () => set({ dismissedIds: new Set() }),
}));
