'use client';

import { LayoutDashboard, Settings, HelpCircle, LogOut, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { UserRole, UserPermissions } from '@/lib/permissions';

interface QuickLinksProps {
  role: UserRole;
  permissions: Partial<UserPermissions>;
}

export function QuickLinks({ role, permissions }: QuickLinksProps) {
  const router = useRouter();

  const links = [
    {
      label: 'Full Dashboard',
      icon: LayoutDashboard,
      action: () => router.push(`/dashboard/${getRolePath(role)}`),
      show: true,
    },
    {
      label: 'Quick Share',
      icon: Share2,
      action: () => router.push('/quick-share'),
      show: true,
      variant: 'default' as const,
    },
    {
      label: 'Settings',
      icon: Settings,
      action: () => router.push(`/dashboard/${getRolePath(role)}/settings`),
      show: permissions.settings,
    },
    {
      label: 'Help & Support',
      icon: HelpCircle,
      action: () => router.push('/help'),
      show: true,
    },
    {
      label: 'Sign Out',
      icon: LogOut,
      action: () => signOut({ callbackUrl: '/' }),
      show: true,
      variant: 'destructive' as const,
    },
  ];

  return (
    <Card className="mx-4">
      <CardHeader>
        <CardTitle className="text-lg">Quick Links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {links
          .filter((link) => link.show)
          .map((link, index) => {
            const Icon = link.icon;
            return (
              <Button
                key={index}
                variant={link.variant || 'outline'}
                className="w-full justify-start h-12"
                onClick={link.action}
              >
                <Icon className="h-5 w-5 mr-3" />
                {link.label}
              </Button>
            );
          })}
      </CardContent>
    </Card>
  );
}

function getRolePath(role: UserRole): string {
  switch (role) {
    case 'tax_preparer':
      return 'tax-preparer';
    case 'affiliate':
      return 'affiliate';
    case 'client':
      return 'client';
    case 'admin':
    case 'super_admin':
      return 'admin';
    default:
      return 'client';
  }
}
