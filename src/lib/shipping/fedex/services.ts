/**
 * FedEx Service Catalog
 * Complete service definitions based on WooCommerce FedEx Plugin 4.4.6
 *
 * Service Types:
 * - Express Domestic (overnight, 2-day)
 * - Ground Domestic (standard ground)
 * - Freight (LTL shipments)
 * - SmartPost (economy with USPS last mile)
 * - International (cross-border)
 */

export enum FedExServiceCategory {
  EXPRESS = 'express',
  GROUND = 'ground',
  FREIGHT = 'freight',
  SMARTPOST = 'smartpost',
  INTERNATIONAL = 'international',
}

export interface FedExService {
  code: string
  name: string
  displayName: string
  category: FedExServiceCategory
  description: string

  // Availability
  domestic: boolean
  international: boolean

  // Speed & Reliability
  estimatedDaysMin: number
  estimatedDaysMax: number
  isGuaranteed: boolean

  // Weight & Size Limits
  maxWeightLbs: number
  maxLengthInches?: number

  // Special Features
  requiresSignature: boolean
  allowsResidential: boolean
  allowsHoldAtLocation: boolean
  allowsSaturdayDelivery: boolean

  // Pricing
  premiumMultiplier: number // 1.0 = base, 2.0 = double cost

  // API Configuration
  carrierCode: 'FDXE' | 'FDXG' | 'FXSP' | 'FXFR' // Express, Ground, SmartPost, Freight
  apiServiceType: string // Exact FedEx API service code
}

/**
 * Complete FedEx Service Catalog
 * Based on WooCommerce data-service-codes.php
 */
