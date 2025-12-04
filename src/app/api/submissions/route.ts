import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// POST /api/submissions - Save tax form submission
export async function POST(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get current tax year
    const currentYear = new Date().getFullYear();
    const taxYear = currentYear - 1; // Previous year's taxes

    // Check if tax return already exists for this year
    let taxReturn = await prisma.taxReturn.findUnique({
      where: {
        profileId_taxYear: {
          profileId: profile.id,
          taxYear,
        },
      },
    });

    if (taxReturn) {
      // Update existing tax return
      taxReturn = await prisma.taxReturn.update({
        where: { id: taxReturn.id },
        data: {
          formData: body,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new tax return
      taxReturn = await prisma.taxReturn.create({
        data: {
          profileId: profile.id,
          taxYear,
          status: 'DRAFT',
          formData: body,
        },
      });
    }

    return NextResponse.json({ success: true, taxReturnId: taxReturn.id });
  } catch (error) {
    logger.error('Error saving tax form submission:', error);
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
  }
}

// GET /api/submissions - Get latest tax form submission
export async function GET(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get current tax year
    const currentYear = new Date().getFullYear();
    const taxYear = currentYear - 1;

    // Get tax return for this year
    const taxReturn = await prisma.taxReturn.findUnique({
      where: {
        profileId_taxYear: {
          profileId: profile.id,
          taxYear,
        },
      },
    });

    if (!taxReturn) {
      return NextResponse.json({ formData: null });
    }

    return NextResponse.json({ formData: taxReturn.formData });
  } catch (error) {
    logger.error('Error fetching tax form submission:', error);
    return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 });
  }
}
