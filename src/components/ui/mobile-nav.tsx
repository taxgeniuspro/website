'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  Users,
  FileText,
  BarChart3,
  Settings,
  Trophy,
  Briefcase,
  MessageSquare,
  DollarSign,
  Share2,
  UserPlus,
  HelpCircle,
  Calendar,
  Mail,
} from 'lucide-react';

interface MobileNavProps {
  role: 'TAX_PREPARER' | 'AFFILIATE' | 'CLIENT' | 'ADMIN';
}

const navigationConfig = {
  TAX_PREPARER: [
    {
      label: 'Dashboard',
      icon: Home,
      href: '/dashboard/tax-preparer',
    },
    {
      label: 'Clients',
      icon: Users,
      href: '/dashboard/tax-preparer/overview',
    },
    {
      label: 'Leads',
      icon: UserPlus,
      href: '/dashboard/tax-preparer/leads',
    },
    {
      label: 'Documents',
      icon: FileText,
      href: '/dashboard/tax-preparer/documents',
    },
    {
      label: 'Earnings',
      icon: DollarSign,
      href: '/dashboard/tax-preparer/earnings',
    },
    {
      label: 'Analytics',
      icon: BarChart3,
      href: '/dashboard/tax-preparer/analytics',
    },
    {
      label: 'Settings',
      icon: Settings,
      href: '/dashboard/tax-preparer/settings',
    },
  ],
  AFFILIATE: [
    {
      label: 'Dashboard',
      icon: Home,
      href: '/dashboard/affiliate',
    },
    {
      label: 'Leads',
      icon: Users,
      href: '/dashboard/affiliate/leads',
    },
    {
      label: 'Marketing',
      icon: Share2,
      href: '/dashboard/affiliate/marketing',
    },
    {
      label: 'Earnings',
      icon: DollarSign,
      href: '/dashboard/affiliate/earnings',
    },
    {
      label: 'Analytics',
      icon: BarChart3,
      href: '/dashboard/affiliate/analytics',
    },
    {
      label: 'Rewards',
      icon: Trophy,
      href: '/dashboard/affiliate/achievements',
    },
    {
      label: 'Settings',
      icon: Settings,
      href: '/dashboard/affiliate/settings',
    },
  ],
  CLIENT: [
    {
      label: 'Dashboard',
      icon: Home,
      href: '/dashboard/client',
    },
    {
      label: 'Documents',
      icon: FileText,
      href: '/dashboard/client/documents',
    },
    {
      label: 'Returns',
      icon: Briefcase,
      href: '/dashboard/client/returns',
    },
    {
      label: 'Messages',
      icon: MessageSquare,
      href: '/dashboard/client/messages',
    },
    {
      label: 'Support',
      icon: HelpCircle,
      href: '/dashboard/client/tickets',
    },
    {
      label: 'Calendar',
      icon: Calendar,
      href: '/dashboard/client/calendar',
    },
    {
      label: 'Settings',
      icon: Settings,
      href: '/dashboard/client/settings',
    },
  ],
  ADMIN: [
    {
      label: 'Dashboard',
      icon: Home,
      href: '/dashboard/admin',
    },
    {
      label: 'Users',
      icon: Users,
      href: '/admin/users',
    },
    {
      label: 'Clients',
      icon: Briefcase,
      href: '/admin/clients-status',
    },
    {
      label: 'Leads',
      icon: UserPlus,
      href: '/admin/leads',
    },
    {
      label: 'Analytics',
      icon: BarChart3,
      href: '/admin/analytics',
    },
    {
      label: 'Payouts',
      icon: DollarSign,
      href: '/admin/payouts',
    },
    {
      label: 'Settings',
      icon: Settings,
      href: '/admin/database',
    },
  ],
};

export function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname();
  const navItems = navigationConfig[role] || navigationConfig.TAX_PREPARER;

  return (
    <>
      {/* Spacer to prevent content from being hidden behind fixed nav */}
      <div className="h-16 md:hidden" />

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-b-full" />
                )}

                <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
