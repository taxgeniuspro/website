/**
 * Google Analytics Window Functions
 * Type declarations for custom tracking functions
 */

interface Window {
  /**
   * Track referral link click
   */
  trackReferralClick?: (trackingCode: string, materialType?: string) => void;

  /**
   * Track QR code scan
   */
  trackQRScan?: (trackingCode: string, location?: string) => void;

  /**
   * Track lead generation
   */
  trackLeadGeneration?: (trackingCode: string, leadType?: string) => void;

  /**
   * Track conversion (signup, intake, tax return)
   */
  trackConversion?: (trackingCode: string, conversionType: string, value?: number) => void;

  /**
   * Track revenue attribution
   */
  trackRevenue?: (trackingCode: string, amount: number, source?: string) => void;

  /**
   * Track tracking code customization
   */
  trackCodeCustomization?: (oldCode: string, newCode: string) => void;
}
