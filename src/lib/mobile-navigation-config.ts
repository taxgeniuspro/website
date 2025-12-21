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
  Search,
  DollarSign,
  type LucideIcon,
} from 'lucide-react';

export type UserRole = 'TAX_PREPARER' | 'AFFILIATE' | 'CLIENT' | 'ADMIN';

export interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  action?: 'links' | 'notifications' | 'more' | 'search';
}

export interface MobileNavConfig {
  primary: NavItem[]; // Bottom nav items (max 5)
  secondary: NavItem[]; // Items shown in "More" drawer
}

/**
 * Streamlined Mobile Navigation (Dec 2025)
 *
 * 5 essential tabs per role:
 * - Home (dashboard)
 * - Primary action (Leads/Docs)
 * - Referrals (unified page)
 * - Stats (analytics)
 * - More (overflow menu)
 */

// Tax Preparer Navigation - Simplified
const TAX_PREPARER_CONFIG: MobileNavConfig = {
  primary: [
    { label: 'Home', icon: Home, href: '/dashboard/tax-preparer' },
    { label: 'Leads', icon: UserPlus, href: '/dashboard/tax-preparer/leads' },
    { label: 'Referrals', icon: Share2, href: '/dashboard/referrals' },
    { label: 'Stats', icon: BarChart3, href: '/dashboard/tax-preparer/analytics' },
    { label: 'More', icon: Menu, action: 'more' },
  ],
  secondary: [
    { label: 'Calendar', icon: Calendar, href: '/dashboard/tax-preparer/calendar' },
    { label: 'Clients', icon: Users, href: '/dashboard/tax-preparer/clients' },
    { label: 'Documents', icon: FileText, href: '/dashboard/tax-preparer/documents' },
    { label: 'Intake Forms', icon: Briefcase, href: '/dashboard/tax-preparer/intake-forms' },
    { label: 'Notifications', icon: Bell, action: 'notifications' },
    { label: 'Settings', icon: Settings, href: '/dashboard/tax-preparer/settings' },
  ],
};

// Affiliate Navigation - Simplified
const AFFILIATE_CONFIG: MobileNavConfig = {
  primary: [
    { label: 'Home', icon: Home, href: '/dashboard/affiliate' },
    { label: 'Leads', icon: Users, href: '/dashboard/affiliate/leads' },
    { label: 'Referrals', icon: Share2, href: '/dashboard/referrals' },
    { label: 'Earnings', icon: DollarSign, href: '/dashboard/affiliate/earnings' },
    { label: 'More', icon: Menu, action: 'more' },
  ],
  secondary: [
    { label: 'Analytics', icon: BarChart3, href: '/dashboard/affiliate/analytics' },
    { label: 'Rewards', icon: Trophy, href: '/dashboard/affiliate/achievements' },
    { label: 'Notifications', icon: Bell, action: 'notifications' },
    { label: 'Settings', icon: Settings, href: '/dashboard/affiliate/settings' },
  ],
};

// Client Navigation - Simplified
const CLIENT_CONFIG: MobileNavConfig = {
  primary: [
    { label: 'Home', icon: Home, href: '/dashboard/client' },
    { label: 'Docs', icon: FileText, href: '/dashboard/client/documents' },
    { label: 'Share', icon: Share2, href: '/dashboard/referrals' },
    { label: 'Support', icon: HelpCircle, href: '/dashboard/client/tickets' },
    { label: 'More', icon: Menu, action: 'more' },
  ],
  secondary: [
    { label: 'Earnings', icon: DollarSign, href: '/dashboard/client/earnings' },
    { label: 'Returns', icon: Briefcase, href: '/dashboard/client/returns' },
    { label: 'Messages', icon: MessageSquare, href: '/dashboard/client/messages' },
    { label: 'Notifications', icon: Bell, action: 'notifications' },
    { label: 'Settings', icon: Settings, href: '/dashboard/client/settings' },
  ],
};

// Admin Navigation - Simplified
const ADMIN_CONFIG: MobileNavConfig = {
  primary: [
    { label: 'Home', icon: Home, href: '/dashboard/admin' },
    { label: 'Leads', icon: UserPlus, href: '/admin/leads' },
    { label: 'Analytics', icon: BarChart3, href: '/admin/analytics' },
    { label: 'Search', icon: Search, action: 'search' },
    { label: 'More', icon: Menu, action: 'more' },
  ],
  secondary: [
    { label: 'Users', icon: Users, href: '/admin/users' },
    { label: 'Clients', icon: Briefcase, href: '/admin/clients-status' },
    { label: 'Calendar', icon: Calendar, href: '/admin/calendar' },
    { label: 'Payouts', icon: DollarSign, href: '/admin/payouts' },
    { label: 'Notifications', icon: Bell, action: 'notifications' },
    { label: 'Settings', icon: Settings, href: '/admin/settings' },
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
