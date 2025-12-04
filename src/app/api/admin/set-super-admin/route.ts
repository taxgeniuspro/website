import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * API endpoint to set a user as SUPER_ADMIN
 * Restricted to support@taxgeniuspro.tax only
 */
export async function POST() {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email;

    // Only allow support@taxgeniuspro.tax to use this endpoint
    if (userEmail !== 'support@taxgeniuspro.tax') {
      return NextResponse.json(
        { error: 'Forbidden: Only support@taxgeniuspro.tax can use this endpoint' },
        { status: 403 }
      );
    }

    logger.info(`🔐 Setting ${userEmail} as SUPER_ADMIN...`);

    // Check if profile exists
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!existingProfile) {
      logger.info('Creating new SUPER_ADMIN profile...');
      await prisma.profile.create({
        data: {
          userId: user.id,
          role: 'super_admin',
          firstName: user.name?.split(' ')[0] || 'Super',
          lastName: user.name?.split(' ').slice(1).join(' ') || 'Admin',
        },
      });
    } else {
      logger.info(`Updating profile from ${existingProfile.role} to SUPER_ADMIN...`);
      await prisma.profile.update({
        where: { id: existingProfile.id },
        data: { role: 'super_admin' },
      });
    }

    logger.info('✅ SUPER_ADMIN role set successfully');

    return NextResponse.json({
      success: true,
      message: `Successfully set ${userEmail} as SUPER_ADMIN. Please sign out and sign back in for changes to take effect.`,
      userId: user.id,
      role: 'super_admin',
    });
  } catch (error) {
    logger.error('Error setting super admin:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
