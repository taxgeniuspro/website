/**
 * Admin Route Access Control API - Single Restriction Operations
 *
 * PUT /api/admin/route-access-control/[id] - Update restriction
 * DELETE /api/admin/route-access-control/[id] - Delete restriction
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  UpdatePageRestrictionRequest,
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
 * PUT - Update existing route restriction
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Check if user has 'routeAccessControl' permission

    const { id } = await params;
    const body: UpdatePageRestrictionRequest = await req.json();

    // Check if restriction exists
    const { data: existingData, error: findError } = await db.from('page_restrictions')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (findError) {
      throw findError;
    }

    const existing = firstOrNull<PageRestriction>(existingData);

    if (!existing) {
      return NextResponse.json({ error: 'Route restriction not found' }, { status: 404 });
    }

    // If changing routePath, check for conflicts
    if (body.routePath && body.routePath !== existing.routePath) {
      const { data: conflict } = await db.from('page_restrictions')
        .select('id')
        .eq('routePath', body.routePath)
        .limit(1);

      if (conflict && conflict.length > 0) {
        return NextResponse.json(
          { error: 'A restriction already exists for this route pattern' },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, any> = {};
    if (body.routePath !== undefined) updateData.routePath = body.routePath;
    if (body.allowedRoles !== undefined) updateData.allowedRoles = body.allowedRoles;
    if (body.blockedRoles !== undefined) updateData.blockedRoles = body.blockedRoles;
    if (body.allowedUsernames !== undefined) updateData.allowedUsernames = body.allowedUsernames;
    if (body.blockedUsernames !== undefined) updateData.blockedUsernames = body.blockedUsernames;
    if (body.allowNonLoggedIn !== undefined) updateData.allowNonLoggedIn = body.allowNonLoggedIn;
    if (body.redirectUrl !== undefined) updateData.redirectUrl = body.redirectUrl;
    if (body.hideFromNav !== undefined) updateData.hideFromNav = body.hideFromNav;
    if (body.showInNavOverride !== undefined) updateData.showInNavOverride = body.showInNavOverride;
    if (body.customHtmlOnBlock !== undefined) updateData.customHtmlOnBlock = body.customHtmlOnBlock;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.description !== undefined) updateData.description = body.description;

    // Update restriction
    const { data: restriction, error: updateError } = await db.from('page_restrictions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Clear cache
    clearRestrictionCache(existing.routePath);
    if (body.routePath && body.routePath !== existing.routePath) {
      clearRestrictionCache(body.routePath);
    }

    logger.info(`Route restriction updated: ${restriction.routePath} by ${userId}`);

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
    logger.error('Error updating route restriction:', error);
    return NextResponse.json(
      { error: 'Failed to update route restriction', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete route restriction
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Check if user has 'routeAccessControl' permission

    const { id } = await params;

    // Check if restriction exists
    const { data: existingData, error: findError } = await db.from('page_restrictions')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (findError) {
      throw findError;
    }

    const existing = firstOrNull<PageRestriction>(existingData);

    if (!existing) {
      return NextResponse.json({ error: 'Route restriction not found' }, { status: 404 });
    }

    // Delete restriction
    const { error: deleteError } = await db.from('page_restrictions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    // Clear cache
    clearRestrictionCache(existing.routePath);

    logger.info(`Route restriction deleted: ${existing.routePath} by ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Route restriction deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting route restriction:', error);
    return NextResponse.json(
      { error: 'Failed to delete route restriction', details: String(error) },
      { status: 500 }
    );
  }
}
