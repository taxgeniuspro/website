import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/submissions/save
 * Saves client tax questionnaire data (auto-save on form changes)
 *
 * Epic 3, Story 3.1: Client Document Submission Questionnaire
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const profile = await prisma.profile.findFirst({
      where: {
        user: { email: user.emailAddresses[0]?.emailAddress },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only clients can submit
    if (profile.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Only clients can submit tax returns' }, { status: 403 });
    }

    const body = await req.json();
    const { taxYear, formData, status } = body;

    if (!taxYear || !formData) {
      return NextResponse.json(
        { error: 'Missing required fields: taxYear, formData' },
        { status: 400 }
      );
    }

    // Find or create tax return for this year
    const existingReturn = await prisma.taxReturn.findUnique({
      where: {
        profileId_taxYear: {
          profileId: profile.id,
          taxYear: parseInt(taxYear),
        },
      },
    });

    let taxReturn;

    if (existingReturn) {
      // Update existing draft
      taxReturn = await prisma.taxReturn.update({
        where: { id: existingReturn.id },
        data: {
          formData,
          status: status || 'DRAFT',
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new draft
      taxReturn = await prisma.taxReturn.create({
        data: {
          profileId: profile.id,
          taxYear: parseInt(taxYear),
          formData,
          status: status || 'DRAFT',
        },
      });
    }

    return NextResponse.json({
      success: true,
      taxReturn: {
        id: taxReturn.id,
        taxYear: taxReturn.taxYear,
        status: taxReturn.status,
        updatedAt: taxReturn.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error saving tax submission:', error);
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
  }
}

/**
 * GET /api/submissions/save?taxYear=2024
 * Retrieves saved tax questionnaire data for a specific year
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const taxYear = searchParams.get('taxYear');

    if (!taxYear) {
      return NextResponse.json({ error: 'Missing taxYear parameter' }, { status: 400 });
    }

    // Get user profile
    const profile = await prisma.profile.findFirst({
      where: {
        user: { email: user.emailAddresses[0]?.emailAddress },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get tax return for this year
    const taxReturn = await prisma.taxReturn.findUnique({
      where: {
        profileId_taxYear: {
          profileId: profile.id,
          taxYear: parseInt(taxYear),
        },
      },
      include: {
        documents: true,
      },
    });

    if (!taxReturn) {
      return NextResponse.json({
        success: true,
        taxReturn: null,
      });
    }

    return NextResponse.json({
      success: true,
      taxReturn: {
        id: taxReturn.id,
        taxYear: taxReturn.taxYear,
        status: taxReturn.status,
        formData: taxReturn.formData,
        documents: taxReturn.documents,
        createdAt: taxReturn.createdAt,
        updatedAt: taxReturn.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error fetching tax submission:', error);
    return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 });
  }
}
