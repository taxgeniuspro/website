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
import { db, firstOrNull } from '@/lib/db';
import { clearRestrictionCache } from '@/lib/content-restriction';
import { logger } from '@/lib/logger';

// TypeScript interface (replacing Prisma types)
interface PageRestriction {
  id: string;
  routePath: string;
  allowedRoles: string[];
  blockedRoles: string[];
  allowedUsernames: string[];
  blockedUsernames: string[];
  allowNonLoggedIn: boolean;
  redirectUrl?: string | null;
  hideFromNav: boolean;
  showInNavOverride: boolean;
  customHtmlOnBlock?: string | null;
  description?: string | null;
  priority: number;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// GET - List all restrictions
export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: restrictions, error } = await db
      .from('page_restrictions')
      .select('*')
      .order('priority', { ascending: false })
      .order('createdAt', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(restrictions || []);
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
    const { data: existingRestrictions } = await db
      .from('page_restrictions')
      .select('id')
      .eq('routePath', routePath)
      .limit(1);

    if (existingRestrictions && existingRestrictions.length > 0) {
      return NextResponse.json(
        { error: 'Restriction for this route already exists' },
        { status: 409 }
      );
    }

    const { data: restriction, error } = await db
      .from('page_restrictions')
      .insert({
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
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

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

    const { data: restriction, error } = await db
      .from('page_restrictions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!restriction) {
      return NextResponse.json({ error: 'Restriction not found' }, { status: 404 });
    }

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

    // First get the restriction to get the routePath for cache clearing
    const { data: restriction, error: fetchError } = await db
      .from('page_restrictions')
      .select('routePath')
      .eq('id', id)
      .single();

    if (fetchError || !restriction) {
      return NextResponse.json({ error: 'Restriction not found' }, { status: 404 });
    }

    const { error: deleteError } = await db
      .from('page_restrictions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    // Clear cache
    clearRestrictionCache(restriction.routePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting restriction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
