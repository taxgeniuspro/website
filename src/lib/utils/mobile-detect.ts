/**
 * Mobile Detection Utilities
 *
 * Utilities for detecting mobile devices and handling mobile-specific logic
 */

/**
 * Detect if user is on a mobile device (server-side)
 * Matches Android, iOS, BlackBerry, Windows Phone, and Opera Mini
 * @param userAgent - The user agent string from the request headers
 * @returns True if the user agent matches a mobile device pattern
 */
export function isMobileDevice(userAgent: string): boolean {
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent);
}

/**
 * Detect if user is on a tablet device
 * Matches iPad and Android tablets (Android without Mobile suffix)
 * @param userAgent - The user agent string from the request headers
 * @returns True if the user agent matches a tablet device pattern
 */
export function isTabletDevice(userAgent: string): boolean {
  const tabletRegex = /iPad|Android(?!.*Mobile)/i;
  return tabletRegex.test(userAgent);
}

/**
 * Detect if user is on a mobile phone (not tablet)
 * Returns true for mobile devices that are NOT tablets
 * @param userAgent - The user agent string from the request headers
 * @returns True if mobile device but not a tablet
 */
export function isMobilePhone(userAgent: string): boolean {
  return isMobileDevice(userAgent) && !isTabletDevice(userAgent);
}

/**
 * Get device type from user agent
 * @param userAgent - The user agent string from the request headers
 * @returns Device type: 'mobile' for phones, 'tablet' for tablets, 'desktop' otherwise
 */
export function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  if (isMobilePhone(userAgent)) return 'mobile';
  if (isTabletDevice(userAgent)) return 'tablet';
  return 'desktop';
}

/**
 * Check if user should see the mobile-optimized hub interface
 * Respects user preference via cookie, defaults to auto-detect for phones
 * @param userAgent - The user agent string from the request headers
 * @param cookies - Optional cookies object to check for user preference
 * @returns True if mobile hub should be shown
 */
export function shouldUseMobileHub(userAgent: string, cookies?: any): boolean {
  // Check if user explicitly disabled mobile hub
  if (cookies?.mobile_hub_disabled === 'true') {
    return false;
  }

  // Auto-enable for mobile phones
  return isMobilePhone(userAgent);
}
