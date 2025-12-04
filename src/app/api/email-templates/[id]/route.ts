/**
 * Email Template API (Single)
 * /api/email-templates/[id]
 *
 * Manage individual email templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { emailTemplateService } from '@/lib/services/email-template.service';

/**
 * GET /api/email-templates/[id]
 *
 * Get a single email template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { clerkId: userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { id } = await params;

    const template = await emailTemplateService.getTemplate(id, profile.id);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    logger.error('Error fetching email template', { error });
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

/**
 * PUT /api/email-templates/[id]
 *
 * Update an email template
 *
 * Body:
 * {
 *   name?: string,
 *   subject?: string,
 *   body?: string,
 *   category?: string
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { clerkId: userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, subject, body: emailBody, category } = body;

    const template = await emailTemplateService.updateTemplate(id, profile.id, {
      name,
      subject,
      body: emailBody,
      category,
    });

    logger.info('Email template updated', {
      templateId: template.id,
      profileId: profile.id,
    });

    return NextResponse.json({ template });
  } catch (error: any) {
    logger.error('Error updating email template', { error });

    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (error.message?.includes('Not authorized')) {
      return NextResponse.json({ error: 'Not authorized to update this template' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

/**
 * DELETE /api/email-templates/[id]
 *
 * Delete an email template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { clerkId: userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { id } = await params;

    await emailTemplateService.deleteTemplate(id, profile.id);

    logger.info('Email template deleted', {
      templateId: id,
      profileId: profile.id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting email template', { error });

    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (error.message?.includes('Not authorized')) {
      return NextResponse.json({ error: 'Not authorized to delete this template' }, { status: 403 });
    }

    if (error.message?.includes('Cannot delete default')) {
      return NextResponse.json({ error: 'Cannot delete default templates' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
