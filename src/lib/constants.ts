/**
 * Application Constants
 *
 * Centralized constants to avoid magic numbers throughout the codebase.
 * All hardcoded values should be defined here for maintainability.
 */

// ============================================
// TIMING CONSTANTS (milliseconds)
// ============================================

/** Standard delay for toast/notification auto-dismiss */
export const TOAST_DISMISS_DELAY = 2000;

/** Delay before showing PWA install prompt to user */
export const PWA_INSTALL_PROMPT_DELAY = 30000;

/** Delay before showing notification permission prompt */
export const NOTIFICATION_PROMPT_DELAY = 5000;

/** Short delay for UI feedback */
export const SHORT_DELAY = 2000;

/** Debounce delay for input validation (e.g., checking availability) */
export const INPUT_DEBOUNCE_DELAY = 500;

// ============================================
// FORM FIELD CONSTRAINTS
// ============================================

/** Social Security Number format length (with dashes: xxx-xx-xxxx) */
export const SSN_MAX_LENGTH = 11;

/** IRS PIN length */
export const IRS_PIN_LENGTH = 6;

/** Maximum length for custom names (e.g., QR poster names) */
export const CUSTOM_NAME_MAX_LENGTH = 50;

/** Maximum length for vanity URLs */
export const VANITY_URL_MAX_LENGTH = 50;

/** Tracking code constraints */
export const TRACKING_CODE = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 20,
} as const;

/** Short link code constraints */
export const SHORT_LINK_CODE = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 30,
  PATTERN: /^[a-z][a-z0-9-]*$/,
} as const;

/** Link metadata constraints */
export const LINK_METADATA = {
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  CAMPAIGN_MAX_LENGTH: 100,
} as const;

// ============================================
// VALIDATION LENGTHS
// ============================================

/** Standard input field max lengths */
export const INPUT_LENGTH = {
  SHORT: 50,
  MEDIUM: 100,
  LONG: 500,
  VERY_LONG: 1000,
} as const;

// ============================================
// UI/UX CONSTANTS
// ============================================

/** Number of skeleton loaders to show during data fetch */
export const SKELETON_COUNT = 5;

/** Default pagination limits */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

// ============================================
// BUSINESS LOGIC CONSTANTS
// ============================================

/** Minimum payout threshold (in cents) */
export const MIN_PAYOUT_THRESHOLD = 5000; // $50.00

/** Commission rates (as percentages) */
export const COMMISSION_RATES = {
  REFERRER: 0.1, // 10%
  AFFILIATE: 0.15, // 15%
  TAX_PREPARER: 0.7, // 70%
} as const;

// ============================================
// SERVICE ENDPOINTS
// ============================================

/** External service endpoints */
export const SERVICE_ENDPOINTS = {
  N8N_BASE: process.env.N8N_BASE || 'http://localhost:5678',
} as const;

/** Advance loan percentages */
export const ADVANCE_LOAN = {
  MIN_PERCENTAGE: 0.5, // 50%
  MAX_PERCENTAGE: 0.8, // 80%
} as const;

// ============================================
// FILE STORAGE CONSTANTS
// ============================================

/** Maximum file sizes (in bytes) */
export const FILE_SIZE = {
  MAX_IMAGE: 5 * 1024 * 1024, // 5MB
  MAX_DOCUMENT: 10 * 1024 * 1024, // 10MB
  MAX_CSV: 2 * 1024 * 1024, // 2MB
} as const;

/** Allowed file types */
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  CSV: ['text/csv', 'application/vnd.ms-excel'],
} as const;

// ============================================
// ANIMATION CONSTANTS
// ============================================

/** Standard animation durations (milliseconds) */
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// ============================================
// QR CODE CONSTANTS
// ============================================

/** QR code generation settings */
export const QR_CODE = {
  SIZE: 160,
  ERROR_CORRECTION: 'H' as const,
  INCLUDE_MARGIN: true,
} as const;

// ============================================
// RETRY LOGIC CONSTANTS
// ============================================

/** API retry configuration */
export const RETRY = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 10000, // 10 seconds
  BACKOFF_MULTIPLIER: 2,
} as const;

// ============================================
// CACHE DURATIONS (seconds)
// ============================================

export const CACHE_DURATION = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

// ============================================
// HTTP STATUS CODES
// ============================================

/** Commonly used HTTP status codes */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================
// REGEX PATTERNS
// ============================================

/** Common validation patterns */
export const REGEX_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
  ZIP_CODE: /^\d{5}(-\d{4})?$/,
  SSN: /^\d{3}-\d{2}-\d{4}$/,
  TRACKING_CODE: /^[a-zA-Z0-9_-]{3,20}$/,
  SLUG: /^[a-z0-9-]+$/,
} as const;

// ============================================
// ENVIRONMENT CONSTANTS
// ============================================

/** Environment detection helpers */
export const ENV = {
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',
} as const;
