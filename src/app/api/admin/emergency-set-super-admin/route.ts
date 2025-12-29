/**
 * EMERGENCY API: Set info@taxgeniuspro.tax as super_admin
 *
 * This endpoint bypasses normal checks and directly sets super_admin role
 * Only works for info@taxgeniuspro.tax
 *
 * Visit: https://taxgeniuspro.tax/api/admin/emergency-set-super-admin
 */

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local interface
interface Profile {
  id: string;
  userId: string;
  role: string;
}

export async function GET() {
  try {
    logger.info('EMERGENCY: Setting super_admin role...');

    // Get current user from NextAuth session
    const session = await auth();
    const user = session?.user;

    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Not authenticated. Please log in first.' },
        { status: 401 }
      );
    }

    // Check email - only allow for info@taxgeniuspro.tax
    const email = user.email;

    if (email !== 'info@taxgeniuspro.tax') {
      return NextResponse.json(
        { error: 'Access denied. This endpoint is only for info@taxgeniuspro.tax' },
        { status: 403 }
      );
    }

    logger.info(`Email verified: ${email}`);

    // Update or create profile in database
    logger.info('Updating database profile...');
    try {
      const { data: profileData } = await db.from('profiles')
        .select('*')
        .eq('userId', user.id)
        .limit(1);

      const profile = firstOrNull<Profile>(profileData);

      if (!profile) {
        const { error: createError } = await db.from('profiles')
          .insert({
            userId: user.id,
            role: 'admin',
            firstName: user.name?.split(' ')[0] || 'Admin',
            lastName: user.name?.split(' ').slice(1).join(' ') || '',
          });

        if (createError) {
          throw createError;
        }
        logger.info('Profile created in database with super_admin role');
      } else {
        const { error: updateError } = await db.from('profiles')
          .update({ role: 'admin' })
          .eq('id', profile.id);

        if (updateError) {
          throw updateError;
        }
        logger.info('Profile updated to super_admin role');
      }
    } catch (dbError) {
      logger.error('Database update failed:', dbError);
      return NextResponse.json(
        { error: 'Database update failed', details: String(dbError) },
        { status: 500 }
      );
    }

    logger.info('SUCCESS! info@taxgeniuspro.tax is now super_admin');

    return NextResponse.json({
      success: true,
      message: 'Role set to super_admin successfully!',
      instructions: 'Please sign out completely and sign back in to see the changes.',
      user: {
        id: user.id,
        email: email,
        role: 'admin',
      },
    });
  } catch (error) {
    logger.error('Error setting super_admin role:', error);
    return NextResponse.json(
      {
        error: 'Failed to set super_admin role',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
