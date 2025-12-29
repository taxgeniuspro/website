import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local interfaces
interface PreparerApplication {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phone: string;
  languages: string[];
  smsConsent: boolean;
  status: string;
  createdAt: string;
}

// POST: Submit a new preparer application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, middleName, lastName, email, phone, languages, smsConsent } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !languages || !smsConsent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create the preparer application
    const { data: application, error: createError } = await db.from('preparer_applications')
      .insert({
        firstName,
        middleName: middleName || null,
        lastName,
        email,
        phone,
        languages,
        smsConsent: smsConsent === 'yes',
        status: 'PENDING',
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    logger.info('New preparer application submitted', {
      applicationId: application.id,
      email: application.email,
      languages: application.languages,
    });

    // TODO: Send notification email to admin
    // TODO: Send confirmation email to applicant

    return NextResponse.json(
      {
        success: true,
        application: {
          id: application.id,
          firstName: application.firstName,
          lastName: application.lastName,
          email: application.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating preparer application:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}

// GET: List all preparer applications (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin via session role
    const userRole = session.user.role as string;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Build query
    let query = db.from('preparer_applications')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('createdAt', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data: applications, count, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    const total = count || 0;

    return NextResponse.json({
      applications: applications || [],
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.error('Error fetching preparer applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
