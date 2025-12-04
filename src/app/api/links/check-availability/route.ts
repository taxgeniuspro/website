/**
 * Check Code Availability API
 *
 * POST /api/links/check-availability
 *
 * Checks if a short code or tracking code is available for use
 * Supports: short-link codes and vanity tracking codes
 */

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { validateShortCode, isShortCodeAvailable } from '@/lib/services/short-link.service';
import {
  validateCustomTrackingCode,
  isTrackingCodeAvailable,
} from '@/lib/services/tracking-code.service';

export async function POST(req: Request) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get request body
    const body = await req.json();
    const { code, type = 'short-link' } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required and must be a string' }, { status: 400 });
    }

    const trimmedCode = code.trim();

    // Check availability based on type
    if (type === 'tracking-code' || type === 'vanity') {
      // Validate tracking code format
      const validation = validateCustomTrackingCode(trimmedCode);
      if (!validation.valid) {
        return NextResponse.json({
          available: false,
          reason: validation.error,
        });
      }

      // Check tracking code availability
      const available = await isTrackingCodeAvailable(trimmedCode);

      return NextResponse.json({
        available,
        reason: available ? undefined : 'This vanity name is already taken',
      });
    } else {
      // Default: check short link code
      // Validate format
      const validation = validateShortCode(trimmedCode);
      if (!validation.valid) {
        return NextResponse.json({
          available: false,
          reason: validation.error,
        });
      }

      // Check availability
      const available = await isShortCodeAvailable(trimmedCode);

      return NextResponse.json({
        available,
        reason: available ? undefined : 'Code is already taken',
      });
    }
  } catch (error) {
    logger.error('Error checking code availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
