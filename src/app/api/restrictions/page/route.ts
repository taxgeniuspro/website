/**
 * Page Restrictions CRUD API
 *
 * GET    /api/restrictions/page - List all restrictions
 * POST   /api/restrictions/page - Create new restriction
 * PUT    /api/restrictions/page - Update restriction
 * DELETE /api/restrictions/page - Delete restriction
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { clearRestrictionCache } from '@/lib/content-restriction';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

// GET - List all restrictions
export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const restrictions = await prisma.pageRestriction.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(restrictions);
  } catch (error) {
    logger.error('Error fetching restrictions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new restriction
export async function POST(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      routePath,
      allowedRoles = [],
      blockedRoles = [],
      allowedUsernames = [],
      blockedUsernames = [],
      allowNonLoggedIn = false,
      redirectUrl,
      hideFromNav = false,
      showInNavOverride = false,
      customHtmlOnBlock,
      description,
      priority = 0,
      isActive = true,
    } = body;

    // Validate required fields
    if (!routePath) {
      return NextResponse.json({ error: 'routePath is required' }, { status: 400 });
    }

    // Check if route already exists
    const existing = await prisma.pageRestriction.findUnique({
      where: { routePath },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Restriction for this route already exists' },
        { status: 409 }
      );
    }

    const restriction = await prisma.pageRestriction.create({
      data: {
        routePath,
        allowedRoles,
        blockedRoles,
        allowedUsernames,
        blockedUsernames,
        allowNonLoggedIn,
        redirectUrl,
        hideFromNav,
        showInNavOverride,
        customHtmlOnBlock,
        description,
        priority,
        isActive,
        createdBy: userId,
      },
    });

    // Clear cache for this route
    clearRestrictionCache(routePath);

    return NextResponse.json(restriction, { status: 201 });
  } catch (error) {
    logger.error('Error creating restriction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update restriction
export async function PUT(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const restriction = await prisma.pageRestriction.update({
      where: { id },
      data: updateData,
    });

    // Clear cache for this route
    clearRestrictionCache(restriction.routePath);

    return NextResponse.json(restriction);
  } catch (error) {
    logger.error('Error updating restriction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete restriction
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const restriction = await prisma.pageRestriction.delete({
      where: { id },
    });

    // Clear cache
    clearRestrictionCache(restriction.routePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting restriction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