export const FEDEX_SERVICES: Record<string, FedExService> = {
  // ============================================================================
  // EXPRESS DOMESTIC SERVICES (FDXE)
  // ============================================================================

  FIRST_OVERNIGHT: {
    code: 'FIRST_OVERNIGHT',
    name: 'First Overnight',
    displayName: 'FedEx First Overnight',
    category: FedExServiceCategory.EXPRESS,
    description: 'Next business day by 8:00 AM, 8:30 AM, or 9:00 AM',
    domestic: true,
    international: false,
    estimatedDaysMin: 1,
    estimatedDaysMax: 1,
    isGuaranteed: true,
    maxWeightLbs: 150,
    requiresSignature: true,
    allowsResidential: true,
    allowsHoldAtLocation: true,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 3.5,
    carrierCode: 'FDXE',
    apiServiceType: 'FIRST_OVERNIGHT',
  },

  PRIORITY_OVERNIGHT: {
    code: 'PRIORITY_OVERNIGHT',
    name: 'Priority Overnight',
    displayName: 'FedEx Priority Overnight',
    category: FedExServiceCategory.EXPRESS,
    description: 'Next business day by 10:30 AM (most areas)',
    domestic: true,
    international: false,
    estimatedDaysMin: 1,
    estimatedDaysMax: 1,
    isGuaranteed: true,
    maxWeightLbs: 150,
    requiresSignature: true,
    allowsResidential: true,
    allowsHoldAtLocation: true,
    allowsSaturdayDelivery: true,
    premiumMultiplier: 2.8,
    carrierCode: 'FDXE',
    apiServiceType: 'PRIORITY_OVERNIGHT',
  },

  STANDARD_OVERNIGHT: {
    code: 'STANDARD_OVERNIGHT',
    name: 'Standard Overnight',
    displayName: 'FedEx Standard Overnight',
    category: FedExServiceCategory.EXPRESS,
    description: 'Next business day by 3:00 PM (most areas)',
    domestic: true,
    international: false,
    estimatedDaysMin: 1,
    estimatedDaysMax: 1,
    isGuaranteed: false,
    maxWeightLbs: 150,
    requiresSignature: false,
    allowsResidential: true,
    allowsHoldAtLocation: true,
    allowsSaturdayDelivery: true,
    premiumMultiplier: 2.2,
    carrierCode: 'FDXE',
    apiServiceType: 'STANDARD_OVERNIGHT',
  },

  FEDEX_2_DAY_AM: {
    code: 'FEDEX_2_DAY_AM',
    name: '2Day A.M.',
    displayName: 'FedEx 2Day A.M.',
    category: FedExServiceCategory.EXPRESS,
    description: 'Second business day by 10:30 AM',
    domestic: true,
    international: false,
    estimatedDaysMin: 2,
    estimatedDaysMax: 2,
    isGuaranteed: true,
    maxWeightLbs: 150,
    requiresSignature: false,
    allowsResidential: true,
    allowsHoldAtLocation: true,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 1.8,
    carrierCode: 'FDXE',
    apiServiceType: 'FEDEX_2_DAY_AM',
  },

  FEDEX_2_DAY: {
    code: 'FEDEX_2_DAY',
    name: '2Day',
    displayName: 'FedEx 2Day',
    category: FedExServiceCategory.EXPRESS,
    description: 'Second business day by end of day',
    domestic: true,
    international: false,
    estimatedDaysMin: 2,
    estimatedDaysMax: 2,
    isGuaranteed: true,
    maxWeightLbs: 150,
    requiresSignature: false,
    allowsResidential: true,
    allowsHoldAtLocation: true,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 1.5,
    carrierCode: 'FDXE',
    apiServiceType: 'FEDEX_2_DAY',
  },

  FEDEX_EXPRESS_SAVER: {
    code: 'FEDEX_EXPRESS_SAVER',
    name: 'Express Saver',
    displayName: 'FedEx Express Saver',
    category: FedExServiceCategory.EXPRESS,
    description: 'Third business day by 3:00 PM',
    domestic: true,
    international: false,
    estimatedDaysMin: 3,
    estimatedDaysMax: 3,
    isGuaranteed: true,
    maxWeightLbs: 150,
    requiresSignature: false,
    allowsResidential: true,
    allowsHoldAtLocation: true,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 1.3,
    carrierCode: 'FDXE',
    apiServiceType: 'FEDEX_EXPRESS_SAVER',
  },

  // ============================================================================
  // GROUND DOMESTIC SERVICES (FDXG)
  // ============================================================================

  FEDEX_GROUND: {
    code: 'FEDEX_GROUND',
    name: 'Ground',
    displayName: 'FedEx Ground',
    category: FedExServiceCategory.GROUND,
    description: '1-5 business days (business addresses)',
    domestic: true,
    international: false,
    estimatedDaysMin: 1,
    estimatedDaysMax: 5,
    isGuaranteed: false,
    maxWeightLbs: 150,
    requiresSignature: false,
    allowsResidential: true, // FIX: Allow residential (displays as "FedEx Home Delivery" for residential addresses)
    allowsHoldAtLocation: true,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 1.0,
    carrierCode: 'FDXG',
    apiServiceType: 'FEDEX_GROUND',
  },

  GROUND_HOME_DELIVERY: {
    code: 'GROUND_HOME_DELIVERY',
    name: 'Home Delivery',
    displayName: 'FedEx Ground Home Delivery',
    category: FedExServiceCategory.GROUND,
    description: '1-5 business days (residential addresses)',
    domestic: true,
    international: false,
    estimatedDaysMin: 1,
    estimatedDaysMax: 5,
    isGuaranteed: false,
    maxWeightLbs: 150,
    requiresSignature: false,
    allowsResidential: true,
    allowsHoldAtLocation: false,
    allowsSaturdayDelivery: true,
    premiumMultiplier: 1.1, // Slightly higher for residential
    carrierCode: 'FDXG',
    apiServiceType: 'GROUND_HOME_DELIVERY',
  },

  FEDEX_REGIONAL_ECONOMY: {
    code: 'FEDEX_REGIONAL_ECONOMY',
    name: 'Regional Economy',
    displayName: 'FedEx Regional Economy',
    category: FedExServiceCategory.GROUND,
    description: 'Regional ground delivery with discounted pricing',
    domestic: true,
    international: false,
    estimatedDaysMin: 2,
    estimatedDaysMax: 7,
    isGuaranteed: false,
    maxWeightLbs: 70,
    requiresSignature: false,
    allowsResidential: true,
    allowsHoldAtLocation: false,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 0.85, // Cheaper than standard ground
    carrierCode: 'FDXG',
    apiServiceType: 'FEDEX_REGIONAL_ECONOMY',
  },

  // ============================================================================
  // SMARTPOST SERVICES (FXSP) - Economy with USPS Last Mile
  // ============================================================================

  SMART_POST: {
    code: 'SMART_POST',
    name: 'Ground Economy',
    displayName: 'FedEx Ground Economy',
    category: FedExServiceCategory.SMARTPOST,
    description: 'Economy shipping with USPS final delivery (2-7 days)',
    domestic: true,
    international: false,
    estimatedDaysMin: 2,
    estimatedDaysMax: 7,
    isGuaranteed: false,
    maxWeightLbs: 70,
    requiresSignature: false,
    allowsResidential: true,
    allowsHoldAtLocation: false,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 0.7, // Cheapest option
    carrierCode: 'FXSP',
    apiServiceType: 'SMART_POST',
  },

  // ============================================================================
  // FREIGHT SERVICES (LTL)
  // ============================================================================

  FEDEX_1_DAY_FREIGHT: {
    code: 'FEDEX_1_DAY_FREIGHT',
    name: '1 Day Freight',
    displayName: 'FedEx 1 Day Freight',
    category: FedExServiceCategory.FREIGHT,
    description: 'Next business day freight delivery',
    domestic: true,
    international: false,
    estimatedDaysMin: 1,
    estimatedDaysMax: 1,
    isGuaranteed: true,
    maxWeightLbs: 20000,
    requiresSignature: true,
    allowsResidential: true,
    allowsHoldAtLocation: false,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 5.0,
    carrierCode: 'FXFR',
    apiServiceType: 'FEDEX_1_DAY_FREIGHT',
  },

  FEDEX_2_DAY_FREIGHT: {
    code: 'FEDEX_2_DAY_FREIGHT',
    name: '2 Day Freight',
    displayName: 'FedEx 2 Day Freight',
    category: FedExServiceCategory.FREIGHT,
    description: 'Second business day freight delivery',
    domestic: true,
    international: false,
    estimatedDaysMin: 2,
    estimatedDaysMax: 2,
    isGuaranteed: true,
    maxWeightLbs: 20000,
    requiresSignature: true,
    allowsResidential: true,
    allowsHoldAtLocation: false,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 3.5,
    carrierCode: 'FXFR',
    apiServiceType: 'FEDEX_2_DAY_FREIGHT',
  },

  FEDEX_3_DAY_FREIGHT: {
    code: 'FEDEX_3_DAY_FREIGHT',
    name: '3 Day Freight',
    displayName: 'FedEx 3 Day Freight',
    category: FedExServiceCategory.FREIGHT,
    description: 'Third business day freight delivery',
    domestic: true,
    international: false,
    estimatedDaysMin: 3,
    estimatedDaysMax: 3,
    isGuaranteed: true,
    maxWeightLbs: 20000,
    requiresSignature: true,
    allowsResidential: true,
    allowsHoldAtLocation: false,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 2.5,
    carrierCode: 'FXFR',
    apiServiceType: 'FEDEX_3_DAY_FREIGHT',
  },

  FEDEX_FREIGHT_ECONOMY: {
    code: 'FEDEX_FREIGHT_ECONOMY',
    name: 'Freight Economy',
    displayName: 'FedEx Freight Economy',
    category: FedExServiceCategory.FREIGHT,
    description: 'Economy freight delivery (5-7 days)',
    domestic: true,
    international: false,
    estimatedDaysMin: 5,
    estimatedDaysMax: 7,
    isGuaranteed: false,
    maxWeightLbs: 20000,
    requiresSignature: true,
    allowsResidential: true,
    allowsHoldAtLocation: false,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 1.8,
    carrierCode: 'FXFR',
    apiServiceType: 'FEDEX_FREIGHT_ECONOMY',
  },

  FEDEX_FREIGHT_PRIORITY: {
    code: 'FEDEX_FREIGHT_PRIORITY',
    name: 'Freight Priority',
    displayName: 'FedEx Freight Priority',
    category: FedExServiceCategory.FREIGHT,
    description: 'Priority freight delivery (2-4 days)',
    domestic: true,
    international: false,
    estimatedDaysMin: 2,
    estimatedDaysMax: 4,
    isGuaranteed: false,
    maxWeightLbs: 20000,
    requiresSignature: true,
    allowsResidential: true,
    allowsHoldAtLocation: false,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 2.2,
    carrierCode: 'FXFR',
    apiServiceType: 'FEDEX_FREIGHT_PRIORITY',
  },

  FEDEX_NATIONAL_FREIGHT: {
    code: 'FEDEX_NATIONAL_FREIGHT',
    name: 'National Freight',
    displayName: 'FedEx National Freight',
    category: FedExServiceCategory.FREIGHT,
    description: 'Cross-country freight delivery',
    domestic: true,
    international: false,
    estimatedDaysMin: 3,
    estimatedDaysMax: 7,
    isGuaranteed: false,
    maxWeightLbs: 20000,
    requiresSignature: true,
    allowsResidential: false,
    allowsHoldAtLocation: false,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 2.0,
    carrierCode: 'FXFR',
    apiServiceType: 'FEDEX_NATIONAL_FREIGHT',
  },

  // ============================================================================
  // INTERNATIONAL SERVICES
  // ============================================================================

  INTERNATIONAL_ECONOMY: {
    code: 'INTERNATIONAL_ECONOMY',
    name: 'International Economy',
    displayName: 'FedEx International Economy',
    category: FedExServiceCategory.INTERNATIONAL,
    description: 'International delivery in 5-7 business days',
    domestic: false,
    international: true,
    estimatedDaysMin: 5,
    estimatedDaysMax: 7,
    isGuaranteed: false,
    maxWeightLbs: 150,
    requiresSignature: true,
    allowsResidential: true,
    allowsHoldAtLocation: true,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 2.5,
    carrierCode: 'FDXE',
    apiServiceType: 'INTERNATIONAL_ECONOMY',
  },

  INTERNATIONAL_PRIORITY: {
    code: 'INTERNATIONAL_PRIORITY',
    name: 'International Priority',
    displayName: 'FedEx International Priority',
    category: FedExServiceCategory.INTERNATIONAL,
    description: 'International delivery in 3-5 business days',
    domestic: false,
    international: true,
    estimatedDaysMin: 3,
    estimatedDaysMax: 5,
    isGuaranteed: false,
    maxWeightLbs: 150,
    requiresSignature: true,
    allowsResidential: true,
    allowsHoldAtLocation: true,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 3.5,
    carrierCode: 'FDXE',
    apiServiceType: 'INTERNATIONAL_PRIORITY',
  },

  INTERNATIONAL_FIRST: {
    code: 'INTERNATIONAL_FIRST',
    name: 'International First',
    displayName: 'FedEx International First',
    category: FedExServiceCategory.INTERNATIONAL,
    description: 'International delivery in 1-3 business days',
    domestic: false,
    international: true,
    estimatedDaysMin: 1,
    estimatedDaysMax: 3,
    isGuaranteed: true,
    maxWeightLbs: 150,
    requiresSignature: true,
    allowsResidential: true,
    allowsHoldAtLocation: true,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 4.5,
    carrierCode: 'FDXE',
    apiServiceType: 'INTERNATIONAL_FIRST',
  },

  INTERNATIONAL_GROUND: {
    code: 'INTERNATIONAL_GROUND',
    name: 'International Ground',
    displayName: 'FedEx International Ground',
    category: FedExServiceCategory.INTERNATIONAL,
    description: 'Ground delivery to Canada/Mexico (2-7 days)',
    domestic: false,
    international: true,
    estimatedDaysMin: 2,
    estimatedDaysMax: 7,
    isGuaranteed: false,
    maxWeightLbs: 150,
    requiresSignature: false,
    allowsResidential: true,
    allowsHoldAtLocation: false,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 1.8,
    carrierCode: 'FDXG',
    apiServiceType: 'INTERNATIONAL_GROUND',
  },

  FEDEX_INTERNATIONAL_CONNECT_PLUS: {
    code: 'FEDEX_INTERNATIONAL_CONNECT_PLUS',
    name: 'International Connect Plus',
    displayName: 'FedEx International Connect Plus',
    category: FedExServiceCategory.INTERNATIONAL,
    description: 'Economy international with faster transit',
    domestic: false,
    international: true,
    estimatedDaysMin: 3,
    estimatedDaysMax: 6,
    isGuaranteed: false,
    maxWeightLbs: 150,
    requiresSignature: true,
    allowsResidential: true,
    allowsHoldAtLocation: true,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 2.2,
    carrierCode: 'FDXE',
    apiServiceType: 'FEDEX_INTERNATIONAL_CONNECT_PLUS',
  },

  FEDEX_INTERNATIONAL_PRIORITY_EXPRESS: {
    code: 'FEDEX_INTERNATIONAL_PRIORITY_EXPRESS',
    name: 'International Priority Express',
    displayName: 'FedEx International Priority Express',
    category: FedExServiceCategory.INTERNATIONAL,
    description: 'Fastest international delivery (1-2 days)',
    domestic: false,
    international: true,
    estimatedDaysMin: 1,
    estimatedDaysMax: 2,
    isGuaranteed: true,
    maxWeightLbs: 150,
    requiresSignature: true,
    allowsResidential: true,
    allowsHoldAtLocation: true,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 5.5,
    carrierCode: 'FDXE',
    apiServiceType: 'FEDEX_INTERNATIONAL_PRIORITY_EXPRESS',
  },

  // ============================================================================
  // INTERNATIONAL FREIGHT
  // ============================================================================

  INTERNATIONAL_ECONOMY_FREIGHT: {
    code: 'INTERNATIONAL_ECONOMY_FREIGHT',
    name: 'International Economy Freight',
    displayName: 'FedEx International Economy Freight',
    category: FedExServiceCategory.FREIGHT,
    description: 'Economy freight to international destinations',
    domestic: false,
    international: true,
    estimatedDaysMin: 5,
    estimatedDaysMax: 10,
    isGuaranteed: false,
    maxWeightLbs: 20000,
    requiresSignature: true,
    allowsResidential: false,
    allowsHoldAtLocation: false,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 4.0,
    carrierCode: 'FXFR',
    apiServiceType: 'INTERNATIONAL_ECONOMY_FREIGHT',
  },

  INTERNATIONAL_PRIORITY_FREIGHT: {
    code: 'INTERNATIONAL_PRIORITY_FREIGHT',
    name: 'International Priority Freight',
    displayName: 'FedEx International Priority Freight',
    category: FedExServiceCategory.FREIGHT,
    description: 'Priority freight to international destinations',
    domestic: false,
    international: true,
    estimatedDaysMin: 3,
    estimatedDaysMax: 7,
    isGuaranteed: false,
    maxWeightLbs: 20000,
    requiresSignature: true,
    allowsResidential: false,
    allowsHoldAtLocation: false,
    allowsSaturdayDelivery: false,
    premiumMultiplier: 5.5,
    carrierCode: 'FXFR',
    apiServiceType: 'INTERNATIONAL_PRIORITY_FREIGHT',
  },
}

