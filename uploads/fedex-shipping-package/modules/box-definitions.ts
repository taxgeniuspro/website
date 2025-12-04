/**
 * FedEx Pre-Defined Box Dimensions
 * Based on WooCommerce FedEx Plugin 4.4.6 data-box-sizes.php
 *
 * Box Types:
 * - Envelopes (up to 1 lb)
 * - Paks (up to 20 lbs, flat/padded)
 * - Small/Medium/Large/Extra Large Boxes (up to 20 lbs)
 * - Tubes (posters, up to 20 lbs)
 * - 10kg/25kg International Boxes
 */

export enum FedExBoxType {
  ENVELOPE = 'envelope',
  PAK = 'pak',
  SMALL_BOX = 'small_box',
  MEDIUM_BOX = 'medium_box',
  LARGE_BOX = 'large_box',
  EXTRA_LARGE_BOX = 'extra_large_box',
  TUBE = 'tube',
  INTERNATIONAL = 'international',
  CUSTOM = 'custom',
}

export interface FedExBox {
  id: string
  name: string
  displayName: string
  type: FedExBoxType

  // Dimensions (inches)
  length: number
  width: number
  height: number

  // Weight limits (pounds)
  maxWeight: number
  boxWeight: number // Tare weight of empty box

  // Special FedEx features
  oneRateMaxWeight?: number // For FedEx One Rate pricing
  oneRateEligible: boolean

  // API packaging type
  packagingType: string

  // Ideal use cases
  bestFor: string[]
}

/**
 * Official FedEx Box Catalog
 * All dimensions verified from FedEx specifications
 */
