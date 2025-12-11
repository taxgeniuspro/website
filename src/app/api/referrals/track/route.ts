import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

// Track referral click and set cookie
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referralCode, source, landingPage } = body;

    if (!referralCode) {
      return NextResponse.json({ error: 'Referral code required' }, { status: 400 });
    }

    // Get tracking data
    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';

    // Parse user agent for device info
    const isMobile = /mobile|android|iphone/i.test(userAgent);
    const isTablet = /tablet|ipad/i.test(userAgent);
    const deviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

    // Generate click ID
    const clickId = crypto.randomUUID();

    // Store referral click (in production, save to database)
    const clickData = {
      id: clickId,
      referralCode,
      source: source || 'direct',
      landingPage: landingPage || '/',
      ip,
      userAgent,
      referer,
      deviceType,
      clickedAt: new Date().toISOString(),
    };

    logger.info('Referral click tracked', clickData);

    // Set referral cookie (30 days)
    const cookieStore = cookies();
    cookieStore.set('ref', referralCode, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    // Also set click ID cookie for attribution
    cookieStore.set('ref_click', clickId, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return NextResponse.json(
      {
        success: true,
        clickId,
        message: 'Referral tracked successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Referral tracking error', error);
    return NextResponse.json({ error: 'Failed to track referral' }, { status: 500 });
  }
}

// Get referral data by code
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const username = searchParams.get('username');

  if (!code && !username) {
    return NextResponse.json({ error: 'Code or username required' }, { status: 400 });
  }

  // Return empty/not found response - real data would come from database query
  // TODO: Implement database query for referrer data when referral system is built
  return NextResponse.json(
    {
      error: 'Referrer not found',
      message: 'No referrer data available for this code',
    },
    { status: 404 }
  );
}
