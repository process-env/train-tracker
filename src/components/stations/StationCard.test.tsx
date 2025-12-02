import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StationCard } from './StationCard';
import { createMockStop } from '@/test/factories';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('StationCard', () => {
  it('renders station name', () => {
    const station = createMockStop({ name: 'Times Square' });
    render(<StationCard station={station} />);

    expect(screen.getByText('Times Square')).toBeInTheDocument();
  });

  it('renders route badges', () => {
    const station = createMockStop({ routes: 'A,C,E' });
    render(<StationCard station={station} />);

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
  });

  it('handles space-separated routes', () => {
    const station = createMockStop({ routes: 'N R W' });
    render(<StationCard station={station} />);

    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
    expect(screen.getByText('W')).toBeInTheDocument();
  });

  it('limits displayed routes to 6', () => {
    const station = createMockStop({ routes: '1,2,3,4,5,6,7,A,B,C' });
    render(<StationCard station={station} />);

    // Should show +4 more (10 routes - 6 displayed)
    expect(screen.getByText('+4')).toBeInTheDocument();
  });

  it('renders coordinates', () => {
    const station = createMockStop({ lat: 40.7128, lon: -74.006 });
    render(<StationCard station={station} />);

    expect(screen.getByText(/40\.7128.*-74\.0060/)).toBeInTheDocument();
  });

  it('links to station detail page', () => {
    const station = createMockStop({ id: '101' });
    render(<StationCard station={station} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/stations/101');
  });

  it('renders cross street from enriched name', () => {
    const station = createMockStop({
      name: '157 St',
      enrichedName: '157 St (Broadway)',
    });
    render(<StationCard station={station} />);

    expect(screen.getByText('& Broadway')).toBeInTheDocument();
  });

  it('takes first cross street when multiple present', () => {
    const station = createMockStop({
      name: '231 St',
      enrichedName: '231 St (Broadway, US Highway 9)',
    });
    render(<StationCard station={station} />);

    expect(screen.getByText('& Broadway')).toBeInTheDocument();
    expect(screen.queryByText(/US Highway/)).not.toBeInTheDocument();
  });

  it('does not render cross street when enriched name matches original', () => {
    const station = createMockStop({
      name: 'Times Square',
      enrichedName: 'Times Square',
    });
    render(<StationCard station={station} />);

    // Should not have the "& " prefix anywhere
    const crossStreetElements = screen.queryAllByText(/^&/);
    expect(crossStreetElements).toHaveLength(0);
  });

  it('handles station with no routes', () => {
    const station = createMockStop({ routes: '' });
    const { container } = render(<StationCard station={station} />);

    // Should not throw, should render without route badges
    expect(container.querySelector('.font-medium')).toBeInTheDocument();
  });

  it('handles station with undefined routes', () => {
    const station = { ...createMockStop(), routes: undefined };
    const { container } = render(<StationCard station={station as any} />);

    // Should not throw
    expect(container).toBeDefined();
  });

  it('applies hover styling class', () => {
    const station = createMockStop();
    const { container } = render(<StationCard station={station} />);

    // Card should have hover styling
    const card = container.querySelector('.hover\\:bg-muted\\/50');
    expect(card).toBeInTheDocument();
  });
});
