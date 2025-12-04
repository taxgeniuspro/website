/**
 * Application Constants
 *
 * Note: SERVICE_ENDPOINTS used by SEO Brain integration system
 */

export const SERVICE_ENDPOINTS = {
  N8N_BASE: process.env.N8N_BASE_URL || 'http://localhost:5678',
  TELEGRAM_BOT_API: process.env.TELEGRAM_BOT_API || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
} as const;

export const APP_CONFIG = {
  APP_NAME: 'TaxGeniusPro',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax',
} as const;