export const FEDEX_BOXES: Record<string, FedExBox> = {
  // ============================================================================
  // ENVELOPES
  // ============================================================================

  FEDEX_ENVELOPE: {
    id: 'FEDEX_ENVELOPE',
    name: 'FedEx Envelope',
    displayName: 'FedEx® Envelope',
    type: FedExBoxType.ENVELOPE,
    length: 12.5,
    width: 9.5,
    height: 0.25,
    maxWeight: 1,
    boxWeight: 0,
    oneRateMaxWeight: 10,
    oneRateEligible: true,
    packagingType: 'FEDEX_ENVELOPE',
    bestFor: ['documents', 'thin items', 'lightweight papers'],
  },

  // ============================================================================
  // PAKS (FLAT MAILERS)
  // ============================================================================

  FEDEX_PAK: {
    id: 'FEDEX_PAK',
    name: 'FedEx Pak',
    displayName: 'FedEx® Pak',
    type: FedExBoxType.PAK,
    length: 15.5,
    width: 12,
    height: 1.5,
    maxWeight: 20,
    boxWeight: 0.0625,
    oneRateMaxWeight: 50,
    oneRateEligible: true,
    packagingType: 'FEDEX_PAK',
    bestFor: ['flat items', 'magazines', 'thin catalogs', 'marketing materials'],
  },

  FEDEX_SMALL_PAK: {
    id: 'FEDEX_SMALL_PAK',
    name: 'FedEx Small Pak',
    displayName: 'FedEx® Small Pak',
    type: FedExBoxType.PAK,
    length: 12.75,
    width: 10.25,
    height: 1.5,
    maxWeight: 20,
    boxWeight: 0.0625,
    oneRateMaxWeight: 50,
    oneRateEligible: true,
    packagingType: 'FEDEX_PAK',
    bestFor: ['small documents', 'folded brochures', 'postcards'],
  },

  FEDEX_PADDED_PAK: {
    id: 'FEDEX_PADDED_PAK',
    name: 'FedEx Padded Pak',
    displayName: 'FedEx® Padded Pak',
    type: FedExBoxType.PAK,
    length: 14.75,
    width: 11.75,
    height: 1.5,
    maxWeight: 20,
    boxWeight: 0.0625,
    oneRateMaxWeight: 50,
    oneRateEligible: true,
    packagingType: 'FEDEX_PAK',
    bestFor: ['fragile flat items', 'CDs', 'DVDs', 'photo prints'],
  },

  FEDEX_REUSABLE_STURDY_PAK: {
    id: 'FEDEX_REUSABLE_STURDY_PAK',
    name: 'FedEx Reusable Sturdy Pak',
    displayName: 'FedEx® Reusable Sturdy Pak',
    type: FedExBoxType.PAK,
    length: 14.5,
    width: 10,
    height: 1.5,
    maxWeight: 20,
    boxWeight: 0.0625,
    oneRateMaxWeight: 50,
    oneRateEligible: true,
    packagingType: 'FEDEX_PAK',
    bestFor: ['reusable packaging', 'eco-friendly shipping', 'flat items'],
  },

  // ============================================================================
  // SMALL BOXES
  // ============================================================================

  FEDEX_SMALL_BOX_1: {
    id: 'FEDEX_SMALL_BOX_1',
    name: 'FedEx Small Box (12.375 x 10.875 x 1.5)',
    displayName: 'FedEx® Small Box',
    type: FedExBoxType.SMALL_BOX,
    length: 12.375,
    width: 10.875,
    height: 1.5,
    maxWeight: 20,
    boxWeight: 0.28125,
    oneRateMaxWeight: 50,
    oneRateEligible: true,
    packagingType: 'FEDEX_SMALL_BOX',
    bestFor: ['business cards (bulk)', 'flat small items', 'booklets'],
  },

  FEDEX_SMALL_BOX_2: {
    id: 'FEDEX_SMALL_BOX_2',
    name: 'FedEx Small Box (11.25 x 8.75 x 2.625)',
    displayName: 'FedEx® Small Box',
    type: FedExBoxType.SMALL_BOX,
    length: 11.25,
    width: 8.75,
    height: 2.625,
    maxWeight: 20,
    boxWeight: 0.28125,
    oneRateMaxWeight: 50,
    oneRateEligible: true,
    packagingType: 'FEDEX_SMALL_BOX',
    bestFor: ['small printed materials', 'greeting cards', 'stickers'],
  },

  // ============================================================================
  // MEDIUM BOXES
  // ============================================================================

  FEDEX_MEDIUM_BOX_1: {
    id: 'FEDEX_MEDIUM_BOX_1',
    name: 'FedEx Medium Box (13.25 x 11.5 x 2.375)',
    displayName: 'FedEx® Medium Box',
    type: FedExBoxType.MEDIUM_BOX,
    length: 13.25,
    width: 11.5,
    height: 2.375,
    maxWeight: 20,
    boxWeight: 0.40625,
    oneRateMaxWeight: 50,
    oneRateEligible: true,
    packagingType: 'FEDEX_MEDIUM_BOX',
    bestFor: ['brochures', 'flyers (bulk)', 'catalogs'],
  },

  FEDEX_MEDIUM_BOX_2: {
    id: 'FEDEX_MEDIUM_BOX_2',
    name: 'FedEx Medium Box (11.25 x 8.75 x 4.375)',
    displayName: 'FedEx® Medium Box',
    type: FedExBoxType.MEDIUM_BOX,
    length: 11.25,
    width: 8.75,
    height: 4.375,
    maxWeight: 20,
    boxWeight: 0.40625,
    oneRateMaxWeight: 50,
    oneRateEligible: true,
    packagingType: 'FEDEX_MEDIUM_BOX',
    bestFor: ['folded posters', 'calendars', 'stationery sets'],
  },

  // ============================================================================
  // LARGE BOXES
  // ============================================================================

  FEDEX_LARGE_BOX_1: {
    id: 'FEDEX_LARGE_BOX_1',
    name: 'FedEx Large Box (17.5 x 12.365 x 3)',
    displayName: 'FedEx® Large Box',
    type: FedExBoxType.LARGE_BOX,
    length: 17.5,
    width: 12.365,
    height: 3,
    maxWeight: 20,
    boxWeight: 0.90625,
    oneRateMaxWeight: 50,
    oneRateEligible: true,
    packagingType: 'FEDEX_LARGE_BOX',
    bestFor: ['magazines (bulk)', 'presentation folders', 'large brochures'],
  },

  FEDEX_LARGE_BOX_2: {
    id: 'FEDEX_LARGE_BOX_2',
    name: 'FedEx Large Box (11.25 x 8.75 x 7.75)',
    displayName: 'FedEx® Large Box',
    type: FedExBoxType.LARGE_BOX,
    length: 11.25,
    width: 8.75,
    height: 7.75,
    maxWeight: 20,
    boxWeight: 0.5875,
    oneRateMaxWeight: 50,
    oneRateEligible: true,
    packagingType: 'FEDEX_LARGE_BOX',
    bestFor: ['books', 'thick catalogs', 'stacked materials'],
  },

  // ============================================================================
  // EXTRA LARGE BOXES
  // ============================================================================

  FEDEX_EXTRA_LARGE_BOX_1: {
    id: 'FEDEX_EXTRA_LARGE_BOX_1',
    name: 'FedEx Extra Large Box (11.875 x 11 x 10.75)',
    displayName: 'FedEx® Extra Large Box',
    type: FedExBoxType.EXTRA_LARGE_BOX,
    length: 11.875,
    width: 11,
    height: 10.75,
    maxWeight: 20,
    boxWeight: 1.25,
    oneRateMaxWeight: 50,
    oneRateEligible: true,
    packagingType: 'FEDEX_EXTRA_LARGE_BOX',
    bestFor: ['multiple product stacks', 'large volume orders'],
  },

  FEDEX_EXTRA_LARGE_BOX_2: {
    id: 'FEDEX_EXTRA_LARGE_BOX_2',
    name: 'FedEx Extra Large Box (15.75 x 14.125 x 6)',
    displayName: 'FedEx® Extra Large Box',
    type: FedExBoxType.EXTRA_LARGE_BOX,
    length: 15.75,
    width: 14.125,
    height: 6,
    maxWeight: 20,
    boxWeight: 1.875,
    oneRateMaxWeight: 50,
    oneRateEligible: true,
    packagingType: 'FEDEX_EXTRA_LARGE_BOX',
    bestFor: ['large format printing', 'banners (folded)', 'poster bundles'],
  },

  // ============================================================================
  // TUBE (FOR POSTERS)
  // ============================================================================

  FEDEX_TUBE: {
    id: 'FEDEX_TUBE',
    name: 'FedEx Tube',
    displayName: 'FedEx® Tube',
    type: FedExBoxType.TUBE,
    length: 38,
    width: 6,
    height: 6,
    maxWeight: 20,
    boxWeight: 1,
    oneRateMaxWeight: 50,
    oneRateEligible: true,
    packagingType: 'FEDEX_TUBE',
    bestFor: ['posters (rolled)', 'banners (rolled)', 'blueprints'],
  },

  // ============================================================================
  // INTERNATIONAL BOXES
  // ============================================================================

  FEDEX_10KG_BOX: {
    id: 'FEDEX_10KG_BOX',
    name: 'FedEx 10kg Box',
    displayName: 'FedEx® 10kg Box',
    type: FedExBoxType.INTERNATIONAL,
    length: 15.81,
    width: 12.94,
    height: 10.19,
    maxWeight: 22, // 10kg ≈ 22 lbs
    boxWeight: 1.9375,
    oneRateMaxWeight: 0,
    oneRateEligible: false,
    packagingType: 'FEDEX_10KG_BOX',
    bestFor: ['international shipments', 'heavy printed materials'],
  },

  FEDEX_25KG_BOX: {
    id: 'FEDEX_25KG_BOX',
    name: 'FedEx 25kg Box',
    displayName: 'FedEx® 25kg Box',
    type: FedExBoxType.INTERNATIONAL,
    length: 21.56,
    width: 16.56,
    height: 13.19,
    maxWeight: 55, // 25kg ≈ 55 lbs
    boxWeight: 3.5625,
    oneRateMaxWeight: 0,
    oneRateEligible: false,
    packagingType: 'FEDEX_25KG_BOX',
    bestFor: ['large international orders', 'bulk shipments abroad'],
  },
}

