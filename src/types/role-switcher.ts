/**
 * Role Switcher Types
 *
 * Types for admin "View As" functionality
 * Allows admins to preview the application from other roles' perspectives
 */

import { UserRole } from '@/lib/permissions';

/**
 * Role view state stored in cookie
 */
export interface ViewingRoleState {
  viewingRole: UserRole;
  viewingRoleName: string;
  timestamp: number;
  adminUserId: string;
}

/**
 * Effective role calculation result
 */
export interface EffectiveRoleInfo {
  actualRole: UserRole;
  effectiveRole: UserRole;
  isViewingAsOtherRole: boolean;
  viewingRoleName?: string;
}

/**
 * Role switch audit log entry
 */
export interface RoleSwitchAuditLog {
  id: string;
  adminUserId: string;
  adminEmail: string;
  fromRole: UserRole;
  toRole: UserRole;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Role switcher API response
 */
export interface RoleSwitcherResponse {
  success: boolean;
  effectiveRole: UserRole;
  message?: string;
  error?: string;
}

/**
 * Role display information
 */
export interface RoleDisplayInfo {
  value: UserRole;
  label: string;
  description: string;
  color: string;
  icon: string;
}

/**
 * Role switcher configuration
 */
export const ROLE_DISPLAY_CONFIG: Record<UserRole, RoleDisplayInfo> = {
  super_admin: {
    value: 'super_admin',
    label: 'Super Admin',
    description: 'Full system access',
    color: 'red',
    icon: '🛡️',
  },
  admin: {
    value: 'admin',
    label: 'Admin',
    description: 'Administrative access',
    color: 'orange',
    icon: '👑',
  },
  tax_preparer: {
    value: 'tax_preparer',
    label: 'Tax Preparer',
    description: 'Preparer dashboard',
    color: 'blue',
    icon: '📊',
  },
  lead: {
    value: 'lead',
    label: 'Lead',
    description: 'Lead management',
    color: 'yellow',
    icon: '🎯',
  },
  affiliate: {
    value: 'affiliate',
    label: 'Affiliate',
    description: 'Affiliate marketing',
    color: 'purple',
    icon: '🤝',
  },
  client: {
    value: 'client',
    label: 'Client',
    description: 'Client portal',
    color: 'gray',
    icon: '👤',
  },
};

/**
 * Roles that admins can view as
 * - Regular admins can switch to these roles (excludes super_admin for security)
 * - Super admins can switch to any role including admin
 * Note: 'admin' is excluded so regular admins don't see themselves in the switcher
 */
export const VIEWABLE_ROLES: UserRole[] = ['lead', 'tax_preparer', 'affiliate', 'client'];

/**
 * Operations that require actual admin role (not viewing role)
 */
export const PROTECTED_OPERATIONS = [
  'delete_user',
  'modify_payment',
  'change_system_settings',
  'grant_permissions',
  'assign_roles',
  'access_database',
  'view_audit_logs',
] as const;

export type ProtectedOperation = (typeof PROTECTED_OPERATIONS)[number];
