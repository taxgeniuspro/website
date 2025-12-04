/**
 * Mobile Detection Utilities
 *
 * Utilities for detecting mobile devices and handling mobile-specific logic
 */

/**
 * Detect if user is on a mobile device (server-side)
 */
export function isMobileDevice(userAgent: string): boolean {
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent);
}

/**
 * Detect if user is on a tablet device
 */
export function isTabletDevice(userAgent: string): boolean {
  const tabletRegex = /iPad|Android(?!.*Mobile)/i;
  return tabletRegex.test(userAgent);
}

/**
 * Detect if user is on a mobile phone (not tablet)
 */
export function isMobilePhone(userAgent: string): boolean {
  return isMobileDevice(userAgent) && !isTabletDevice(userAgent);
}

/**
 * Get device type
 */
export function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  if (isMobilePhone(userAgent)) return 'mobile';
  if (isTabletDevice(userAgent)) return 'tablet';
  return 'desktop';
}

/**
 * Check if user prefers mobile hub (check cookie)
 */
export function shouldUseMobileHub(userAgent: string, cookies?: any): boolean {
  // Check if user explicitly disabled mobile hub
  if (cookies?.mobile_hub_disabled === 'true') {
    return false;
  }

  // Auto-enable for mobile phones
  return isMobilePhone(userAgent);
}
