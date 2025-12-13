'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { ViewingAsBar } from '@/components/admin/ViewingAsBar';
import { TaxAssistantWidget } from '@/components/tax-assistant/TaxAssistantWidget';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
import { NotificationDrawer, type Notification } from '@/components/mobile/NotificationDrawer';
import { QuickLinksSheet, type QuickLink } from '@/components/mobile/QuickLinksSheet';
import { SearchDrawer } from '@/components/mobile/SearchDrawer';
import { UserRole, UserPermissions } from '@/lib/permissions';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { type UserRole as MobileNavRole } from '@/lib/mobile-navigation-config';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  actualRole: UserRole;
  effectiveRole: UserRole;
  isViewingAsOtherRole: boolean;
  viewingRoleName?: string;
  permissions: Partial<UserPermissions>;
}

// Convert UserRole to MobileNav role format
function convertToMobileNavRole(role: UserRole): MobileNavRole {
  const roleMap: Record<UserRole, MobileNavRole> = {
    tax_preparer: 'TAX_PREPARER',
    affiliate: 'AFFILIATE',
    client: 'CLIENT',
    lead: 'CLIENT', // Leads use the same mobile nav as clients
    admin: 'ADMIN',
    super_admin: 'ADMIN', // Super admins use the same mobile nav as admins
  };
  return roleMap[role] || 'CLIENT';
}

export function DashboardLayoutClient({
  children,
  actualRole,
  effectiveRole,
  isViewingAsOtherRole,
  viewingRoleName,
  permissions,
}: DashboardLayoutClientProps) {
  const [linksOpen, setLinksOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);

  // Fetch notifications
  useEffect(() => {
    // TODO: Replace with actual API call
    // For now, using empty array - API endpoint can be added later
  }, []);

  // Fetch quick links for tax preparers
  useEffect(() => {
    if (effectiveRole === 'tax_preparer' || effectiveRole === 'admin' || effectiveRole === 'admin') {
      // TODO: Replace with actual API call to get preparer's links
      // For now, using empty array - will be populated from API
    }
  }, [effectiveRole]);

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read and navigate if href exists
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );
    if (notification.href) {
      setNotificationsOpen(false);
      window.location.href = notification.href;
    }
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Sidebar - uses effective role-based navigation with permissions */}
      <DashboardSidebar role={effectiveRole} permissions={permissions} />

      {/* Main content area with header */}
      <SidebarInset className="flex flex-col">
        {/* Header - uses real user data from Clerk */}
        <DashboardHeader
          actualRole={actualRole}
          effectiveRole={effectiveRole}
          isViewingAsOtherRole={isViewingAsOtherRole}
        />

        {/* Viewing As Bar - shows when admin is viewing as another role */}
        {isViewingAsOtherRole && (
          <ViewingAsBar
            actualRole={actualRole}
            effectiveRole={effectiveRole}
            viewingRoleName={viewingRoleName}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-6">{children}</div>
      </SidebarInset>

      {/* Tax Assistant Widget - Only for Tax Preparers and Admins */}
      {(actualRole === 'tax_preparer' ||
        actualRole === 'admin' ||
        actualRole === 'admin') && <TaxAssistantWidget />}

      {/* Mobile Bottom Navigation - Shows on mobile devices */}
      <MobileBottomNav
        role={convertToMobileNavRole(effectiveRole)}
        onLinksOpen={() => setLinksOpen(true)}
        onNotificationsOpen={() => setNotificationsOpen(true)}
        onSearchOpen={() => setSearchOpen(true)}
        notificationCount={unreadCount}
      />

      {/* Quick Links Sheet */}
      <QuickLinksSheet
        open={linksOpen}
        onOpenChange={setLinksOpen}
        links={quickLinks}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllRead={handleMarkAllRead}
        onClearAll={handleClearNotifications}
      />

      {/* Search Drawer */}
      <SearchDrawer open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  );
}
