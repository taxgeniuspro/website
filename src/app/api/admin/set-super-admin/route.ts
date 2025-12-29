import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local interfaces
interface Profile {
  id: string;
  role: string;
}

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

    logger.info(`Setting ${userEmail} as SUPER_ADMIN...`);

    // Check if profile exists
    const { data: existingProfileData } = await db.from('profiles')
      .select('id, role')
      .eq('userId', user.id)
      .limit(1);

    const existingProfile = firstOrNull<Profile>(existingProfileData);

    if (!existingProfile) {
      logger.info('Creating new SUPER_ADMIN profile...');
      await db.from('profiles')
        .insert({
          userId: user.id,
          role: 'admin',
          firstName: user.name?.split(' ')[0] || 'Super',
          lastName: user.name?.split(' ').slice(1).join(' ') || 'Admin',
        });
    } else {
      logger.info(`Updating profile from ${existingProfile.role} to SUPER_ADMIN...`);
      await db.from('profiles')
        .update({ role: 'admin' })
        .eq('id', existingProfile.id);
    }

    logger.info('SUPER_ADMIN role set successfully');

    return NextResponse.json({
      success: true,
      message: `Successfully set ${userEmail} as SUPER_ADMIN. Please sign out and sign back in for changes to take effect.`,
      userId: user.id,
      role: 'admin',
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
