/**
 * Unqualify Lead API
 *
 * Marks a lead as UNQUALIFIED when we cannot help them.
 * Reasons: wrong_state, no_income, already_filed, unresponsive, other
 *
 * POST /api/tax-preparer/leads/:id/unqualify
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const VALID_REASONS = [
  'wrong_state',      // We don't service their state
  'no_income',        // No taxable income to file
  'already_filed',    // Already filed elsewhere
  'unresponsive',     // No response after multiple attempts
  'not_interested',   // Lead declined services
  'other',            // Other reason (requires notes)
] as const;

type UnqualifyReason = typeof VALID_REASONS[number];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.role as string;
    const isAdmin = role === 'admin';
    const isTaxPreparer = role === 'tax_preparer';

    if (!isAdmin && !isTaxPreparer) {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers and admins can unqualify leads' },
        { status: 403 }
      );
    }

    const { id: leadId } = await params;
    const body = await req.json();
    const { reason, notes } = body as { reason: string; notes?: string };

    // Validate reason
    if (!reason || !VALID_REASONS.includes(reason as UnqualifyReason)) {
      return NextResponse.json(
        { error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Require notes for "other" reason
    if (reason === 'other' && !notes) {
      return NextResponse.json(
        { error: 'Notes are required when reason is "other"' },
        { status: 400 }
      );
    }

    // Fetch the lead
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        assignedPreparerId: true,
        convertedToClient: true,
        unqualified: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Cannot unqualify already converted clients
    if (lead.convertedToClient) {
      return NextResponse.json(
        { error: 'Cannot unqualify a lead that has already been converted to a client' },
        { status: 400 }
      );
    }

    // Cannot unqualify already unqualified leads
    if (lead.unqualified) {
      return NextResponse.json(
        { error: 'Lead is already marked as unqualified' },
        { status: 400 }
      );
    }

    // Tax preparers can only unqualify their assigned leads
    if (isTaxPreparer) {
      const preparerProfile = await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!preparerProfile) {
        return NextResponse.json(
          { error: 'Tax preparer profile not found' },
          { status: 404 }
        );
      }

      if (lead.assignedPreparerId !== preparerProfile.id) {
        return NextResponse.json(
          { error: 'Forbidden: This lead is not assigned to you' },
          { status: 403 }
        );
      }
    }

    // Update lead as unqualified
    const updatedLead = await prisma.taxIntakeLead.update({
      where: { id: leadId },
      data: {
        unqualified: true,
        unqualifiedReason: reason,
        unqualifiedAt: new Date(),
        unqualifiedNotes: notes || null,
        updated_at: new Date(),
      },
    });

    // Create lead activity
    await prisma.leadActivity.create({
      data: {
        leadId,
        activityType: 'STATUS_CHANGED',
        title: `Lead marked as UNQUALIFIED`,
        description: `Reason: ${reason}${notes ? ` - ${notes}` : ''}`,
        metadata: {
          previousStatus: 'active',
          newStatus: 'unqualified',
          reason,
          notes: notes || null,
        },
      },
    });

    logger.info('Lead marked as unqualified', {
      leadId,
      reason,
      leadName: `${lead.first_name} ${lead.last_name}`,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Lead marked as unqualified',
      leadId,
      reason,
    });
  } catch (error) {
    logger.error('Error marking lead as unqualified:', error);
    return NextResponse.json(
      { error: 'Failed to mark lead as unqualified' },
      { status: 500 }
    );
  }
}