/**
 * Helper Functions for Box Selection
 */

export function getAllBoxes(): FedExBox[] {
  return Object.values(FEDEX_BOXES)
}

export function getBoxesByType(type: FedExBoxType): FedExBox[] {
  return Object.values(FEDEX_BOXES).filter((box) => box.type === type)
}

export function getBoxById(id: string): FedExBox | undefined {
  return FEDEX_BOXES[id]
}

/**
 * Find boxes that can fit given dimensions
 */
export function findSuitableBoxes(
  length: number,
  width: number,
  height: number,
  weight: number
): FedExBox[] {
  return Object.values(FEDEX_BOXES).filter((box) => {
    // Check weight
    if (weight + box.boxWeight > box.maxWeight) return false

    // Check if item fits in box (any rotation)
    const itemDims = [length, width, height].sort((a, b) => b - a)
    const boxDims = [box.length, box.width, box.height].sort((a, b) => b - a)

    return itemDims.every((dim, i) => dim <= boxDims[i])
  })
}

/**
 * Find smallest box that fits the given criteria
 */
export function findSmallestBox(
  length: number,
  width: number,
  height: number,
  weight: number
): FedExBox | null {
  const suitableBoxes = findSuitableBoxes(length, width, height, weight)

  if (suitableBoxes.length === 0) return null

  // Sort by volume (smallest first)
  return suitableBoxes.sort((a, b) => {
    const volA = a.length * a.width * a.height
    const volB = b.length * b.width * b.height
    return volA - volB
  })[0]
}

