/**
 * Forgot Password API Route
 * Sends a password reset email to the user
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import { authRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

// Stricter rate limit for password reset: 5 requests per minute per IP
const PASSWORD_RESET_MAX_REQUESTS = 5;

// Email sending via Resend
async function sendPasswordResetEmail(email: string, resetUrl: string, name: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    logger.error('RESEND_API_KEY not configured');
    throw new Error('Email service not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Tax Genius Pro <noreply@taxgeniuspro.tax>',
      to: email,
      subject: 'Reset Your Tax Genius Pro Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://taxgeniuspro.tax/images/wordpress-assets/taxgenius-logo.png" alt="Tax Genius Pro" style="max-width: 200px; height: auto;">
          </div>

          <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Reset Your Password</h1>

          <p>Hi ${name || 'there'},</p>

          <p>We received a request to reset your password for your Tax Genius Pro account. Click the button below to set a new password:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background-color: #ff6b35; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Reset Password
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>

          <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <p style="color: #999; font-size: 12px; text-align: center;">
            &copy; ${new Date().getFullYear()} Tax Genius Pro. All rights reserved.<br>
            1632 Jonesboro Rd SE, Atlanta, GA 30315
          </p>
        </body>
        </html>
      `,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to send password reset email:', error);
    throw new Error('Failed to send email');
  }

  return response.json();
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 5 requests per minute per IP (stricter for password reset)
    const clientIp = getClientIdentifier(req);
    const rateLimitResult = await authRateLimit.limit(`forgot-password:${clientIp}`);

    // Check against stricter limit for password reset
    if (!rateLimitResult.success || rateLimitResult.remaining < (10 - PASSWORD_RESET_MAX_REQUESTS)) {
      logger.warn('[ForgotPassword] Rate limit exceeded', { ip: clientIp });
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            ...getRateLimitHeaders(rateLimitResult),
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email.toLowerCase(),
          mode: 'insensitive',
        },
      },
      include: {
        profile: true,
      },
    });

    // Always return success to prevent email enumeration attacks
    // But only send email if user exists
    if (!user) {
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, we sent a password reset link.',
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store reset token in magic_links table (reusing existing table)
    await prisma.magicLink.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        used: false,
      },
    });

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || 'https://taxgeniuspro.tax';
    const resetUrl = `${baseUrl}/en/auth/reset-password?token=${token}`;

    // Send email
    const name = user.profile?.firstName || user.name?.split(' ')[0] || '';
    await sendPasswordResetEmail(user.email!, resetUrl, name);

    logger.info(`Password reset email sent to: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, we sent a password reset link.',
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
