/**
 * Content Restriction Utilities
 *
 * Provides role-based and username-based access control for pages and content.
 * Inspired by WordPress "Pages by User Role" plugin, adapted for Next.js + Clerk.
 *
 * Priority Order:
 * 1. Username-based blocks (blockedUsernames) - HIGHEST PRIORITY
 * 2. Username-based allows (allowedUsernames)
 * 3. Role-based blocks (blockedRoles)
 * 4. Role-based allows (allowedRoles)
 * 5. Default behavior (based on allowNonLoggedIn)
 */

import { PrismaClient } from '@prisma/client';
import { UserRole } from './permissions';
import { logger } from './logger';

const prisma = new PrismaClient();

// ============ Types ============

export interface AccessCheckResult {
  allowed: boolean;
  reason: string; // 'allowed', 'blocked_username', 'blocked_role', 'not_authenticated', 'no_permission'
  redirectUrl?: string;
  customContent?: string;
}

export interface PageRestrictionData {
  routePath: string;
  allowedRoles: string[];
  blockedRoles: string[];
  allowedUsernames: string[];
  blockedUsernames: string[];
  allowNonLoggedIn: boolean;
  redirectUrl?: string | null;
  customHtmlOnBlock?: string | null;
  hideFromNav: boolean;
  showInNavOverride: boolean;
}

export interface ContentRestrictionData {
  contentType: string;
  contentIdentifier: string;
  allowedRoles: string[];
  blockedRoles: string[];
  allowedUsernames: string[];
  blockedUsernames: string[];
  hideFromFrontend: boolean;
}

export interface UserContext {
  userId?: string;
  username?: string;
  role?: UserRole | string;
  isAuthenticated: boolean;
}

// ============ Pattern Matching ============

/**
 * Check if a route matches a pattern (supports wildcards)
 *
 * Patterns:
 * - Exact match: /admin/users matches only /admin/users
 * - Wildcard: /admin/* matches /admin/anything, /admin/users/123
 * - Wildcard: /dashboard/star/settings matches /dashboard/client/settings, /dashboard/admin/settings
 *
 * @param route - The actual route path to check
 * @param pattern - The pattern to match against (can contain wildcards)
 * @returns true if route matches pattern
 */
export function matchRoutePattern(route: string, pattern: string): boolean {
  // Exact match (no wildcards)
  if (!pattern.includes('*')) {
    return route === pattern;
  }

  // Convert pattern to regex
  // Escape special regex characters except *
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .replace(/\*/g, '.*'); // Convert * to .*

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(route);
}

/**
 * Find all restrictions that match a route (supports patterns)
 * Returns restrictions ordered by priority (highest first)
 *
 * @param route - Route to check
 * @returns Array of matching restrictions, ordered by priority
 */
async function findMatchingRestrictions(route: string) {
  try {
    // Get all active restrictions
    const allRestrictions = await prisma.pageRestriction.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' }, // Higher priority first
    });

    // Filter to only matching restrictions
    const matchingRestrictions = allRestrictions.filter((restriction) =>
      matchRoutePattern(route, restriction.routePath)
    );

    return matchingRestrictions;
  } catch (error) {
    logger.error('Error finding matching restrictions:', error);
    return [];
  }
}

// ============ Core Access Control Functions ============

/**
 * Normalize username for comparison (lowercase, trimmed)
 */
function normalizeUsername(username: string): string {
  return username.toLowerCase().trim();
}

/**
 * Check if username is in a list (case-insensitive)
 */
function isUsernameInList(username: string, usernameList: string[]): boolean {
  const normalized = normalizeUsername(username);
  return usernameList.some((u) => normalizeUsername(u) === normalized);
}

/**
 * Check if user has access to a page/route
 * Now supports pattern matching with priority ordering
 *
 * @param routePath - The route path to check (e.g., '/admin/users')
 * @param userContext - Current user context
 * @returns AccessCheckResult with allowed status and reason
 */
export async function checkPageAccess(
  routePath: string,
  userContext: UserContext
): Promise<AccessCheckResult> {
  try {
    // Find all restrictions that match this route (supports patterns)
    // Returns restrictions ordered by priority (highest first)
    const matchingRestrictions = await findMatchingRestrictions(routePath);

    // No matching restrictions = allow by default
    if (matchingRestrictions.length === 0) {
      return {
        allowed: true,
        reason: 'no_restriction',
      };
    }

    // Use the highest priority matching restriction
    const restriction = matchingRestrictions[0];

    logger.info(
      `Route ${routePath} matched pattern "${restriction.routePath}" (priority: ${restriction.priority})`
    );

    // Check access using restriction rules
    return checkAccessWithRestriction(
      {
        allowedRoles: restriction.allowedRoles,
        blockedRoles: restriction.blockedRoles,
        allowedUsernames: restriction.allowedUsernames,
        blockedUsernames: restriction.blockedUsernames,
        allowNonLoggedIn: restriction.allowNonLoggedIn,
      },
      userContext,
      restriction.redirectUrl,
      restriction.customHtmlOnBlock
    );
  } catch (error) {
    logger.error('Error checking page access:', error);
    // Fail closed - deny access on error
    return {
      allowed: false,
      reason: 'error',
    };
  }
}

