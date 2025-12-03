'use client';

import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores';
import { getRouteColor, ALL_ROUTES } from '@/lib/constants';
import { Button } from '@/components/ui/button';

interface RouteFilterProps {
  compact?: boolean;
}

export function RouteFilter({ compact = false }: RouteFilterProps) {
  const { selectedRouteIds, toggleRouteFilter, clearRouteFilters } = useUIStore();

  if (compact) {
    // Compact vertical view - no scrollbar, flows naturally with sidebar scroll
    return (
      <div className="flex flex-col gap-1 items-center py-1">
        {ALL_ROUTES.map((routeId) => {
          const color = getRouteColor(routeId);
          const isSelected = selectedRouteIds.includes(routeId);
          const textColor = color === '#FCCC0A' ? '#000' : '#fff';

          return (
            <button
              key={routeId}
              onClick={() => toggleRouteFilter(routeId)}
              className={cn(
                'w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all',
                isSelected
                  ? 'ring-2 ring-offset-1 ring-offset-background ring-primary'
                  : 'opacity-50 hover:opacity-100'
              )}
              style={{
                backgroundColor: color,
                color: textColor,
              }}
            >
              {routeId === 'SI' ? 'S' : routeId}
            </button>
          );
        })}
        {selectedRouteIds.length > 0 && (
          <button
            onClick={clearRouteFilters}
            className="w-6 h-6 rounded-full text-[10px] bg-muted hover:bg-muted/80 flex items-center justify-center mt-1"
            title="Clear filters"
          >
            ×
          </button>
        )}
      </div>
    );
  }

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
