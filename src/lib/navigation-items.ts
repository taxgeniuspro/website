/**
 * Shared Navigation Items
 *
 * Single source of truth for dashboard navigation across mobile and desktop.
 * Used by both DashboardSidebar and MobileSidebar components.
 *
 * ADMIN NAVIGATION CONSOLIDATION (Dec 2025):
 * Reduced from 20+ items to 14 items for better usability:
 * - 🎯 Command Center: People Hub (unified CRM), Analytics, Calendar, Clients Status
 * - 👥 Team: User Management, Preparer Applications, Preparer Performance
 * - 💰 Financial: Earnings Overview, Payouts, Commission Settings
 * - 📢 Marketing: Marketing Hub, Content Generator, Tracking Codes
 * - ⚙️ Settings: Permissions, File Center, IRS Forms, Content Restrictions
 *
 * KEY CHANGE: "People Hub" replaces separate CRM Contacts, User Management, Tax Intake Leads
 * - Admin can now change user roles directly from CRM
 * - Admin can create user accounts from CRM contacts
 *
 * OTHER ROLES:
 * - Client: 📱 My Dashboard
 * - Affiliate: 🤝 Affiliate Dashboard (referral-only, cannot file taxes)
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
  // 🤝 AFFILIATE DASHBOARD SECTION
  // Referral-only: Can refer others for commission, CANNOT file taxes
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'Overview',
    href: '/dashboard/affiliate',
    icon: Home,
    permission: 'dashboard',
    section: '🤝 Affiliate Dashboard',
    roles: ['affiliate'],
  },
  {
    label: 'Share & Earn',
    href: '/dashboard/referrals',
    icon: Gift,
    permission: 'dashboard',
    section: '🤝 Affiliate Dashboard',
    roles: ['affiliate'],
  },
  {
    label: 'My Leads',
    href: '/dashboard/affiliate/leads',
    icon: Users,
    permission: 'dashboard',
    section: '🤝 Affiliate Dashboard',
    roles: ['affiliate'],
  },
  {
    label: 'Analytics',
    href: '/dashboard/affiliate/analytics',
    icon: BarChart3,
    permission: 'analytics',
    section: '🤝 Affiliate Dashboard',
    roles: ['affiliate'],
  },
  {
    label: 'Marketing Assets',
    href: '/dashboard/affiliate/creatives',
    icon: FolderOpen,
    permission: 'marketingAssets',
    section: '🤝 Affiliate Dashboard',
    roles: ['affiliate'],
  },
  {
    label: 'My Earnings',
    href: '/dashboard/affiliate/earnings',
    icon: DollarSign,
    permission: 'earnings',
    section: '🤝 Affiliate Dashboard',
    roles: ['affiliate'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 TAX PREPARER DASHBOARD SECTION
  // STREAMLINED: Core daily operations
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
    label: 'My Clients',
    href: '/dashboard/tax-preparer/clients',
    icon: Users,
    permission: 'clients',
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
    label: 'Client Documents',
    href: '/dashboard/tax-preparer/documents',
    icon: FolderOpen,
    permission: 'documents',
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
    label: 'Analytics',
    href: '/dashboard/tax-preparer/analytics',
    icon: BarChart3,
    permission: 'analytics',
    section: '📊 Dashboard',
    roles: ['tax_preparer'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 💰 TAX PREPARER REFERRAL & EARNINGS SECTION
  // Consolidated: Referrals, bonded affiliates, commissions, payouts
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'Share & Earn',
    href: '/dashboard/referrals',
    icon: Gift,
    permission: 'trackingCode',
    section: '💰 Earnings',
    roles: ['tax_preparer'],
  },
  {
    label: 'Bonded Affiliates',
    href: '/dashboard/tax-preparer/bonded-affiliates',
    icon: Users,
    permission: 'trackingCode',
    section: '💰 Earnings',
    roles: ['tax_preparer'],
  },
  {
    label: 'Commission Settings',
    href: '/dashboard/tax-preparer/commission-settings',
    icon: Settings,
    permission: 'trackingCode',
    section: '💰 Earnings',
    roles: ['tax_preparer'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📚 TAX PREPARER RESOURCES SECTION
  // Academy, IRS Forms, Promotional materials
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'Academy',
    href: '/app/academy',
    icon: GraduationCap,
    permission: 'academy',
    section: '📚 Resources',
    roles: ['tax_preparer'],
  },
  {
    label: 'IRS Forms Library',
    href: '/dashboard/tax-preparer/tax-forms',
    icon: FileText,
    permission: 'taxForms',
    section: '📚 Resources',
    roles: ['tax_preparer'],
  },
  {
    label: 'Promotional Images',
    href: '/dashboard/tax-preparer/promotional-images',
    icon: Image,
    permission: 'trackingCode',
    section: '📚 Resources',
    roles: ['tax_preparer'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎯 COMMAND CENTER (Admin) - Primary daily operations
  // CONSOLIDATED: People Hub replaces CRM Contacts, User Management, Tax Intake Leads
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'People Hub',
    href: '/crm/contacts',
    icon: Users,
    permission: 'addressBook',
    section: '🎯 Command Center',
    roles: ['admin'],
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    permission: 'analytics',
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
  // 👥 TEAM (Admin) - Team & user management
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'User Management',
    href: '/admin/users',
    icon: Users,
    permission: 'users',
    section: '👥 Team',
    roles: ['admin'],
  },
  {
    label: 'Preparer Applications',
    href: '/admin/applications/preparers',
    icon: UserCheck,
    permission: 'users',
    section: '👥 Team',
    roles: ['admin'],
  },
  {
    label: 'Preparer Performance',
    href: '/admin/analytics/preparers',
    icon: Trophy,
    permission: 'analytics',
    section: '👥 Team',
    roles: ['admin'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 💰 FINANCIAL (Admin) - Earnings, payouts, commissions
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'Earnings Overview',
    href: '/admin/earnings',
    icon: DollarSign,
    permission: 'earnings',
    section: '💰 Financial',
    roles: ['admin'],
  },
  {
    label: 'Payouts',
    href: '/admin/payouts',
    icon: Wallet,
    permission: 'payouts',
    section: '💰 Financial',
    roles: ['admin'],
  },
  {
    label: 'Commission Settings',
    href: '/admin/commission-settings',
    icon: Settings,
    permission: 'payouts',
    section: '💰 Financial',
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
  affiliate: '/dashboard/affiliate',
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
  // Client sections
  '📱 My Dashboard': ['client'],
  // Affiliate sections
  '🤝 Affiliate Dashboard': ['affiliate'],
  // Tax preparer sections (streamlined to 3 sections)
  '📊 Dashboard': ['tax_preparer'], // Core daily operations
  '💰 Earnings': ['tax_preparer'], // Referrals, affiliates, commissions
  '📚 Resources': ['tax_preparer'], // Academy, IRS forms, promotional materials
  // Admin sections (consolidated to 5 sections)
  '🎯 Command Center': ['admin'], // People Hub, Analytics, Calendar, Clients Status
  '👥 Team': ['admin'], // User Management, Applications, Performance
  '💰 Financial': ['admin'], // Earnings, Payouts, Commission Settings
  '📢 Marketing': ['admin'], // Marketing Hub, Content Generator, Tracking Codes
  '⚙️ Settings': ['admin'], // Permissions, File Center, IRS Forms, Restrictions
};
