import {
  Users,
  Calendar,
  Link,
  Bell,
  Menu,
  Home,
  FileText,
  BarChart3,
  Settings,
  Share2,
  Trophy,
  Briefcase,
  MessageSquare,
  HelpCircle,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';

export type UserRole = 'TAX_PREPARER' | 'AFFILIATE' | 'CLIENT' | 'ADMIN';

export interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  action?: 'links' | 'notifications' | 'more';
}

export interface MobileNavConfig {
  primary: NavItem[]; // Bottom nav items (max 5)
  secondary: NavItem[]; // Items shown in "More" drawer
}

// Tax Preparer Navigation
const TAX_PREPARER_CONFIG: MobileNavConfig = {
  primary: [
    { label: 'CRM', icon: Users, href: '/crm/contacts' },
    { label: 'Calendar', icon: Calendar, href: '/dashboard/tax-preparer/calendar' },
    { label: 'Links', icon: Link, action: 'links' },
    { label: 'Alerts', icon: Bell, action: 'notifications' },
    { label: 'More', icon: Menu, action: 'more' },
  ],
  secondary: [
    { label: 'Dashboard', icon: Home, href: '/dashboard/tax-preparer' },
    { label: 'Stats', icon: BarChart3, href: '/dashboard/tax-preparer/analytics' },
    { label: 'Leads', icon: UserPlus, href: '/dashboard/tax-preparer/leads' },
    { label: 'Settings', icon: Settings, href: '/dashboard/tax-preparer/settings' },
  ],
};

// Affiliate Navigation
const AFFILIATE_CONFIG: MobileNavConfig = {
  primary: [
    { label: 'Home', icon: Home, href: '/dashboard/affiliate' },
    { label: 'Leads', icon: Users, href: '/dashboard/affiliate/leads' },
    { label: 'Links', icon: Link, action: 'links' },
    { label: 'Alerts', icon: Bell, action: 'notifications' },
    { label: 'More', icon: Menu, action: 'more' },
  ],
  secondary: [
    { label: 'Marketing', icon: Share2, href: '/dashboard/affiliate/marketing' },
    { label: 'Earnings', icon: DollarSign, href: '/dashboard/affiliate/earnings' },
    { label: 'Analytics', icon: BarChart3, href: '/dashboard/affiliate/analytics' },
    { label: 'Rewards', icon: Trophy, href: '/dashboard/affiliate/achievements' },
    { label: 'Settings', icon: Settings, href: '/dashboard/affiliate/settings' },
  ],
};

// Client Navigation
const CLIENT_CONFIG: MobileNavConfig = {
  primary: [
    { label: 'Home', icon: Home, href: '/dashboard/client' },
    { label: 'Docs', icon: FileText, href: '/dashboard/client/documents' },
    { label: 'Calendar', icon: Calendar, href: '/dashboard/client/calendar' },
    { label: 'Alerts', icon: Bell, action: 'notifications' },
    { label: 'More', icon: Menu, action: 'more' },
  ],
  secondary: [
    { label: 'Returns', icon: Briefcase, href: '/dashboard/client/returns' },
    { label: 'Messages', icon: MessageSquare, href: '/dashboard/client/messages' },
    { label: 'Support', icon: HelpCircle, href: '/dashboard/client/tickets' },
    { label: 'Settings', icon: Settings, href: '/dashboard/client/settings' },
  ],
};

// Admin Navigation
const ADMIN_CONFIG: MobileNavConfig = {
  primary: [
    { label: 'CRM', icon: Users, href: '/crm/contacts' },
    { label: 'Calendar', icon: Calendar, href: '/dashboard/tax-preparer/calendar' },
    { label: 'Links', icon: Link, action: 'links' },
    { label: 'Alerts', icon: Bell, action: 'notifications' },
    { label: 'More', icon: Menu, action: 'more' },
  ],
  secondary: [
    { label: 'Dashboard', icon: Home, href: '/dashboard/admin' },
    { label: 'Users', icon: Users, href: '/admin/users' },
    { label: 'Clients', icon: Briefcase, href: '/admin/clients-status' },
    { label: 'Leads', icon: UserPlus, href: '/admin/leads' },
    { label: 'Analytics', icon: BarChart3, href: '/admin/analytics' },
    { label: 'Payouts', icon: DollarSign, href: '/admin/payouts' },
    { label: 'Settings', icon: Settings, href: '/admin/database' },
  ],
};

export const mobileNavigationConfig: Record<UserRole, MobileNavConfig> = {
  TAX_PREPARER: TAX_PREPARER_CONFIG,
  AFFILIATE: AFFILIATE_CONFIG,
  CLIENT: CLIENT_CONFIG,
  ADMIN: ADMIN_CONFIG,
};

export function getMobileNavConfig(role: UserRole): MobileNavConfig {
  return mobileNavigationConfig[role] || TAX_PREPARER_CONFIG;
}
