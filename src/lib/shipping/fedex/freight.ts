/**
 * FedEx Freight (LTL) Support
 * Based on WooCommerce FedEx Plugin freight capabilities
 *
 * Freight shipping for orders >150 lbs or oversized items
 * Uses NMFC (National Motor Freight Classification) classes
 */

import type { FreightClass, FreightShipmentDetail, ShippingAddress, ShippingPackage } from './types'

/**
 * NMFC Freight Classes (50-500)
 * Based on density (lbs per cubic foot)
 * Lower class = higher density = lower cost per pound
 */
export const FREIGHT_CLASSES: Record<string, FreightClass> = {
  CLASS_50: {
    code: '50',
    name: 'Class 50',
    description: 'Dense, high-weight items (e.g., steel, books)',
    densityMin: 50,
    densityMax: 999,
  },
  CLASS_55: {
    code: '55',
    name: 'Class 55',
    description: 'Very dense items (e.g., bricks, cement)',
    densityMin: 35,
    densityMax: 50,
  },
  CLASS_60: {
    code: '60',
    name: 'Class 60',
    description: 'Heavy items (e.g., car parts)',
    densityMin: 30,
    densityMax: 35,
  },
  CLASS_65: {
    code: '65',
    name: 'Class 65',
    description: 'Medium-heavy items (e.g., bottled beverages)',
    densityMin: 22.5,
    densityMax: 30,
  },
  CLASS_70: {
    code: '70',
    name: 'Class 70',
    description: 'Medium weight items (e.g., food, automobile engines)',
    densityMin: 15,
    densityMax: 22.5,
  },
  CLASS_77_5: {
    code: '77.5',
    name: 'Class 77.5',
    description: 'Light-medium items (e.g., tires, bathroom fixtures)',
    densityMin: 13.5,
    densityMax: 15,
  },
  CLASS_85: {
    code: '85',
    name: 'Class 85',
    description: 'Light items (e.g., crated machinery, cast iron stoves)',
    densityMin: 12,
    densityMax: 13.5,
  },
  CLASS_92_5: {
    code: '92.5',
    name: 'Class 92.5',
    description: 'Low density (e.g., computers, monitors)',
    densityMin: 10.5,
    densityMax: 12,
  },
  CLASS_100: {
    code: '100',
    name: 'Class 100',
    description: 'Very light items (e.g., boat covers, car covers, canvas)',
    densityMin: 9,
    densityMax: 10.5,
  },
  CLASS_110: {
    code: '110',
    name: 'Class 110',
    description: 'Lightweight (e.g., cabinets, framed artwork)',
    densityMin: 8,
    densityMax: 9,
  },
  CLASS_125: {
    code: '125',
    name: 'Class 125',
    description: 'Very lightweight (e.g., small household appliances)',
    densityMin: 7,
    densityMax: 8,
  },
  CLASS_150: {
    code: '150',
    name: 'Class 150',
    description: 'Ultra lightweight (e.g., auto sheet metal parts)',
    densityMin: 6,
    densityMax: 7,
  },
  CLASS_175: {
    code: '175',
    name: 'Class 175',
    description: 'Extremely light (e.g., clothing, stuffed furniture)',
    densityMin: 5,
    densityMax: 6,
  },
  CLASS_200: {
    code: '200',
    name: 'Class 200',
    description: 'Very bulky (e.g., aircraft parts, aluminum table)',
    densityMin: 4,
    densityMax: 5,
  },
  CLASS_250: {
    code: '250',
    name: 'Class 250',
    description: 'Highly bulky (e.g., bamboo furniture, mattresses)',
    densityMin: 3,
    densityMax: 4,
  },
  CLASS_300: {
    code: '300',
    name: 'Class 300',
    description: 'Extremely bulky (e.g., wood cabinets, tables)',
    densityMin: 2,
    densityMax: 3,
  },
  CLASS_400: {
    code: '400',
    name: 'Class 400',
    description: 'Ultra bulky (e.g., deer antlers)',
    densityMin: 1,
    densityMax: 2,
  },
  CLASS_500: {
    code: '500',
    name: 'Class 500',
    description: 'Maximum bulk (e.g., ping pong balls, bags of gold)',
    densityMin: 0,
    densityMax: 1,
  },
}

