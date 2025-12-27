/**
 * Admin Leads API
 * GET: List all leads with pagination and filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (stage) {
      where.stage = stage;
    }

    if (contactType) {
      where.contactType = contactType;
    }

    if (preparerId) {
      where.assignedPreparerId = preparerId;
    }

    // Fetch leads
    const [leads, total] = await Promise.all([
      prisma.cRMContact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          contactType: true,
          stage: true,
          source: true,
          assignedPreparerId: true,
          referrerUsername: true,
          referrerType: true,
          leadScore: true,
          createdAt: true,
          updatedAt: true,
          lastContactedAt: true,
        },
      }),
      prisma.cRMContact.count({ where }),
    ]);

    // Format response
    const formattedLeads = leads.map((lead) => ({
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
