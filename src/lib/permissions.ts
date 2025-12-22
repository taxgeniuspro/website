import { logger } from '@/lib/logger';
import type { AffiliateStatus } from '@prisma/client';

/**
 * Permission System
 *
 * Manages granular access control for different user roles.
 * Permissions are stored in Clerk publicMetadata.permissions
 */

export type Permission =
  | 'dashboard'
  | 'users'
  | 'payouts'
  | 'contentGenerator'
  | 'database'
  | 'analytics'
  | 'adminManagement'
  | 'clients'
  | 'documents'
  | 'store'
  | 'academy'
  | 'earnings'
  | 'settings'
  | 'marketing'
  | 'uploadDocuments'
  | 'contest'
  | 'trackingCode'
  // Main feature toggles
  | 'clientsStatus'
  | 'referralsStatus'
  | 'emails'
  | 'calendar'
  | 'addressBook'
  | 'clientFileCenter'
  | 'taxForms'
  | 'marketingAssets'
  | 'googleAnalytics'
  | 'referralsAnalytics'
  | 'learningCenter'
  | 'marketingHub'
  | 'quickShareLinks'
  | 'alerts'
  | 'routeAccessControl'
  // 🎛️ MICRO-TOGGLES: Calendar & Appointments (4)
  | 'calendar_view'
  | 'calendar_create'
  | 'calendar_edit'
  | 'calendar_delete'
  // 🎛️ MICRO-TOGGLES: CRM Contacts (5)
  | 'contacts_view'
  | 'contacts_create'
  | 'contacts_edit'
  | 'contacts_delete'
  | 'contacts_export'
  // 🎛️ MICRO-TOGGLES: Client File Center (5)
  | 'files_view'
  | 'files_upload'
  | 'files_download'
  | 'files_delete'
  | 'files_share'
  // 🎛️ MICRO-TOGGLES: Academy (3)
  | 'academy_view'
  | 'academy_enroll'
  | 'academy_complete'
  // 🎛️ MICRO-TOGGLES: IRS Forms (4)
  | 'taxforms_view'
  | 'taxforms_download'
  | 'taxforms_assign'
  | 'taxforms_upload'
  // 🎛️ MICRO-TOGGLES: My Analytics (3)
  | 'analytics_view'
  | 'analytics_export'
  | 'analytics_detailed'
  // 🎛️ MICRO-TOGGLES: My Tracking Code (3)
  | 'tracking_view'
  | 'tracking_edit'
  | 'tracking_analytics'
  // 🎛️ MICRO-TOGGLES: Store (2) - store_cart removed since store was removed
  | 'store_view'
  | 'store_purchase'
  // 🎛️ MICRO-TOGGLES: Marketing Assets (4)
  | 'marketing_view'
  | 'marketing_upload'
  | 'marketing_download'
  | 'marketing_delete';

// Section permissions - control entire sections
export type SectionPermission =
  | 'section_general'
  | 'section_client_management'
  | 'section_communications'
  | 'section_analytics'
  | 'section_growth_marketing'
  | 'section_content_learning'
  | 'section_marketing_materials'
  | 'section_financial'
  | 'section_system_admin';

// Map sections to their display names
export const SECTION_NAMES: Record<SectionPermission, string> = {
  section_general: '🔔 General',
  section_client_management: '👥 Client Management',
  section_communications: '📧 Communications',
  section_analytics: '📊 Analytics & Reporting',
  section_growth_marketing: '🚀 Growth & Marketing',
  section_content_learning: '🎓 Content & Learning',
  section_marketing_materials: '📢 Marketing Materials',
  section_financial: '💰 Financial',
  section_system_admin: '⚙️ System Administration',
};

