/**
 * Google Analytics 4 (GA4) Integration
 *
 * Event tracking utilities for lead attribution, conversions, and user behavior
 * Tracks the complete referral funnel from visit to conversion
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 7
 */

import { logger } from '@/lib/logger';

// GA4 Measurement ID from environment
export const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

/**
 * Check if GA4 is properly configured
 */
export function isGA4Enabled(): boolean {
  return Boolean(GA4_MEASUREMENT_ID && typeof window !== 'undefined' && (window as any).gtag);
}

/**
 * Initialize GA4 with referrer tracking
 */
export function initGA4(referrerUsername?: string) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    // Send page view with referrer context
    gtag('config', GA4_MEASUREMENT_ID, {
      page_title: document.title,
      page_location: window.location.href,
      ...(referrerUsername && {
        referrer_username: referrerUsername,
        traffic_source: 'referral_link',
      }),
    });

    // Set custom dimension for referrer
    if (referrerUsername) {
      gtag('set', 'user_properties', {
        referrer_username: referrerUsername,
      });
    }

    logger.info('GA4 initialized', { referrerUsername, measurementId: GA4_MEASUREMENT_ID });
  } catch (error) {
    logger.error('GA4 initialization failed', { error });
  }
}

/**
 * Track page view with referrer context
 */
export function trackPageView(pagePath: string, referrerUsername?: string) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: document.title,
      ...(referrerUsername && {
        referrer_username: referrerUsername,
      }),
    });

    logger.info('GA4 page view tracked', { pagePath, referrerUsername });
  } catch (error) {
    logger.error('GA4 page view tracking failed', { error });
  }
}

/**
 * Track referral link visit
 * Fired when user lands via a referral link
 */
export function trackReferralVisit(referrerUsername: string, source?: string) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'referral_visit', {
      event_category: 'Referral',
      event_label: referrerUsername,
      referrer_username: referrerUsername,
      traffic_source: source || 'direct',
      value: 1,
    });

    logger.info('GA4 referral visit tracked', { referrerUsername, source });
  } catch (error) {
    logger.error('GA4 referral visit tracking failed', { error });
  }
}

/**
 * Track form start
 * Fired when user begins filling out a lead form
 */
export function trackFormStart(formType: string, referrerUsername?: string) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'form_start', {
      event_category: 'Lead Generation',
      event_label: formType,
      form_type: formType,
      ...(referrerUsername && {
        referrer_username: referrerUsername,
      }),
    });

    logger.info('GA4 form start tracked', { formType, referrerUsername });
  } catch (error) {
    logger.error('GA4 form start tracking failed', { error });
  }
}

/**
 * Track lead submission
 * Fired when a lead form is successfully submitted
 */
export function trackLeadSubmission(data: {
  leadId: string;
  leadType: string;
  referrerUsername?: string;
  attributionMethod: string;
  source?: string;
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'generate_lead', {
      event_category: 'Lead Generation',
      event_label: data.leadType,
      lead_id: data.leadId,
      lead_type: data.leadType,
      attribution_method: data.attributionMethod,
      ...(data.referrerUsername && {
        referrer_username: data.referrerUsername,
      }),
      ...(data.source && {
        traffic_source: data.source,
      }),
      value: 1,
    });

    logger.info('GA4 lead submission tracked', data);
  } catch (error) {
    logger.error('GA4 lead submission tracking failed', { error });
  }
}

/**
 * Track lead qualification
 * Fired when a lead is qualified by staff
 */
export function trackLeadQualification(data: {
  leadId: string;
  leadType: string;
  referrerUsername?: string;
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'lead_qualified', {
      event_category: 'Lead Qualification',
      event_label: data.leadType,
      lead_id: data.leadId,
      lead_type: data.leadType,
      ...(data.referrerUsername && {
        referrer_username: data.referrerUsername,
      }),
      value: 5,
    });

    logger.info('GA4 lead qualification tracked', data);
  } catch (error) {
    logger.error('GA4 lead qualification tracking failed', { error });
  }
}

/**
 * Track lead conversion
 * Fired when a lead becomes a paying customer
 */
