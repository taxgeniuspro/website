import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { convertLeadToClient } from '@/lib/services/lead-conversion.service';

/**
 * POST /api/tax-preparer/leads/:id/convert
 * Manually converts a qualified lead to a client
 *
 * Flow:
 * 1. If lead has already signed up (has profileId) → Use existing conversion service
 * 2. If lead hasn't signed up yet → Send invitation email and mark as ready to convert
 *
 * For now, we'll focus on case #1 (lead has signed up)
 * Case #2 requires email invitation setup (future enhancement)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.role as string;
    const isAdmin = role === 'admin' || role === 'super_admin';
    const isTaxPreparer = role === 'tax_preparer';

    if (!isAdmin && !isTaxPreparer) {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers and admins can convert leads' },
        { status: 403 }
      );
    }

    const { id: leadId } = await params;

    // Fetch the lead with profile relation
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: leadId },
      include: {
        profile: {
          select: {
            id: true,
            userId: true,
            role: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Check if already converted
    if (lead.convertedToClient) {
      return NextResponse.json(
        {
          error: 'Lead has already been converted to a client',
          profileId: lead.profileId,
        },
        { status: 400 }
      );
    }

    // Tax preparers can only convert their assigned leads
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

    // Case 1: Lead has already signed up (has userId in profile)
    if (lead.profile && lead.profile.userId) {
      logger.info(`Lead ${leadId} has Clerk account, using automatic conversion service`);

      const conversionResult = await convertLeadToClient(leadId, lead.profile.userId);

      if (!conversionResult.success) {
        return NextResponse.json(
          { error: conversionResult.error || 'Failed to convert lead' },
          { status: 500 }
        );
      }

      // Update profile role to CLIENT if not already
      if (lead.profile.role !== 'CLIENT') {
        await prisma.profile.update({
          where: { id: lead.profile.id },
          data: { role: 'client' },
        });

        logger.info(`Updated profile ${lead.profile.id} role from ${lead.profile.role} to CLIENT`);
      }

      logger.info(
        `✅ Lead ${leadId} converted to client by ${isTaxPreparer ? 'preparer' : 'admin'} ${user.id}`
      );

      return NextResponse.json({
        success: true,
        message: 'Lead successfully converted to client',
        profileId: conversionResult.profileId,
        taxReturnId: conversionResult.taxReturnId,
      });
    }

    // Case 2: Lead hasn't signed up yet
    // For now, we'll mark them as "ready to convert" and require admin to send invitation
    // TODO: Implement automatic email invitation with Clerk
    logger.info(`Lead ${leadId} has not signed up yet, marking as ready to convert`);

    await prisma.taxIntakeLead.update({
      where: { id: leadId },
      data: {
        contactNotes: lead.contactNotes
          ? `${lead.contactNotes}\n\n[${new Date().toISOString()}] Marked as ready to convert - awaiting signup`
          : `[${new Date().toISOString()}] Marked as ready to convert - awaiting signup`,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: false,
      requiresSignup: true,
      message:
        'This lead has not created an account yet. Please send them a signup invitation email first.',
      leadEmail: lead.email,
      leadName: `${lead.first_name} ${lead.last_name}`,
    });
  } catch (error) {
    logger.error('Error converting lead to client:', error);
    return NextResponse.json(
      { error: 'Failed to convert lead to client' },
      { status: 500 }
    );
  }
}
