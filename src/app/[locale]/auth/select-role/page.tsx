'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserRole } from '@/lib/auth';
import { logger } from '@/lib/logger';

export default function SelectRolePage() {
  const router = useRouter();
  const { data: session } = useSession(); const user = session?.user;
  const t = useTranslations('auth.selectRole');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingLead, setCheckingLead] = useState(true);

  // Only show client role - tax_preparer and affiliate require manual admin upgrade
  const roles: { value: UserRole; label: string; description: string }[] = [
    {
      value: 'client',
      label: t('roles.client.label'),
      description: t('roles.client.description'),
    },
  ];

  // Check if user filled out tax form and was auto-converted to CLIENT
  useEffect(() => {
    async function checkForLead() {
      if (!user?.email) {
        setCheckingLead(false);
        return;
      }

      try {
        const email = user.email;
        const res = await fetch(`/api/auth/check-lead?email=${encodeURIComponent(email)}`);
        const data = await res.json();

        if (data.hasLead && data.profileCreated) {
          // User filled out form and was auto-converted to CLIENT
          // Redirect directly to client dashboard
          logger.info('User has converted lead, redirecting to client dashboard');
          router.push('/dashboard/client');
          return;
        }
      } catch (err) {
        logger.error('Error checking for lead:', err);
      } finally {
        setCheckingLead(false);
      }
    }

    checkForLead();
  }, [user, router]);

  const handleRoleSelection = async () => {
    if (!selectedRole || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Update role via API endpoint
      const response = await fetch('/api/user/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: selectedRole,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      // Redirect to role-specific dashboard
      const dashboardUrls: Record<UserRole, string> = {
        super_admin: '/dashboard/admin',
        admin: '/dashboard/admin',
        lead: '/dashboard/lead',
        client: '/dashboard/client',
        tax_preparer: '/dashboard/tax-preparer',
        affiliate: '/dashboard/affiliate',
      };

      router.push(dashboardUrls[selectedRole]);
      router.refresh(); // Refresh to update session with new role
    } catch (err) {
      logger.error('Error updating role:', err);
      setError(t('error'));
      setIsLoading(false);
    }
  };

  // Show loading while checking for lead
  if (checkingLead) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>{t('loading.title')}</CardTitle>
            <CardDescription>{t('loading.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{t('header.title')}</CardTitle>
          <CardDescription>
            {t('header.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={`rounded-lg border-2 p-6 text-left transition-all hover:border-primary ${
                  selectedRole === role.value ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                disabled={isLoading}
              >
                <h3 className="mb-2 font-semibold">{role.label}</h3>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{t('error')}</div>
          )}

          <Button
            onClick={handleRoleSelection}
            disabled={!selectedRole || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? t('buttons.settingUp') : t('buttons.continue')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
