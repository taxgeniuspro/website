'use client';

import { useState, useEffect } from 'react';
import { UserRole, UserPermissions } from '@/lib/permissions';
import { MobileHubLayout } from './MobileHubLayout';
import { TaxPreparerActions } from './TaxPreparerActions';
import { AffiliateActions } from './AffiliateActions';
import { ClientActions } from './ClientActions';
import { StatsOverview } from './StatsOverview';
import { QuickLinks } from './QuickLinks';
import { logger } from '@/lib/logger';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  imageUrl?: string;
  role: UserRole;
}

interface MobileHubClientProps {
  user: UserProfile;
  permissions: Partial<UserPermissions>;
}

export function MobileHubClient({ user, permissions }: MobileHubClientProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mobile-hub/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      logger.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderRoleActions = () => {
    switch (user.role) {
      case 'tax_preparer':
        return <TaxPreparerActions userId={user.id} />;
      case 'affiliate':
        return <AffiliateActions userId={user.id} />;
      case 'client':
        return <ClientActions userId={user.id} />;
      case 'admin':
      case 'super_admin':
        // Admins see tax preparer view by default
        return <TaxPreparerActions userId={user.id} />;
      default:
        return null;
    }
  };

  return (
    <MobileHubLayout user={user}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="text-center px-4 pt-6">
          <h1 className="text-2xl font-bold">Welcome back, {user.firstName}!</h1>
          <p className="text-muted-foreground mt-1">{getRoleDisplayName(user.role)} Dashboard</p>
        </div>

        {/* Quick Stats */}
        <StatsOverview stats={stats} loading={loading} role={user.role} />

        {/* Role-Based Actions */}
        <div className="px-4">{renderRoleActions()}</div>

        {/* Quick Links */}
        <QuickLinks role={user.role} permissions={permissions} />
      </div>
    </MobileHubLayout>
  );
}

function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    tax_preparer: 'Tax Preparer',
    affiliate: 'Affiliate',
    lead: 'Lead',
    client: 'Client',
  };
  return names[role] || 'User';
}
