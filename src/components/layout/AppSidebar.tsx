'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Map,
  BarChart3,
  Train,
  Bell,
  Settings,
  ChevronUp,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAlertsStore } from '@/stores';
import { RouteFilter } from './RouteFilter';

const navItems = [
  { href: '/map', label: 'Live Map', icon: Map },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/stations', label: 'Stations', icon: Train },
  { href: '/alerts', label: 'Alerts', icon: Bell, showBadge: true },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const alertCount = useAlertsStore((s) => s.alerts.length);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/map">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Train className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">MTA Tracker</span>
                  <span className="truncate text-xs text-muted-foreground">NYC Subway</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.showBadge && alertCount > 0 && !isCollapsed && (
                    <SidebarMenuBadge className="bg-destructive text-destructive-foreground text-[10px] min-w-4 h-4 px-1">
                      {alertCount > 9 ? '9+' : alertCount}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Route Filters */}
        <SidebarGroup>
          <SidebarGroupLabel>Filter Routes</SidebarGroupLabel>
          <SidebarGroupContent>
            <RouteFilter compact={isCollapsed} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
