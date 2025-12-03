'use client';

import { useAlerts } from '@/hooks';
import { cn } from '@/lib/utils';
import {
  getRouteColor,
  SEVERITY_COLORS,
  ALERT_LIMITS,
  calculateTickerDuration,
} from '@/lib/constants';
import { getTextColorForBackground } from '@/lib/mta/format';
import type { ServiceAlert, AlertSeverity } from '@/types/mta';

interface AlertBannerProps {
  className?: string;
}

interface TickerSectionProps {
  alerts: ServiceAlert[];
  severity: AlertSeverity;
}

function TickerSection({ alerts, severity }: TickerSectionProps) {
  if (alerts.length === 0) return null;

  const colors = SEVERITY_COLORS[severity];
  const duration = calculateTickerDuration(alerts.length);

  // Create ticker content with unique keys
  const tickerContent = alerts.map((alert) => ({
    id: alert.id,
    routes: alert.affectedRoutes,
    text: alert.headerText,
  }));

  return (
    <div className={cn('relative overflow-hidden', colors.bg, colors.textOnBg)}>
      <div className="ticker-wrapper">
        <div
          className="ticker-content"
          style={{ '--ticker-duration': `${duration}s` } as React.CSSProperties}
        >
          {/* Double the content for seamless loop */}
          {[0, 1].map((copy) =>
            tickerContent.map((item) => (
              <span
                key={`${item.id}-copy${copy}`}
                className="inline-flex items-center gap-2 px-4"
              >
                {/* Route circles */}
                {item.routes.slice(0, ALERT_LIMITS.TICKER_ROUTES).map((route) => {
                  const color = getRouteColor(route);
                  const routeTextColor = getTextColorForBackground(color);
                  return (
                    <span
                      key={`${item.id}-${route}-copy${copy}`}
                      className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full"
                      style={{ backgroundColor: color, color: routeTextColor }}
                    >
                      {route}
                    </span>
                  );
                })}
                {item.routes.length > ALERT_LIMITS.TICKER_ROUTES && (
                  <span className="text-xs opacity-75">
                    +{item.routes.length - ALERT_LIMITS.TICKER_ROUTES}
                  </span>
                )}
                <span className="text-sm font-medium">{item.text}</span>
                <span className="mx-4 opacity-50">•</span>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TickerSkeleton({ severity }: { severity: AlertSeverity }) {
  const colors = SEVERITY_COLORS[severity];
  return <div className={cn('ticker-skeleton', colors.bg)} />;
}

export function AlertBanner({ className }: AlertBannerProps) {
  // Use the new hook interface - visibleAlerts comes directly from the hook
  const { visibleAlerts, isLoading } = useAlerts({ enabled: true });

  const criticalAlerts = visibleAlerts.filter((a) => a.severity === 'critical');
  const warningAlerts = visibleAlerts.filter((a) => a.severity === 'warning');
  const infoAlerts = visibleAlerts.filter((a) => a.severity === 'info');

  // Show loading skeleton during initial fetch
  if (isLoading && visibleAlerts.length === 0) {
    return (
      <div className={cn('flex flex-col', className)}>
        <TickerSkeleton severity="critical" />
      </div>
    );
  }

  if (visibleAlerts.length === 0) return null;

  return (
    <div className={cn('flex flex-col', className)}>
      <TickerSection alerts={criticalAlerts} severity="critical" />
      <TickerSection alerts={warningAlerts} severity="warning" />
      <TickerSection alerts={infoAlerts} severity="info" />
    </div>
  );
}
