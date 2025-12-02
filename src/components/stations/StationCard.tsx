'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { getRouteColor } from '@/lib/constants';
import type { Station } from '@/types/mta';

interface StationCardProps {
  station: Station;
}

// Extract cross street from enriched name, take only first one
function getCrossStreet(enrichedName: string | undefined, originalName: string): string | null {
  if (!enrichedName || enrichedName === originalName) return null;

  // Format: "157 St (Broadway)" or "231 St (Broadway, US Highway 9...)"
  const match = enrichedName.match(/\(([^)]+)\)/);
  if (!match) return null;

  // Take only the first cross street (before any comma)
  const crossStreets = match[1];
  const firstCrossStreet = crossStreets.split(',')[0].trim();

  // Skip if it's just repeating the street name (e.g., "West 237th Street" for "238 St")
  if (firstCrossStreet.toLowerCase().includes('street') &&
      firstCrossStreet.match(/\d+/) &&
      originalName.match(/\d+/)) {
    const enrichedNum = firstCrossStreet.match(/\d+/)?.[0];
    const originalNum = originalName.match(/\d+/)?.[0];
    if (enrichedNum && originalNum && Math.abs(parseInt(enrichedNum) - parseInt(originalNum)) <= 1) {
      // Try second cross street if available
      const parts = crossStreets.split(',');
      if (parts.length > 1) {
        return parts[1].trim();
      }
      return null;
    }
  }

  return firstCrossStreet;
}

export function StationCard({ station }: StationCardProps) {
  const routes = station.routes?.split(/[,\s]+/).filter(Boolean) || [];
  const crossStreet = getCrossStreet(station.enrichedName, station.name);

  return (
    <Link href={`/stations/${station.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardContent className="p-4 h-full">
          <div className="flex items-start justify-between gap-3 h-full">
            <div className="flex flex-col justify-between min-h-[72px]">
              <div>
                <h3 className="font-medium leading-tight">{station.name}</h3>
                {crossStreet && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    & {crossStreet}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                <MapPin className="h-3 w-3 shrink-0" />
                <span>{station.lat.toFixed(4)}, {station.lon.toFixed(4)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[100px]">
              {routes.slice(0, 6).map((route) => (
                <Badge
                  key={route}
                  className="w-6 h-6 p-0 flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: getRouteColor(route),
                    color: getRouteColor(route) === '#FCCC0A' ? '#000' : '#fff',
                  }}
                >
                  {route}
                </Badge>
              ))}
              {routes.length > 6 && (
                <Badge variant="secondary" className="text-xs">
                  +{routes.length - 6}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
