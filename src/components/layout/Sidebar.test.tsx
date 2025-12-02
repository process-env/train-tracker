import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { useUIStore, useAlertsStore } from '@/stores';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/map'),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    useUIStore.setState({
      selectedRouteIds: [],
      sidebarOpen: false,
      selectedTrainId: null,
    });
    useAlertsStore.setState({
      alerts: [],
      lastFetch: null,
      isLoading: false,
      error: null,
      dismissedIds: new Set(),
    });
  });

  it('renders app title', () => {
    render(<Sidebar />);
    // Desktop sidebar
    expect(screen.getAllByText('MTA Tracker').length).toBeGreaterThan(0);
  });

  it('renders Live Map navigation link', () => {
    render(<Sidebar />);
    expect(screen.getAllByText('Live Map').length).toBeGreaterThan(0);
  });

  it('renders Analytics navigation link', () => {
    render(<Sidebar />);
    expect(screen.getAllByText('Analytics').length).toBeGreaterThan(0);
  });

  it('renders Stations navigation link', () => {
    render(<Sidebar />);
    expect(screen.getAllByText('Stations').length).toBeGreaterThan(0);
  });

  it('renders Alerts navigation link', () => {
    render(<Sidebar />);
    expect(screen.getAllByText('Alerts').length).toBeGreaterThan(0);
  });

  it('renders navigation links with correct hrefs', () => {
    render(<Sidebar />);

    // Check href attributes
    const mapLinks = screen.getAllByRole('link', { name: /Live Map/i });
    expect(mapLinks[0]).toHaveAttribute('href', '/map');

    const analyticsLinks = screen.getAllByRole('link', { name: /Analytics/i });
    expect(analyticsLinks[0]).toHaveAttribute('href', '/analytics');
  });

  it('renders Filter Routes section', () => {
    render(<Sidebar />);
    expect(screen.getAllByText('Filter Routes').length).toBeGreaterThan(0);
  });

  it('renders RouteFilter component', () => {
    render(<Sidebar />);
    // RouteFilter renders route buttons
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
  });

  it('renders mobile menu trigger', () => {
    render(<Sidebar />);
    // Menu button should exist for mobile
    const menuButtons = screen.getAllByRole('button');
    expect(menuButtons.length).toBeGreaterThan(0);
  });

  it('has desktop sidebar hidden on mobile', () => {
    const { container } = render(<Sidebar />);
    // Desktop sidebar should have lg:flex class
    const desktopSidebar = container.querySelector('.hidden.lg\\:flex');
    expect(desktopSidebar).toBeInTheDocument();
  });
});
