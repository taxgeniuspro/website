import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getCreativeById, scheduleCreative } from '@/lib/services/creative.service';

/**
 * POST /api/admin/creatives/[id]/schedule
 * Schedule a creative with start and end dates (admin only)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { startDate, endDate } = body;

    // Check if creative exists
    const existingCreative = await getCreativeById(id);

    if (!existingCreative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    // Validate dates
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        return NextResponse.json(
          { error: 'Start date must be before end date' },
          { status: 400 }
        );
      }
    }

    // Schedule creative
    const creative = await scheduleCreative(
      id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    logger.info('Creative scheduled', {
      creativeId: creative.id,
      startDate: creative.startDate,
      endDate: creative.endDate,
      status: creative.status,
    });

    return NextResponse.json(creative);
  } catch (error) {
    logger.error('Failed to schedule creative', error);
    return NextResponse.json({ error: 'Failed to schedule creative' }, { status: 500 });
  }
}
