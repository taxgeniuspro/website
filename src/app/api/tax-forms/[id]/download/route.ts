import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GET /api/tax-forms/[id]/download
 * Download tax form PDF and track download count
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get tax form
    const taxForm = await prisma.taxForm.findUnique({
      where: { id },
    });

    if (!taxForm) {
      return NextResponse.json({ error: 'Tax form not found' }, { status: 404 });
    }

    if (!taxForm.isActive) {
      return NextResponse.json({ error: 'Tax form is not active' }, { status: 403 });
    }

    // Increment download count
    await prisma.taxForm.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });

    logger.info(`Tax form downloaded: ${taxForm.formNumber} by ${userId}`);

    // Read the file
    const filePath = path.join(
      process.cwd(),
      'public',
      taxForm.fileUrl.startsWith('/') ? taxForm.fileUrl.slice(1) : taxForm.fileUrl
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
        'Content-Disposition': `attachment; filename="${taxForm.fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error('Error downloading tax form:', error);
    return NextResponse.json({ error: 'Failed to download tax form' }, { status: 500 });
  }
}
