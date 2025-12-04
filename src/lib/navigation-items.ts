/**
 * Shared Navigation Items
 *
 * Single source of truth for dashboard navigation across mobile and desktop.
 * Used by both DashboardSidebar and MobileSidebar components.
 */

import {
  Home,
  FileText,
  Users,
  DollarSign,
  Settings,
  BarChart3,
  CreditCard,
  Share2,
  Calendar,
  Mail,
  FolderOpen,
  Megaphone,
  Link2,
  Database,
  Sparkles,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Trophy,
  QrCode,
  Package,
  BookOpen,
  Shield,
  Ticket,
  GitBranch,
  LifeBuoy,
  Image,
} from 'lucide-react';
import { UserRole, Permission } from '@/lib/permissions';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  permission: Permission;
  section?: string;
  roles?: UserRole[];
}

/**
 * All possible navigation items with their permission requirements
 * Organized by section for better maintainability
 */
export const ALL_NAV_ITEMS: NavItem[] = [
  // 📱 Client Section (for clients and leads only)
  {
    label: 'Overview',
    href: '/dashboard/client',
    icon: Home,
    permission: 'dashboard',
    section: '📱 My Dashboard',
    roles: ['client', 'lead'],
  },
  {
    label: 'Documents',
    href: '/dashboard/client/documents',
    icon: FileText,
    permission: 'dashboard',
    section: '📱 My Dashboard',
    roles: ['client', 'lead'],
  },
  {
    label: 'Referral Earnings',
    href: '/dashboard/client/referrals',
    icon: Share2,
    permission: 'dashboard',
    section: '📱 My Dashboard',
    roles: ['client', 'lead'],
  },
  {
    label: 'Ask Your Tax Genius',
    href: '/dashboard/client/tickets',
    icon: Ticket,
    permission: 'dashboard',
    section: '📱 My Dashboard',
    roles: ['client', 'lead'],
  },
  // Tax Forms hidden from navigation - clients will access assigned forms through direct links
  // {
  //   label: 'Tax Forms',
  //   href: '/dashboard/client/tax-forms',
  //   icon: FileText,
  //   permission: 'dashboard',
  //   section: '📱 My Dashboard',
  //   roles: ['client', 'lead'],
  // },

  // 🎯 Affiliate Section (for affiliates only)
  {
    label: 'Overview',
    href: '/dashboard/affiliate',
    icon: Home,
    permission: 'dashboard',
    section: '🎯 Affiliate Dashboard',
    roles: ['affiliate'],
  },
  {
    label: 'Links & QR',
    href: '/dashboard/affiliate/tracking',
    icon: QrCode,
    permission: 'trackingCode',
    section: '🎯 Affiliate Dashboard',
    roles: ['affiliate'],
  },
  {
    label: 'My Leads',
    href: '/dashboard/affiliate/leads',
    icon: Users,
    permission: 'dashboard',
    section: '🎯 Affiliate Dashboard',
    roles: ['affiliate'],
  },
  {
    label: 'Analytics',
    href: '/dashboard/affiliate/analytics',
    icon: BarChart3,
    permission: 'analytics',
    section: '🎯 Affiliate Dashboard',
    roles: ['affiliate'],
  },

  // 👥 Clients Section (for tax preparers and admins)
  {
    label: 'My Clients',
    href: '/dashboard/tax-preparer/clients',
    icon: Users,
    permission: 'clientsStatus',
    section: '👥 Clients',
    roles: ['tax_preparer'],
  },
  {
    label: 'Support Tickets',
    href: '/dashboard/tax-preparer/tickets',
    icon: Ticket,
    permission: 'clientsStatus',
    section: '👥 Clients',
    roles: ['tax_preparer'],
  },
  {
    label: 'Tax Forms Library',
    href: '/dashboard/tax-preparer/tax-forms',
    icon: FileText,
    permission: 'clientsStatus',
    section: '👥 Clients',
    roles: ['tax_preparer'],
  },
  {
    label: 'Clients Status',
    href: '/admin/clients-status',
    icon: UserCheck,
    permission: 'clientsStatus',
    section: '👥 Clients',
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Referrals Status',
    href: '/admin/referrals-status',
    icon: Users,
    permission: 'referralsStatus',
    section: '👥 Clients',
    roles: ['admin', 'super_admin'],
  },

  // 📊 Analytics Section (Moved to top for admin - overview of whole company)
  {
    label: 'Analytics Overview',
    href: '/admin/analytics',
    icon: BarChart3,
    permission: 'analytics',
    section: '📊 Analytics',
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Tax Genius Analytics',
    href: '/admin/analytics/tax-genius',
    icon: Sparkles,
    permission: 'analytics',
    section: '📊 Analytics',
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Tax Preparers Analytics',
    href: '/admin/analytics/preparers',
    icon: Users,
    permission: 'analytics',
    section: '📊 Analytics',
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Affiliates Analytics',
    href: '/admin/analytics/affiliates',
    icon: Trophy,
    permission: 'analytics',
    section: '📊 Analytics',
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Clients Analytics',
    href: '/admin/analytics/clients',
    icon: TrendingUp,
    permission: 'analytics',
    section: '📊 Analytics',
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'My Analytics',
    href: '/dashboard/tax-preparer/analytics',
    icon: BarChart3,
    permission: 'analytics',
    section: '📊 Analytics',
    roles: ['tax_preparer'],
  },
  {
    label: 'My Tracking Code',
    href: '/dashboard/tax-preparer/tracking',
    icon: QrCode,
    permission: 'trackingCode',
    section: '📊 Analytics',
    roles: ['tax_preparer', 'super_admin', 'affiliate', 'client'],
  },

  // 📋 CRM Section
  {
    label: 'Calendar & Appointments',
    href: '/admin/calendar',
    icon: Calendar,
    permission: 'calendar',
    section: '📋 CRM',
    roles: ['tax_preparer', 'super_admin'],
  },
  {
    label: 'CRM Contacts',
    href: '/crm/contacts',
    icon: BookOpen,
    permission: 'addressBook',
    section: '📋 CRM',
    roles: ['tax_preparer', 'super_admin'],
  },
  {
    label: 'Client File Center',
    href: '/admin/file-center',
    icon: FolderOpen,
    permission: 'clientFileCenter',
    section: '📋 CRM',
    roles: ['tax_preparer', 'super_admin'],
  },
  {
    label: 'Emails',
    href: '/admin/emails',
    icon: Mail,
    permission: 'emails',
    section: '📋 CRM',
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Academy',
    href: '/app/academy',
    icon: GraduationCap,
    permission: 'academy',
    section: '📋 CRM',
    roles: ['tax_preparer', 'admin', 'super_admin'],
  },
  {
    label: 'IRS Forms',
    href: '/admin/tax-forms',
    icon: FileText,
    permission: 'taxForms', // ✅ NOW INDEPENDENT! Can toggle separately from Client File Center
    section: '📋 CRM',
    roles: ['tax_preparer', 'admin', 'super_admin'], // ✅ Visible to tax preparers too!
  },
  {
    label: 'Store',
    href: '/store',
    icon: Package,
    permission: 'store',
    section: '📋 CRM',
    roles: ['tax_preparer', 'admin', 'super_admin'],
  },
  {
    label: 'Marketing Assets',
    href: '/crm/marketing-assets',
    icon: FolderOpen,
    permission: 'marketingAssets', // ✅ NOW INDEPENDENT! Can toggle separately from Client File Center
    section: '📋 CRM',
    roles: ['tax_preparer', 'super_admin'],
  },
  {
    label: 'Marketing Products',
    href: '/dashboard/tax-preparer/marketing-products',
    icon: Package,
    permission: 'marketingAssets',
    section: '📋 CRM',
    roles: ['tax_preparer'],
  },
  {
    label: 'Support System',
    href: '/admin/support-settings',
    icon: LifeBuoy,
    permission: 'clientFileCenter',
    section: '📋 CRM',
    roles: ['super_admin'],
  },
  {
    label: 'Saved Replies',
    href: '/admin/saved-replies',
    icon: FileText,
    permission: 'clientFileCenter',
    section: '📋 CRM',
    roles: ['super_admin'],
  },
  {
    label: 'Ticket Workflows',
    href: '/admin/workflows',
    icon: GitBranch,
    permission: 'clientFileCenter',
    section: '📋 CRM',
    roles: ['super_admin'],
  },
  {
    label: 'Ticket Reports',
    href: '/admin/ticket-reports',
    icon: BarChart3,
    permission: 'analytics',
    section: '📋 CRM',
    roles: ['super_admin'],
  },

  // 💰 Financials Section (admin only)
  {
    label: 'Earnings',
    href: '/admin/earnings',
    icon: DollarSign,
    permission: 'earnings',
    section: '💰 Financials',
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Payouts',
    href: '/admin/payouts',
    icon: DollarSign,
    permission: 'payouts',
    section: '💰 Financials',
    roles: ['admin', 'super_admin'],
  },

  // 📢 Marketing Section
  {
    label: 'Marketing Hub',
    href: '/admin/marketing-hub',
    icon: Megaphone,
    permission: 'marketingHub',
    section: '📢 Marketing',
    roles: ['tax_preparer', 'super_admin'],
  },
  {
    label: 'Tracking Codes',
    href: '/admin/tracking-codes',
    icon: QrCode,
    permission: 'marketingHub',
    section: '📢 Marketing',
    roles: ['tax_preparer', 'super_admin'],
  },

  // 🛒 Marketing Materials Section (Paid Features: Store, Content Generator, Products)
  {
    label: 'Content Generator',
    href: '/admin/content-generator',
    icon: Sparkles,
    permission: 'contentGenerator',
    section: '🛒 Marketing Materials',
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'AI Image Center',
    href: '/admin/image-center',
    icon: Image,
    permission: 'contentGenerator',
    section: '🛒 Marketing Materials',
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Store',
    href: '/store',
    icon: Package,
    permission: 'store',
    section: '🛒 Marketing Materials',
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Product Management',
    href: '/admin/products',
    icon: Package,
    permission: 'database',
    section: '🛒 Marketing Materials',
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Order Management',
    href: '/admin/orders',
    icon: Package,
    permission: 'database',
    section: '🛒 Marketing Materials',
    roles: ['admin', 'super_admin'],
  },

  // 💼 Business Section (for tax preparers and affiliates)
  {
    label: 'My Earnings',
    href: '/dashboard/tax-preparer/earnings',
    icon: DollarSign,
    permission: 'earnings',
    section: '💼 Business',
    roles: ['tax_preparer'],
  },
  {
    label: 'My Earnings',
    href: '/dashboard/affiliate/earnings',
    icon: DollarSign,
    permission: 'earnings',
    section: '💼 Business',
    roles: ['affiliate'],
  },

  // 🔗 Quick Share Tools Section
  {
    label: 'Quick Share',
    href: '/quick-share',
    icon: Share2,
    permission: 'dashboard', // All users with dashboard access can share
    section: '🔗 Quick Share Tools',
    // Available to all roles
  },
  {
    label: 'Admin Quick Share',
    href: '/admin/quick-share',
    icon: Link2,
    permission: 'quickShareLinks',
    section: '🔗 Quick Share Tools',
    roles: ['admin', 'super_admin'],
  },

  // ⚙️ System Controls Section
  {
    label: 'User Management',
    href: '/admin/users',
    icon: Users,
    permission: 'users',
    section: '⚙️ System Controls',
  },
  {
    label: 'Permissions',
    href: '/admin/permissions',
    icon: ShieldCheck,
    permission: 'users',
    section: '⚙️ System Controls',
    roles: ['super_admin'],
  },
  {
    label: 'Content Restrictions',
    href: '/admin/content-restrictions',
    icon: Shield,
    permission: 'users',
    section: '⚙️ System Controls',
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Database',
    href: '/admin/database',
    icon: Database,
    permission: 'database',
    section: '⚙️ System Controls',
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    permission: 'settings',
    section: '⚙️ Settings', // Separate section so it's not hidden when System Controls is restricted
  },
];

/**
 * Dashboard routes by role (for redirecting generic /dashboard to role-specific dashboard)
 */
export const ROLE_DASHBOARD_ROUTES: Record<UserRole, string> = {
  super_admin: '/dashboard/admin',
  admin: '/dashboard/admin',
  lead: '/dashboard/lead',
  tax_preparer: '/dashboard/tax-preparer',
  affiliate: '/dashboard/affiliate',
  client: '/dashboard/client',
};

/**
 * Section visibility by role
 * Defines which sections should be visible to which roles
 * If a section is not listed, it's visible to all roles (with proper permissions)
 */
export const SECTION_ROLE_RESTRICTIONS: Record<string, UserRole[]> = {
  '⚙️ System Controls': ['super_admin', 'admin'], // Only admins and super_admins can see system controls
  '💰 Financials': ['super_admin', 'admin'], // Only admins can see financials
  '📊 Analytics': ['super_admin', 'admin', 'tax_preparer'], // Analytics section for admins and preparers
  '📢 Marketing': ['super_admin', 'admin'], // Marketing hub for admins
  '🛒 Marketing Materials': ['super_admin', 'admin'], // Marketing materials (paid features) for admins
};
