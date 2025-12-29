/**
 * Reopen Lead API
 *
 * Reopens an UNQUALIFIED lead to work with them again.
 *
 * POST /api/tax-preparer/leads/:id/reopen
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

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
        { error: 'Forbidden: Only tax preparers and admins can reopen leads' },
        { status: 403 }
      );
    }

    const { id: leadId } = await params;
    const body = await req.json().catch(() => ({}));
    const { notes } = body as { notes?: string };

    // Fetch the lead
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select('id, first_name, last_name, assignedPreparerId, unqualified, unqualifiedReason')
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leads);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Can only reopen unqualified leads
    if (!lead.unqualified) {
      return NextResponse.json(
        { error: 'Lead is not unqualified. Only unqualified leads can be reopened.' },
        { status: 400 }
      );
    }

    // Tax preparers can only reopen their assigned leads
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

    // Reopen the lead
    await db
      .from('tax_intake_leads')
      .update({
        unqualified: false,
        // Keep the reason and notes for history, but clear the timestamp
        unqualifiedAt: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    // Create lead activity
    await db.from('lead_activities').insert({
      leadId,
      type: 'STATUS_CHANGED',
      description: `Lead REOPENED - Previously unqualified: ${lead.unqualifiedReason}`,
      metadata: {
        previousStatus: 'unqualified',
        newStatus: 'active',
        previousReason: lead.unqualifiedReason,
        reopenNotes: notes || null,
      },
    });

    logger.info('Lead reopened', {
      leadId,
      previousReason: lead.unqualifiedReason,
      leadName: `${lead.first_name} ${lead.last_name}`,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Lead reopened successfully',
      leadId,
    });
  } catch (error) {
    logger.error('Error reopening lead:', error);
    return NextResponse.json({ error: 'Failed to reopen lead' }, { status: 500 });
  }
}
