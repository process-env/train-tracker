'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary, MapErrorFallback } from '@/components/ErrorBoundary';

// Dynamic import to avoid SSR issues with MapLibre
const SubwayMap = dynamic(
  () => import('@/components/map/SubwayMap').then((mod) => mod.SubwayMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <div className="text-center space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    ),
  }
);

export default function MapPage() {
  return (
    <div className="h-full">
      <ErrorBoundary fallback={<MapErrorFallback onRetry={() => window.location.reload()} />}>
        <SubwayMap />
      </ErrorBoundary>
    </div>
  );
}
