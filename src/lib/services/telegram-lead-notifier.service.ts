import { logger } from '@/lib/logger';

/**
 * Telegram Lead Notification Service
 *
 * Sends lead form submissions to Telegram bots for instant notification.
 * Routes by language: Spanish leads → Spanish bot, English leads → English bot.
 */

const TELEGRAM_BOTS = {
  english: {
    token: '7904997613:AAFWL7jt240sSn5Vt8ShOHmt7iV8krKb0Jo',
    name: 'TaxgeniusBot',
  },
  spanish: {
    token: '7776905155:AAF0FCIGHoAi5e2KVR_AbBizF1SW-1qD-DQ',
    name: 'taxgeniusspanish_bot',
  },
};

// Ira Watkins - receives all lead notifications
const ADMIN_CHAT_ID = '7154912264';

export interface LeadNotificationData {
  formType: string; // 'Contact Form', 'Cash Advance', 'Tax Intake', etc.
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  zipCode?: string;
  service?: string;
  message?: string;
  locale?: 'en' | 'es';
  refCode?: string;
  assignedPreparer?: string;
  source?: string;
  additionalFields?: Record<string, string>;
}

/**
 * Send lead notification to Telegram.
 * Routes by language: Spanish → Spanish bot, English → English bot.
 * Non-blocking - failures are logged but don't affect form submission.
 */
export async function sendLeadToTelegram(data: LeadNotificationData): Promise<void> {
  try {
    const message = formatLeadMessage(data);
    const bot = data.locale === 'es' ? TELEGRAM_BOTS.spanish : TELEGRAM_BOTS.english;

    await sendTelegramMessage(bot.token, ADMIN_CHAT_ID, message);

    logger.info('Telegram lead notification sent', {
      formType: data.formType,
      bot: bot.name,
      locale: data.locale || 'en',
    });
  } catch (error) {
    logger.error('Failed to send Telegram lead notification', {
      formType: data.formType,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't rethrow - Telegram failures should not block form submissions
  }
}

/**
 * Format lead data into a readable Telegram message with Markdown.
 */
function formatLeadMessage(data: LeadNotificationData): string {
  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const languageFlag = data.locale === 'es' ? '🇪🇸 Spanish' : '🇺🇸 English';

  // Build additional fields section if present
  let additionalSection = '';
  if (data.additionalFields && Object.keys(data.additionalFields).length > 0) {
    const fields = Object.entries(data.additionalFields)
      .filter(([, value]) => value) // Only include non-empty values
      .map(([key, value]) => `• ${key}: ${value}`)
      .join('\n');
    if (fields) {
      additionalSection = `\n${fields}`;
    }
  }

  // Build service line if present
  const serviceLine = data.service ? `• Service: ${data.service}\n` : '';

  // Build message section if present
  const messageSection = data.message ? `\n💬 *Message*\n${truncateMessage(data.message, 500)}` : '';

  return `
🆕 *NEW LEAD - ${data.formType}*
━━━━━━━━━━━━━━━━━━━━━

👤 *Contact Info*
• Name: ${data.firstName}${data.lastName ? ` ${data.lastName}` : ''}
• Phone: ${data.phone || 'Not provided'}
• Email: ${data.email || 'Not provided'}
• Zip: ${data.zipCode || 'Not provided'}

📋 *Details*
• Source: ${data.source || 'Direct'}
• Ref Code: ${data.refCode || 'None'}
• Language: ${languageFlag}
• Assigned To: ${data.assignedPreparer || (data.locale === 'es' ? 'Ale Hamilton' : 'Ray Hamilton')}
${serviceLine}${additionalSection}${messageSection}

⏰ ${timestamp} CST
  `.trim();
}

/**
 * Truncate message to max length to avoid Telegram API limits.
 */
function truncateMessage(message: string, maxLength: number): string {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength - 3) + '...';
}

/**
 * Send a message to Telegram using Bot API.
 */
async function sendTelegramMessage(token: string, chatId: string, message: string): Promise<void> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram API error: ${response.status} - ${errorText}`);
  }
}

/**
 * Test Telegram connection by sending a test message.
 * Useful for verifying bot tokens and chat IDs.
 */
export async function testTelegramConnection(): Promise<{ english: boolean; spanish: boolean }> {
  const testMessage = '🔔 *Test Connection*\nTelegram lead notifications are working!';

  const results = {
    english: false,
    spanish: false,
  };

  try {
    await sendTelegramMessage(TELEGRAM_BOTS.english.token, ADMIN_CHAT_ID, testMessage);
    results.english = true;
  } catch (error) {
    logger.error('English Telegram bot test failed', { error });
  }

  try {
    await sendTelegramMessage(TELEGRAM_BOTS.spanish.token, ADMIN_CHAT_ID, testMessage);
    results.spanish = true;
  } catch (error) {
    logger.error('Spanish Telegram bot test failed', { error });
  }

  return results;
}
