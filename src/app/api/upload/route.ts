import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { StorageService } from '@/lib/services/storage.service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { DocumentType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = (formData.get('type') as string) || 'document';
    const taxReturnId = formData.get('taxReturnId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes =
      type === 'avatar'
        ? StorageService.getAllowedImageTypes()
        : StorageService.getAllowedDocumentTypes();

    if (!StorageService.validateFileType(file.type, allowedTypes)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size (10MB for documents, 5MB for images)
    const maxSize = type === 'avatar' ? 5 : 10;
    if (!StorageService.validateFileSize(file.size, maxSize)) {
      return NextResponse.json(
        { error: `File size must be less than ${maxSize}MB` },
        { status: 400 }
      );
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Generate file key
    const fileKey = StorageService.generateFileKey(
      profile.id,
      file.name,
      type as 'document' | 'avatar' | 'marketing' | 'temp'
    );

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    const { key, url } = await StorageService.uploadFile(
      fileKey,
      buffer,
      file.type,
      type === 'document' // Encrypt documents but not avatars
    );

    // Save document record if it's a document upload
    if (type === 'document') {
      const documentType: DocumentType = file.name.toLowerCase().includes('w2')
        ? DocumentType.W2
        : file.name.toLowerCase().includes('1099')
          ? DocumentType.FORM_1099
          : file.type === 'application/pdf'
            ? DocumentType.TAX_RETURN
            : DocumentType.OTHER;

      await prisma.document.create({
        data: {
          profileId: profile.id,
          taxReturnId: taxReturnId,
          type: documentType,
          fileName: file.name,
          fileUrl: url,
          fileSize: file.size,
          mimeType: file.type,
          isEncrypted: true,
        },
      });
    }

    // Update avatar URL if it's an avatar upload
    if (type === 'avatar') {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { avatarUrl: url },
      });
    }

    return NextResponse.json({
      success: true,
      key,
      url,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    logger.error('Error uploading file:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

// Generate presigned URL for direct upload
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const contentType = searchParams.get('contentType');
    const type = searchParams.get('type') || 'document';

    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Generate file key
    const fileKey = StorageService.generateFileKey(
      profile.id,
      fileName,
      type as 'document' | 'avatar' | 'marketing' | 'temp'
    );

    // Generate presigned URL
    const presignedUrl = await StorageService.getPresignedUploadUrl(
      fileKey,
      contentType,
      3600 // 1 hour expiry
    );

    return NextResponse.json({
      presignedUrl,
      key: fileKey,
      expires: new Date(Date.now() + 3600000).toISOString(),
    });
  } catch (error) {
    logger.error('Error generating presigned URL:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