export function trackLeadConversion(data: {
  leadId: string;
  leadType: string;
  referrerUsername?: string;
  commissionAmount?: number;
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'conversion', {
      event_category: 'Conversion',
      event_label: data.leadType,
      lead_id: data.leadId,
      lead_type: data.leadType,
      send_to: GA4_MEASUREMENT_ID,
      ...(data.referrerUsername && {
        referrer_username: data.referrerUsername,
      }),
      ...(data.commissionAmount && {
        value: data.commissionAmount,
        currency: 'USD',
      }),
    });

    // Also fire purchase event for e-commerce tracking
    if (data.commissionAmount) {
      gtag('event', 'purchase', {
        transaction_id: data.leadId,
        value: data.commissionAmount,
        currency: 'USD',
        items: [
          {
            item_id: data.leadId,
            item_name: `${data.leadType} Conversion`,
            item_category: 'Referral Commission',
            price: data.commissionAmount,
            quantity: 1,
          },
        ],
      });
    }

    logger.info('GA4 lead conversion tracked', data);
  } catch (error) {
    logger.error('GA4 lead conversion tracking failed', { error });
  }
}

/**
 * Track affiliate application submission
 */
export function trackAffiliateApplication(data: {
  email: string;
  bondedToPreparer: boolean;
  preparerUsername?: string;
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'affiliate_application', {
      event_category: 'Application',
      event_label: data.bondedToPreparer ? 'Bonded' : 'Independent',
      bonded_to_preparer: data.bondedToPreparer,
      ...(data.preparerUsername && {
        preparer_username: data.preparerUsername,
      }),
    });

    logger.info('GA4 affiliate application tracked', data);
  } catch (error) {
    logger.error('GA4 affiliate application tracking failed', { error });
  }
}

/**
 * Track commission payout request
 */
export function trackPayoutRequest(data: {
  amount: number;
  paymentMethod: string;
  referrerUsername: string;
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'payout_request', {
      event_category: 'Payout',
      event_label: data.paymentMethod,
      value: data.amount,
      currency: 'USD',
      payment_method: data.paymentMethod,
      referrer_username: data.referrerUsername,
    });

    logger.info('GA4 payout request tracked', data);
  } catch (error) {
    logger.error('GA4 payout request tracking failed', { error });
  }
}

/**
 * Track marketing material click
 */
export function trackMarketingClick(data: {
  materialType: string;
  materialId: string;
  referrerUsername: string;
  destination: string;
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'marketing_click', {
      event_category: 'Marketing',
      event_label: data.materialType,
      material_type: data.materialType,
      material_id: data.materialId,
      referrer_username: data.referrerUsername,
      destination: data.destination,
    });

    logger.info('GA4 marketing click tracked', data);
  } catch (error) {
    logger.error('GA4 marketing click tracking failed', { error });
  }
}

/**
 * Track QR code scan
 */
export function trackQRScan(data: { referrerUsername: string; location?: string }) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'qr_scan', {
      event_category: 'Engagement',
      event_label: 'QR Code Scan',
      referrer_username: data.referrerUsername,
      ...(data.location && {
        scan_location: data.location,
      }),
    });

    logger.info('GA4 QR scan tracked', data);
  } catch (error) {
    logger.error('GA4 QR scan tracking failed', { error });
  }
}

/**
 * Track user engagement with dashboard features
 */
export function trackDashboardAction(action: string, details?: Record<string, any>) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'dashboard_action', {
      event_category: 'Dashboard',
      event_label: action,
      action,
      ...details,
    });

    logger.info('GA4 dashboard action tracked', { action, details });
  } catch (error) {
    logger.error('GA4 dashboard action tracking failed', { error });
  }
}

/**
 * Track custom event
 */
export function trackCustomEvent(eventName: string, parameters?: Record<string, any>) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;
    gtag('event', eventName, parameters);

    logger.info('GA4 custom event tracked', { eventName, parameters });
  } catch (error) {
    logger.error('GA4 custom event tracking failed', { error });
  }
}

// ============================================================
// CRM TRACKING FUNCTIONS (Epic 7 - Story 7.1)
// ============================================================

/**
 * NOTE: These CRM tracking functions are for CLIENT-SIDE use only.
 * For server-side tracking (API routes, service layer), these events
 * should be triggered from the client after successful API responses.
 *
 * Server-side components should log events using the logger, and
 * client components should call these functions after mutations.
 */

/**
 * Track CRM contact creation
 * Fired when a new contact is added to the CRM
 */
