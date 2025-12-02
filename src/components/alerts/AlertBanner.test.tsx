import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlertBanner } from './AlertBanner';
import { useAlertsStore } from '@/stores';
import { createMockServiceAlert } from '@/test/factories';

// Mock the useAlerts hook
vi.mock('@/hooks', () => ({
  useAlerts: vi.fn(() => ({ isLoading: false })),
}));

describe('AlertBanner', () => {
  beforeEach(() => {
    useAlertsStore.setState({
      alerts: [],
      lastFetch: null,
      isLoading: false,
      error: null,
      dismissedIds: new Set(),
    });
  });

  it('renders nothing when no alerts', () => {
    const { container } = render(<AlertBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders critical alerts section', () => {
    useAlertsStore.getState().setAlerts([
      createMockServiceAlert({ severity: 'critical', headerText: 'Critical Alert' }),
    ]);

    render(<AlertBanner />);
    // Ticker duplicates content for seamless loop
    expect(screen.getAllByText('Critical Alert').length).toBeGreaterThan(0);
  });

  it('renders warning alerts section', () => {
    useAlertsStore.getState().setAlerts([
      createMockServiceAlert({ severity: 'warning', headerText: 'Warning Alert' }),
    ]);

    render(<AlertBanner />);
    expect(screen.getAllByText('Warning Alert').length).toBeGreaterThan(0);
  });

  it('renders info alerts section', () => {
    useAlertsStore.getState().setAlerts([
      createMockServiceAlert({ severity: 'info', headerText: 'Info Alert' }),
    ]);

    render(<AlertBanner />);
    expect(screen.getAllByText('Info Alert').length).toBeGreaterThan(0);
  });

  it('renders alerts grouped by severity', () => {
    useAlertsStore.getState().setAlerts([
      createMockServiceAlert({ severity: 'critical', headerText: 'Critical One' }),
      createMockServiceAlert({ severity: 'warning', headerText: 'Warning One' }),
      createMockServiceAlert({ severity: 'info', headerText: 'Info One' }),
    ]);

    render(<AlertBanner />);

    // Ticker duplicates content for seamless loop
    expect(screen.getAllByText('Critical One').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Warning One').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Info One').length).toBeGreaterThan(0);
  });

  it('renders route badges for affected routes', () => {
    useAlertsStore.getState().setAlerts([
      createMockServiceAlert({
        severity: 'critical',
        headerText: 'Test Alert',
        affectedRoutes: ['A', 'C', 'E'],
      }),
    ]);

    render(<AlertBanner />);

    // Ticker duplicates content for seamless loop
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('C').length).toBeGreaterThan(0);
    expect(screen.getAllByText('E').length).toBeGreaterThan(0);
  });

  it('limits displayed routes and shows overflow count', () => {
    useAlertsStore.getState().setAlerts([
      createMockServiceAlert({
        severity: 'critical',
        headerText: 'Test Alert',
        affectedRoutes: ['1', '2', '3', '4', '5', '6', '7', 'A', 'B', 'C'],
      }),
    ]);

    render(<AlertBanner />);

    // Should show +X for overflow routes
    expect(screen.getAllByText(/\+\d+/).length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    useAlertsStore.getState().setAlerts([
      createMockServiceAlert({ severity: 'critical' }),
    ]);

    const { container } = render(<AlertBanner className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('does not render dismissed alerts', () => {
    const alert = createMockServiceAlert({
      id: 'dismissed-alert',
      severity: 'critical',
      headerText: 'Dismissed Alert',
    });

    useAlertsStore.setState({
      alerts: [alert],
      lastFetch: null,
      isLoading: false,
      error: null,
      dismissedIds: new Set(['dismissed-alert']),
    });

    const { container } = render(<AlertBanner />);
    expect(screen.queryByText('Dismissed Alert')).not.toBeInTheDocument();
  });

  it('renders multiple alerts of same severity', () => {
    useAlertsStore.getState().setAlerts([
      createMockServiceAlert({ severity: 'critical', headerText: 'Critical One' }),
      createMockServiceAlert({ severity: 'critical', headerText: 'Critical Two' }),
    ]);

    render(<AlertBanner />);

    // Ticker duplicates content for seamless loop
    expect(screen.getAllByText('Critical One').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Critical Two').length).toBeGreaterThan(0);
  });
});
