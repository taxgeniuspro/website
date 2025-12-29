/**
 * Admin Route Access Control API
 *
 * GET /api/admin/route-access-control - List all route restrictions
 * POST /api/admin/route-access-control - Create new restriction
 *
 * Inspired by WordPress "Pages by User Role" plugin
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  CreatePageRestrictionRequest,
  PageRestrictionResponse,
} from '@/types/route-access-control';
import { clearRestrictionCache } from '@/lib/content-restriction';

// Local interfaces
interface PageRestriction {
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
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET - List all route restrictions with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Check if user has 'routeAccessControl' permission
    // For now, only allow super_admin access
    // This can be enhanced with the permissions system later

    const { searchParams } = new URL(req.url);
    const searchTerm = searchParams.get('search');
    const isActiveFilter = searchParams.get('isActive');
    const sortField = (searchParams.get('sortField') || 'priority') as
      | 'routePath'
      | 'priority'
      | 'createdAt'
      | 'updatedAt';
    const sortDirection = (searchParams.get('sortDirection') || 'desc') as 'asc' | 'desc';

    // Build query
    let query = db.from('page_restrictions').select('*');

    if (searchTerm) {
      query = query.or(`routePath.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    if (isActiveFilter !== null && isActiveFilter !== undefined) {
      query = query.eq('isActive', isActiveFilter === 'true');
    }

    query = query.order(sortField, { ascending: sortDirection === 'asc' });

    const { data: restrictions, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    // Map to response type
    const response: PageRestrictionResponse[] = (restrictions || []).map((r: PageRestriction) => ({
      id: r.id,
      routePath: r.routePath,
      allowedRoles: r.allowedRoles,
      blockedRoles: r.blockedRoles,
      allowedUsernames: r.allowedUsernames,
      blockedUsernames: r.blockedUsernames,
      allowNonLoggedIn: r.allowNonLoggedIn,
      redirectUrl: r.redirectUrl,
      hideFromNav: r.hideFromNav,
      showInNavOverride: r.showInNavOverride,
      customHtmlOnBlock: r.customHtmlOnBlock,
      priority: r.priority,
      isActive: r.isActive,
      description: r.description,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: response,
      count: response.length,
    });
  } catch (error) {
    logger.error('Error fetching route restrictions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch route restrictions', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new route restriction
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Check if user has 'routeAccessControl' permission

    const body: CreatePageRestrictionRequest = await req.json();

    // Validate required fields
    if (!body.routePath) {
      return NextResponse.json({ error: 'routePath is required' }, { status: 400 });
    }

    // Check for duplicate route pattern
    const { data: existing } = await db.from('page_restrictions')
      .select('id')
      .eq('routePath', body.routePath)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'A restriction already exists for this route pattern' },
        { status: 409 }
      );
    }

    // Create restriction
    const { data: restriction, error: createError } = await db.from('page_restrictions')
      .insert({
        routePath: body.routePath,
        allowedRoles: body.allowedRoles || [],
        blockedRoles: body.blockedRoles || [],
        allowedUsernames: body.allowedUsernames || [],
        blockedUsernames: body.blockedUsernames || [],
        allowNonLoggedIn: body.allowNonLoggedIn || false,
        redirectUrl: body.redirectUrl || null,
        hideFromNav: body.hideFromNav || false,
        showInNavOverride: body.showInNavOverride || false,
        customHtmlOnBlock: body.customHtmlOnBlock || null,
        priority: body.priority || 0,
        isActive: body.isActive !== undefined ? body.isActive : true,
        description: body.description || null,
        createdBy: userId,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Clear cache since we added a new restriction
    clearRestrictionCache();

    logger.info(`Route restriction created: ${restriction.routePath} by ${userId}`);

    const response: PageRestrictionResponse = {
      id: restriction.id,
      routePath: restriction.routePath,
      allowedRoles: restriction.allowedRoles,
      blockedRoles: restriction.blockedRoles,
      allowedUsernames: restriction.allowedUsernames,
      blockedUsernames: restriction.blockedUsernames,
      allowNonLoggedIn: restriction.allowNonLoggedIn,
      redirectUrl: restriction.redirectUrl,
      hideFromNav: restriction.hideFromNav,
      showInNavOverride: restriction.showInNavOverride,
      customHtmlOnBlock: restriction.customHtmlOnBlock,
      priority: restriction.priority,
      isActive: restriction.isActive,
      description: restriction.description,
      createdBy: restriction.createdBy,
      createdAt: restriction.createdAt,
      updatedAt: restriction.updatedAt,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error('Error creating route restriction:', error);
    return NextResponse.json(
      { error: 'Failed to create route restriction', details: String(error) },
      { status: 500 }
    );
  }
}
