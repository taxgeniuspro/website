/**
 * Content Restriction Check API
 *
 * GET /api/restrictions/check
 * Check if current user has access to a specific route or content
 *
 * Query params:
 * - routePath: The route path to check (e.g., '/admin/users')
 * - contentType: (optional) Type of content to check
 * - contentId: (optional) Content identifier
 *
 * Returns:
 * - allowed: boolean
 * - reason: string
 * - redirectUrl?: string
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkPageAccess, checkContentAccess, UserContext } from '@/lib/content-restriction';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const session = await auth(); const userId = session?.user?.id;
    const user = userId ? await auth() : null;

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const routePath = searchParams.get('routePath');
    const contentType = searchParams.get('contentType');
    const contentId = searchParams.get('contentId');

    // Validate params
    if (!routePath && (!contentType || !contentId)) {
      return NextResponse.json(
        {
          error: 'Must provide either routePath or both contentType and contentId',
        },
        { status: 400 }
      );
    }

    // Build user context
    const userContext: UserContext = {
      userId: user?.id,
      username: user?.username || user?.primaryEmailAddress?.emailAddress,
      role: user?.publicMetadata?.role as string | undefined,
      isAuthenticated: !!user,
    };

    // Check access
    let result;
    if (routePath) {
      result = await checkPageAccess(routePath, userContext);
    } else if (contentType && contentId) {
      result = await checkContentAccess(contentType, contentId, userContext);
    } else {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error checking access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
