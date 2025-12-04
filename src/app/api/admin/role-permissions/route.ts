/**
 * Role Permission Templates API
 *
 * Manages default permissions for each user role.
 * Only super_admin can access this API.
 *
 * GET    /api/admin/role-permissions - Get all role permission templates
 * PUT    /api/admin/role-permissions - Update a role's permission template
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { UserRole, UserPermissions, DEFAULT_PERMISSIONS } from '@/lib/permissions';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

// GET - Fetch all role permission templates
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super_admin can access
    const role = session?.user?.role;

    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super admin only' }, { status: 403 });
    }

    // Fetch all templates from database
    const templates = await prisma.rolePermissionTemplate.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // If no templates in DB, return defaults from code
    if (templates.length === 0) {
      const defaultTemplates = Object.entries(DEFAULT_PERMISSIONS).map(([role, permissions]) => ({
        id: `default_${role}`,
        role,
        permissions,
        updatedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      return NextResponse.json(defaultTemplates);
    }

    return NextResponse.json(templates);
  } catch (error) {
    logger.error('Error fetching role templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a role's permission template
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super_admin can access
    const role = session?.user?.role;

    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { targetRole, permissions, updateExistingUsers = true } = body;

    if (!targetRole || !permissions) {
      return NextResponse.json(
        { error: 'targetRole and permissions are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: UserRole[] = [
      'super_admin',
      'admin',
      'tax_preparer',
      'affiliate',
      'lead',
      'client',
    ];

    if (!validRoles.includes(targetRole as UserRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Upsert permission template in database
    const template = await prisma.rolePermissionTemplate.upsert({
      where: { role: targetRole },
      create: {
        role: targetRole,
        permissions: permissions as any,
        updatedBy: userId,
      },
      update: {
        permissions: permissions as any,
        updatedBy: userId,
        updatedAt: new Date(),
      },
    });

    // If requested, update all existing users with this role
    if (updateExistingUsers) {
      try {
        // Get all users with this role from Clerk
        const users = await clerk.users.getUserList({
          limit: 500, // Max limit
        });

        // Filter users by role
        const usersWithRole = users.data.filter((u) => {
          const userRole = u.publicMetadata?.role as string | undefined;
          return userRole === targetRole;
        });

        // Update each user's permissions
        const updatePromises = usersWithRole.map((u) =>
          clerk.users.updateUserMetadata(u.id, {
            publicMetadata: {
              ...u.publicMetadata,
              permissions: permissions,
            },
          })
        );

        await Promise.all(updatePromises);

        return NextResponse.json({
          success: true,
          template,
          usersUpdated: usersWithRole.length,
          message: `Successfully updated permissions for ${usersWithRole.length} ${targetRole} users`,
        });
      } catch (clerkError: any) {
        // Handle Clerk rate limiting gracefully
        if (clerkError?.status === 429 || clerkError?.errors?.[0]?.code === 'rate_limit_exceeded') {
          logger.warn('⚠️  Clerk rate limit hit - template saved but user updates skipped');
          return NextResponse.json(
            {
              success: true,
              template,
              usersUpdated: 0,
              warning:
                'Template saved successfully. User updates will be applied when they next log in.',
            },
            { status: 200 }
          );
        }

        logger.error('Error updating users in Clerk:', clerkError);
        // Template updated but user update failed
        return NextResponse.json(
          {
            success: true,
            template,
            usersUpdated: 0,
            warning:
              'Template updated but failed to update some users. Changes will apply on next login.',
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      template,
      usersUpdated: 0,
    });
  } catch (error) {
    logger.error('Error updating role template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
