/**
 * FedEx Ultra-Integration Module
 * Enhanced FedEx shipping with WooCommerce-grade capabilities
 *
 * @module fedex
 * @version 2.0.0
 * @author Winston (Architect)
 * @date October 15, 2025
 */

// Main Provider
export { FedExProviderEnhanced } from '../providers/fedex-enhanced'

// Services
export {
  FEDEX_SERVICES,
  FedExServiceCategory,
  getDomesticServices,
  getInternationalServices,
  getServicesByCategory,
  getExpressServices,
  getGroundServices,
  getFreightServices,
  getSmartPostServices,
  getServiceByCode,
  getServicesForWeight,
  recommendServices,
  type FedExService,
  type ServiceRequirements,
} from './services'

// Box Packing
export {
  FEDEX_BOXES,
  FedExBoxType,
  getAllBoxes,
  getBoxesByType,
  getBoxById,
  findSuitableBoxes,
  findSmallestBox,
  getBoxVolume,
  getUsableVolume,
  isPosterDimensions,
  recommendBoxForProduct,
  type FedExBox,
} from './box-definitions'

export {
  packItems,
  convertToShippingPackages,
  formatPackingResult,
  type PackItem,
  type PackedBox,
  type PackingResult,
  type PackingOptions,
  type ShippingPackage,
} from './box-packer'

// Error Handling
export {
  FedExError,
  FedExErrorHandler,
  ERROR_CODES,
  DEFAULT_RETRY_CONFIG,
  withRetry,
  type RetryConfig,
} from './error-handler'

// SmartPost
export {
  SMARTPOST_HUBS,
  getAllSmartPostHubs,
  findNearestHub,
  getHubById,
  isStateServedBySmartPost,
  getAllServedStates,
} from './smartpost-hubs'

// Freight
export {
  FREIGHT_CLASSES,
  calculateDensity,
  determineFreightClass,
  getFreightClassForPackage,
  requiresFreight,
  calculatePallets,
  buildFreightShipmentDetail,
  estimateFreightCost,
  getRecommendedFreightServices,
  getFreightClassForPrintProduct,
  isResidentialFreightAvailable,
  calculateResidentialFreightSurcharge,
  type FreightClass,
  type FreightShipmentDetail,
} from './freight'

// TypeScript Types
export type {
  ShippingAddress,
  ShippingDimensions,
  ShippingRate,
  ShippingLabel,
  TrackingInfo,
  TrackingEvent,
  FedExAuthToken,
  FedExRateRequest,
  FedExRateResponse,
  FedExRateReplyDetail,
  FedExAddress,
  FedExContact,
  FedExPackageLineItem,
  FedExAlert,
  FedExError as FedExApiError,
  FedExAuthConfig,
  FedExLabelRequest,
  AddressValidationRequest,
  AddressValidationResponse,
  SmartPostHub,
  FedExCarrierSettings,
  FedExApiError as FedExErrorType,
  FedExErrorCode,
  RateCalculationOptions,
  RateSurcharge,
} from './types'

/**
 * Quick Start Example
 *
 * ```typescript
 * import { FedExProviderEnhanced, packItems, getServiceByCode } from '@/lib/shipping/fedex'
 *
 * // Initialize provider
 * const fedex = new FedExProviderEnhanced({
 *   clientId: process.env.FEDEX_API_KEY,
 *   clientSecret: process.env.FEDEX_SECRET_KEY,
 *   accountNumber: process.env.FEDEX_ACCOUNT_NUMBER,
 *   testMode: false,
 *   markupPercentage: 0,
 *   useIntelligentPacking: true,
 * })
 *
 * // Get rates with intelligent packing
 * const rates = await fedex.getRates(fromAddress, toAddress, packages)
 *
 * // Create label
 * const label = await fedex.createLabel(fromAddress, toAddress, packages, 'FEDEX_GROUND')
 *
 * // Track shipment
 * const tracking = await fedex.track('1234567890')
 * ```
 *
 * Features:
 * - ✅ 30+ FedEx services (Express, Ground, Freight, SmartPost, International)
 * - ✅ Intelligent box packing (14 FedEx box types, 3D bin packing)
 * - ✅ Enterprise error handling (retry, token refresh, exponential backoff)
 * - ✅ Freight support (LTL, NMFC classes, pallet calculations)
 * - ✅ SmartPost support (27 US hubs, USPS last-mile)
 * - ✅ Multi-rate-type support (LIST/ACCOUNT/PREFERRED)
 * - ✅ Residential detection and surcharges
 * - ✅ International shipping
 *
 * Documentation:
 * - Implementation Guide: `/docs/FEDEX-ULTRA-INTEGRATION-GUIDE.md`
 * - Status Report: `/docs/FEDEX-ULTRA-INTEGRATION-STATUS.md`
 * - WooCommerce Analysis: Based on WooCommerce FedEx Plugin 4.4.6
 */

// Version info
export const FEDEX_MODULE_VERSION = '2.0.0'
export const FEDEX_MODULE_DATE = '2025-10-15'
export const FEDEX_MODULE_AUTHOR = 'Winston (Architect)'
export const FEDEX_MODULE_BASED_ON = 'WooCommerce FedEx Plugin 4.4.6'
