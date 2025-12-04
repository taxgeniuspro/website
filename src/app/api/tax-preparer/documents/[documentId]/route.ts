import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * PATCH /api/tax-preparer/documents/[documentId]
 * Update document status, review notes
 * Only for assigned clients
 */
export async function PATCH(req: NextRequest, { params }: { params: { documentId: string } }) {
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

    // Check if user is a tax preparer or admin
    const role = profile.role;
    if (role !== 'TAX_PREPARER' && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. This endpoint is for tax preparers only.' },
        { status: 403 }
      );
    }

    const { documentId } = params;

    // Get the document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        profileId: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if preparer has access to this client's documents
    if (role === 'TAX_PREPARER') {
      const hasAccess = await prisma.clientPreparer.findFirst({
        where: {
          clientId: document.profileId,
          preparerId: profile.id,
          isActive: true,
        },
      });

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied. You are not assigned to this client.' },
          { status: 403 }
        );
      }
    }

    // Parse request body
    const body = await req.json();
    const { status, reviewNotes } = body;

    // Validate status if provided
    const validStatuses = ['PENDING', 'REVIEWED', 'APPROVED', 'REJECTED', 'PROCESSING'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    // Update document
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        ...(status && { status }),
        ...(reviewNotes !== undefined && { reviewNotes }),
        ...(status && {
          reviewedBy: profile.id,
          reviewedAt: new Date(),
        }),
      },
      include: {
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      document: updatedDocument,
    });
  } catch (error) {
    logger.error('Error updating document:', error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

/**
 * DELETE /api/tax-preparer/documents/[documentId]
 * Delete a document (only for assigned clients)
 */
export async function DELETE(req: NextRequest, { params }: { params: { documentId: string } }) {
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

    // Check if user is a tax preparer or admin
    const role = profile.role;
    if (role !== 'TAX_PREPARER' && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. This endpoint is for tax preparers only.' },
        { status: 403 }
      );
    }

    const { documentId } = params;

    // Get the document with full info
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if preparer has access to this client's documents
    if (role === 'TAX_PREPARER') {
      const hasAccess = await prisma.clientPreparer.findFirst({
        where: {
          clientId: document.profileId,
          preparerId: profile.id,
          isActive: true,
        },
      });

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied. You are not assigned to this client.' },
          { status: 403 }
        );
      }
    }

    // Delete file from filesystem
    const filePath = join(process.cwd(), document.fileUrl);
    if (existsSync(filePath)) {
      try {
        await unlink(filePath);
        logger.info(`Deleted file: ${filePath}`);
      } catch (error) {
        logger.error('Error deleting file from filesystem:', error);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete document from database
    await prisma.document.delete({
      where: { id: documentId },
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}

/**
 * GET /api/tax-preparer/documents/[documentId]
 * Get a specific document (for assigned clients only)
 */
export async function GET(req: NextRequest, { params }: { params: { documentId: string } }) {
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

    // Check if user is a tax preparer or admin
    const role = profile.role;
    if (role !== 'TAX_PREPARER' && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. This endpoint is for tax preparers only.' },
        { status: 403 }
      );
    }

    const { documentId } = params;

    // Get the document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if preparer has access to this client's documents
    if (role === 'TAX_PREPARER') {
      const hasAccess = await prisma.clientPreparer.findFirst({
        where: {
          clientId: document.profileId,
          preparerId: profile.id,
          isActive: true,
        },
      });

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied. You are not assigned to this client.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ document });
  } catch (error) {
    logger.error('Error fetching document:', error);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}
