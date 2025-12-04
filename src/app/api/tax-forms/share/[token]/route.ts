import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GET /api/tax-forms/share/[token]
 * Access shared tax form via token
 * This route is public and doesn't require authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find share by token
    const share = await prisma.taxFormShare.findUnique({
      where: { shareToken: token },
      include: {
        taxForm: true,
      },
    });

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    // Check if share has expired
    if (share.expiresAt && new Date() > share.expiresAt) {
      return NextResponse.json({ error: 'Share has expired' }, { status: 410 });
    }

    // Update access count and last access time
    await prisma.taxFormShare.update({
      where: { id: share.id },
      data: {
        accessCount: { increment: 1 },
        lastAccessAt: new Date(),
      },
    });

    // Increment form download count
    await prisma.taxForm.update({
      where: { id: share.taxForm.id },
      data: { downloadCount: { increment: 1 } },
    });

    logger.info(`Tax form shared accessed: ${share.taxForm.formNumber} via token ${token}`);

    // Read the file
    const filePath = path.join(
      process.cwd(),
      'public',
      share.taxForm.fileUrl.startsWith('/') ? share.taxForm.fileUrl.slice(1) : share.taxForm.fileUrl
    );

    if (!fs.existsSync(filePath)) {
      logger.error(`File not found: ${filePath}`);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    // Return PDF file
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${share.taxForm.fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error('Error accessing shared tax form:', error);
    return NextResponse.json({ error: 'Failed to access shared form' }, { status: 500 });
  }
}
