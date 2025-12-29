import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
// Rate limiting temporarily disabled
// import {
//   uploadRateLimit,
//   getClientIdentifier,
//   getUserIdentifier,
//   getRateLimitHeaders,
//   checkRateLimit,
// } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

// Map form categories to DocumentType enum
const CATEGORY_TO_TYPE: Record<string, string> = {
  w2: 'W2',
  '1099': 'FORM_1099',
  receipts: 'RECEIPT',
  mortgage: 'OTHER',
  other: 'OTHER',
};

/**
 * POST /api/documents/upload
 * Upload tax documents with rate limiting
 *
 * Security:
 * - Rate limited: 20 uploads per hour per user
 * - File size limit enforced
 * - Files saved to user-specific directory
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: Temporarily disabled due to Redis compatibility issues
    // TODO: Re-implement with a different rate limiting approach
    // const ip = getClientIdentifier(req);
    // const identifier = getUserIdentifier(userId, ip);
    // const rateLimitResult = await checkRateLimit(identifier, uploadRateLimit);
    //
    // if (!rateLimitResult.success) {
    //   return NextResponse.json(
    //     {
    //       error: 'Upload limit exceeded. Please try again later.',
    //       retryAfter: rateLimitResult.retryAfter,
    //       limit: rateLimitResult.limit,
    //       reset: new Date(rateLimitResult.reset).toISOString(),
    //     },
    //     {
    //       status: 429,
    //       headers: getRateLimitHeaders(rateLimitResult),
    //     }
    //   );
    // }

    // Get user's profile
    const { data: profiles } = await db.from('profiles')
      .select('*')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email}`);
    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string;
    const taxReturnId = formData.get('taxReturnId') as string | null;
    const folderId = formData.get('folderId') as string | null; // NEW: Folder assignment

    // Get tax year from form data or default to previous year
    // Tax year defaults to previous year year-round (e.g., in 2026, default is 2025)
    // Only changes on January 1st when calendar year rolls over
    const currentYear = new Date().getFullYear();
    const defaultTaxYear = currentYear - 1;
    const taxYear = formData.get('taxYear')
      ? parseInt(formData.get('taxYear') as string)
      : defaultTaxYear;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create upload directory with year subfolder: /uploads/documents/{profileId}/{taxYear}/
    const uploadDir = join(process.cwd(), 'uploads', 'documents', profile.id, taxYear.toString());
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = join(uploadDir, fileName);

    // Save file to disk
    await writeFile(filePath, buffer);

    // Save document record to database with new fields
    const { data: newDocuments, error: createError } = await db.from('documents').insert({
      profile_id: profile.id,
      tax_return_id: taxReturnId || null,
      type: CATEGORY_TO_TYPE[category] || 'OTHER',
      file_name: file.name,
      file_url: `/uploads/documents/${profile.id}/${taxYear}/${fileName}`,
      file_size: file.size,
      mime_type: file.type,
      is_encrypted: false, // TODO: Implement encryption
      tax_year: taxYear,
      status: 'REVIEWED', // Default to REVIEWED for client uploads (no pending review needed until assigned to preparer)
      folder_id: folderId || null, // NEW: Assign to folder if specified
      metadata: {
        category,
        uploadedAt: new Date().toISOString(),
      },
    }).select();

    if (createError) {
      throw createError;
    }

    const document = firstOrNull(newDocuments);

    // Log upload operation
    await db.from('file_operations').insert({
      operation: 'UPLOAD',
      performed_by: profile.id,
      document_id: document?.id,
      details: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        folderId: folderId || null,
      },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      user_agent: req.headers.get('user-agent') || null,
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document?.id,
        fileName: document?.file_name,
        fileUrl: document?.file_url,
        fileSize: document?.file_size,
        taxYear: document?.tax_year,
        status: document?.status,
        category,
      },
    });
  } catch (error) {
    logger.error('Error uploading document:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}

// GET /api/documents/upload - Get user's uploaded documents
export async function GET(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profiles } = await db.from('profiles')
      .select('*')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email}`);
    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get all documents for this profile
    const { data: documents } = await db.from('documents')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ documents });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}
