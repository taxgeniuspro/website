import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { hash } from 'bcryptjs';
import { customAlphabet } from 'nanoid';

// Generate random password
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 16);

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET: Get single preparer application (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or super_admin
    if (session.user.role !== 'admin' && session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const application = await prisma.preparerApplication.findUnique({
      where: { id },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    logger.error('Error fetching preparer application:', error);
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
  }
}

// PUT: Update preparer application (approve/reject)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or super_admin
    if (session.user.role !== 'admin' && session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, notes } = body;

    const application = await prisma.preparerApplication.findUnique({
      where: { id },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Check if user already exists with this email
      let profile = await prisma.profile.findFirst({
        where: { email: application.email.toLowerCase() },
      });

      if (profile) {
        // User exists, update their role to tax_preparer
        profile = await prisma.profile.update({
          where: { id: profile.id },
          data: {
            role: 'tax_preparer',
          },
        });

        logger.info('Existing user upgraded to tax_preparer', {
          profileId: profile.id,
          email: application.email,
          applicationId: application.id,
        });
      } else {
        // Create new user account with tax_preparer role
        const tempPassword = nanoid();
        const hashedPassword = await hash(tempPassword, 10);

        profile = await prisma.profile.create({
          data: {
            email: application.email.toLowerCase(),
            firstName: application.firstName,
            lastName: application.lastName,
            phone: application.phone,
            role: 'tax_preparer',
            password: hashedPassword,
            emailVerified: new Date(), // Auto-verify since admin approved
          },
        });

        logger.info('New tax_preparer profile created', {
          profileId: profile.id,
          email: application.email,
          applicationId: application.id,
        });

        // TODO: Send welcome email with temporary password or magic link
      }

      // Update application status to APPROVED
      const updatedApplication = await prisma.preparerApplication.update({
        where: { id },
        data: {
          status: 'APPROVED',
          notes: notes || application.notes,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Application approved successfully',
        application: updatedApplication,
        profile: {
          id: profile.id,
          email: profile.email,
          role: profile.role,
        },
      });
    } else if (action === 'reject') {
      // Update application status to REJECTED
      const updatedApplication = await prisma.preparerApplication.update({
        where: { id },
        data: {
          status: 'REJECTED',
          notes: notes || application.notes,
        },
      });

      logger.info('Preparer application rejected', {
        applicationId: id,
        email: application.email,
      });

      // TODO: Send rejection email to applicant

      return NextResponse.json({
        success: true,
        message: 'Application rejected',
        application: updatedApplication,
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error updating preparer application:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}

// DELETE: Delete preparer application (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super_admin
    if (session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super admin only' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.preparerApplication.delete({
      where: { id },
    });

    logger.info('Preparer application deleted', { applicationId: id });

    return NextResponse.json({
      success: true,
      message: 'Application deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting preparer application:', error);
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 });
  }
}
