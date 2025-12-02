'use client';

import { useState, useEffect, useCallback } from 'react';
import { Database, RefreshCw, Play, Pause, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface CollectionStats {
  totalSnapshots: number;
  totalArrivals: number;
  totalAlerts: number;
  lastCollection: string | null;
  lastStatus: string | null;
  dataRange: {
    from: string;
    to: string;
    hours: number;
  } | null;
}

interface HistoricalDataCardProps {
  stats: CollectionStats | null;
  onCollect: () => Promise<void>;
  isCollecting: boolean;
  autoCollectEnabled: boolean;
  onToggleAutoCollect: () => void;
}

export function HistoricalDataCard({
  stats,
  onCollect,
  isCollecting,
  autoCollectEnabled,
  onToggleAutoCollect,
}: HistoricalDataCardProps) {
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Database className="h-4 w-4" />
          Data Collection
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant={autoCollectEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleAutoCollect}
            className="h-7 px-2"
          >
            {autoCollectEnabled ? (
              <>
                <Pause className="h-3 w-3 mr-1" />
                Auto
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" />
                Auto
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCollect}
            disabled={isCollecting}
            className="h-7 px-2"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isCollecting ? 'animate-spin' : ''}`} />
            Collect
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {stats ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Snapshots</p>
                <p className="text-lg font-semibold">{formatNumber(stats.totalSnapshots)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Arrivals</p>
                <p className="text-lg font-semibold">{formatNumber(stats.totalArrivals)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Alerts</p>
                <p className="text-lg font-semibold">{formatNumber(stats.totalAlerts)}</p>
              </div>
            </div>

            {stats.lastCollection && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last collected {formatDistanceToNow(new Date(stats.lastCollection))} ago
                {stats.lastStatus && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      stats.lastStatus === 'success'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {stats.lastStatus}
                  </span>
                )}
              </div>
            )}

            {stats.dataRange && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {stats.dataRange.hours}h of data collected
              </div>
            )}

            {autoCollectEnabled && (
              <p className="text-xs text-muted-foreground">
                Auto-collecting every 5 minutes
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">No data collected yet</p>
            <p className="text-xs mt-1">Click Collect to start gathering data</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
