import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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
    const application = await prisma.preparerApplication.create({
      data: {
        firstName,
        middleName: middleName || null,
        lastName,
        email,
        phone,
        languages,
        smsConsent: smsConsent === 'yes',
        status: 'PENDING',
      },
    });

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

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where = status ? { status } : {};

    const [applications, total] = await Promise.all([
      prisma.preparerApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      prisma.preparerApplication.count({ where }),
    ]);

    return NextResponse.json({
      applications,
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
