import { NextResponse } from 'next/server';

/**
 * Health check endpoint for PWA offline connectivity detection.
 * Used by /public/offline.html to check if the server is reachable.
 */

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: Date.now(),
    service: 'taxgeniuspro',
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
