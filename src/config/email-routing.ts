/**
 * Centralized Email Routing Configuration
 *
 * Defines email recipients for all form submissions based on language/locale.
 *
 * @configuration
 * - English forms go to Ray Hamilton with CC to Owliver Owl
 * - Spanish forms go to Ale Hamilton with CC to Owliver Owl
 *
 * @environment
 * - EMAIL_ROUTING_EN_PRIMARY: English form primary recipient
 * - EMAIL_ROUTING_EN_CC: English form CC recipient
 * - EMAIL_ROUTING_ES_PRIMARY: Spanish form primary recipient
 * - EMAIL_ROUTING_ES_CC: Spanish form CC recipient
 * - EMAIL_ADMIN_CC: Admin CC for all emails
 */

export const EMAIL_ROUTING = {
  /**
   * English form recipients
   */
  EN: {
    primary: process.env.EMAIL_ROUTING_EN_PRIMARY || 'taxgenius.taxes@gmail.com',  // Ray Hamilton
    cc: process.env.EMAIL_ROUTING_EN_CC || process.env.EMAIL_ADMIN_CC || 'taxgenius.tax@gmail.com',  // Owliver Owl
    recipientName: 'Ray',
  },

  /**
   * Spanish form recipients
   */
  ES: {
    primary: process.env.EMAIL_ROUTING_ES_PRIMARY || 'Goldenprotaxes@gmail.com',  // Ale Hamilton
    cc: process.env.EMAIL_ROUTING_ES_CC || process.env.EMAIL_ADMIN_CC || 'taxgenius.tax@gmail.com',  // Owliver Owl
    recipientName: 'Ale',
  },

  /**
   * Admin email for system notifications
   */
  ADMIN: process.env.EMAIL_ADMIN || 'taxgenius.tax@gmail.com',
} as const;

/**
 * Get email recipients based on locale
 *
 * @param locale - Language locale ('en' or 'es')
 * @returns Object with primary and cc email addresses
 *
 * @example
 * const recipients = getEmailRecipients('es');
 * // Returns: { primary: 'Goldenprotaxes@gmail.com', cc: 'taxgenius.tax@gmail.com' }
 */
export function getEmailRecipients(locale: 'en' | 'es' = 'en') {
  return locale === 'es' ? EMAIL_ROUTING.ES : EMAIL_ROUTING.EN;
}

/**
 * Type for email recipient configuration
 */
export type EmailRecipients = {
  primary: string;
  cc: string;
  recipientName: string;
};
