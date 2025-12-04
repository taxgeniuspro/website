/**
 * EMERGENCY API: Set info@taxgeniuspro.tax as super_admin
 *
 * This endpoint bypasses normal checks and directly sets super_admin role
 * Only works for info@taxgeniuspro.tax
 *
 * Visit: https://taxgeniuspro.tax/api/admin/emergency-set-super-admin
 */

import { auth } from '@/lib/auth';
// Clerk client removed - using NextAuth;
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    logger.info('🚨 EMERGENCY: Setting super_admin role...');

    // Get current user
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated. Please log in first.' },
        { status: 401 }
      );
    }

    // Check email
    const email = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress;

    if (email !== 'info@taxgeniuspro.tax') {
      return NextResponse.json(
        { error: 'Access denied. This endpoint is only for info@taxgeniuspro.tax' },
        { status: 403 }
      );
    }

    logger.info(`✅ Email verified: ${email}`);

    // Update Clerk metadata
    logger.info('📝 Updating Clerk metadata...');
    await clerk.users.updateUserMetadata(user.id, {
      publicMetadata: {
        role: 'super_admin',
      },
    });
    logger.info('✅ Clerk metadata updated to super_admin');

    // Update or create profile in database
    logger.info('📝 Updating database profile...');
    try {
      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        await prisma.profile.create({
          data: {
            userId: user.id,
            role: 'super_admin',
            email: email,
            firstName: user.firstName || 'Irad',
            lastName: user.lastName || 'Watkins',
          },
        });
        logger.info('✅ Profile created in database with SUPER_ADMIN role');
      } else {
        await prisma.profile.update({
          where: { id: profile.id },
          data: { role: 'super_admin' },
        });
        logger.info('✅ Profile updated to SUPER_ADMIN role');
      }
    } catch (dbError) {
      logger.error('⚠️  Database update failed (non-critical):', dbError);
    }

    logger.info('🎉 SUCCESS! info@taxgeniuspro.tax is now super_admin');

    return NextResponse.json({
      success: true,
      message: 'Role set to super_admin successfully!',
      instructions: 'Please sign out completely and sign back in to see the changes.',
      user: {
        id: user.id,
        email: email,
        role: 'super_admin',
      },
    });
  } catch (error) {
    logger.error('❌ Error setting super_admin role:', error);
    return NextResponse.json(
      {
        error: 'Failed to set super_admin role',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
