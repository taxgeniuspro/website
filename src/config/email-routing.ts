/**
 * Centralized Email Routing Configuration
 *
 * Defines email recipients for all form submissions based on language/locale.
 *
 * @configuration
 * - English forms go to Ray Hamilton (taxgenius.taxes@gmail.com) with CC to Owliver Owl
 * - Spanish forms go to Ale Hamilton (Goldenprotaxes@gmail.com) with CC to Owliver Owl
 */

export const EMAIL_ROUTING = {
  /**
   * English form recipients
   */
  EN: {
    primary: 'taxgenius.taxes@gmail.com',  // Ray Hamilton - Tax Preparer on behalf of Owliver Owl
    cc: 'taxgenius.tax@gmail.com',          // Owliver Owl - Courtesy copy
    recipientName: 'Ray',                   // First name for personalized greeting
  },

  /**
   * Spanish form recipients
   */
  ES: {
    primary: 'Goldenprotaxes@gmail.com',    // Ale Hamilton - Tax Preparer on behalf of Owliver Owl
    cc: 'taxgenius.tax@gmail.com',          // Owliver Owl - Courtesy copy
    recipientName: 'Ale',                   // First name for personalized greeting
  },
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