// Map sections to their permissions (including micro-toggles organized by feature)
export const SECTION_PERMISSIONS: Record<SectionPermission, Permission[]> = {
  section_general: ['dashboard', 'alerts'],
  section_client_management: [
    'clientsStatus',
    'clients',
    // 📂 Client File Center + Micro-Toggles
    'clientFileCenter',
    'files_view',
    'files_upload',
    'files_download',
    'files_delete',
    'files_share',
    // 📋 IRS Forms + Micro-Toggles
    'taxForms',
    'taxforms_view',
    'taxforms_download',
    'taxforms_assign',
    'taxforms_upload',
    // 📄 Documents
    'documents',
    'uploadDocuments',
  ],
  section_communications: [
    'emails',
    // 📅 Calendar + Micro-Toggles
    'calendar',
    'calendar_view',
    'calendar_create',
    'calendar_edit',
    'calendar_delete',
    // 👥 CRM Contacts + Micro-Toggles
    'addressBook',
    'contacts_view',
    'contacts_create',
    'contacts_edit',
    'contacts_delete',
    'contacts_export',
  ],
  section_analytics: [
    // 📊 Analytics + Micro-Toggles
    'analytics',
    'analytics_view',
    'analytics_export',
    'analytics_detailed',
    'googleAnalytics',
    'referralsAnalytics',
    // 🔗 Tracking Code + Micro-Toggles
    'trackingCode',
    'tracking_view',
    'tracking_edit',
    'tracking_analytics',
  ],
  section_growth_marketing: ['referralsStatus', 'contest', 'quickShareLinks'],
  section_content_learning: [
    'learningCenter',
    // 🎓 Academy + Micro-Toggles
    'academy',
    'academy_view',
    'academy_enroll',
    'academy_complete',
  ],
  section_marketing_materials: [
    'marketingHub',
    'marketing',
    // 🎨 Marketing Assets + Micro-Toggles
    'marketingAssets',
    'marketing_view',
    'marketing_upload',
    'marketing_download',
    'marketing_delete',
    'contentGenerator',
    // 🛒 Store + Micro-Toggles (store_cart removed)
    'store',
    'store_view',
    'store_purchase',
  ],
  section_financial: ['payouts', 'earnings'],
  section_system_admin: ['users', 'adminManagement', 'database', 'settings', 'routeAccessControl'],
};

export type UserPermissions = Record<Permission, boolean>;

// TypeScript best practice: lowercase with underscores (matches Prisma enum)
// NOTE: 4 roles exist:
// - admin: Platform administrator
// - tax_preparer: Tax professional (auto has affiliate features)
// - client: DEFAULT for all signups (tax filing + optional affiliate features via affiliateStatus)
// - affiliate: Referral-only role (can refer others for commission, CANNOT file taxes)
//
// REMOVED ROLES:
// - 'super_admin': merged into 'admin' role
// - 'lead': removed - leads are CRM contacts without accounts, signups become 'client'
export type UserRole = 'admin' | 'tax_preparer' | 'client' | 'affiliate';

/**
 * Default permissions for each role
 * These are the baseline permissions that can be customized by admin
 *
 * ==================================================================================
 * QUICK REFERENCE: WHAT MAKES EACH ROLE UNIQUE
 * ==================================================================================
 *
 * 🛡️  SUPER ADMIN:    Database, Permissions, Google Analytics, All Client Files, Alerts
 * 👑 ADMIN:          User Management, Payouts, Content Generator, System-wide Analytics
 * 📊 TAX PREPARER:   Client Documents (their clients only), Lead Tracking, Academy
 *                    AUTO has all affiliate features (tracking code, commissions, marketing)
 * 🔶 LEAD:           Pending Approval (no access until role changed by admin)
 * 👤 CLIENT:         Base role for all general users
 *                    - Tax filing features: controlled by hasFiledTaxes flag
 *                    - Affiliate features: controlled by affiliateStatus (NONE → APPROVED)
 *
 * ==================================================================================
 * STATUS-BASED ACCESS (replaces old affiliate role):
 *
 * For CLIENTS, feature access is determined by TWO flags:
 *
 * 📋 hasFiledTaxes (boolean):
 *    - true: Can upload documents, view tax returns, create support tickets
 *    - false: No tax-filing related features
 *
 * 🤝 affiliateStatus (enum):
 *    - APPROVED: All new signups are auto-approved (default)
 *    - SUSPENDED: Temporarily disabled by admin
 *    - INACTIVE: Permanently deactivated by admin
 *    Note: NONE and PENDING are legacy - all new users get APPROVED automatically
 *
 * TAX PREPARERS automatically have all affiliate features (no status check needed).
 *
 * ==================================================================================
 * ROLE HIERARCHY:
 *
 * 1. SUPER_ADMIN (Highest Level - Full System Control)
 *    - Has ALL permissions including system-critical features
 *    - Can manage other admin permissions
 *    - Can access database management
 *    - Can view Google Analytics
 *    - Can access sensitive client files
 *    - Has phone alerts enabled
 *    - CANNOT be assigned to regular users (security)
 *
 * 2. ADMIN (Limited Administrative Access)
 *    - Has most admin features but RESTRICTED from critical operations
 *    - CANNOT manage permissions (adminManagement: false)
 *    - CANNOT access database (database: false)
 *    - CANNOT access sensitive client files (clientFileCenter: false)
 *    - CANNOT access Google Analytics (googleAnalytics: false)
 *    - Phone alerts DISABLED by default (alerts: false)
 *    - Can be customized by admin to grant additional permissions
 *
 * 3. TAX_PREPARER (Independent Tax Professional)
 *    - Manages THEIR OWN assigned clients only
 *    - Has client documents and file access (scoped to their clients)
 *    - Has tracking code for lead generation
 *    - AUTO has all affiliate features (no status check needed)
 *    - CANNOT see other preparers' clients or system-wide data
 *
 * 4. LEAD (New Signup - Pending Approval)
 *    - Default role for all new signups
 *    - NO dashboard access (shows pending approval page)
 *    - Admin must change role to: CLIENT or TAX_PREPARER
 *    - Tax Preparers can only change: LEAD → CLIENT
 *
 * 5. CLIENT (Base Role for General Users)
 *    - Base role for all non-staff users
 *    - Tax filing features controlled by hasFiledTaxes flag
 *    - Affiliate features controlled by affiliateStatus
 *    - Can apply to become affiliate (status: NONE → PENDING → APPROVED)
 */
