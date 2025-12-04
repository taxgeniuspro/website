'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { UserRole, UserPermissions } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import {
  ALL_NAV_ITEMS,
  ROLE_DASHBOARD_ROUTES,
  SECTION_ROLE_RESTRICTIONS,
  type NavItem,
} from '@/lib/navigation-items';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ShieldCheck } from 'lucide-react';
import { PWASidebarInstall } from '@/components/PWASidebarInstall';
import { RestartTourButton } from '@/components/RestartTourButton';

interface DashboardSidebarProps {
  role: UserRole;
  permissions: Partial<UserPermissions>;
}

export function DashboardSidebar({ role, permissions }: DashboardSidebarProps) {
  // Collapse all sections by default for a cleaner, less overwhelming interface
  // Users can expand the sections they need
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Generate navigation items dynamically based on user's permissions AND role
  const navItems = ALL_NAV_ITEMS.filter((item) => {
    // Check permission first
    if (permissions[item.permission] !== true) return false;

    // If item has role restrictions, check if user's role is included
    if (item.roles && item.roles.length > 0) {
      return item.roles.includes(role);
    }

    // No role restrictions, show to all users with permission
    return true;
  }).map((item) => {
    // Dashboard Home is special - update href based on role (but only for the generic /dashboard route)
    if (item.permission === 'dashboard' && item.href === '/dashboard') {
      return { ...item, href: ROLE_DASHBOARD_ROUTES[role] };
    }

    // Earnings is special - update href based on role
    if (item.permission === 'earnings') {
      const earningsRoutes: Record<UserRole, string> = {
        super_admin: '/admin/earnings',
        admin: '/admin/earnings',
        lead: '/dashboard/lead/earnings',
        tax_preparer: '/dashboard/tax-preparer/earnings',
        affiliate: '/dashboard/affiliate/earnings',
        client: '/dashboard/client/earnings',
      };
      return { ...item, href: earningsRoutes[role] };
    }

    // Settings is special - update href based on role
    if (item.permission === 'settings') {
      const settingsRoutes: Record<UserRole, string> = {
        super_admin: '/admin/settings',
        admin: '/admin/settings',
        lead: '/dashboard/lead/settings',
        tax_preparer: '/dashboard/tax-preparer/settings',
        affiliate: '/dashboard/affiliate/settings',
        client: '/dashboard/client/settings',
      };
      return { ...item, href: settingsRoutes[role] };
    }

    // Return item as-is for all other cases
    return item;
  });

  // Group items by section for admin users
  const groupedItems = navItems.reduce(
    (acc, item) => {
      const section = item.section || 'Other';
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(item);
      return acc;
    },
    {} as Record<string, typeof navItems>
  );

  // Helper function to check if a section should be visible for this role
  const isSectionVisibleForRole = (sectionName: string): boolean => {
    const allowedRoles = SECTION_ROLE_RESTRICTIONS[sectionName];
    // If no restriction defined, section is visible to all
    if (!allowedRoles) return true;
    // Check if current role is in the allowed list
    return allowedRoles.includes(role);
  };

  // Debug: Log the role and grouped items
  logger.info('Dashboard Sidebar Debug:', {
    role,
    isAdminOrSuperAdmin: role === 'admin' || role === 'super_admin',
    totalNavItems: navItems.length,
    sections: Object.keys(groupedItems),
    itemsPerSection: Object.entries(groupedItems).map(([section, items]) => ({
      section,
      count: items.length,
      items: items.map((i) => ({ label: i.label, href: i.href })),
    })),
    permissions,
  });

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      {/* Sidebar Header */}
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-lg font-bold">TG</span>
          </div>
          {!isCollapsed && <span className="font-semibold">Tax Genius Pro</span>}
        </div>
      </SidebarHeader>

      {/* Sidebar Content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
            {role === 'admin' || role === 'super_admin' ? (
              // Render with sections for admin users - ordered sections
              // Define section order for consistent display
              <div className="space-y-4">
                {[
                  '📊 Overview',
                  '👥 Clients',
                  '📋 CRM',
                  '💰 Financials',
                  '📊 Analytics',
                  '📢 Marketing',
                  '💼 Business',
                  '🔗 Quick Share Tools',
                  '⚙️ System Controls',
                  '⚙️ Settings',
                ].map((sectionName, sectionIndex) => {
                  const items = groupedItems[sectionName];
                  if (!items || items.length === 0) return null;

                  // Check if this section should be visible for the current role
                  if (!isSectionVisibleForRole(sectionName)) return null;

                  // Default all sections to expanded (false) so users can see navigation links
                  const isSectionCollapsed = collapsedSections[sectionName] ?? false;

                  return (
                    <div key={sectionName} className="space-y-1">
                      {/* Section header with collapsible button */}
                      {!isCollapsed && (
                        <button
                          onClick={() =>
                            setCollapsedSections((prev) => ({
                              ...prev,
                              [sectionName]: !prev[sectionName],
                            }))
                          }
                          className={cn(
                            'w-full flex items-center justify-between mb-2 px-3 py-2 rounded-md border transition-all group cursor-pointer',
                            'hover:bg-accent/50 hover:border-primary/50',
                            sectionIndex === 0
                              ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20'
                              : 'bg-muted/30 border-border/50'
                          )}
                        >
                          <h3 className="text-xs font-bold tracking-wide text-foreground/90">
                            {sectionName}
                          </h3>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 transition-transform duration-200 group-hover:text-primary',
                              isSectionCollapsed && '-rotate-90'
                            )}
                          />
                        </button>
                      )}

                      {/* Section Items - only show if not collapsed */}
                      {(!isSectionCollapsed || isCollapsed) && (
                        <div className={cn('space-y-0.5', !isCollapsed && !isSectionCollapsed && 'ml-2')}>
                          {items.map((item) => {
                            const isActive =
                              pathname === item.href || pathname.startsWith(`${item.href}/`);
                            const Icon = item.icon;

                            return (
                              <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                                  <Link href={item.href}>
                                    <Icon className="h-5 w-5" />
                                    <span>{item.label}</span>
                                    {item.badge && (
                                      <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                        {item.badge}
                                      </span>
                                    )}
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </div>
                      )}

                      {/* Add separator between sections (except last) */}
                      {sectionIndex < 6 && !isCollapsed && (
                        <div className="mt-2 border-b border-border/30" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // Render with sections for non-admin users (tax_preparer, affiliate, client, lead, etc.)
              <div className="space-y-4">
                {[
                  '📱 My Dashboard', // Client/Lead only section
                  '🎯 Affiliate Dashboard', // Affiliate only section
                  '📊 Overview',
                  '👥 Clients',
                  '📋 CRM',
                  '📊 Analytics', // Fixed: was '📈 Analytics'
                  '💼 Business',
                  '⚙️ Settings',
                ].map((sectionName, sectionIndex) => {
                  const items = groupedItems[sectionName];
                  if (!items || items.length === 0) return null;

                  // Check if this section should be visible for the current role
                  if (!isSectionVisibleForRole(sectionName)) return null;

                  // Default all sections to expanded (false) so users can see navigation links
                  const isSectionCollapsed = collapsedSections[sectionName] ?? false;

                  return (
                    <div key={sectionName} className="space-y-1">
                      {/* Section header with collapsible button */}
                      {!isCollapsed && (
                        <button
                          onClick={() =>
                            setCollapsedSections((prev) => ({
                              ...prev,
                              [sectionName]: !prev[sectionName],
                            }))
                          }
                          className={cn(
                            'w-full flex items-center justify-between mb-2 px-3 py-2 rounded-md border transition-all group cursor-pointer',
                            'hover:bg-accent/50 hover:border-primary/50',
                            sectionIndex === 0
                              ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20'
                              : 'bg-muted/30 border-border/50'
                          )}
                        >
                          <h3 className="text-xs font-bold tracking-wide text-foreground/90">
                            {sectionName}
                          </h3>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 transition-transform duration-200 group-hover:text-primary',
                              isSectionCollapsed && '-rotate-90'
                            )}
                          />
                        </button>
                      )}

                      {/* Section Items - only show if not collapsed */}
                      {(!isSectionCollapsed || isCollapsed) && (
                        <div className={cn('space-y-0.5', !isCollapsed && !isSectionCollapsed && 'ml-2')}>
                          {items.map((item) => {
                            const isActive =
                              pathname === item.href || pathname.startsWith(`${item.href}/`);
                            const Icon = item.icon;

                            return (
                              <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                                  <Link href={item.href}>
                                    <Icon className="h-5 w-5" />
                                    <span>{item.label}</span>
                                    {item.badge && (
                                      <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                        {item.badge}
                                      </span>
                                    )}
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </div>
                      )}

                      {/* Add separator between sections (except last) */}
                      {sectionIndex < 6 && !isCollapsed && (
                        <div className="mt-2 border-b border-border/30" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with PWA Install, Restart Tour & Role Badge */}
      <SidebarFooter>
        {/* PWA Install Prompt */}
        <PWASidebarInstall />

        {/* Restart Tour Button */}
        <RestartTourButton role={role} />

        {/* Role Badge */}
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          {!isCollapsed && <span className="capitalize">{role.replace('_', ' ')} Account</span>}
        </div>
      </SidebarFooter>

      {/* Rail for resizing */}
      <SidebarRail />
    </Sidebar>
  );
}
