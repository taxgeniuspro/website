/**
 * Weight calculation utilities for shipping
 */

/**
 * Round weight to nearest valid shipping weight
 * FedEx requires weights to be in whole pounds or specific decimal increments
 */
export function roundWeight(weight: number): number {
  // Round to 1 decimal place (0.1 lb increments)
  return Math.ceil(weight * 10) / 10
}

/**
 * Convert ounces to pounds
 */
export function ouncesToPounds(ounces: number): number {
  return ounces / 16
}

/**
 * Convert pounds to ounces
 */
export function poundsToOunces(pounds: number): number {
  return pounds * 16
}

/**
 * Calculate dimensional weight (DIM weight)
 * Used when package is large but light
 * Formula: (Length x Width x Height) / Divisor
 */
export function calculateDimensionalWeight(
  length: number,
  width: number,
  height: number,
  divisor: number = 139 // FedEx domestic divisor
): number {
  const dimWeight = (length * width * height) / divisor
  return roundWeight(dimWeight)
}

/**
 * Get billable weight (greater of actual weight or dimensional weight)
 */
export function getBillableWeight(
  actualWeight: number,
  length: number,
  width: number,
  height: number,
  divisor?: number
): number {
  const dimWeight = calculateDimensionalWeight(length, width, height, divisor)
  return Math.max(actualWeight, dimWeight)
}