export const DEFAULT_PERMISSIONS: Record<UserRole, Partial<UserPermissions>> = {
  admin: {
    // Admin has ALL permissions - Full system control
    dashboard: true,
    users: true,
    payouts: true,
    contentGenerator: true,
    database: true,
    analytics: true,
    adminManagement: true,
    clients: true,
    documents: true,
    store: true,
    academy: true,
    earnings: false,
    settings: true,
    marketing: true,
    uploadDocuments: true,
    contest: true,
    trackingCode: true,
    clientsStatus: true,
    referralsStatus: true,
    emails: true,
    calendar: true,
    addressBook: true,
    clientFileCenter: true,
    taxForms: true,
    marketingAssets: true,
    googleAnalytics: true,
    referralsAnalytics: true,
    learningCenter: false,
    marketingHub: true,
    quickShareLinks: false,
    alerts: true,
    routeAccessControl: true,
    // 🎛️ Calendar Micro-Toggles (ALL ENABLED)
    calendar_view: true,
    calendar_create: true,
    calendar_edit: true,
    calendar_delete: true,
    // 🎛️ Contacts Micro-Toggles (ALL ENABLED)
    contacts_view: true,
    contacts_create: true,
    contacts_edit: true,
    contacts_delete: true,
    contacts_export: true,
    // 🎛️ Files Micro-Toggles (ALL ENABLED)
    files_view: true,
    files_upload: true,
    files_download: true,
    files_delete: true,
    files_share: true,
    // 🎛️ Academy Micro-Toggles (ALL ENABLED)
    academy_view: true,
    academy_enroll: true,
    academy_complete: true,
    // 🎛️ Tax Forms Micro-Toggles (ALL ENABLED)
    taxforms_view: true,
    taxforms_download: true,
    taxforms_assign: true,
    taxforms_upload: true,
    // 🎛️ Analytics Micro-Toggles (ALL ENABLED)
    analytics_view: true,
    analytics_export: true,
    analytics_detailed: true,
    // 🎛️ Tracking Micro-Toggles (ALL ENABLED)
    tracking_view: true,
    tracking_edit: true,
    tracking_analytics: true,
    // 🎛️ Store Micro-Toggles (ALL ENABLED) - store_cart removed
    store_view: true,
    store_purchase: true,
    // 🎛️ Marketing Assets Micro-Toggles (ALL ENABLED)
    marketing_view: true,
    marketing_upload: true,
    marketing_download: true,
    marketing_delete: true,
  },
  tax_preparer: {
    // Tax preparers are independent contractors who prepare taxes for THEIR assigned clients
    // They should NOT have access to system-wide management tools
    // ✅ They get FULL micro-toggle access for their features (scoped to their clients)
    dashboard: true,
    clients: true,
    documents: true,
    clientFileCenter: true,
    taxForms: true,
    addressBook: true,
    calendar: true,
    store: true,
    academy: true,
    analytics: true,
    trackingCode: true,
    marketing: true,
    marketingAssets: true,
    earnings: false,
    quickShareLinks: false,
    // 🎛️ Calendar Micro-Toggles (ALL ENABLED - for their appointments)
    calendar_view: true,
    calendar_create: true,
    calendar_edit: true,
    calendar_delete: true,
    // 🎛️ Contacts Micro-Toggles (ALL ENABLED - for their contacts)
    contacts_view: true,
    contacts_create: true,
    contacts_edit: true,
    contacts_delete: true,
    contacts_export: true,
    // 🎛️ Files Micro-Toggles (ALL ENABLED - for their client files)
    files_view: true,
    files_upload: true,
    files_download: true,
    files_delete: true,
    files_share: true,
    // 🎛️ Academy Micro-Toggles (ALL ENABLED - for training)
    academy_view: true,
    academy_enroll: true,
    academy_complete: true,
    // 🎛️ Tax Forms Micro-Toggles (ALL ENABLED - for their clients)
    taxforms_view: true,
    taxforms_download: true,
    taxforms_assign: true,
    taxforms_upload: true, // ✅ Can upload forms for their clients
    // 🎛️ Analytics Micro-Toggles (ALL ENABLED - their performance)
    analytics_view: true,
    analytics_export: true,
    analytics_detailed: true,
    // 🎛️ Tracking Micro-Toggles (ALL ENABLED - their tracking code)
    tracking_view: true,
    tracking_edit: true,
    tracking_analytics: true,
    // 🎛️ Store Micro-Toggles (ALL ENABLED - purchase materials) - store_cart removed
    store_view: true,
    store_purchase: true,
    // 🎛️ Marketing Assets Micro-Toggles (ALL ENABLED - promote themselves)
    marketing_view: true,
    marketing_upload: true,
    marketing_download: true,
    marketing_delete: true,
  },
  // NOTE: 'lead' role has been REMOVED
  // Leads are now CRM contacts without accounts - they don't have a user role
  // When they sign up, they become 'client' by default
  client: {
    // CLIENT is the base role for all general users
    // Feature access is controlled by TWO flags:
    //   - hasFiledTaxes: controls tax-filing features (documents, returns, tickets)
    //   - affiliateStatus: controls affiliate features (tracking, marketing, commissions)
    //
    // All permissions below are available, but UI conditionally shows based on flags:
    //   - Tax filing UI: shown when hasFiledTaxes === true
    //   - Affiliate UI: shown when affiliateStatus === 'APPROVED'
    dashboard: true,
    // Tax filing features (conditional on hasFiledTaxes)
    uploadDocuments: true,
    // Affiliate features (conditional on affiliateStatus === 'APPROVED')
    store: true,
    analytics: true,
    trackingCode: true,
    marketing: true,
    marketingAssets: true, // ✅ Full access when approved affiliate
    earnings: false,
    // 🎛️ Files Micro-Toggles (for tax filing features - conditional on hasFiledTaxes)
    files_view: true,
    files_upload: true,
    files_download: true,
    files_delete: false, // ⚠️ RESTRICTED: Can't delete files
    files_share: false, // ⚠️ RESTRICTED: Can't share files
    // 🎛️ Analytics Micro-Toggles (for affiliate features - conditional on affiliateStatus)
    analytics_view: true,
    analytics_export: true,
    analytics_detailed: true,
    // 🎛️ Tracking Micro-Toggles (for affiliate features - conditional on affiliateStatus)
    tracking_view: true,
    tracking_edit: true,
    tracking_analytics: true,
    // 🎛️ Store Micro-Toggles (for affiliate features - conditional on affiliateStatus) - store_cart removed
    store_view: true,
    store_purchase: true,
    // 🎛️ Marketing Micro-Toggles (for affiliate features - conditional on affiliateStatus)
    marketing_view: true,
    marketing_upload: false, // ⚠️ RESTRICTED: Can't upload marketing materials
    marketing_download: true,
    marketing_delete: false, // ⚠️ RESTRICTED: Can't delete materials
  },
  affiliate: {
    // AFFILIATE role: Referral-only - can refer others for commission, CANNOT file taxes
    // This is different from clients who CAN file taxes AND refer
    dashboard: true,
    // ❌ NO tax filing features
    uploadDocuments: false,
    documents: false,
    clientFileCenter: false,
    taxForms: false,
    // ✅ Full affiliate/referral features
    store: true,
    analytics: true,
    trackingCode: true,
    marketing: true,
    marketingAssets: true,
    earnings: true, // Can view their commission earnings
    quickShareLinks: true,
    // 🎛️ Analytics Micro-Toggles (view their referral performance)
    analytics_view: true,
    analytics_export: true,
    analytics_detailed: true,
    // 🎛️ Tracking Micro-Toggles (manage their tracking code)
    tracking_view: true,
    tracking_edit: true,
    tracking_analytics: true,
    // 🎛️ Store Micro-Toggles (purchase marketing materials)
    store_view: true,
    store_purchase: true,
    // 🎛️ Marketing Micro-Toggles (download marketing assets)
    marketing_view: true,
    marketing_upload: false, // ⚠️ RESTRICTED: Can't upload materials
    marketing_download: true,
    marketing_delete: false, // ⚠️ RESTRICTED: Can't delete materials
  },
};

