import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import archiver from 'archiver';
import { Readable } from 'stream';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * POST /api/documents/download-zip
 * Create a zip file of multiple documents for bulk download
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fileIds } = body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'No files specified' }, { status: 400 });
    }

    // Get user's profile
    const { data: profiles } = await db.from('profiles')
      .select('*')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email}`);
    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch documents
    const { data: documents } = await db.from('documents')
      .select('id, file_name, file_url, profile_id')
      .in('id', fileIds)
      .eq('is_deleted', false);

    if (!documents || documents.length === 0) {
      return NextResponse.json({ error: 'No documents found' }, { status: 404 });
    }

    // Verify permissions
    const authorizedDocs = documents.filter((doc) => {
      // Owner can download
      if (doc.profile_id === profile.id) return true;

      // Admins can download
      if (profile.role === 'admin') return true;

      // Tax preparers can download if assigned (we'll check)
      return profile.role === 'tax_preparer';
    });

    if (authorizedDocs.length === 0) {
      return NextResponse.json({ error: 'No authorized documents' }, { status: 403 });
    }

    // Create zip archive
    const archive = archiver('zip', {
      zlib: { level: 6 }, // Compression level
    });

    // Set up response headers
    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set('Content-Disposition', `attachment; filename="documents_${Date.now()}.zip"`);

    // Convert archive to web stream
    const stream = new ReadableStream({
      start(controller) {
        archive.on('data', (chunk) => {
          controller.enqueue(chunk);
        });

        archive.on('end', () => {
          controller.close();
        });

        archive.on('error', (err) => {
          logger.error('Archive error:', err);
          controller.error(err);
        });

        // Add files to archive
        (async () => {
          for (const doc of authorizedDocs) {
            try {
              // Extract file path from file_url (assuming local storage)
              // file_url format: /uploads/documents/{profileId}/{taxYear}/{filename}
              const filePath = join(process.cwd(), 'uploads', ...doc.file_url.split('/').slice(2));

              // Read file and add to archive
              const fileBuffer = await readFile(filePath);
              archive.append(fileBuffer, { name: doc.file_name });
            } catch (error) {
              logger.error(`Error adding file ${doc.file_name} to archive:`, error);
              // Continue with other files
            }
          }

          // Finalize archive
          await archive.finalize();
        })();
      },
    });

    // Log download operations
    for (const doc of authorizedDocs) {
      await db.from('file_operations').insert({
        operation: 'DOWNLOAD',
        performed_by: profile.id,
        document_id: doc.id,
        details: {
          bulkDownload: true,
          fileCount: authorizedDocs.length,
        },
        ip_address:
          req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
        user_agent: req.headers.get('user-agent') || null,
      });
    }

    return new NextResponse(stream, { headers });
  } catch (error) {
    logger.error('Error creating zip file:', error);
    return NextResponse.json({ error: 'Failed to create zip file' }, { status: 500 });
  }
}
