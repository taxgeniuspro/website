/**
 * Admin Settings Page
 *
 * Central settings hub for administrators.
 * Links to key configuration areas across the platform.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getUserPermissions, UserPermissions } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import {
  Settings,
  Users,
  Shield,
  Calendar,
  Link2,
  FileText,
  Bell,
  CreditCard,
  BarChart3,
  Headphones,
  ShoppingBag,
  Database,
  Mail,
  Image,
  Lock,
  ExternalLink,
} from 'lucide-react';

export const metadata = {
  title: 'Admin Settings | Tax Genius Pro',
  description: 'Platform administration settings',
};

async function checkAdminAccess() {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) return { hasAccess: false, user: null };

    const role = user?.role as string;
    const customPermissions = user?.permissions as Partial<UserPermissions> | undefined;
    const permissions = getUserPermissions(role as any, customPermissions);
    const hasAccess = role === 'admin';

    return { hasAccess, user, permissions };
  } catch (error) {
    console.error('Auth check error:', error);
    return { hasAccess: false, user: null };
  }
}

interface SettingsSection {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
}

export default async function AdminSettingsPage() {
  const { hasAccess, user } = await checkAdminAccess();

  if (!hasAccess || !user) {
    redirect('/forbidden');
  }

  const settingsSections: SettingsSection[] = [
    {
      title: 'User Management',
      description: 'Manage user accounts, roles, and access',
      icon: <Users className="h-5 w-5" />,
      href: '/admin/users',
    },
    {
      title: 'Permissions',
      description: 'Configure role-based permissions',
      icon: <Shield className="h-5 w-5" />,
      href: '/admin/permissions',
    },
    {
      title: 'Content Restrictions',
      description: 'Control route and content access',
      icon: <Lock className="h-5 w-5" />,
      href: '/admin/content-restrictions',
    },
    {
      title: 'Booking Settings',
      description: 'Configure appointment scheduling',
      icon: <Calendar className="h-5 w-5" />,
      href: '/admin/booking-settings',
    },
    {
      title: 'Tracking Codes',
      description: 'Manage QR codes and short links',
      icon: <Link2 className="h-5 w-5" />,
      href: '/admin/tracking-codes',
    },
    {
      title: 'Tax Forms Library',
      description: 'Manage IRS tax form templates',
      icon: <FileText className="h-5 w-5" />,
      href: '/admin/tax-forms',
    },
    {
      title: 'Analytics',
      description: 'View platform performance metrics',
      icon: <BarChart3 className="h-5 w-5" />,
      href: '/admin/analytics',
    },
    {
      title: 'Payouts',
      description: 'Manage commissions and payments',
      icon: <CreditCard className="h-5 w-5" />,
      href: '/admin/payouts',
    },
    {
      title: 'Products & Orders',
      description: 'Manage store products and orders',
      icon: <ShoppingBag className="h-5 w-5" />,
      href: '/admin/products',
    },
    {
      title: 'Content Generator',
      description: 'AI-powered content creation',
      icon: <FileText className="h-5 w-5" />,
      href: '/admin/content-generator',
    },
    {
      title: 'Image Center',
      description: 'AI image generation tools',
      icon: <Image className="h-5 w-5" />,
      href: '/admin/image-center',
    },
    {
      title: 'Marketing Hub',
      description: 'Campaign management tools',
      icon: <Mail className="h-5 w-5" />,
      href: '/admin/marketing-hub',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground mt-1">
          Platform configuration and management
        </p>
      </div>

      {/* Current User Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Current Session</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{user.name || user.email}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="default">Administrator</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Settings Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {section.icon}
                  </div>
                  {section.badge && (
                    <Badge variant="secondary">{section.badge}</Badge>
                  )}
                </div>
                <CardTitle className="text-lg mt-3">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center text-sm text-primary">
                  <span>Configure</span>
                  <ExternalLink className="h-3 w-3 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </Link>
          <Link href="/admin/quick-share">
            <Button variant="outline" size="sm">
              <Link2 className="h-4 w-4 mr-2" />
              Create Short Link
            </Button>
          </Link>
          <Link href="/admin/analytics">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
          </Link>
          <Link href="/admin/payouts">
            <Button variant="outline" size="sm">
              <CreditCard className="h-4 w-4 mr-2" />
              Process Payouts
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Platform status and version</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Platform</span>
            <span className="font-medium">Tax Genius Pro</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Environment</span>
            <Badge variant="outline">Production</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-green-600">Operational</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
