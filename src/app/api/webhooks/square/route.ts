import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'Square webhook endpoint - temporarily disabled during migration',
    },
    { status: 503 }
  );
}