/**
 * Permission labels for UI display
 */
export const PERMISSION_LABELS: Record<Permission, string> = {
  // Core permissions
  dashboard: 'Dashboard',
  alerts: 'Phone Alerts & Notifications',
  users: 'User Management',
  payouts: 'Payouts',
  contentGenerator: 'Content Generator',
  database: 'Database',
  analytics: 'Analytics',
  adminManagement: 'Admin Management',
  clients: 'Client List',
  documents: 'Documents',
  store: 'Store',
  academy: 'Academy',
  earnings: 'Earnings',
  settings: 'Settings',
  marketing: 'Marketing Tools',
  uploadDocuments: 'Upload Documents',
  contest: 'Contest',
  trackingCode: 'My Tracking Code',
  // Main feature toggles
  clientsStatus: 'Clients Status',
  referralsStatus: 'Referrals Status',
  emails: 'Emails',
  calendar: 'Calendar & Appointments',
  addressBook: 'CRM Contacts',
  clientFileCenter: 'Client File Center',
  taxForms: 'IRS Forms Library',
  marketingAssets: 'Marketing Assets',
  googleAnalytics: 'Google Analytics',
  referralsAnalytics: 'Referrals Analytics',
  learningCenter: 'Learning Center',
  marketingHub: 'Marketing Hub',
  quickShareLinks: 'Quick Share Links',
  routeAccessControl: 'Route Access Control',
  // 🎛️ Calendar & Appointments Micro-Toggles
  calendar_view: '📅 Calendar: View Appointments',
  calendar_create: '📅 Calendar: Create Appointments',
  calendar_edit: '📅 Calendar: Edit Appointments',
  calendar_delete: '📅 Calendar: Delete Appointments',
  // 🎛️ CRM Contacts Micro-Toggles
  contacts_view: '👥 Contacts: View Contact List',
  contacts_create: '👥 Contacts: Create New Contacts',
  contacts_edit: '👥 Contacts: Edit Contact Info',
  contacts_delete: '👥 Contacts: Delete Contacts',
  contacts_export: '👥 Contacts: Export Contact Data',
  // 🎛️ Client File Center Micro-Toggles
  files_view: '📂 Files: View & Browse Files',
  files_upload: '📂 Files: Upload New Files',
  files_download: '📂 Files: Download Files',
  files_delete: '📂 Files: Delete Files',
  files_share: '📂 Files: Generate Share Links',
  // 🎛️ Academy Micro-Toggles
  academy_view: '🎓 Academy: View Course Catalog',
  academy_enroll: '🎓 Academy: Enroll in Courses',
  academy_complete: '🎓 Academy: Complete Courses',
  // 🎛️ IRS Forms Micro-Toggles
  taxforms_view: '📋 Tax Forms: View Forms Library',
  taxforms_download: '📋 Tax Forms: Download Forms',
  taxforms_assign: '📋 Tax Forms: Assign to Clients',
  taxforms_upload: '📋 Tax Forms: Upload Custom Forms',
  // 🎛️ Analytics Micro-Toggles
  analytics_view: '📊 Analytics: View Dashboard',
  analytics_export: '📊 Analytics: Export Data',
  analytics_detailed: '📊 Analytics: Detailed Reports',
  // 🎛️ Tracking Code Micro-Toggles
  tracking_view: '🔗 Tracking: View Tracking Code',
  tracking_edit: '🔗 Tracking: Edit/Customize Code',
  tracking_analytics: '🔗 Tracking: View Performance',
  // 🎛️ Store Micro-Toggles (store_cart removed)
  store_view: '🛒 Store: Browse Products',
  store_purchase: '🛒 Store: Make Purchases',
  // 🎛️ Marketing Assets Micro-Toggles
  marketing_view: '🎨 Marketing: View Assets Library',
  marketing_upload: '🎨 Marketing: Upload New Assets',
  marketing_download: '🎨 Marketing: Download Assets',
  marketing_delete: '🎨 Marketing: Delete Assets',
};

