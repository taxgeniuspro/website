/**
 * Terminate Tax Preparer API
 *
 * POST /api/admin/preparers/[id]/terminate
 *
 * Terminates a tax preparer:
 * - Reassigns all their clients to Owliver Owl
 * - Reassigns all their leads to Owliver Owl
 * - Deletes their profile and associated data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { terminatePreparer } from '@/lib/services/preparer-termination.service';

// Local interfaces
interface Profile {
  role: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: preparerId } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminProfileData, error: adminProfileError } = await db.from('profiles')
      .select('role')
      .eq('userId', session.user.id)
      .limit(1);

    if (adminProfileError) {
      throw adminProfileError;
    }

    const adminProfile = firstOrNull<Profile>(adminProfileData);

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Get confirmation from request body
    const body = await req.json().catch(() => ({}));
    const { confirm } = body;

    if (confirm !== true) {
      return NextResponse.json(
        { error: 'Confirmation required. Send { "confirm": true } in request body.' },
        { status: 400 }
      );
    }

    // Perform termination
    const result = await terminatePreparer(preparerId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, preparerName: result.preparerName },
        { status: 400 }
      );
    }

    logger.info('Admin terminated preparer', {
      adminId: session.user.id,
      preparerId,
      preparerName: result.preparerName,
      clientsReassigned: result.clientsReassigned,
      leadsReassigned: result.leadsReassigned,
    });

    return NextResponse.json({
      success: true,
      message: `${result.preparerName} has been terminated`,
      preparerName: result.preparerName,
      clientsReassigned: result.clientsReassigned,
      leadsReassigned: result.leadsReassigned,
      reassignedTo: 'Owliver Owl (Tax Genius)',
    });
  } catch (error) {
    logger.error('Error in terminate preparer endpoint', { error });
    return NextResponse.json(
      { error: 'Failed to terminate preparer' },
      { status: 500 }
    );
  }
}