/**
 * Helper functions for service filtering
 */

export function getDomesticServices(): FedExService[] {
  return Object.values(FEDEX_SERVICES).filter((s) => s.domestic)
}

export function getInternationalServices(): FedExService[] {
  return Object.values(FEDEX_SERVICES).filter((s) => s.international)
}

export function getServicesByCategory(category: FedExServiceCategory): FedExService[] {
  return Object.values(FEDEX_SERVICES).filter((s) => s.category === category)
}

export function getExpressServices(): FedExService[] {
  return getServicesByCategory(FedExServiceCategory.EXPRESS)
}

export function getGroundServices(): FedExService[] {
  return getServicesByCategory(FedExServiceCategory.GROUND)
}

export function getFreightServices(): FedExService[] {
  return getServicesByCategory(FedExServiceCategory.FREIGHT)
}

export function getSmartPostServices(): FedExService[] {
  return getServicesByCategory(FedExServiceCategory.SMARTPOST)
}

export function getServiceByCode(code: string): FedExService | undefined {
  return FEDEX_SERVICES[code]
}

export function getServicesForWeight(weightLbs: number): FedExService[] {
  return Object.values(FEDEX_SERVICES).filter((s) => s.maxWeightLbs >= weightLbs)
}

/**
 * Determine best service based on requirements
 */
