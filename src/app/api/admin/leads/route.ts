/**
 * Admin Leads API
 * GET: List all leads with pagination and filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local interface
interface CRMContact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  contactType: string;
  stage: string;
  source: string | null;
  assignedPreparerId: string | null;
  referrerUsername: string | null;
  referrerType: string | null;
  leadScore: number | null;
  createdAt: string;
  updatedAt: string;
  lastContactedAt: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const currentUser = session?.user;

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = currentUser?.role as string;
    const isAdmin = role === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const stage = searchParams.get('stage') || '';
    const contactType = searchParams.get('contactType') || '';
    const preparerId = searchParams.get('preparerId') || '';

    // Build query
    let query = db.from('crm_contacts')
      .select('id, firstName, lastName, email, phone, contactType, stage, source, assignedPreparerId, referrerUsername, referrerType, leadScore, createdAt, updatedAt, lastContactedAt', { count: 'exact' });

    if (search) {
      query = query.or(`email.ilike.%${search}%,firstName.ilike.%${search}%,lastName.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    if (stage) {
      query = query.eq('stage', stage);
    }

    if (contactType) {
      query = query.eq('contactType', contactType);
    }

    if (preparerId) {
      query = query.eq('assignedPreparerId', preparerId);
    }

    const { data: leads, error, count } = await query
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      throw error;
    }

    const total = count || 0;

    // Format response
    const formattedLeads = (leads || []).map((lead: CRMContact) => ({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      contactType: lead.contactType,
      stage: lead.stage,
      source: lead.source,
      assignedPreparerId: lead.assignedPreparerId,
      referrerUsername: lead.referrerUsername,
      referrerType: lead.referrerType,
      leadScore: lead.leadScore,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      lastContactedAt: lead.lastContactedAt,
    }));

    return NextResponse.json({
      success: true,
      leads: formattedLeads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    logger.error('Error fetching leads:', {
      error: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
