'use client';

import { DashboardHeader } from '@/components/DashboardHeader';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { ViewingAsBar } from '@/components/admin/ViewingAsBar';
import { TaxAssistantWidget } from '@/components/tax-assistant/TaxAssistantWidget';
import { MobileNav } from '@/components/ui/mobile-nav';
import { UserRole, UserPermissions } from '@/lib/permissions';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  actualRole: UserRole;
  effectiveRole: UserRole;
  isViewingAsOtherRole: boolean;
  viewingRoleName?: string;
  permissions: Partial<UserPermissions>;
}

// Convert UserRole to MobileNav role format
function convertToMobileNavRole(role: UserRole): 'TAX_PREPARER' | 'AFFILIATE' | 'CLIENT' | 'ADMIN' {
  const roleMap: Record<UserRole, 'TAX_PREPARER' | 'AFFILIATE' | 'CLIENT' | 'ADMIN'> = {
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
        actualRole === 'super_admin') && <TaxAssistantWidget />}

      {/* Mobile Bottom Navigation - Shows on mobile devices */}
      <MobileNav role={convertToMobileNavRole(effectiveRole)} />
    </SidebarProvider>
  );
}