export interface ServiceRequirements {
  weightLbs: number
  isResidential: boolean
  isInternational: boolean
  needsGuarantee: boolean
  maxDays?: number
  preferEconomy?: boolean
}

export function recommendServices(requirements: ServiceRequirements): FedExService[] {
  let services = Object.values(FEDEX_SERVICES)

  // Filter by weight
  services = services.filter((s) => s.maxWeightLbs >= requirements.weightLbs)

  // Filter by location
  if (requirements.isInternational) {
    services = services.filter((s) => s.international)
  } else {
    services = services.filter((s) => s.domestic)
  }

  // Filter by residential
  if (requirements.isResidential) {
    services = services.filter((s) => s.allowsResidential)
  }

  // Filter by guarantee
  if (requirements.needsGuarantee) {
    services = services.filter((s) => s.isGuaranteed)
  }

  // Filter by max days
  if (requirements.maxDays) {
    services = services.filter((s) => s.estimatedDaysMax <= requirements.maxDays)
  }

  // Sort by price (multiplier) if economy preferred
  if (requirements.preferEconomy) {
    services.sort((a, b) => a.premiumMultiplier - b.premiumMultiplier)
  } else {
    services.sort((a, b) => a.estimatedDaysMin - b.estimatedDaysMin)
  }

  return services
}
