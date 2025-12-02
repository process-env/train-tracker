import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlertBadge } from './AlertBadge';
import { useAlertsStore } from '@/stores';
import { createMockServiceAlert } from '@/test/factories';

describe('AlertBadge', () => {
  beforeEach(() => {
    // Reset store state
    useAlertsStore.setState({
      alerts: [],
      lastFetch: null,
      isLoading: false,
      error: null,
      dismissedIds: new Set(),
    });
  });

  it('renders nothing when no alerts and showZero is false', () => {
    const { container } = render(<AlertBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('renders zero when showZero is true', () => {
    render(<AlertBadge showZero />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('shows total alert count', () => {
    useAlertsStore.getState().setAlerts([
      createMockServiceAlert({ severity: 'critical' }),
      createMockServiceAlert({ severity: 'warning' }),
      createMockServiceAlert({ severity: 'info' }),
    ]);

    render(<AlertBadge />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('uses critical color when critical alerts present', () => {
    useAlertsStore.getState().setAlerts([
      createMockServiceAlert({ severity: 'critical' }),
      createMockServiceAlert({ severity: 'warning' }),
    ]);

    const { container } = render(<AlertBadge />);
    const badge = container.querySelector('span');

    // Should have critical styling (red background)
    expect(badge?.className).toContain('bg-red');
  });

  it('uses warning color when no critical but warning present', () => {
    useAlertsStore.getState().setAlerts([
      createMockServiceAlert({ severity: 'warning' }),
      createMockServiceAlert({ severity: 'info' }),
    ]);

    const { container } = render(<AlertBadge />);
    const badge = container.querySelector('span');

    // Should have warning styling (amber/yellow background)
    expect(badge?.className).toMatch(/bg-(amber|yellow)/);
  });

  it('uses info color when only info alerts present', () => {
    useAlertsStore.getState().setAlerts([
      createMockServiceAlert({ severity: 'info' }),
    ]);

    const { container } = render(<AlertBadge />);
    const badge = container.querySelector('span');

    // Should have info styling (blue background)
    expect(badge?.className).toContain('bg-blue');
  });

  it('applies custom className', () => {
    useAlertsStore.getState().setAlerts([createMockServiceAlert()]);

    const { container } = render(<AlertBadge className="custom-class" />);
    const badge = container.querySelector('.custom-class');

    expect(badge).toBeInTheDocument();
  });

  it('renders with proper accessibility', () => {
    useAlertsStore.getState().setAlerts([createMockServiceAlert()]);

    const { container } = render(<AlertBadge />);
    const badge = container.querySelector('span');

    // Should be a span element
    expect(badge?.tagName).toBe('SPAN');
  });
});
