/**
 * Shared Navigation Items
 *
 * Single source of truth for dashboard navigation across mobile and desktop.
 * Used by both DashboardSidebar and MobileSidebar components.
 *
 * ADMIN NAVIGATION REDESIGN (Dec 2025):
 * Reduced from 6 sections to 4 for better usability:
 * - 🎯 Command Center: Lead Analytics, CRM Contacts, Tax Intake Leads, Calendar, Clients Status
 * - 👥 People: Preparer/Affiliate Performance, User Management, Applications, Referrals Status
 * - 📢 Marketing: Marketing Hub, Content Generator, Tracking Codes
 * - ⚙️ Settings: Permissions, Earnings, Payouts, File Center, IRS Forms, Content Restrictions
 *
 * OTHER ROLES:
 * - Client: 📱 My Dashboard
 * - Tax Preparer: 📊 Dashboard, 💰 Referral Management
 *
 * Settings: Only in sidebar footer (removed from nav items to avoid duplicates)
 */

import {
  Home,
  FileText,
  Users,
  DollarSign,
  BarChart3,
  Share2,
  Calendar,
  FolderOpen,
  Megaphone,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Trophy,
  QrCode,
  BookOpen,
  Shield,
  Ticket,
  Image,
  Gift,
  GraduationCap,
  UserPlus,
  Settings,
  Wallet,
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
 * All navigation items organized by section
 *
 * SECTIONS BY ROLE:
 * - Client: 📱 My Dashboard
 * - Tax Preparer: 📊 Dashboard, 💰 Referral Management
 * - Admin: 🎯 Command Center, 👥 People, 📢 Marketing, ⚙️ Settings
 */
export const ALL_NAV_ITEMS: NavItem[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 📱 CLIENT DASHBOARD SECTION
  // Feature visibility controlled by profile flags:
  // - hasFiledTaxes: tax-filing features (documents, tickets)
  // - affiliateStatus: affiliate features (tracking, leads, analytics, creatives)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'Overview',
    href: '/dashboard/client',
    icon: Home,
    permission: 'dashboard',
    section: '📱 My Dashboard',
    roles: ['client'],
  },
  {
    label: 'My Documents',
    href: '/dashboard/client/documents',
    icon: FileText,
    permission: 'uploadDocuments',
    section: '📱 My Dashboard',
    roles: ['client'],
  },
  {
    label: 'Ask Your Tax Genius',
    href: '/dashboard/client/tickets',
    icon: Ticket,
    permission: 'dashboard',
    section: '📱 My Dashboard',
    roles: ['client'],
  },
  {
    label: 'Share & Earn',
    href: '/dashboard/referrals',
    icon: Gift,
    permission: 'dashboard',
    section: '📱 My Dashboard',
    roles: ['client'],
  },
  {
    label: 'My Leads',
    href: '/dashboard/affiliate/leads',
    icon: Users,
    permission: 'dashboard',
    section: '📱 My Dashboard',
    roles: ['client'],
  },
  {
    label: 'Analytics',
    href: '/dashboard/affiliate/analytics',
    icon: BarChart3,
    permission: 'analytics',
    section: '📱 My Dashboard',
    roles: ['client'],
  },
  {
    label: 'Marketing Assets',
    href: '/dashboard/affiliate/creatives',
    icon: FolderOpen,
    permission: 'marketingAssets',
    section: '📱 My Dashboard',
    roles: ['client'],
  },
  {
    label: 'My Earnings',
    href: '/dashboard/client/earnings',
    icon: DollarSign,
    permission: 'earnings',
    section: '📱 My Dashboard',
    roles: ['client'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 TAX PREPARER DASHBOARD SECTION
  // Order: Overview, Analytics, Share & Earn, Clients, Calendar, Documents, Tax Forms, Training
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'Overview',
    href: '/dashboard/tax-preparer',
    icon: Home,
    permission: 'dashboard',
    section: '📊 Dashboard',
    roles: ['tax_preparer'],
  },
  {
    label: 'Analytics',
    href: '/dashboard/tax-preparer/analytics',
    icon: BarChart3,
    permission: 'analytics',
    section: '📊 Dashboard',
    roles: ['tax_preparer'],
  },
  {
    label: 'Share & Earn',
    href: '/dashboard/referrals',
    icon: Gift,
    permission: 'trackingCode',
    section: '📊 Dashboard',
    roles: ['tax_preparer'],
  },
  {
    label: 'Promotional Images',
    href: '/dashboard/tax-preparer/promotional-images',
    icon: Image,
    permission: 'trackingCode',
    section: '📊 Dashboard',
    roles: ['tax_preparer'],
  },
  {
    label: 'My Clients',
    href: '/dashboard/tax-preparer/clients',
    icon: Users,
    permission: 'clients',
    section: '📊 Dashboard',
    roles: ['tax_preparer'],
  },
  {
    label: 'Calendar',
    href: '/dashboard/tax-preparer/calendar',
    icon: Calendar,
    permission: 'calendar',
    section: '📊 Dashboard',
    roles: ['tax_preparer'],
  },
  {
    label: 'Client Documents',
    href: '/dashboard/tax-preparer/documents',
    icon: FolderOpen,
    permission: 'documents',
    section: '📊 Dashboard',
    roles: ['tax_preparer'],
  },
  {
    label: 'My Leads',
    href: '/dashboard/tax-preparer/leads',
    icon: UserPlus,
    permission: 'dashboard',
    section: '📊 Dashboard',
    roles: ['tax_preparer'],
  },
  {
    label: 'Intake Forms',
    href: '/dashboard/tax-preparer/intake-forms',
    icon: FileText,
    permission: 'dashboard',
    section: '📊 Dashboard',
    roles: ['tax_preparer'],
  },
  {
    label: 'Academy',
    href: '/app/academy',
    icon: GraduationCap,
    permission: 'academy',
    section: '📊 Dashboard',
    roles: ['tax_preparer'],
  },
  {
    label: 'IRS Forms Library',
    href: '/dashboard/tax-preparer/tax-forms',
    icon: FileText,
    permission: 'taxForms',
    section: '📊 Dashboard',
    roles: ['tax_preparer'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 💰 TAX PREPARER REFERRAL MANAGEMENT SECTION
  // Manage referrers (clients + affiliates) and their commission rates
  // Tax Preparers do NOT earn commissions - they manage rates for their referrers
  // Note: Links & QR consolidated into Share & Earn (/dashboard/referrals)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'Bonded Affiliates',
    href: '/dashboard/tax-preparer/bonded-affiliates',
    icon: Users,
    permission: 'trackingCode',
    section: '💰 Referral Management',
    roles: ['tax_preparer'],
  },
  {
    label: 'Commission Settings',
    href: '/dashboard/tax-preparer/commission-settings',
    icon: Settings,
    permission: 'trackingCode',
    section: '💰 Referral Management',
    roles: ['tax_preparer'],
  },
  {
    label: 'Payout Obligations',
    href: '/dashboard/tax-preparer/payout-obligations',
    icon: Wallet,
    permission: 'trackingCode',
    section: '💰 Referral Management',
    roles: ['tax_preparer'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎯 COMMAND CENTER (Admin) - Primary daily operations
  // Most-used features for day-to-day admin work
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'Lead Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    permission: 'analytics',
    section: '🎯 Command Center',
    roles: ['admin'],
  },
  {
    label: 'CRM Contacts',
    href: '/crm/contacts',
    icon: BookOpen,
    permission: 'addressBook',
    section: '🎯 Command Center',
    roles: ['admin'],
  },
  {
    label: 'Tax Intake Leads',
    href: '/admin/leads',
    icon: UserPlus,
    permission: 'users',
    section: '🎯 Command Center',
    roles: ['admin'],
  },
  {
    label: 'Calendar',
    href: '/admin/calendar',
    icon: Calendar,
    permission: 'calendar',
    section: '🎯 Command Center',
    roles: ['admin'],
  },
  {
    label: 'Clients Status',
    href: '/admin/clients-status',
    icon: UserCheck,
    permission: 'clientsStatus',
    section: '🎯 Command Center',
    roles: ['admin'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 👥 PEOPLE (Admin) - Team & user management
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'Preparer Performance',
    href: '/admin/analytics/preparers',
    icon: Users,
    permission: 'analytics',
    section: '👥 People',
    roles: ['admin'],
  },
  {
    label: 'Affiliate Performance',
    href: '/admin/analytics/affiliates',
    icon: Trophy,
    permission: 'analytics',
    section: '👥 People',
    roles: ['admin'],
  },
  {
    label: 'User Management',
    href: '/admin/users',
    icon: Users,
    permission: 'users',
    section: '👥 People',
    roles: ['admin'],
  },
  {
    label: 'Preparer Applications',
    href: '/admin/applications/preparers',
    icon: UserCheck,
    permission: 'users',
    section: '👥 People',
    roles: ['admin'],
  },
  {
    label: 'Referrals Status',
    href: '/admin/referrals-status',
    icon: Share2,
    permission: 'referralsStatus',
    section: '👥 People',
    roles: ['admin'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📢 MARKETING (Admin) - Creative tools & content
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'Marketing Hub',
    href: '/admin/marketing-hub',
    icon: Megaphone,
    permission: 'marketingHub',
    section: '📢 Marketing',
    roles: ['admin'],
  },
  {
    label: 'Content Generator',
    href: '/admin/content-generator',
    icon: Sparkles,
    permission: 'contentGenerator',
    section: '📢 Marketing',
    roles: ['admin'],
  },
  {
    label: 'Tracking Codes',
    href: '/admin/tracking-codes',
    icon: QrCode,
    permission: 'marketingHub',
    section: '📢 Marketing',
    roles: ['admin'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚙️ SETTINGS (Admin) - Configuration & system
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'Permissions',
    href: '/admin/permissions',
    icon: ShieldCheck,
    permission: 'users',
    section: '⚙️ Settings',
    roles: ['admin'],
  },
  {
    label: 'Earnings Overview',
    href: '/admin/earnings',
    icon: DollarSign,
    permission: 'earnings',
    section: '⚙️ Settings',
    roles: ['admin'],
  },
  {
    label: 'Payouts',
    href: '/admin/payouts',
    icon: DollarSign,
    permission: 'payouts',
    section: '⚙️ Settings',
    roles: ['admin'],
  },
  {
    label: 'Client File Center',
    href: '/admin/file-center',
    icon: FolderOpen,
    permission: 'clientFileCenter',
    section: '⚙️ Settings',
    roles: ['admin'],
  },
  {
    label: 'IRS Forms Library',
    href: '/admin/tax-forms',
    icon: FileText,
    permission: 'taxForms',
    section: '⚙️ Settings',
    roles: ['admin'],
  },
  {
    label: 'Content Restrictions',
    href: '/admin/content-restrictions',
    icon: Shield,
    permission: 'users',
    section: '⚙️ Settings',
    roles: ['admin'],
  },
];

/**
 * Dashboard routes by role (for redirecting generic /dashboard to role-specific dashboard)
 * NOTE: Only 3 roles exist: admin, client, tax_preparer
 */
export const ROLE_DASHBOARD_ROUTES: Record<string, string> = {
  admin: '/dashboard/admin',
  tax_preparer: '/dashboard/tax-preparer',
  client: '/dashboard/client',
};

/**
 * Section visibility by role
 * Defines which sections should be visible to which roles
 * If a section is not listed, it's visible to all roles (with proper permissions)
 *
 * STREAMLINED ADMIN NAVIGATION (Dec 2025):
 * - Reduced from 6 sections to 4: Command Center, People, Marketing, Settings
 * - Command Center: Lead Analytics, CRM, Leads, Calendar, Clients Status
 * - People: Preparer/Affiliate Performance, Users, Applications, Referrals
 * - Marketing: Marketing Hub, Content Generator, Tracking Codes
 * - Settings: Permissions, Earnings, Payouts, File Center, IRS Forms, Restrictions
 */
export const SECTION_ROLE_RESTRICTIONS: Record<string, UserRole[]> = {
  '📱 My Dashboard': ['client'], // Client dashboard items
  '📊 Dashboard': ['tax_preparer'], // Tax preparer dashboard section
  '💰 Referral Management': ['tax_preparer'], // Tax preparer referral tracking
  '🎯 Command Center': ['admin'], // Admin primary operations
  '👥 People': ['admin'], // Admin team management
  '📢 Marketing': ['admin'], // Admin marketing hub
  '⚙️ Settings': ['admin'], // Admin configuration
};
