import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Static file handler for /mockups/* HTML files
 * This route serves static HTML files from the public/mockups folder
 * without going through the i18n/dynamic route system.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const filename = slug.join('/');

  // Only allow .html files for security
  if (!filename.endsWith('.html')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Prevent directory traversal
  if (filename.includes('..')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const filePath = join(process.cwd(), 'public', 'mockups', filename);
    const content = await readFile(filePath, 'utf-8');

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    return new NextResponse('Not Found', { status: 404 });
  }
}
