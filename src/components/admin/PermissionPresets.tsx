'use client';

import { Button } from '@/components/ui/button';
import { Lock, ShieldCheck, Settings, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserPermissions } from '@/lib/permissions';
import { logger } from '@/lib/logger';

interface PermissionPresetsProps {
  onApplyPreset?: (permissions: Partial<UserPermissions>) => void;
}

export function PermissionPresets({ onApplyPreset }: PermissionPresetsProps) {
  const { toast } = useToast();

  const presets = [
    {
      name: 'Limited Admin',
      description: 'Basic admin access without system controls',
      icon: Lock,
      iconColor: 'text-muted-foreground',
      permissions: {
        // General
        dashboard: true,
        alerts: false,
        // Client Management
        clientsStatus: true,
        clients: false,
        clientFileCenter: false,
        documents: false,
        uploadDocuments: false,
        returns: false,
        // Communications
        emails: true,
        calendar: true,
        messages: false,
        addressBook: true,
        // Analytics
        analytics: true,
        googleAnalytics: false,
        referralsAnalytics: false,
        // Growth & Marketing
        referralsStatus: true,
        referrals: false,
        leads: false,
        contest: false,
        quickShareLinks: false,
        // Content & Learning
        learningCenter: false,
        academy: false,
        contentGenerator: false,
        // Marketing Materials
        marketingHub: false,
        marketing: false,
        // Financial
        payouts: false,
        earnings: true,
        store: false,
        // System Administration
        users: false,
        adminManagement: false,
        database: false,
        settings: true,
      } as Partial<UserPermissions>,
    },
    {
      name: 'Full Admin',
      description: 'Complete admin access (except super admin features)',
      icon: ShieldCheck,
      iconColor: 'text-green-600',
      permissions: {
        // General
        dashboard: true,
        alerts: true,
        // Client Management
        clientsStatus: true,
        clients: true,
        clientFileCenter: true,
        documents: true,
        uploadDocuments: false,
        returns: false,
        // Communications
        emails: true,
        calendar: true,
        messages: true,
        addressBook: true,
        // Analytics
        analytics: true,
        googleAnalytics: true,
        referralsAnalytics: true,
        // Growth & Marketing
        referralsStatus: true,
        referrals: false,
        leads: false,
        contest: false,
        quickShareLinks: true,
        // Content & Learning
        learningCenter: true,
        academy: true,
        contentGenerator: true,
        // Marketing Materials
        marketingHub: true,
        marketing: true,
        // Financial
        payouts: true,
        earnings: true,
        store: true,
        // System Administration
        users: true,
        adminManagement: false, // Still restricted
        database: true,
        settings: true,
      } as Partial<UserPermissions>,
    },
    {
      name: 'Operations Admin',
      description: 'Focus on day-to-day operations',
      icon: Settings,
      iconColor: 'text-blue-600',
      permissions: {
        // General
        dashboard: true,
        alerts: false,
        // Client Management
        clientsStatus: true,
        clients: true,
        clientFileCenter: true,
        documents: true,
        uploadDocuments: false,
        returns: false,
        // Communications
        emails: true,
        calendar: true,
        messages: true,
        addressBook: true,
        // Analytics
        analytics: true,
        googleAnalytics: false,
        referralsAnalytics: false,
        // Growth & Marketing
        referralsStatus: false,
        referrals: false,
        leads: false,
        contest: false,
        quickShareLinks: false,
        // Content & Learning
        learningCenter: false,
        academy: false,
        contentGenerator: false,
        // Marketing Materials
        marketingHub: false,
        marketing: false,
        // Financial
        payouts: false,
        earnings: false,
        store: false,
        // System Administration
        users: false,
        adminManagement: false,
        database: false,
        settings: true,
      } as Partial<UserPermissions>,
    },
    {
      name: 'Marketing Admin',
      description: 'Marketing and content focused access',
      icon: Users,
      iconColor: 'text-purple-600',
      permissions: {
        // General
        dashboard: true,
        alerts: false,
        // Client Management - Limited
        clientsStatus: false,
        clients: false,
        clientFileCenter: false,
        documents: false,
        uploadDocuments: false,
        returns: false,
        // Communications
        emails: true,
        calendar: false,
        messages: false,
        addressBook: false,
        // Analytics
        analytics: true,
        googleAnalytics: true,
        referralsAnalytics: true,
        // Growth & Marketing
        referralsStatus: true,
        referrals: false,
        leads: true,
        contest: true,
        quickShareLinks: true,
        // Content & Learning
        learningCenter: true,
        academy: false,
        contentGenerator: true,
        // Marketing Materials
        marketingHub: true,
        marketing: true,
        // Financial
        payouts: false,
        earnings: true,
        store: true,
        // System Administration
        users: false,
        adminManagement: false,
        database: false,
        settings: true,
      } as Partial<UserPermissions>,
    },
  ];

  const applyPreset = async (preset: (typeof presets)[0]) => {
    if (onApplyPreset) {
      onApplyPreset(preset.permissions);
      return;
    }

    // Apply to all admin users
    try {
      const response = await fetch('/api/admin/update-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'default',
          role: 'admin',
          permissions: preset.permissions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to apply preset');
      }

      const result = await response.json();

      toast({
        title: 'Preset Applied',
        description: `${preset.name} permissions have been applied to ${result.affectedUsers || 'all'} admin users.`,
        duration: 3000,
      });
    } catch (error) {
      logger.error('Error applying preset:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to apply preset',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {presets.map((preset) => {
        const Icon = preset.icon;

        return (
          <div key={preset.name} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium">{preset.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{preset.description}</p>
              </div>
              <Icon className={`w-5 h-5 ${preset.iconColor}`} />
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Key Features:</p>
              <ul className="space-y-1 text-muted-foreground">
                {preset.name === 'Limited Admin' && (
                  <>
                    <li>✓ Dashboard & Basic Analytics</li>
                    <li>✓ Client & Referral Status</li>
                    <li>✓ Email & Calendar</li>
                    <li>✗ Database Access</li>
                    <li>✗ User Management</li>
                    <li>✗ Permission Control</li>
                  </>
                )}
                {preset.name === 'Full Admin' && (
                  <>
                    <li>✓ All Management Features</li>
                    <li>✓ All Analytics</li>
                    <li>✓ User Management</li>
                    <li>✓ Database Access</li>
                    <li>✓ Content Generation</li>
                    <li>✗ Permission Control</li>
                  </>
                )}
                {preset.name === 'Operations Admin' && (
                  <>
                    <li>✓ Client Management</li>
                    <li>✓ Email & Calendar</li>
                    <li>✓ File Management</li>
                    <li>✓ Basic Analytics</li>
                    <li>✗ Financial Features</li>
                    <li>✗ System Settings</li>
                  </>
                )}
                {preset.name === 'Marketing Admin' && (
                  <>
                    <li>✓ Marketing Hub</li>
                    <li>✓ Content Generator</li>
                    <li>✓ Learning Center</li>
                    <li>✓ Quick Share Links</li>
                    <li>✓ Analytics</li>
                    <li>✗ Client Data Access</li>
                  </>
                )}
              </ul>
            </div>
            <Button className="w-full mt-4" variant="outline" onClick={() => applyPreset(preset)}>
              Apply to All Admins
            </Button>
          </div>
        );
      })}
    </div>
  );
}
