/**
 * Professional Email Availability Checker API
 * GET /api/store/professional-email/check-availability?username=ira
 *
 * Checks if a professional email username is available
 * Returns availability status and suggestions if taken
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/store/professional-email/check-availability
 *
 * Query params:
 * - username: Desired username (e.g., "ira" for "ira@taxgeniuspro.tax")
 *
 * Response:
 * {
 *   available: boolean,
 *   email: string,  // Full email address
 *   suggestions?: string[]  // Alternative usernames if taken
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9._-]+$/i;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        {
          error: 'Invalid username. Use only letters, numbers, dots, hyphens, and underscores.',
          available: false,
        },
        { status: 400 }
      );
    }

    // Validate username length
    if (username.length < 2 || username.length > 30) {
      return NextResponse.json(
        {
          error: 'Username must be between 2 and 30 characters',
          available: false,
        },
        { status: 400 }
      );
    }

    // Check if username is reserved
    const reservedUsernames = [
      'admin',
      'support',
      'help',
      'info',
      'contact',
      'sales',
      'noreply',
      'no-reply',
      'postmaster',
      'webmaster',
      'abuse',
      'security',
      'privacy',
      'legal',
      'billing',
      'accounts',
      'team',
      'hello',
      'hi',
      'mail',
      'email',
    ];

    const normalizedUsername = username.toLowerCase();
    const emailAddress = `${normalizedUsername}@taxgeniuspro.tax`;

    if (reservedUsernames.includes(normalizedUsername)) {
      logger.info('Username check: reserved', { username: normalizedUsername });

      return NextResponse.json({
        available: false,
        email: emailAddress,
        error: 'This username is reserved and cannot be used',
        suggestions: generateSuggestions(normalizedUsername),
      });
    }

    // Check if email already exists
    const existing = await prisma.professionalEmailAlias.findUnique({
      where: { emailAddress },
    });

    if (existing) {
      logger.info('Username check: taken', {
        username: normalizedUsername,
        existingId: existing.id,
      });

      return NextResponse.json({
        available: false,
        email: emailAddress,
        suggestions: generateSuggestions(normalizedUsername),
      });
    }

    logger.info('Username check: available', { username: normalizedUsername });

    return NextResponse.json({
      available: true,
      email: emailAddress,
    });
  } catch (error) {
    logger.error('Error checking email availability', { error });
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}

/**
 * Generate alternative username suggestions
 */
function generateSuggestions(username: string): string[] {
  const suggestions: string[] = [];
  const baseUsername = username.replace(/[0-9]+$/, ''); // Remove trailing numbers

  // Add variations
  suggestions.push(`${baseUsername}${Math.floor(Math.random() * 99) + 1}`);
  suggestions.push(`${baseUsername}tax`);
  suggestions.push(`${baseUsername}cpa`);
  suggestions.push(`${baseUsername}pro`);
  suggestions.push(`${baseUsername}${new Date().getFullYear()}`);

  // Return unique suggestions
  return Array.from(new Set(suggestions)).slice(0, 5);
}
