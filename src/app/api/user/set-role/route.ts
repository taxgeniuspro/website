import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

/**
 * POST /api/user/set-role
 * Allows authenticated users to set their own role (client only)
 *
 * Note: tax_preparer and affiliate roles require manual admin upgrade
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { role } = await request.json();

    // Validate role
    if (!role || typeof role !== 'string') {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }

    // Only allow users to set themselves as 'client'
    // tax_preparer and affiliate require admin upgrade
    if (role !== 'client') {
      return NextResponse.json(
        { error: 'Only client role can be self-selected. Contact an administrator for tax_preparer or affiliate access.' },
        { status: 403 }
      );
    }

    // Update user's profile with new role
    const profile = await prisma.profile.update({
      where: { userId: session.user.id },
      data: { role: role as UserRole },
    });

    return NextResponse.json({
      success: true,
      role: profile.role,
      message: 'Role updated successfully',
    });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    );
  }
}
