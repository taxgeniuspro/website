/**
 * Admin Route Access Control API - Single Restriction Operations
 *
 * PUT /api/admin/route-access-control/[id] - Update restriction
 * DELETE /api/admin/route-access-control/[id] - Delete restriction
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  UpdatePageRestrictionRequest,
  PageRestrictionResponse,
} from '@/types/route-access-control';
import { clearRestrictionCache } from '@/lib/content-restriction';

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
    const existing = await prisma.pageRestriction.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Route restriction not found' }, { status: 404 });
    }

    // If changing routePath, check for conflicts
    if (body.routePath && body.routePath !== existing.routePath) {
      const conflict = await prisma.pageRestriction.findUnique({
        where: { routePath: body.routePath },
      });

      if (conflict) {
        return NextResponse.json(
          { error: 'A restriction already exists for this route pattern' },
          { status: 409 }
        );
      }
    }

    // Update restriction
    const restriction = await prisma.pageRestriction.update({
      where: { id },
      data: {
        ...(body.routePath !== undefined && { routePath: body.routePath }),
        ...(body.allowedRoles !== undefined && { allowedRoles: body.allowedRoles }),
        ...(body.blockedRoles !== undefined && { blockedRoles: body.blockedRoles }),
        ...(body.allowedUsernames !== undefined && {
          allowedUsernames: body.allowedUsernames,
        }),
        ...(body.blockedUsernames !== undefined && {
          blockedUsernames: body.blockedUsernames,
        }),
        ...(body.allowNonLoggedIn !== undefined && {
          allowNonLoggedIn: body.allowNonLoggedIn,
        }),
        ...(body.redirectUrl !== undefined && { redirectUrl: body.redirectUrl }),
        ...(body.hideFromNav !== undefined && { hideFromNav: body.hideFromNav }),
        ...(body.showInNavOverride !== undefined && {
          showInNavOverride: body.showInNavOverride,
        }),
        ...(body.customHtmlOnBlock !== undefined && {
          customHtmlOnBlock: body.customHtmlOnBlock,
        }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.description !== undefined && { description: body.description }),
      },
    });

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
      createdAt: restriction.createdAt.toISOString(),
      updatedAt: restriction.updatedAt.toISOString(),
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
    const existing = await prisma.pageRestriction.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Route restriction not found' }, { status: 404 });
    }

    // Delete restriction
    await prisma.pageRestriction.delete({
      where: { id },
    });

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
