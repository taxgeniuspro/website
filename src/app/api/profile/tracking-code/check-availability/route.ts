/**
 * Check Tracking Code Availability
 *
 * POST: Check if a custom tracking code is available
 */

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
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
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required and must be a string' }, { status: 400 });
    }

    // Validate format
    const validation = validateCustomTrackingCode(code.trim());
    if (!validation.valid) {
      return NextResponse.json({
        available: false,
        reason: validation.error,
      });
    }

    // Check availability
    const available = await isTrackingCodeAvailable(code.trim());

    return NextResponse.json({
      available,
      reason: available ? undefined : 'Code is already taken',
    });
  } catch (error) {
    logger.error('Error checking code availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
