import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
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
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select(
        `
        *,
        profile:profiles!profileId (
          id,
          userId,
          role,
          firstName,
          lastName
        )
      `
      )
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leads);

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
      const { data: profiles } = await db
        .from('profiles')
        .select('id')
        .eq('userId', user.id)
        .limit(1);

      const preparerProfile = firstOrNull(profiles);

      if (!preparerProfile) {
        return NextResponse.json({ error: 'Tax preparer profile not found' }, { status: 404 });
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
    const profileData = lead.profile as { id: string; userId: string; role: string } | null;

    if (profileData && profileData.userId) {
      // Lead has signed up - proceed with conversion
      logger.info(`Lead ${leadId} has account, converting to ${conversionType}`);

      let conversionResult;

      if (conversionType === 'affiliate') {
        conversionResult = await convertLeadToAffiliateClient(leadId, profileData.userId);
      } else {
        conversionResult = await convertLeadToClient(leadId, profileData.userId);
      }

      if (!conversionResult.success) {
        return NextResponse.json(
          { error: conversionResult.error || 'Failed to convert lead' },
          { status: 500 }
        );
      }

      // Update profile role to CLIENT if not already
      if (profileData.role !== 'client') {
        await db.from('profiles').update({ role: 'client' }).eq('id', profileData.id);
        logger.info(`Updated profile ${profileData.id} role to client`);
      }

      logger.info(
        `Lead ${leadId} converted to ${conversionType} by ${isTaxPreparer ? 'preparer' : 'admin'} ${user.id}`
      );

      return NextResponse.json({
        success: true,
        conversionType,
        message:
          conversionType === 'affiliate'
            ? 'Lead converted to affiliate client with referral benefits!'
            : 'Lead successfully converted to client',
        profileId: conversionResult.profileId,
        taxReturnId: conversionResult.taxReturnId,
      });
    }

    // Lead hasn't signed up yet - mark as ready to convert
    logger.info(
      `Lead ${leadId} has not signed up yet, marking as ready to convert to ${conversionType}`
    );

    const updatedNotes = lead.contactNotes
      ? `${lead.contactNotes}\n\n[${new Date().toISOString()}] Marked as ready to convert to ${conversionType} - awaiting signup`
      : `[${new Date().toISOString()}] Marked as ready to convert to ${conversionType} - awaiting signup`;

    await db
      .from('tax_intake_leads')
      .update({
        contactNotes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

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
    return NextResponse.json({ error: 'Failed to convert lead' }, { status: 500 });
  }
}
