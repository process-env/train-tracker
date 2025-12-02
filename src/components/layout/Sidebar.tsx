'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, BarChart3, Train, Menu, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { useUIStore } from '@/stores';
import { RouteFilter } from './RouteFilter';
import { AlertBadge } from '@/components/alerts';

const navItems = [
  { href: '/map', label: 'Live Map', icon: Map },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/stations', label: 'Stations', icon: Train },
  { href: '/alerts', label: 'Alerts', icon: Bell, showBadge: true },
];

function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="flex-1">{item.label}</span>
            {item.showBadge && <AlertBadge />}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <>
      {/* Mobile trigger */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
          <Button variant="outline" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Train className="h-6 w-6" />
                MTA Tracker
              </h1>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <NavLinks />
              <div className="mt-6">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Filter Routes
                </h3>
                <RouteFilter />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r bg-card">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Train className="h-6 w-6" />
            MTA Tracker
          </h1>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <NavLinks />
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Filter Routes
            </h3>
            <RouteFilter />
          </div>
        </div>
      </aside>
    </>
  );
}