/**
 * Calculate box volume (cubic inches)
 */
export function getBoxVolume(box: FedExBox): number {
  return box.length * box.width * box.height
}

/**
 * Calculate usable volume (subtracting padding/structure)
 */
export function getUsableVolume(box: FedExBox, paddingInches: number = 0.5): number {
  const usableLength = Math.max(0, box.length - paddingInches * 2)
  const usableWidth = Math.max(0, box.width - paddingInches * 2)
  const usableHeight = Math.max(0, box.height - paddingInches * 2)
  return usableLength * usableWidth * usableHeight
}

/**
 * Check if item is poster-like (long and thin)
 */
export function isPosterDimensions(length: number, width: number, height: number): boolean {
  const dims = [length, width, height].sort((a, b) => b - a)
  const longest = dims[0]
  const middle = dims[1]

  // If longest dimension is >24" and much longer than next dimension, likely poster
  return longest >= 24 && longest / middle >= 2
}

/**
 * Recommend best box for printing company use cases
 */
export function recommendBoxForProduct(productType: string, weight: number): FedExBox[] {
  const productMapping: Record<string, string[]> = {
    'business-cards': ['FEDEX_SMALL_BOX_1', 'FEDEX_SMALL_BOX_2', 'FEDEX_PAK'],
    flyers: ['FEDEX_MEDIUM_BOX_1', 'FEDEX_LARGE_BOX_1', 'FEDEX_PAK'],
    brochures: ['FEDEX_MEDIUM_BOX_1', 'FEDEX_MEDIUM_BOX_2', 'FEDEX_LARGE_BOX_1'],
    posters: ['FEDEX_TUBE', 'FEDEX_EXTRA_LARGE_BOX_2'],
    banners: ['FEDEX_TUBE', 'FEDEX_EXTRA_LARGE_BOX_2'],
    catalogs: ['FEDEX_LARGE_BOX_1', 'FEDEX_LARGE_BOX_2', 'FEDEX_MEDIUM_BOX_1'],
    postcards: ['FEDEX_SMALL_PAK', 'FEDEX_PAK', 'FEDEX_SMALL_BOX_1'],
    'greeting-cards': ['FEDEX_SMALL_BOX_2', 'FEDEX_PAK'],
    labels: ['FEDEX_PAK', 'FEDEX_SMALL_BOX_1'],
    stickers: ['FEDEX_SMALL_PAK', 'FEDEX_ENVELOPE'],
  }

  const boxIds = productMapping[productType] || []
  return boxIds.map((id) => FEDEX_BOXES[id]).filter((box) => box && box.maxWeight >= weight)
}
