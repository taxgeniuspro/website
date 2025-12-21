'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserRole, UserPermissions, hasAffiliateAccess, hasTaxFilingAccess } from '@/lib/permissions';
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { ShieldCheck, Settings } from 'lucide-react';
import { PWASidebarInstall } from '@/components/PWASidebarInstall';
import Image from 'next/image';
import type { AffiliateStatus } from '@prisma/client';

interface DashboardSidebarProps {
  role: UserRole;
  permissions: Partial<UserPermissions>;
  // Status-based access control (for clients)
  affiliateStatus?: AffiliateStatus | null;
  hasFiledTaxes?: boolean | null;
  // User preference to hide referral program features
  hideReferralProgram?: boolean | null;
}

export function DashboardSidebar({ role, permissions, affiliateStatus, hasFiledTaxes, hideReferralProgram }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Check status-based access for clients
  const canAccessAffiliateFeatures = hasAffiliateAccess(role, affiliateStatus);
  const canAccessTaxFilingFeatures = hasTaxFilingAccess(role, hasFiledTaxes);

  // User has opted out of referral program visibility
  const userHidesReferralProgram = hideReferralProgram === true;

  // List of affiliate/referral-feature paths (hidden if user opts out)
  const affiliateFeaturePaths = [
    '/dashboard/referrals',
    '/dashboard/client/leads',
    '/dashboard/client/analytics',
    '/dashboard/client/creatives',
    '/dashboard/client/earnings',
  ];

  // List of tax-filing paths (only shown if hasFiledTaxes for clients)
  const taxFilingPaths = [
    '/dashboard/client/documents',
    '/dashboard/client/tickets',
  ];

  // Generate navigation items dynamically based on user's permissions, role, AND status flags
  const navItems = ALL_NAV_ITEMS.filter((item) => {
    // Check permission first
    if (permissions[item.permission] !== true) return false;

    // If item has role restrictions, check if user's role is included
    if (item.roles && item.roles.length > 0) {
      if (!item.roles.includes(role)) return false;
    }

    // Check section visibility for role
    if (item.section) {
      const allowedRoles = SECTION_ROLE_RESTRICTIONS[item.section];
      if (allowedRoles && !allowedRoles.includes(role)) return false;
    }

    // For clients, apply additional status-based filtering
    if (role === 'client') {
      // Check if this is an affiliate feature path
      if (affiliateFeaturePaths.some(path => item.href.startsWith(path))) {
        // Hide if user opted out of referral program OR doesn't have affiliate access
        if (userHidesReferralProgram || !canAccessAffiliateFeatures) return false;
      }

      // Check if this is a tax-filing feature path
      if (taxFilingPaths.some(path => item.href.startsWith(path))) {
        if (!canAccessTaxFilingFeatures) return false;
      }
    }

    // Show to all users with permission
    return true;
  }).map((item) => {
    // Dashboard Home is special - update href based on role (but only for the generic /dashboard route)
    if (item.permission === 'dashboard' && item.href === '/dashboard') {
      return { ...item, href: ROLE_DASHBOARD_ROUTES[role] };
    }

    // NOTE: Earnings routes are now defined directly in nav items per role
    // Settings is in sidebar footer only (not in nav items)

    // Return item as-is for all other cases
    return item;
  });

  // Debug: Log the role and nav items
  logger.info('Dashboard Sidebar Debug:', {
    role,
    isAdmin: role === 'admin',
    totalNavItems: navItems.length,
    permissions,
  });

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      {/* Sidebar Header */}
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Image
            src="/images/owliver-owl-icon.png"
            alt="Tax Genius Pro"
            width={40}
            height={40}
            className="h-8 w-8 object-contain"
            priority
          />
        </div>
      </SidebarHeader>

      {/* Sidebar Content - Grouped by Section (no dropdowns, always visible) */}
      <SidebarContent>
        {(() => {
          // Group nav items by section
          const groupedItems: Record<string, NavItem[]> = {};
          navItems.forEach((item) => {
            const section = item.section || 'Other';
            if (!groupedItems[section]) {
              groupedItems[section] = [];
            }
            groupedItems[section].push(item);
          });

          return Object.entries(groupedItems).map(([section, items]) => (
            <SidebarGroup key={section}>
              {/* Section Label - always visible, no dropdown */}
              <SidebarGroupLabel>{section}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ));
        })()}
      </SidebarContent>

      {/* Footer with PWA Install & Role Badge */}
      <SidebarFooter>
        {/* PWA Install Prompt */}
        <PWASidebarInstall />

        {/* Settings Link - Single location to avoid duplicates */}
        <SidebarMenuButton asChild tooltip="Settings">
          <Link href={
            role === 'admin' ? '/admin/settings' :
            role === 'tax_preparer' ? '/dashboard/tax-preparer/settings' :
            '/dashboard/client/settings'
          }>
            <Settings className="h-4 w-4" />
            {!isCollapsed && <span>Settings</span>}
          </Link>
        </SidebarMenuButton>

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
