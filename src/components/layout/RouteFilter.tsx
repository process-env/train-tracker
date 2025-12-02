'use client';

import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores';
import { getRouteColor, ALL_ROUTES } from '@/lib/constants';
import { Button } from '@/components/ui/button';

const ROUTE_GROUPS = [
  { label: '123', routes: ['1', '2', '3'] },
  { label: '456', routes: ['4', '5', '6'] },
  { label: '7', routes: ['7'] },
  { label: 'ACE', routes: ['A', 'C', 'E'] },
  { label: 'BDFM', routes: ['B', 'D', 'F', 'M'] },
  { label: 'G', routes: ['G'] },
  { label: 'JZ', routes: ['J', 'Z'] },
  { label: 'L', routes: ['L'] },
  { label: 'NQRW', routes: ['N', 'Q', 'R', 'W'] },
  { label: 'S', routes: ['S'] },
  { label: 'SIR', routes: ['SI'] },
];

export function RouteFilter() {
  const { selectedRouteIds, toggleRouteFilter, clearRouteFilters } = useUIStore();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {ALL_ROUTES.map((routeId) => {
          const color = getRouteColor(routeId);
          const isSelected = selectedRouteIds.includes(routeId);
          const textColor = color === '#FCCC0A' ? '#000' : '#fff';

          return (
            <button
              key={routeId}
              onClick={() => toggleRouteFilter(routeId)}
              className={cn(
                'w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all',
                isSelected
                  ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110'
                  : 'opacity-60 hover:opacity-100'
              )}
              style={{
                backgroundColor: color,
                color: textColor,
              }}
            >
              {routeId}
            </button>
          );
        })}
      </div>

      {selectedRouteIds.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearRouteFilters}
          className="w-full text-xs"
        >
          Clear filters ({selectedRouteIds.length})
        </Button>
      )}
    </div>
  );
}
