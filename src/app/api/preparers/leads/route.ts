import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/preparers/leads
 * Fetches leads (CRM contacts) from the TaxIntakeLead table
 * Note: Leads are CRM contacts, NOT users with a 'lead' role
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profileData } = await db
      .from('profiles')
      .select('id, role')
      .eq('userId', user.id)
      .limit(1);

    const profile = firstOrNull(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only tax preparers and admins can access leads
    if (profile.role !== 'tax_preparer' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers and admins can access this endpoint' },
        { status: 403 }
      );
    }

    // Build query - tax preparers see only their assigned leads, admins see all
    let query = db
      .from('tax_intake_leads')
      .select('id, first_name, last_name, email, phone, referrerUsername, referrerType, convertedToClient, created_at, updated_at')
      .eq('convertedToClient', false)
      .order('created_at', { ascending: false });

    if (profile.role === 'tax_preparer') {
      query = query.eq('assignedPreparerId', profile.id);
    }

    const { data: taxIntakeLeads } = await query;

    // Format response
    const leads = (taxIntakeLeads || []).map((lead: any) => ({
      id: lead.id,
      email: lead.email || '',
      firstName: lead.first_name || '',
      lastName: lead.last_name || '',
      phone: lead.phone || '',
      referrerUsername: lead.referrerUsername,
      referrerType: lead.referrerType,
      status: lead.convertedToClient ? 'converted' : 'new',
      createdAt: lead.created_at,
    }));

    return NextResponse.json({
      success: true,
      leads,
      totalLeads: leads.length,
    });
  } catch (error) {
    logger.error('Error fetching preparer leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

/**
 * PATCH /api/preparers/leads
 * Converts a lead to a client (marks as converted in CRM)
 *
 * Body: { leadId: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profileData } = await db
      .from('profiles')
      .select('id, role')
      .eq('userId', user.id)
      .limit(1);

    const profile = firstOrNull(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role !== 'tax_preparer' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers and admins can convert leads' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
    }

    // Find the lead
    const { data: leadData } = await db
      .from('tax_intake_leads')
      .select('*')
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leadData);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.convertedToClient) {
      return NextResponse.json({ error: 'Lead already converted' }, { status: 400 });
    }

    // Mark lead as converted
    const { data: updatedLeadData } = await db
      .from('tax_intake_leads')
      .update({
        convertedToClient: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .select()
      .single();

    const updatedLead = updatedLeadData;

    logger.info(
      `🔄 Lead converted: ${leadId} marked as converted by ${user.id} (${profile.role})`
    );

    return NextResponse.json({
      success: true,
      message: 'Lead marked as converted',
      lead: {
        id: updatedLead.id,
        firstName: updatedLead.first_name,
        lastName: updatedLead.last_name,
        convertedToClient: true,
      },
    });
  } catch (error) {
    logger.error('Error converting lead:', error);
    return NextResponse.json({ error: 'Failed to convert lead' }, { status: 500 });
  }
}
