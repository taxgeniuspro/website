/**
 * Admin Route Access Control API - Test Route Access
 *
 * POST /api/admin/route-access-control/check - Test if a user/role can access a route
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { CheckRouteAccessRequest, CheckRouteAccessResponse } from '@/types/route-access-control';
import { checkPageAccess, matchRoutePattern } from '@/lib/content-restriction';
import { prisma } from '@/lib/prisma';

/**
 * POST - Test route access for a given user context
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Check if user has 'routeAccessControl' permission

    const body: CheckRouteAccessRequest = await req.json();

    // Validate required fields
    if (!body.routePath) {
      return NextResponse.json({ error: 'routePath is required' }, { status: 400 });
    }

    // Build user context for access check
    const userContext = {
      userId: body.userId,
      username: body.username,
      role: body.role,
      isAuthenticated: !!body.userId || !!body.role,
    };

    // Check access
    const accessResult = await checkPageAccess(body.routePath, userContext);

    // Find which pattern matched (if any)
    let matchedPattern: string | undefined;
    let matchedRestrictionId: string | undefined;

    if (!accessResult.allowed || accessResult.reason !== 'no_restriction') {
      // Find the matching restriction
      const allRestrictions = await prisma.pageRestriction.findMany({
        where: { isActive: true },
        orderBy: { priority: 'desc' },
      });

      const matchingRestriction = allRestrictions.find((r) =>
        matchRoutePattern(body.routePath, r.routePath)
      );

      if (matchingRestriction) {
        matchedPattern = matchingRestriction.routePath;
        matchedRestrictionId = matchingRestriction.id;
      }
    }

    logger.info(
      `Route access check: ${body.routePath} - ${accessResult.allowed ? 'ALLOWED' : 'BLOCKED'} (${accessResult.reason})`
    );

    const response: CheckRouteAccessResponse = {
      allowed: accessResult.allowed,
      reason: accessResult.reason,
      redirectUrl: accessResult.redirectUrl,
      matchedPattern,
      matchedRestrictionId,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error('Error checking route access:', error);
    return NextResponse.json(
      { error: 'Failed to check route access', details: String(error) },
      { status: 500 }
    );
  }
}
