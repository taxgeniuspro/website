/**
 * Email Verification API Route
 *
 * POST /api/auth/verify-email - Send verification email
 * GET /api/auth/verify-email?token=xxx - Verify token and mark email as verified
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { getResendClient } from '@/lib/resend';
import { EmailVerificationEmail } from '../../../../../emails/email-verification';
import { authRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';
import crypto from 'crypto';

// Token expires in 24 hours
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * GET /api/auth/verify-email?token=xxx
 * Verify the email token and mark user's email as verified
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing verification token' }, { status: 400 });
    }

    // Find the verification token
    const verificationRecord = await prisma.verificationToken.findFirst({
      where: { token },
    });

    if (!verificationRecord) {
      logger.warn('Invalid verification token attempted', { token: token.substring(0, 8) + '...' });
      return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 400 });
    }

    // Check if token is expired
    if (verificationRecord.expires < new Date()) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationRecord.identifier,
            token: verificationRecord.token,
          },
        },
      });
      logger.warn('Expired verification token used', { email: verificationRecord.identifier });
      return NextResponse.json({ error: 'Verification token has expired. Please request a new one.' }, { status: 400 });
    }

    // Find user by email (identifier)
    const user = await prisma.user.findUnique({
      where: { email: verificationRecord.identifier.toLowerCase() },
    });

    if (!user) {
      logger.error('Verification token valid but user not found', { email: verificationRecord.identifier });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    // Delete the used token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationRecord.identifier,
          token: verificationRecord.token,
        },
      },
    });

    logger.info('Email verified successfully', { userId: user.id, email: user.email });

    // Redirect to success page
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
    return NextResponse.redirect(`${appUrl}/auth/email-verified`);
  } catch (error) {
    logger.error('Error verifying email', { error });
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
  }
}

/**
 * POST /api/auth/verify-email
 * Send/resend verification email to the authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 3 requests per 5 minutes per IP
    const clientIp = getClientIdentifier(req);
    const rateLimitResult = await authRateLimit.limit(`verify-email:${clientIp}`);

    if (!rateLimitResult.success || rateLimitResult.remaining < 7) {
      // authRateLimit allows 10, we want 3 per 5 min for verification emails
      logger.warn('[Verify-Email] Rate limit exceeded', { ip: clientIp });
      return NextResponse.json(
        { error: 'Too many verification email requests. Please wait a few minutes.' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Check if user is authenticated
    const session = await auth();
    let email: string;
    let name: string | undefined;

    if (session?.user?.email) {
      // Authenticated user requesting resend
      email = session.user.email;
      name = session.user.name || undefined;

      // Check if already verified
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { emailVerified: true },
      });

      if (user?.emailVerified) {
        return NextResponse.json({ message: 'Email is already verified' }, { status: 200 });
      }
    } else {
      // Allow unauthenticated resend with email in body
      const body = await req.json().catch(() => ({}));
      if (!body.email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }
      email = body.email;

      // Look up user to get name
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { name: true, emailVerified: true },
      });

      if (!user) {
        // Don't reveal if email exists
        return NextResponse.json({ message: 'If an account exists, a verification email has been sent.' }, { status: 200 });
      }

      if (user.emailVerified) {
        return NextResponse.json({ message: 'Email is already verified' }, { status: 200 });
      }

      name = user.name || undefined;
    }

    // Delete any existing verification tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email.toLowerCase() },
    });

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + TOKEN_EXPIRY_MS);

    // Save token
    await prisma.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token,
        expires,
      },
    });

    // Build verification URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
    const verificationUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

    // Send email
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';

    if (process.env.NODE_ENV === 'development') {
      logger.info('Email Verification (Dev Mode)', {
        to: email,
        verificationUrl,
        token: token.substring(0, 8) + '...',
      });
    } else {
      const { error } = await getResendClient().emails.send({
        from: fromEmail,
        to: email,
        subject: 'Verify Your Tax Genius Account',
        react: EmailVerificationEmail({
          name,
          verificationUrl,
        }),
      });

      if (error) {
        logger.error('Failed to send verification email', { error, email });
        return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
      }
    }

    logger.info('Verification email sent', { email });

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    });
  } catch (error) {
    logger.error('Error sending verification email', { error });
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
  }
}