/**
 * Get permissions for a user based on their role and custom permissions
 */
export function getUserPermissions(
  role: UserRole,
  customPermissions?: Partial<UserPermissions>
): Partial<UserPermissions> {
  const defaultPerms = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.client;

  // If custom permissions are provided, merge with defaults
  if (customPermissions) {
    return { ...defaultPerms, ...customPermissions };
  }

  return defaultPerms;
}

/**
 * Get effective permissions for a user considering viewing role
 * Used for admin "View As" functionality
 */
export function getEffectivePermissions(
  actualRole: UserRole,
  effectiveRole: UserRole,
  customPermissions?: Partial<UserPermissions>
): Partial<UserPermissions> & { isViewingAsOtherRole: boolean; actualRole: UserRole } {
  // Get permissions for the effective role (what user sees)
  const permissions = getUserPermissions(effectiveRole, customPermissions);

  // Add metadata about viewing state
  return {
    ...permissions,
    isViewingAsOtherRole: actualRole !== effectiveRole,
    actualRole,
  };
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  userPermissions: Partial<UserPermissions>,
  permission: Permission
): boolean {
  return userPermissions[permission] === true;
}

/**
 * 🎛️ MICRO-PERMISSION HELPERS
 * Check if user has specific micro-permissions for granular access control
 */

