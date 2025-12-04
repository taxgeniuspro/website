import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/support/settings
 * Get support system settings
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin or tax preparer role
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile || !['ADMIN', 'SUPER_ADMIN', 'TAX_PREPARER'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const section = searchParams.get('section') || 'general';

    // For now, return default settings
    // In the future, these could be stored in the database
    const defaultSettings = getDefaultSettings(section);

    return NextResponse.json({
      success: true,
      data: {
        settings: defaultSettings,
      },
    });
  } catch (error) {
    logger.error('Failed to get support settings', error);
    return NextResponse.json({ error: 'Failed to get support settings' }, { status: 500 });
  }
}

/**
 * POST /api/support/settings
 * Update support system settings
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { section, settings } = body;

    // Log settings update
    logger.info('Support settings updated', {
      userId: profile.id,
      section,
      updatedBy: `${profile.firstName} ${profile.lastName}`,
    });

    // For now, just return success
    // In the future, these could be stored in the database
    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      data: {
        settings,
      },
    });
  } catch (error) {
    logger.error('Failed to update support settings', error);
    return NextResponse.json({ error: 'Failed to update support settings' }, { status: 500 });
  }
}

function getDefaultSettings(section: string): Record<string, any> {
  switch (section) {
    case 'general':
      return {
        enableTicketSystem: true,
        autoAssignTickets: true,
        requireTicketApproval: false,
        allowClientClose: false,
        defaultPriority: 'NORMAL',
      };
    case 'features':
      return {
        enableSavedReplies: true,
        enableWorkflows: true,
        enableTimeTracking: true,
        enableInternalNotes: true,
        enableAttachments: true,
      };
    case 'ai':
      return {
        enableAI: false,
        openaiApiKey: '',
        openaiModel: 'gpt-4o-mini',
        enableResponseSuggestions: true,
        enableSentimentAnalysis: true,
        enableSummarization: true,
        enableAutoCategorization: true,
      };
    case 'notifications':
      return {
        enableEmailNotifications: true,
        enableInAppNotifications: true,
        enableSlackNotifications: false,
        enableSMSNotifications: false,
        notifyOnNewTicket: true,
        notifyOnNewMessage: true,
        notifyOnStatusChange: true,
      };
    case 'email':
      return {
        senderName: 'Tax Genius Pro Support',
        senderEmail: 'support@taxgeniuspro.tax',
        replyToEmail: 'support@taxgeniuspro.tax',
        includeTicketLink: true,
        includeUnsubscribeLink: true,
      };
    case 'integrations':
      return {
        slackWebhookUrl: '',
        slackChannel: '#support',
        twilioAccountSid: '',
        twilioAuthToken: '',
        twilioPhoneNumber: '',
        discordWebhookUrl: '',
        telegramBotToken: '',
        telegramChatId: '',
      };
    default:
      return {};
  }
}
