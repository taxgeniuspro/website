import { logger } from '@/lib/logger';

/**
 * Discord Lead Notification Service
 *
 * Sends lead form submissions to Discord webhook for instant notification.
 * Non-blocking - failures are logged but don't affect form submissions.
 */

// New Client Bot webhook
const DISCORD_WEBHOOK_URL =
  'https://discord.com/api/webhooks/1179520043684462713/sBwTkWXVUhTdMENrZMkARIfnUhaV5cynLqZHotOcyCLOWeirfSrXElFu8WgmIP4BPx3m';

export interface DiscordLeadNotificationData {
  leadType: 'advance' | 'filing' | 'contact' | 'intake';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zipCode?: string;
  preferredFiling?: 'remote' | 'in-person';
  preparerName?: string;
  preparerCode?: string;
  preparerDiscordId?: string;
  source: string;
  message?: string;
}

/**
 * Send lead notification to Discord webhook.
 * Pings the preparer if they have a Discord ID set.
 * Non-blocking - failures are logged but don't affect form submission.
 */
export async function sendLeadToDiscord(data: DiscordLeadNotificationData): Promise<void> {
  try {
    const embed = formatDiscordEmbed(data);

    // Ping the preparer if they have a Discord ID
    const mentionContent = data.preparerDiscordId
      ? `<@${data.preparerDiscordId}> 🔔 New lead for you!`
      : undefined;

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: mentionContent,
        embeds: [embed]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook error: ${response.status} - ${errorText}`);
    }

    logger.info('Discord lead notification sent', {
      leadType: data.leadType,
      preparerCode: data.preparerCode,
      source: data.source,
    });
  } catch (error) {
    logger.error('Failed to send Discord lead notification', {
      leadType: data.leadType,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't rethrow - Discord failures should not block form submissions
  }
}

/**
 * Format lead data into a Discord embed.
 */
function formatDiscordEmbed(data: DiscordLeadNotificationData): object {
  const typeConfig: Record<string, { label: string; emoji: string; color: number }> = {
    advance: { label: 'Cash Advance Request', emoji: '💰', color: 5763719 },
    filing: { label: 'Tax Filing', emoji: '📄', color: 3447003 },
    contact: { label: 'Contact Form', emoji: '📬', color: 15844367 },
    intake: { label: 'Tax Intake Form', emoji: '📝', color: 3066993 },
  };

  const config = typeConfig[data.leadType] || typeConfig.contact;
  const typeLabel = config.label;
  const typeEmoji = config.emoji;
  const color = config.color;

  const timestamp = new Date().toISOString();

  const filingLabel =
    data.preferredFiling === 'remote'
      ? 'Remote'
      : data.preferredFiling === 'in-person'
        ? 'In-Person'
        : 'Not specified';

  // Build fields dynamically based on available data
  const fields = [
    { name: 'Type', value: typeLabel, inline: true },
    { name: 'Preparer', value: data.preparerName || 'Owliver Owl', inline: true },
    { name: 'Ref Code', value: data.preparerCode || 'ow', inline: true },
    { name: 'Name', value: `${data.firstName} ${data.lastName}`, inline: true },
    { name: 'Phone', value: formatPhone(data.phone), inline: true },
    { name: 'Email', value: data.email, inline: true },
  ];

  if (data.zipCode) {
    fields.push({ name: 'Zip', value: data.zipCode, inline: true });
  }
  if (data.preferredFiling) {
    fields.push({ name: 'Filing', value: filingLabel, inline: true });
  }
  fields.push({ name: 'Source', value: data.source, inline: true });

  return {
    title: `${typeEmoji} New Lead for ${data.preparerName || 'Tax Genius'}`,
    description: data.message ? `**Message:** ${data.message.substring(0, 200)}${data.message.length > 200 ? '...' : ''}` : undefined,
    color,
    fields,
    timestamp,
    footer: {
      text: 'Tax Genius Pro - Tax Season 2026',
    },
  };
}

/**
 * Format phone number for display.
 */
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Test Discord webhook connection.
 * Useful for verifying the webhook is working.
 */
export async function testDiscordConnection(): Promise<boolean> {
  try {
    const testEmbed = {
      title: '🔔 Test Connection',
      description: 'Discord lead notifications are working!',
      color: 5763719,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [testEmbed] }),
    });

    return response.ok;
  } catch (error) {
    logger.error('Discord webhook test failed', { error });
    return false;
  }
}
