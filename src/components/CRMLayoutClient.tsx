'use client';

import { DashboardHeader } from '@/components/DashboardHeader';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { UserRole, UserPermissions } from '@/lib/permissions';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

interface CRMLayoutClientProps {
  children: React.ReactNode;
  role: UserRole;
  permissions: Partial<UserPermissions>;
}

export function CRMLayoutClient({ children, role, permissions }: CRMLayoutClientProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      {/* Sidebar - uses role-based navigation with permissions */}
      <DashboardSidebar role={role} permissions={permissions} />

      {/* Main content area with header */}
      <SidebarInset className="flex flex-col">
        {/* Header - uses real user data from Clerk */}
        <DashboardHeader actualRole={role} effectiveRole={role} isViewingAsOtherRole={false} />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
