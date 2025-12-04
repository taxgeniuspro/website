/**
 * Email Templates API
 * /api/email-templates
 *
 * Manage email templates for tax preparers
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { emailTemplateService } from '@/lib/services/email-template.service';

/**
 * GET /api/email-templates
 *
 * List all email templates for the current user
 * Includes user's own templates + shared templates
 *
 * Query params:
 * - category?: LEAD | CLIENT | GENERAL
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;

    const templates = await emailTemplateService.listTemplates(profile.id, category);

    return NextResponse.json({
      templates,
      count: templates.length,
    });
  } catch (error) {
    logger.error('Error fetching email templates', { error });
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

/**
 * POST /api/email-templates
 *
 * Create a new email template
 *
 * Body:
 * {
 *   name: string,
 *   subject: string,
 *   body: string,
 *   category?: string
 * }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, subject, body: emailBody, category } = body;

    if (!name || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subject, body' },
        { status: 400 }
      );
    }

    const template = await emailTemplateService.createTemplate(profile.id, {
      name,
      subject,
      body: emailBody,
      category,
    });

    logger.info('Email template created', {
      templateId: template.id,
      profileId: profile.id,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    logger.error('Error creating email template', { error });
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
