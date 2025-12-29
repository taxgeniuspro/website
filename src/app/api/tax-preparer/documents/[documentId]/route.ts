import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Local type definitions
interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  role: string;
}

interface Document {
  id: string;
  profileId: string;
  fileUrl: string;
}

interface ClientPreparer {
  id: string;
}

/**
 * PATCH /api/tax-preparer/documents/[documentId]
 * Update document status, review notes
 * Only for assigned clients
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email || ''}`)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user is a tax preparer or admin
    const role = profile.role;
    if (role !== 'tax_preparer' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. This endpoint is for tax preparers only.' },
        { status: 403 }
      );
    }

    const { documentId } = await params;

    // Get the document
    const { data: documents } = await db
      .from('documents')
      .select('id, profileId')
      .eq('id', documentId)
      .limit(1);

    const document = firstOrNull(documents) as Document | null;

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if preparer has access to this client's documents
    if (role === 'tax_preparer') {
      const { data: hasAccessData } = await db
        .from('client_preparers')
        .select('id')
        .eq('clientId', document.profileId)
        .eq('preparerId', profile.id)
        .eq('isActive', true)
        .limit(1);

      const hasAccess = firstOrNull(hasAccessData);

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

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      updateData.reviewedBy = profile.id;
      updateData.reviewedAt = new Date().toISOString();
    }
    if (reviewNotes !== undefined) {
      updateData.reviewNotes = reviewNotes;
    }

    // Update document
    const { data: updatedDocument, error: updateError } = await db
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Get client profile info
    const { data: clientProfiles } = await db
      .from('profiles')
      .select('id, firstName, lastName, email')
      .eq('id', document.profileId)
      .limit(1);

    const clientProfile = firstOrNull(clientProfiles) as Profile | null;

    return NextResponse.json({
      success: true,
      document: {
        ...updatedDocument,
        profile: clientProfile,
      },
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
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email || ''}`)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user is a tax preparer or admin
    const role = profile.role;
    if (role !== 'tax_preparer' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. This endpoint is for tax preparers only.' },
        { status: 403 }
      );
    }

    const { documentId } = await params;

    // Get the document with full info
    const { data: documents } = await db
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .limit(1);

    const document = firstOrNull(documents);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if preparer has access to this client's documents
    if (role === 'tax_preparer') {
      const { data: hasAccessData } = await db
        .from('client_preparers')
        .select('id')
        .eq('clientId', document.profileId)
        .eq('preparerId', profile.id)
        .eq('isActive', true)
        .limit(1);

      const hasAccess = firstOrNull(hasAccessData);

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
    await db.from('documents').delete().eq('id', documentId);

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
export async function GET(req: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email || ''}`)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user is a tax preparer or admin
    const role = profile.role;
    if (role !== 'tax_preparer' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. This endpoint is for tax preparers only.' },
        { status: 403 }
      );
    }

    const { documentId } = await params;

    // Get the document
    const { data: documents } = await db
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .limit(1);

    const document = firstOrNull(documents);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if preparer has access to this client's documents
    if (role === 'tax_preparer') {
      const { data: hasAccessData } = await db
        .from('client_preparers')
        .select('id')
        .eq('clientId', document.profileId)
        .eq('preparerId', profile.id)
        .eq('isActive', true)
        .limit(1);

      const hasAccess = firstOrNull(hasAccessData);

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied. You are not assigned to this client.' },
          { status: 403 }
        );
      }
    }

    // Get client profile
    const { data: clientProfiles } = await db
      .from('profiles')
      .select('id, firstName, lastName, email, phone')
      .eq('id', document.profileId)
      .limit(1);

    const clientProfile = firstOrNull(clientProfiles);

    return NextResponse.json({
      document: {
        ...document,
        profile: clientProfile,
      },
    });
  } catch (error) {
    logger.error('Error fetching document:', error);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}