export function trackCRMContactCreated(data: {
  contactId: string;
  contactType: string;
  source?: string;
  referrerUsername?: string;
  attributionMethod?: string;
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'crm_contact_created', {
      event_category: 'CRM',
      event_label: data.contactType,
      contact_id: data.contactId,
      contact_type: data.contactType,
      ...(data.source && { source: data.source }),
      ...(data.referrerUsername && { referrer_username: data.referrerUsername }),
      ...(data.attributionMethod && { attribution_method: data.attributionMethod }),
      value: 1,
    });

    logger.info('GA4 CRM contact created tracked', data);
  } catch (error) {
    logger.error('GA4 CRM contact created tracking failed', { error });
  }
}

/**
 * Track CRM contact update
 * Fired when contact information is modified
 */
export function trackCRMContactUpdated(data: {
  contactId: string;
  contactType: string;
  updatedFields: string[];
  userRole: string;
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'crm_contact_updated', {
      event_category: 'CRM',
      event_label: data.contactType,
      contact_id: data.contactId,
      contact_type: data.contactType,
      updated_fields: data.updatedFields.join(','),
      user_role: data.userRole,
    });

    logger.info('GA4 CRM contact updated tracked', data);
  } catch (error) {
    logger.error('GA4 CRM contact updated tracking failed', { error });
  }
}

/**
 * Track CRM contact assignment
 * Fired when contact is assigned to a preparer
 */
export function trackCRMContactAssigned(data: {
  contactId: string;
  contactType: string;
  preparerId: string;
  assignedBy: string;
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'crm_contact_assigned', {
      event_category: 'CRM',
      event_label: 'Contact Assignment',
      contact_id: data.contactId,
      contact_type: data.contactType,
      preparer_id: data.preparerId,
      assigned_by: data.assignedBy,
    });

    logger.info('GA4 CRM contact assigned tracked', data);
  } catch (error) {
    logger.error('GA4 CRM contact assigned tracking failed', { error });
  }
}

/**
 * Track CRM pipeline stage change
 * Fired when contact moves through pipeline stages
 */
export function trackCRMStageChanged(data: {
  contactId: string;
  contactType: string;
  fromStage: string;
  toStage: string;
  timeInStage?: number; // minutes
  userRole: string;
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'crm_stage_changed', {
      event_category: 'CRM Pipeline',
      event_label: `${data.fromStage} → ${data.toStage}`,
      contact_id: data.contactId,
      contact_type: data.contactType,
      from_stage: data.fromStage,
      to_stage: data.toStage,
      user_role: data.userRole,
      ...(data.timeInStage && { time_in_stage_minutes: data.timeInStage }),
      value: 1,
    });

    logger.info('GA4 CRM stage changed tracked', data);
  } catch (error) {
    logger.error('GA4 CRM stage changed tracking failed', { error });
  }
}

/**
 * Track CRM interaction logged
 * Fired when phone call, email, meeting, or note is logged
 */
export function trackCRMInteractionLogged(data: {
  interactionId: string;
  contactId: string;
  contactType: string;
  interactionType: string; // EMAIL | PHONE_CALL | MEETING | NOTE
  direction: string; // INBOUND | OUTBOUND
  duration?: number; // minutes (for calls/meetings)
  userRole: string;
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'crm_interaction_logged', {
      event_category: 'CRM Interaction',
      event_label: data.interactionType,
      interaction_id: data.interactionId,
      contact_id: data.contactId,
      contact_type: data.contactType,
      interaction_type: data.interactionType,
      direction: data.direction,
      user_role: data.userRole,
      ...(data.duration && { duration_minutes: data.duration }),
      value: 1,
    });

    logger.info('GA4 CRM interaction logged tracked', data);
  } catch (error) {
    logger.error('GA4 CRM interaction logged tracking failed', { error });
  }
}

/**
 * Track CRM email sync
 * Fired when email is automatically synced from Resend
 */
export function trackCRMEmailSynced(data: {
  emailId: string;
  contactId: string;
  contactType: string;
  emailThreadId?: string;
  syncMethod: string; // 'webhook' | 'manual'
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'crm_email_synced', {
      event_category: 'CRM Email Sync',
      event_label: data.syncMethod,
      email_id: data.emailId,
      contact_id: data.contactId,
      contact_type: data.contactType,
      sync_method: data.syncMethod,
      ...(data.emailThreadId && { thread_id: data.emailThreadId }),
    });

    logger.info('GA4 CRM email synced tracked', data);
  } catch (error) {
    logger.error('GA4 CRM email synced tracking failed', { error });
  }
}

/**
 * Track CRM dashboard view
 * Fired when user accesses CRM dashboard
 */
