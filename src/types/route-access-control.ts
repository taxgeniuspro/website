/**
 * Route Access Control Types
 *
 * Type definitions for the route access control system
 * (inspired by WordPress "Pages by User Role" plugin)
 */

import { UserRole } from '@/lib/permissions';

// ============ API Request/Response Types ============

export interface CreatePageRestrictionRequest {
  routePath: string;
  allowedRoles?: string[];
  blockedRoles?: string[];
  allowedUsernames?: string[];
  blockedUsernames?: string[];
  allowNonLoggedIn?: boolean;
  redirectUrl?: string | null;
  hideFromNav?: boolean;
  showInNavOverride?: boolean;
  customHtmlOnBlock?: string | null;
  priority?: number;
  isActive?: boolean;
  description?: string | null;
}

export interface UpdatePageRestrictionRequest extends Partial<CreatePageRestrictionRequest> {
  id: string;
}

export interface PageRestrictionResponse {
  id: string;
  routePath: string;
  allowedRoles: string[];
  blockedRoles: string[];
  allowedUsernames: string[];
  blockedUsernames: string[];
  allowNonLoggedIn: boolean;
  redirectUrl: string | null;
  hideFromNav: boolean;
  showInNavOverride: boolean;
  customHtmlOnBlock: string | null;
  priority: number;
  isActive: boolean;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckRouteAccessRequest {
  routePath: string;
  userId?: string;
  username?: string;
  role?: UserRole | string;
}

export interface CheckRouteAccessResponse {
  allowed: boolean;
  reason: string;
  redirectUrl?: string;
  matchedPattern?: string;
  matchedRestrictionId?: string;
}

export interface BulkActionRequest {
  action: 'activate' | 'deactivate' | 'delete';
  ids: string[];
}

export interface BulkActionResponse {
  success: boolean;
  processedCount: number;
  errors?: string[];
}

// ============ Form Types ============

export interface RouteRestrictionFormData {
  routePath: string;
  description?: string;

  // Access control
  mode: 'allow' | 'block'; // Simplified mode for UI
  roles: string[];
  usernames: string[];

  // Behavior
  allowNonLoggedIn: boolean;
  redirectUrl?: string;
  customHtmlOnBlock?: string;

  // Navigation
  hideFromNav: boolean;
  showInNavOverride: boolean;

  // Settings
  priority: number;
  isActive: boolean;
}

// ============ Table/List Types ============

export interface RouteRestrictionTableRow {
  id: string;
  routePath: string;
  description?: string;
  allowedRoles: string[];
  blockedRoles: string[];
  allowedUsernames: string[];
  blockedUsernames: string[];
  priority: number;
  isActive: boolean;
  redirectUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RouteRestrictionFilters {
  searchTerm?: string;
  isActive?: boolean;
  hasRedirect?: boolean;
  pattern?: string; // Filter by route pattern
  minPriority?: number;
  maxPriority?: number;
}

export interface RouteRestrictionSortOptions {
  field: 'routePath' | 'priority' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

// ============ Statistics Types ============

export interface RouteAccessStats {
  totalRestrictions: number;
  activeRestrictions: number;
  inactiveRestrictions: number;
  patternsCount: number;
  exactMatchesCount: number;
  mostBlockedRoles: Array<{ role: string; count: number }>;
  mostAllowedRoles: Array<{ role: string; count: number }>;
  recentAccessAttempts: Array<{
    route: string;
    username?: string;
    role?: string;
    wasBlocked: boolean;
    timestamp: Date;
  }>;
}

// ============ Validation Types ============

export interface RoutePatternValidation {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
  conflictsWith?: string[]; // Other patterns that conflict
}

// ============ Export Types ============

export interface ExportConfig {
  format: 'json' | 'csv';
  includeInactive?: boolean;
  filters?: RouteRestrictionFilters;
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errors: Array<{ line: number; error: string }>;
}
