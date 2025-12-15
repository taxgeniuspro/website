/**
 * Shared Navigation Items
 *
 * Single source of truth for dashboard navigation across mobile and desktop.
 * Used by both DashboardSidebar and MobileSidebar components.
 *
 * CONSOLIDATION NOTES (Dec 2025):
 * - Settings: Only in sidebar footer (removed from nav items to avoid duplicates)
 * - Store: Single entry for tax_preparer + admin
 * - Calendar/CRM Contacts: Consolidated - same /crm/contacts route for all roles
 * - Marketing Assets: Consolidated per role
 * - IRS Forms: Moved to Store & Products section
 * - My Tracking Code: Moved to Dashboard section for tax_preparer
 *
 * SIMPLIFIED NAVIGATION (Dec 2025):
 * - Removed: Dashboard section (merged), Tools & Resources, CRM, Quick Share Tools, Business
 * - Tax Preparer sections: 📊 Dashboard, 💰 Referral Management
 * - Admin sections: 👥 Clients, 📊 Analytics, 💰 Financials, 📢 Marketing, 🛒 Store & Products, ⚙️ System Controls
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
  Package,
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
 * - Admin: 👥 Clients, 📊 Analytics, 💰 Financials, 📢 Marketing, 🛒 Store & Products, ⚙️ System Controls
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
    href: '/dashboard/client/share-earn',
    icon: Gift,
    permission: 'dashboard',
    section: '📱 My Dashboard',
    roles: ['client'],
  },
  {
    label: 'My Referrals',
    href: '/dashboard/client/referrals',
    icon: Share2,
    permission: 'trackingCode',
    section: '📱 My Dashboard',
    roles: ['client'],
  },
  {
    label: 'Tracking & QR',
    href: '/dashboard/client/tracking',
    icon: QrCode,
    permission: 'trackingCode',
    section: '📱 My Dashboard',
    roles: ['client'],
  },
  {
    label: 'My Leads',
    href: '/dashboard/client/leads',
    icon: Users,
    permission: 'dashboard',
    section: '📱 My Dashboard',
    roles: ['client'],
  },
  {
    label: 'Analytics',
    href: '/dashboard/client/analytics',
    icon: BarChart3,
    permission: 'analytics',
    section: '📱 My Dashboard',
    roles: ['client'],
  },
  {
    label: 'Marketing Assets',
    href: '/dashboard/client/creatives',
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
  // Order: Overview, Analytics, Share & Earn, Clients, Calendar, Documents, Tax Forms, Training, Store
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
    href: '/dashboard/tax-preparer/share-earn',
    icon: Gift,
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
  {
    label: 'Store',
    href: '/store',
    icon: Package,
    permission: 'store',
    section: '📊 Dashboard',
    roles: ['tax_preparer'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 💰 TAX PREPARER REFERRAL MANAGEMENT SECTION
  // Manage referrers (clients + affiliates) and their commission rates
  // Tax Preparers do NOT earn commissions - they manage rates for their referrers
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'My Referrals',
    href: '/dashboard/tax-preparer/referrals',
    icon: Share2,
    permission: 'trackingCode',
    section: '💰 Referral Management',
    roles: ['tax_preparer'],
  },
  {
    label: 'My Links & QR',
    href: '/dashboard/tax-preparer/tracking',
    icon: QrCode,
    permission: 'trackingCode',
    section: '💰 Referral Management',
    roles: ['tax_preparer'],
  },
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

  {
    label: 'Clients Status',
    href: '/admin/clients-status',
    icon: UserCheck,
    permission: 'clientsStatus',
    section: '👥 Clients',
    roles: ['admin'],
  },
  {
    label: 'Referrals Status',
    href: '/admin/referrals-status',
    icon: Users,
    permission: 'referralsStatus',
    section: '👥 Clients',
    roles: ['admin'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 ANALYTICS SECTION (Admin)
  // Platform-wide analytics and performance tracking
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'Lead Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    permission: 'analytics',
    section: '📊 Analytics',
    roles: ['admin'],
  },
  {
    label: 'Preparer Performance',
    href: '/admin/analytics/preparers',
    icon: Users,
    permission: 'analytics',
    section: '📊 Analytics',
    roles: ['admin'],
  },
  {
    label: 'Affiliate Performance',
    href: '/admin/analytics/affiliates',
    icon: Trophy,
    permission: 'analytics',
    section: '📊 Analytics',
    roles: ['admin'],
  },

  {
    label: 'Calendar',
    href: '/admin/calendar',
    icon: Calendar,
    permission: 'calendar',
    section: '👥 Clients',
    roles: ['admin'],
  },
  {
    label: 'CRM Contacts',
    href: '/crm/contacts',
    icon: BookOpen,
    permission: 'addressBook',
    section: '👥 Clients',
    roles: ['admin'],
  },
  {
    label: 'Client File Center',
    href: '/admin/file-center',
    icon: FolderOpen,
    permission: 'clientFileCenter',
    section: '👥 Clients',
    roles: ['admin'],
  },
  {
    label: 'Tax Preparer Applications',
    href: '/admin/applications/preparers',
    icon: Users,
    permission: 'users',
    section: '👥 Clients',
    roles: ['admin'],
  },
  {
    label: 'Tax Intake Leads',
    href: '/admin/leads',
    icon: UserPlus,
    permission: 'users',
    section: '👥 Clients',
    roles: ['admin'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 💰 FINANCIALS SECTION (Admin)
  // Earnings and payouts management
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'Earnings Overview',
    href: '/admin/earnings',
    icon: DollarSign,
    permission: 'earnings',
    section: '💰 Financials',
    roles: ['admin'],
  },
  {
    label: 'Payouts',
    href: '/admin/payouts',
    icon: DollarSign,
    permission: 'payouts',
    section: '💰 Financials',
    roles: ['admin'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📢 MARKETING SECTION (Admin)
  // Company-wide marketing management
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
    label: 'Tracking Codes Overview',
    href: '/admin/tracking-codes',
    icon: QrCode,
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
    label: 'AI Image Center',
    href: '/admin/image-center',
    icon: Image,
    permission: 'contentGenerator',
    section: '📢 Marketing',
    roles: ['admin'],
  },
  {
    label: 'Marketing Assets',
    href: '/crm/marketing-assets',
    icon: FolderOpen,
    permission: 'marketingAssets',
    section: '📢 Marketing',
    roles: ['admin'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🛒 STORE & PRODUCTS SECTION (Admin only)
  // Store access and product management
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'Store',
    href: '/store',
    icon: Package,
    permission: 'store',
    section: '🛒 Store & Products',
    roles: ['admin'],
  },
  {
    label: 'Product Management',
    href: '/admin/products',
    icon: Package,
    permission: 'database',
    section: '🛒 Store & Products',
    roles: ['admin'],
  },
  {
    label: 'Order Management',
    href: '/admin/orders',
    icon: Package,
    permission: 'database',
    section: '🛒 Store & Products',
    roles: ['admin'],
  },
  {
    label: 'IRS Forms Library',
    href: '/admin/tax-forms',
    icon: FileText,
    permission: 'taxForms',
    section: '🛒 Store & Products',
    roles: ['admin'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚙️ SYSTEM CONTROLS SECTION (Admin)
  // User management and permissions
  // NOTE: Settings is NOT here - it's only in sidebar footer to avoid duplicates
  // ═══════════════════════════════════════════════════════════════════════════
  {
    label: 'User Management',
    href: '/admin/users',
    icon: Users,
    permission: 'users',
    section: '⚙️ System Controls',
    roles: ['admin'],
  },
  {
    label: 'Permissions',
    href: '/admin/permissions',
    icon: ShieldCheck,
    permission: 'users',
    section: '⚙️ System Controls',
    roles: ['admin'],
  },
  {
    label: 'Content Restrictions',
    href: '/admin/content-restrictions',
    icon: Shield,
    permission: 'users',
    section: '⚙️ System Controls',
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
 */
export const SECTION_ROLE_RESTRICTIONS: Record<string, UserRole[]> = {
  '📱 My Dashboard': ['client'], // Client dashboard items
  '📊 Dashboard': ['tax_preparer'], // Tax preparer dashboard section
  '💰 Referral Management': ['tax_preparer'], // Tax preparer referral tracking
  '📊 Analytics': ['admin'], // Admin analytics section
  '💰 Financials': ['admin'], // Admin financials
  '📢 Marketing': ['admin'], // Admin marketing hub
  '🛒 Store & Products': ['admin'], // Admin store management
  '⚙️ System Controls': ['admin'], // Admin system settings
  // 👥 Clients: visible to both tax_preparer and admin (different items shown)
};
