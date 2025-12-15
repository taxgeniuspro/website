import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  convertLeadToClient,
  convertLeadToAffiliateClient,
} from '@/lib/services/lead-conversion.service';

type ConversionType = 'client' | 'affiliate';

/**
 * POST /api/tax-preparer/leads/:id/convert
 * Converts a tax intake lead to a client:
 * - client: Standard client who gets taxes prepared (regular pricing)
 * - affiliate: Client with affiliate status, special pricing, and referral links
 *
 * Note: Tax preparer applications are handled separately via /admin/applications/preparers
 *
 * Request body:
 * {
 *   conversionType: 'client' | 'affiliate',
 *   notes?: string
 * }
 */
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
        { error: 'Forbidden: Only tax preparers and admins can convert leads' },
        { status: 403 }
      );
    }

    const { id: leadId } = await params;

    // Parse request body
    let conversionType: ConversionType = 'client';
    let notes: string | undefined;

    try {
      const body = await req.json();
      conversionType = body.conversionType || 'client';
      notes = body.notes;
    } catch {
      // If no body, default to client conversion (backwards compatible)
    }

    // Validate conversion type
    if (!['client', 'affiliate'].includes(conversionType)) {
      return NextResponse.json(
        { error: 'Invalid conversionType. Must be: client or affiliate' },
        { status: 400 }
      );
    }

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

    // Handle CLIENT or AFFILIATE conversion
    // These require the lead to have signed up first

    if (lead.profile && lead.profile.userId) {
      // Lead has signed up - proceed with conversion
      logger.info(`Lead ${leadId} has account, converting to ${conversionType}`);

      let conversionResult;

      if (conversionType === 'affiliate') {
        conversionResult = await convertLeadToAffiliateClient(leadId, lead.profile.userId);
      } else {
        conversionResult = await convertLeadToClient(leadId, lead.profile.userId);
      }

      if (!conversionResult.success) {
        return NextResponse.json(
          { error: conversionResult.error || 'Failed to convert lead' },
          { status: 500 }
        );
      }

      // Update profile role to CLIENT if not already
      if (lead.profile.role !== 'client') {
        await prisma.profile.update({
          where: { id: lead.profile.id },
          data: { role: 'client' },
        });
        logger.info(`Updated profile ${lead.profile.id} role to client`);
      }

      logger.info(
        `✅ Lead ${leadId} converted to ${conversionType} by ${isTaxPreparer ? 'preparer' : 'admin'} ${user.id}`
      );

      return NextResponse.json({
        success: true,
        conversionType,
        message: conversionType === 'affiliate'
          ? 'Lead converted to affiliate client with referral benefits!'
          : 'Lead successfully converted to client',
        profileId: conversionResult.profileId,
        taxReturnId: conversionResult.taxReturnId,
      });
    }

    // Lead hasn't signed up yet - mark as ready to convert
    logger.info(`Lead ${leadId} has not signed up yet, marking as ready to convert to ${conversionType}`);

    await prisma.taxIntakeLead.update({
      where: { id: leadId },
      data: {
        contactNotes: lead.contactNotes
          ? `${lead.contactNotes}\n\n[${new Date().toISOString()}] Marked as ready to convert to ${conversionType} - awaiting signup`
          : `[${new Date().toISOString()}] Marked as ready to convert to ${conversionType} - awaiting signup`,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: false,
      requiresSignup: true,
      conversionType,
      message: `This lead has not created an account yet. Please send them a signup invitation email first. They will be converted to ${conversionType === 'affiliate' ? 'an affiliate client' : 'a client'} after signing up.`,
      leadEmail: lead.email,
      leadName: `${lead.first_name} ${lead.last_name}`,
    });
  } catch (error) {
    logger.error('Error converting lead:', error);
    return NextResponse.json(
      { error: 'Failed to convert lead' },
      { status: 500 }
    );
  }
}