/**
 * Check if user has access to content (component/section)
 *
 * @param contentType - Type of content ('section', 'component', etc.)
 * @param contentIdentifier - Unique identifier for the content
 * @param userContext - Current user context
 * @returns AccessCheckResult
 */
export async function checkContentAccess(
  contentType: string,
  contentIdentifier: string,
  userContext: UserContext
): Promise<AccessCheckResult> {
  try {
    // Get restriction for this content
    const restriction = await prisma.contentRestriction.findUnique({
      where: {
        contentType_contentIdentifier: {
          contentType,
          contentIdentifier,
        },
      },
    });

    // No restriction = allow by default
    if (!restriction) {
      return {
        allowed: true,
        reason: 'no_restriction',
      };
    }

    // Check access using restriction rules
    return checkAccessWithRestriction(
      {
        allowedRoles: restriction.allowedRoles,
        blockedRoles: restriction.blockedRoles,
        allowedUsernames: restriction.allowedUsernames,
        blockedUsernames: restriction.blockedUsernames,
        allowNonLoggedIn: false, // Content restrictions never allow non-logged-in by default
      },
      userContext
    );
  } catch (error) {
    logger.error('Error checking content access:', error);
    // Fail closed - deny access on error
    return {
      allowed: false,
      reason: 'error',
    };
  }
}

/**
 * Core access checking logic using restriction rules
 */
function checkAccessWithRestriction(
  restriction: {
    allowedRoles: string[];
    blockedRoles: string[];
    allowedUsernames: string[];
    blockedUsernames: string[];
    allowNonLoggedIn: boolean;
  },
  userContext: UserContext,
  redirectUrl?: string | null,
  customContent?: string | null
): AccessCheckResult {
  const { username, role, isAuthenticated } = userContext;

  // STEP 1: Check username-based BLOCKS (highest priority)
  if (username && isUsernameInList(username, restriction.blockedUsernames)) {
    return {
      allowed: false,
      reason: 'blocked_username',
      redirectUrl: redirectUrl || undefined,
      customContent: customContent || undefined,
    };
  }

  // STEP 2: Check username-based ALLOWS (second highest priority)
  if (username && isUsernameInList(username, restriction.allowedUsernames)) {
    return {
      allowed: true,
      reason: 'allowed_username',
    };
  }

  // STEP 3: Check authentication requirement
  if (!isAuthenticated) {
    if (restriction.allowNonLoggedIn) {
      return {
        allowed: true,
        reason: 'public_access',
      };
    }
    return {
      allowed: false,
      reason: 'not_authenticated',
      redirectUrl: redirectUrl || undefined,
      customContent: customContent || undefined,
    };
  }

  // STEP 4: Check role-based BLOCKS
  if (role && restriction.blockedRoles.includes(role)) {
    return {
      allowed: false,
      reason: 'blocked_role',
      redirectUrl: redirectUrl || undefined,
      customContent: customContent || undefined,
    };
  }

  // STEP 5: Check role-based ALLOWS
  // Empty allowedRoles = allow all authenticated users
  if (restriction.allowedRoles.length === 0) {
    return {
      allowed: true,
      reason: 'authenticated',
    };
  }

  // Check if user's role is in allowed list
  if (role && restriction.allowedRoles.includes(role)) {
    return {
      allowed: true,
      reason: 'allowed_role',
    };
  }

  // Default: deny access
  return {
    allowed: false,
    reason: 'no_permission',
    redirectUrl: redirectUrl || undefined,
    customContent: customContent || undefined,
  };
}

// ============ Batch Access Checks ============

/**
 * Check access to multiple routes at once (for navigation menus)
 * Now supports pattern matching with priority
 *
 * @param routePaths - Array of route paths to check
 * @param userContext - Current user context
 * @returns Map of routePath -> AccessCheckResult
 */
export async function checkBatchPageAccess(
  routePaths: string[],
  userContext: UserContext
): Promise<Map<string, AccessCheckResult>> {
  const results = new Map<string, AccessCheckResult>();

  try {
    // Get all active restrictions (to support pattern matching)
    const allRestrictions = await prisma.pageRestriction.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });

    // Check each route
    for (const routePath of routePaths) {
      // Find matching restrictions for this route
      const matchingRestrictions = allRestrictions.filter((restriction) =>
        matchRoutePattern(routePath, restriction.routePath)
      );

      if (matchingRestrictions.length === 0) {
        results.set(routePath, {
          allowed: true,
          reason: 'no_restriction',
        });
        continue;
      }

      // Use highest priority match
      const restriction = matchingRestrictions[0];

      const result = checkAccessWithRestriction(
        {
          allowedRoles: restriction.allowedRoles,
          blockedRoles: restriction.blockedRoles,
          allowedUsernames: restriction.allowedUsernames,
          blockedUsernames: restriction.blockedUsernames,
          allowNonLoggedIn: restriction.allowNonLoggedIn,
        },
        userContext,
        restriction.redirectUrl,
        restriction.customHtmlOnBlock
      );

      results.set(routePath, result);
    }

    return results;
  } catch (error) {
    logger.error('Error in batch access check:', error);
    // Return all denied on error
    routePaths.forEach((path) => {
      results.set(path, {
        allowed: false,
        reason: 'error',
      });
    });
    return results;
  }
}