// Calendar Micro-Permissions
export function canViewCalendar(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'calendar_view');
}

export function canCreateCalendar(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'calendar_create');
}

export function canEditCalendar(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'calendar_edit');
}

export function canDeleteCalendar(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'calendar_delete');
}

// CRM Contacts Micro-Permissions
export function canViewContacts(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'contacts_view');
}

export function canCreateContacts(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'contacts_create');
}

export function canEditContacts(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'contacts_edit');
}

export function canDeleteContacts(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'contacts_delete');
}

export function canExportContacts(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'contacts_export');
}

// File Center Micro-Permissions
export function canViewFiles(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'files_view');
}

export function canUploadFiles(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'files_upload');
}

export function canDownloadFiles(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'files_download');
}

export function canDeleteFiles(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'files_delete');
}

export function canShareFiles(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'files_share');
}

// Academy Micro-Permissions
export function canViewAcademy(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'academy_view');
}

export function canEnrollAcademy(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'academy_enroll');
}

export function canCompleteAcademy(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'academy_complete');
}

// Tax Forms Micro-Permissions
export function canViewTaxForms(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'taxforms_view');
}

export function canDownloadTaxForms(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'taxforms_download');
}

export function canAssignTaxForms(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'taxforms_assign');
}

export function canUploadTaxForms(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'taxforms_upload');
}

// Analytics Micro-Permissions
export function canViewAnalytics(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'analytics_view');
}

export function canExportAnalytics(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'analytics_export');
}

export function canViewDetailedAnalytics(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'analytics_detailed');
}

// Tracking Code Micro-Permissions
export function canViewTracking(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'tracking_view');
}

export function canEditTracking(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'tracking_edit');
}

export function canViewTrackingAnalytics(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'tracking_analytics');
}

// Store Micro-Permissions
export function canViewStore(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'store_view');
}

export function canPurchaseStore(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'store_purchase');
}

// Marketing Assets Micro-Permissions
export function canViewMarketing(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'marketing_view');
}

export function canUploadMarketing(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'marketing_upload');
}

export function canDownloadMarketing(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'marketing_download');
}

export function canDeleteMarketing(permissions: Partial<UserPermissions>): boolean {
  return hasPermission(permissions, 'marketing_delete');
}

/**
 * Get available permissions to edit for a specific role
 * Super admin can edit all, but lower roles have restrictions
 */