/**
 * Calculate density (lbs per cubic foot)
 */
export function calculateDensity(
  weightLbs: number,
  lengthIn: number,
  widthIn: number,
  heightIn: number
): number {
  const cubicInches = lengthIn * widthIn * heightIn
  const cubicFeet = cubicInches / 1728 // 1 cubic foot = 1728 cubic inches
  return weightLbs / cubicFeet
}

/**
 * Determine freight class based on density
 */
export function determineFreightClass(density: number): FreightClass {
  // Find appropriate class based on density range
  for (const freightClass of Object.values(FREIGHT_CLASSES)) {
    if (density >= freightClass.densityMin && density < freightClass.densityMax) {
      return freightClass
    }
  }

  // Default to Class 100 if no match (common for general freight)
  return FREIGHT_CLASSES.CLASS_100
}

/**
 * Determine freight class for a package
 */
export function getFreightClassForPackage(pkg: ShippingPackage): FreightClass {
  if (!pkg.dimensions) {
    // Without dimensions, assume Class 100 (general freight)
    return FREIGHT_CLASSES.CLASS_100
  }

  const density = calculateDensity(
    pkg.weight,
    pkg.dimensions.length || 48, // Default to 4 feet if not specified
    pkg.dimensions.width,
    pkg.dimensions.height
  )

  return determineFreightClass(density)
}

/**
 * Check if shipment requires freight
 * Freight needed if:
 * - Total weight > 150 lbs
 * - Any dimension > 96 inches (8 feet)
 * - Density suggests freight class
 */
export function requiresFreight(packages: ShippingPackage[]): boolean {
  const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0)

  // Weight threshold
  if (totalWeight > 150) return true

  // Check dimensions
  for (const pkg of packages) {
    if (pkg.dimensions) {
      const maxDim = Math.max(
        pkg.dimensions.length || 0,
        pkg.dimensions.width || 0,
        pkg.dimensions.height || 0
      )
      if (maxDim > 96) return true
    }
  }

  return false
}

/**
 * Calculate number of pallets needed
 * Standard pallet: 48" x 40" x 6" (4 ft x 3.33 ft)
 * Max weight per pallet: 2000 lbs
 */
export function calculatePallets(packages: ShippingPackage[]): number {
  const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0)
  const totalVolume = packages.reduce((sum, pkg) => {
    if (!pkg.dimensions) return sum
    return sum + pkg.dimensions.length * pkg.dimensions.width * pkg.dimensions.height
  }, 0)

  // Pallet capacity
  const palletVolume = 48 * 40 * 72 // 72 inches height (6 ft stacking)
  const palletWeight = 2000 // lbs

  // Calculate based on weight and volume
  const palletsByWeight = Math.ceil(totalWeight / palletWeight)
  const palletsByVolume = Math.ceil(totalVolume / palletVolume)

  // Return whichever requires more pallets
  return Math.max(palletsByWeight, palletsByVolume, 1) // At least 1 pallet
}

/**
 * Build freight shipment detail for API request
 */
export function buildFreightShipmentDetail(
  packages: ShippingPackage[],
  declaredValuePerPallet: number = 1000
): FreightShipmentDetail {
  const totalPallets = calculatePallets(packages)

  // Get freight class from first package (or most representative)
  const representativePackage = packages.reduce((heaviest, pkg) =>
    pkg.weight > heaviest.weight ? pkg : heaviest
  )
  const freightClass = getFreightClassForPackage(representativePackage)

  return {
    role: 'SHIPPER',
    totalHandlingUnits: totalPallets,
    freightClass: freightClass.code,
    declaredValue: {
      amount: declaredValuePerPallet * totalPallets,
      currency: 'USD',
    },
  }
}

/**
 * Estimate freight cost (rough calculation)
 * Actual cost from FedEx API will vary based on many factors
 */
