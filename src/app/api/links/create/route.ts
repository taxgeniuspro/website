/**
 * Create Short Link API
 *
 * POST /api/links/create
 *
 * Creates a new short link for the authenticated user
 */

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  createShortLink,
  validateShortCode,
  isShortCodeAvailable,
  type ShortLinkDestination,
} from '@/lib/services/short-link.service';

export async function POST(req: Request) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get request body
    const body = await req.json();
    const { shortCode, destination, title, description, campaign } = body;

    // Validate input
    if (!shortCode || typeof shortCode !== 'string') {
      return NextResponse.json({ error: 'Short code is required' }, { status: 400 });
    }

    if (!destination || !destination.type) {
      return NextResponse.json({ error: 'Destination is required' }, { status: 400 });
    }

    // Validate destination type
    const validDestinations = ['INTAKE_FORM', 'CONTACT_FORM', 'CUSTOM'];
    if (!validDestinations.includes(destination.type)) {
      return NextResponse.json({ error: 'Invalid destination type' }, { status: 400 });
    }

    // If custom, require customUrl
    if (destination.type === 'CUSTOM' && !destination.customUrl) {
      return NextResponse.json(
        { error: 'Custom URL is required for custom destinations' },
        { status: 400 }
      );
    }

    // Validate short code format
    const validation = validateShortCode(shortCode.trim());
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check availability
    const available = await isShortCodeAvailable(shortCode.trim());
    if (!available) {
      return NextResponse.json({ error: 'This short code is already taken' }, { status: 400 });
    }

    // Create short link
    const link = await createShortLink({
      profileId: profile.id,
      shortCode: shortCode.trim(),
      destination: destination as ShortLinkDestination,
      title: title || undefined,
      description: description || undefined,
      campaign: campaign || undefined,
    });

    return NextResponse.json({
      success: true,
      data: link,
      message: 'Short link created successfully',
    });
  } catch (error: any) {
    logger.error('Error creating short link:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