export function trackCRMDashboardViewed(data: {
  userRole: string;
  contactCount?: number;
  filterApplied?: string;
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'crm_dashboard_viewed', {
      event_category: 'CRM Dashboard',
      event_label: data.userRole,
      user_role: data.userRole,
      ...(data.contactCount !== undefined && { contact_count: data.contactCount }),
      ...(data.filterApplied && { filter_applied: data.filterApplied }),
    });

    logger.info('GA4 CRM dashboard viewed tracked', data);
  } catch (error) {
    logger.error('GA4 CRM dashboard viewed tracking failed', { error });
  }
}

/**
 * Track CRM contact detail view
 * Fired when user opens a contact's detail page
 */
export function trackCRMContactViewed(data: {
  contactId: string;
  contactType: string;
  contactStage: string;
  interactionCount?: number;
  userRole: string;
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'crm_contact_viewed', {
      event_category: 'CRM',
      event_label: data.contactType,
      contact_id: data.contactId,
      contact_type: data.contactType,
      contact_stage: data.contactStage,
      user_role: data.userRole,
      ...(data.interactionCount !== undefined && { interaction_count: data.interactionCount }),
    });

    logger.info('GA4 CRM contact viewed tracked', data);
  } catch (error) {
    logger.error('GA4 CRM contact viewed tracking failed', { error });
  }
}

/**
 * Track CRM search performed
 * Fired when user searches contacts
 */
export function trackCRMSearchPerformed(data: {
  searchQuery: string;
  resultCount: number;
  filterApplied?: string;
  userRole: string;
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'crm_search_performed', {
      event_category: 'CRM Search',
      event_label: data.searchQuery.substring(0, 50), // Limit search query length
      search_term: data.searchQuery,
      result_count: data.resultCount,
      user_role: data.userRole,
      ...(data.filterApplied && { filter_applied: data.filterApplied }),
    });

    logger.info('GA4 CRM search performed tracked', data);
  } catch (error) {
    logger.error('GA4 CRM search performed tracking failed', { error });
  }
}

/**
 * Track CRM CSV export
 * Fired when user exports contacts or interactions to CSV
 */
export function trackCRMExportCSV(data: {
  exportType: string; // 'contacts' | 'interactions'
  recordCount: number;
  filterApplied?: string;
  userRole: string;
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'crm_export_csv', {
      event_category: 'CRM Export',
      event_label: data.exportType,
      export_type: data.exportType,
      record_count: data.recordCount,
      user_role: data.userRole,
      ...(data.filterApplied && { filter_applied: data.filterApplied }),
    });

    logger.info('GA4 CRM export CSV tracked', data);
  } catch (error) {
    logger.error('GA4 CRM export CSV tracking failed', { error });
  }
}

// ============================================================
// I18N / LANGUAGE TRACKING FUNCTIONS
// ============================================================

/**
 * Track language switch
 * Fired when user changes site language
 */
export function trackLanguageSwitch(data: {
  fromLocale: string;
  toLocale: string;
  currentPage: string;
  switchMethod: 'header_dropdown' | 'mobile_menu' | 'footer_compact' | 'custom';
  userAuthenticated?: boolean;
  userRole?: string;
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'language_switch', {
      event_category: 'Localization',
      event_label: `${data.fromLocale} → ${data.toLocale}`,
      from_locale: data.fromLocale,
      to_locale: data.toLocale,
      current_page: data.currentPage,
      switch_method: data.switchMethod,
      ...(data.userAuthenticated !== undefined && {
        user_authenticated: data.userAuthenticated,
      }),
      ...(data.userRole && { user_role: data.userRole }),
      value: 1,
    });

    logger.info('GA4 language switch tracked', data);
  } catch (error) {
    logger.error('GA4 language switch tracking failed', { error });
  }
}

/**
 * Track language preference
 * Fired when language preference is detected or set
 */
export function trackLanguagePreference(data: {
  preferredLocale: string;
  detectionMethod: 'browser' | 'cookie' | 'user_selection' | 'default';
  browserLanguage?: string;
}) {
  if (!isGA4Enabled()) return;

  try {
    const gtag = (window as any).gtag;

    gtag('event', 'language_preference', {
      event_category: 'Localization',
      event_label: data.preferredLocale,
      preferred_locale: data.preferredLocale,
      detection_method: data.detectionMethod,
      ...(data.browserLanguage && { browser_language: data.browserLanguage }),
    });

    logger.info('GA4 language preference tracked', data);
  } catch (error) {
    logger.error('GA4 language preference tracking failed', { error });
  }
}