export function estimateFreightCost(
  packages: ShippingPackage[],
  fromZip: string,
  toZip: string,
  options: {
    liftgateRequired?: boolean
    insideDelivery?: boolean
    appointmentRequired?: boolean
  } = {}
): number {
  const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0)
  const totalPallets = calculatePallets(packages)
  const freightClass = getFreightClassForPackage(packages[0])

  // Base rate per 100 lbs (class-dependent)
  const classMultiplier = {
    '50': 0.5,
    '55': 0.55,
    '60': 0.6,
    '65': 0.7,
    '70': 0.8,
    '77.5': 0.9,
    '85': 1.0,
    '92.5': 1.1,
    '100': 1.2,
    '110': 1.3,
    '125': 1.5,
    '150': 1.8,
    '175': 2.0,
    '200': 2.3,
    '250': 2.7,
    '300': 3.2,
    '400': 4.0,
    '500': 5.0,
  }

  const baseRatePer100lbs = 50
  const multiplier = classMultiplier[freightClass.code as keyof typeof classMultiplier] || 1.2

  // Calculate distance surcharge
  const zipDiff = Math.abs(parseInt(fromZip.substring(0, 3)) - parseInt(toZip.substring(0, 3)))
  const distanceMultiplier = 1 + zipDiff / 1000 // ~10% increase per 100 zip codes

  // Base cost
  let cost = (totalWeight / 100) * baseRatePer100lbs * multiplier * distanceMultiplier

  // Pallet charge ($30 per pallet)
  cost += totalPallets * 30

  // Additional services
  if (options.liftgateRequired) cost += 75
  if (options.insideDelivery) cost += 100
  if (options.appointmentRequired) cost += 50

  return Math.round(cost * 100) / 100
}

/**
 * Get recommended freight services based on urgency
 */
export function getRecommendedFreightServices(
  urgency: 'economy' | 'standard' | 'priority' | 'expedited'
) {
  const serviceMap = {
    economy: ['FEDEX_FREIGHT_ECONOMY'],
    standard: ['FEDEX_FREIGHT_PRIORITY', 'FEDEX_FREIGHT_ECONOMY'],
    priority: ['FEDEX_FREIGHT_PRIORITY', 'FEDEX_2_DAY_FREIGHT'],
    expedited: ['FEDEX_1_DAY_FREIGHT', 'FEDEX_2_DAY_FREIGHT', 'FEDEX_3_DAY_FREIGHT'],
  }

  return serviceMap[urgency] || serviceMap.standard
}

/**
 * Freight-specific product categorization
 * For printing company: large banners, bulk orders, trade show materials
 */
export function getFreightClassForPrintProduct(
  productType: string,
  totalWeight: number
): FreightClass {
  const productClassMap: Record<string, string> = {
    'banners-large': 'CLASS_100', // Canvas/vinyl banners
    'trade-show-displays': 'CLASS_125', // Lightweight frames
    'bulk-flyers': 'CLASS_85', // Paper products in bulk
    'bulk-brochures': 'CLASS_85',
    'signage-metal': 'CLASS_70', // Metal signs
    'signage-foam': 'CLASS_150', // Foam core signs
    'display-stands': 'CLASS_125',
    'promotional-materials-bulk': 'CLASS_100',
  }

  const classCode = productClassMap[productType] || 'CLASS_100'
  return FREIGHT_CLASSES[classCode]
}

/**
 * Check if residential delivery available for freight
 * (Some freight services don't deliver to residential)
 */
export function isResidentialFreightAvailable(serviceCode: string): boolean {
  // FedEx Freight Priority and Economy support residential with surcharge
  const residentialServices = [
    'FEDEX_FREIGHT_PRIORITY',
    'FEDEX_FREIGHT_ECONOMY',
    'FEDEX_1_DAY_FREIGHT',
    'FEDEX_2_DAY_FREIGHT',
    'FEDEX_3_DAY_FREIGHT',
  ]

  return residentialServices.includes(serviceCode)
}

/**
 * Calculate residential freight surcharge
 */
export function calculateResidentialFreightSurcharge(baseCost: number): number {
  // Typically 20-30% surcharge for residential freight
  return baseCost * 0.25 // 25% surcharge
}