export function getEditablePermissions(role: UserRole): Permission[] {
  switch (role) {
    case 'admin':
      return Object.keys(DEFAULT_PERMISSIONS.admin) as Permission[];

    case 'tax_preparer':
      // Tax preparers have these fixed features (scoped to their assigned clients)
      return [
        'dashboard',
        'clients',
        'documents',
        'clientFileCenter',
        'taxForms',
        'addressBook',
        'calendar',
        'store',
        'academy',
        'analytics',
        'trackingCode',
        'marketing',
        'marketingAssets',
        // 🎛️ Calendar Micro-Toggles
        'calendar_view',
        'calendar_create',
        'calendar_edit',
        'calendar_delete',
        // 🎛️ Contacts Micro-Toggles
        'contacts_view',
        'contacts_create',
        'contacts_edit',
        'contacts_delete',
        'contacts_export',
        // 🎛️ Files Micro-Toggles
        'files_view',
        'files_upload',
        'files_download',
        'files_delete',
        'files_share',
        // 🎛️ Academy Micro-Toggles
        'academy_view',
        'academy_enroll',
        'academy_complete',
        // 🎛️ Tax Forms Micro-Toggles
        'taxforms_view',
        'taxforms_download',
        'taxforms_assign',
        'taxforms_upload',
        // 🎛️ Analytics Micro-Toggles
        'analytics_view',
        'analytics_export',
        'analytics_detailed',
        // 🎛️ Tracking Micro-Toggles
        'tracking_view',
        'tracking_edit',
        'tracking_analytics',
        // 🎛️ Store Micro-Toggles (store_cart removed)
        'store_view',
        'store_purchase',
        // 🎛️ Marketing Assets Micro-Toggles
        'marketing_view',
        'marketing_upload',
        'marketing_download',
        'marketing_delete',
      ];

    // NOTE: 'lead' case removed - leads are CRM contacts, not users with accounts

    case 'affiliate':
      // Affiliate role: Referral-only features, NO tax filing
      return [
        'dashboard',
        'store',
        'analytics',
        'trackingCode',
        'marketing',
        'marketingAssets',
        'earnings',
        'quickShareLinks',
        // 🎛️ Analytics Micro-Toggles
        'analytics_view',
        'analytics_export',
        'analytics_detailed',
        // 🎛️ Tracking Micro-Toggles
        'tracking_view',
        'tracking_edit',
        'tracking_analytics',
        // 🎛️ Store Micro-Toggles
        'store_view',
        'store_purchase',
        // 🎛️ Marketing Micro-Toggles
        'marketing_view',
        'marketing_download',
      ];

    case 'client':
      // Client now includes all affiliate features (controlled by affiliateStatus)
      return [
        'dashboard',
        // Tax filing features (conditional on hasFiledTaxes)
        'uploadDocuments',
        // Affiliate features (conditional on affiliateStatus)
        'store',
        'analytics',
        'trackingCode',
        'marketing',
        'marketingAssets',
        // 🎛️ Files Micro-Toggles
        'files_view',
        'files_upload',
        'files_download',
        'files_delete',
        'files_share',
        // 🎛️ Analytics Micro-Toggles
        'analytics_view',
        'analytics_export',
        'analytics_detailed',
        // 🎛️ Tracking Micro-Toggles
        'tracking_view',
        'tracking_edit',
        'tracking_analytics',
        // 🎛️ Store Micro-Toggles (store_cart removed)
        'store_view',
        'store_purchase',
        // 🎛️ Marketing Micro-Toggles
        'marketing_view',
        'marketing_upload',
        'marketing_download',
        'marketing_delete',
      ];

    default:
      return [];
  }
}

/**
 * Map permissions to navigation routes
 */
export const PERMISSION_TO_ROUTE: Record<Permission, string> = {
  dashboard: '/dashboard',
  users: '/admin/users',
  payouts: '/admin/payouts',
  contentGenerator: '/admin/content-generator',
  database: '/admin/database',
  analytics: '/admin/analytics',
  adminManagement: '/admin/permissions',
  clients: '/dashboard/tax-preparer/clients',
  documents: '/dashboard/tax-preparer/documents',
  store: '/store',
  academy: '/app/academy',
  earnings: '/dashboard/*/earnings',
  settings: '/dashboard/*/settings',
  marketing: '/dashboard/*/marketing',
  uploadDocuments: '/upload-documents',
  contest: '/dashboard/contest',
  trackingCode: '/dashboard/*/tracking',
  alerts: '/admin/alerts',
  // New admin navigation routes
  clientsStatus: '/admin/clients-status',
  referralsStatus: '/admin/referrals-status',
  emails: '/admin/emails',
  calendar: '/admin/calendar',
  addressBook: '/admin/address-book',
  clientFileCenter: '/admin/file-center',
  googleAnalytics: '/admin/analytics/google',
  referralsAnalytics: '/admin/analytics/referrals',
  learningCenter: '/admin/learning-center',
  marketingHub: '/admin/marketing-hub',
  quickShareLinks: '/admin/quick-share',
  routeAccessControl: '/admin/route-access-control',
};