/**
 * Filter array of routes/pages based on user access
 * Useful for navigation menus
 *
 * @param routes - Array of objects with 'path' property
 * @param userContext - Current user context
 * @returns Filtered array of routes user can access
 */
export async function filterAccessibleRoutes<T extends { path: string }>(
  routes: T[],
  userContext: UserContext
): Promise<T[]> {
  const routePaths = routes.map((r) => r.path);
  const accessResults = await checkBatchPageAccess(routePaths, userContext);

  return routes.filter((route) => {
    const result = accessResults.get(route.path);
    return result?.allowed === true;
  });
}

// ============ Navigation Visibility ============

/**
 * Check if a route should be hidden from navigation
 *
 * @param routePath - Route path to check
 * @returns true if should be hidden from nav
 */
export async function shouldHideFromNav(routePath: string): Promise<boolean> {
  try {
    const restriction = await prisma.pageRestriction.findUnique({
      where: { routePath },
      select: { hideFromNav: true, showInNavOverride: true },
    });

    if (!restriction) {
      return false;
    }

    // showInNavOverride forces it to show even if hideFromNav is true
    if (restriction.showInNavOverride) {
      return false;
    }

    return restriction.hideFromNav;
  } catch (error) {
    logger.error('Error checking nav visibility:', error);
    return false;
  }
}

// ============ Content Filtering ============

/**
 * Filter array of content items based on user access
 *
 * @param contentType - Type of content
 * @param contentItems - Array of items with identifier
 * @param userContext - Current user context
 * @returns Filtered array of accessible content
 */
export async function filterAccessibleContent<T extends { id: string }>(
  contentType: string,
  contentItems: T[],
  userContext: UserContext
): Promise<T[]> {
  try {
    // Get restrictions for this content type
    const restrictions = await prisma.contentRestriction.findMany({
      where: {
        contentType,
        contentIdentifier: {
          in: contentItems.map((item) => item.id),
        },
      },
    });

    const restrictionMap = new Map(restrictions.map((r) => [r.contentIdentifier, r]));

    const results: T[] = [];

    for (const item of contentItems) {
      const restriction = restrictionMap.get(item.id);

      if (!restriction) {
        // No restriction = allow
        results.push(item);
        continue;
      }

      // Check if should hide from frontend entirely
      if (restriction.hideFromFrontend) {
        continue;
      }

      // Check access
      const accessResult = checkAccessWithRestriction(
        {
          allowedRoles: restriction.allowedRoles,
          blockedRoles: restriction.blockedRoles,
          allowedUsernames: restriction.allowedUsernames,
          blockedUsernames: restriction.blockedUsernames,
          allowNonLoggedIn: false,
        },
        userContext
      );

      if (accessResult.allowed) {
        results.push(item);
      }
    }

    return results;
  } catch (error) {
    logger.error('Error filtering content:', error);
    // On error, return all items (fail open for content)
    return contentItems;
  }
}

// ============ Logging ============

/**
 * Log an unauthorized access attempt
 *
 * @param userContext - User who attempted access
 * @param attemptedRoute - Route they tried to access
 * @param blockReason - Why they were blocked
 * @param restrictionId - ID of the restriction that blocked them
 */
export async function logAccessAttempt(
  userContext: UserContext,
  attemptedRoute: string,
  blockReason: string,
  restrictionId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.accessAttemptLog.create({
      data: {
        userId: userContext.userId,
        userRole: userContext.role,
        username: userContext.username,
        attemptedRoute,
        restrictionType: 'page',
        restrictionId,
        wasBlocked: true,
        blockReason,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    logger.error('Error logging access attempt:', error);
    // Don't throw - logging failures shouldn't block the app
  }
}

// ============ Cache Management ============

/**
 * Simple in-memory cache for restrictions (5 minute TTL)
 * In production, consider using Redis or similar
 */
const restrictionCache = new Map<string, { data: PageRestrictionData | null; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get restriction with caching
 */
async function getCachedRestriction(routePath: string): Promise<PageRestrictionData | null> {
  const cached = restrictionCache.get(routePath);

  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const restriction = await prisma.pageRestriction.findUnique({
    where: { routePath },
  });

  restrictionCache.set(routePath, {
    data: restriction,
    expiry: Date.now() + CACHE_TTL,
  });

  return restriction;
}

/**
 * Clear restriction cache (call when restrictions are updated)
 */
export function clearRestrictionCache(routePath?: string): void {
  if (routePath) {
    restrictionCache.delete(routePath);
  } else {
    restrictionCache.clear();
  }
}