/**
 * Get role permission template from database
 * Falls back to DEFAULT_PERMISSIONS if not found in DB
 *
 * @param role - The user role to get template for
 * @returns Promise<Partial<UserPermissions>>
 */
export async function getRolePermissionTemplate(role: UserRole): Promise<Partial<UserPermissions>> {
  try {
    // Dynamic import to avoid circular dependency
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const template = await prisma.rolePermissionTemplate.findUnique({
      where: { role },
    });

    await prisma.$disconnect();

    if (template && template.permissions) {
      return template.permissions as Partial<UserPermissions>;
    }

    // Fall back to default permissions
    return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.client;
  } catch (error) {
    logger.error('Error fetching role template from DB:', error);
    // Fall back to default permissions on error
    return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.client;
  }
}

/**
 * Get role display names for UI
 * Note: Display 'Member' instead of 'Client' in user-facing contexts
 * 4 roles: admin, tax_preparer, client, affiliate
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  admin: 'Admin',
  tax_preparer: 'Tax Preparer',
  client: 'Member', // Display as 'Member' to users
  affiliate: 'Affiliate', // Referral-only role
};

/**
 * Get role descriptions for UI
 * 4 roles: admin, tax_preparer, client, affiliate
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Full system control - Database, Permissions, All Client Files',
  tax_preparer: 'Independent tax professional - Manages clients, auto has affiliate features',
  client: 'General member - Tax filing (if hasFiledTaxes), affiliate features (if approved)',
  affiliate: 'Referral-only - Can refer others for commission, cannot file taxes',
};

/**
 * ==================================================================================
 * STATUS-BASED ACCESS HELPERS
 * These helpers check affiliate and tax filing feature access based on profile flags
 * ==================================================================================
 */

/**
 * Check if user has access to affiliate features
 * Affiliates and Tax preparers always have access, clients need APPROVED status
 */
export function hasAffiliateAccess(
  role: UserRole,
  affiliateStatus?: AffiliateStatus | null
): boolean {
  // Affiliates always have affiliate features (that's their only purpose)
  if (role === 'affiliate') {
    return true;
  }

  // Tax preparers always have affiliate features
  if (role === 'tax_preparer') {
    return true;
  }

  // Clients need APPROVED status
  if (role === 'client') {
    return affiliateStatus === 'APPROVED';
  }

  // Admins don't typically use affiliate features but can view
  if (role === 'admin') {
    return true;
  }

  return false;
}

/**
 * Check if user has access to tax filing features (documents, returns, tickets)
 * Only clients with hasFiledTaxes flag can access
 * Affiliates CANNOT file taxes - they are referral-only
 */
export function hasTaxFilingAccess(
  role: UserRole,
  hasFiledTaxes?: boolean | null
): boolean {
  // Affiliates CANNOT file taxes - referral only
  if (role === 'affiliate') {
    return false;
  }

  // Only clients can have tax filing features
  if (role === 'client') {
    return hasFiledTaxes === true;
  }

  // Tax preparers access client files through their own interface
  // Admins can view but through admin interfaces

  return false;
}

/**
 * Get the affiliate status display text
 */
export function getAffiliateStatusDisplay(status: AffiliateStatus | null | undefined): string {
  switch (status) {
    case 'NONE':
      return 'Not an Affiliate';
    case 'PENDING':
      return 'Pending Approval';
    case 'APPROVED':
      return 'Active Affiliate';
    case 'SUSPENDED':
      return 'Suspended';
    case 'INACTIVE':
      return 'Inactive';
    default:
      return 'Not an Affiliate';
  }
}

/**
 * Check if user can apply to become an affiliate
 */
export function canApplyForAffiliate(
  role: UserRole,
  affiliateStatus?: AffiliateStatus | null
): boolean {
  // Only clients who are not already affiliates can apply
  if (role !== 'client') {
    return false;
  }

  // Can only apply if status is NONE
  return affiliateStatus === 'NONE' || affiliateStatus === null || affiliateStatus === undefined;
}
