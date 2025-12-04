/**
 * Intelligent Box Packing Algorithm
 * Based on WooCommerce BoxPacker with enhancements
 *
 * Features:
 * - 3D bin packing (first-fit decreasing)
 * - Cost optimization (not just box count)
 * - Supports 14 FedEx box types
 * - Handles irregular items (posters, flat materials)
 */

import {
  type FedExBox,
  FedExBoxType,
  getAllBoxes,
  findSmallestBox,
  getUsableVolume,
  isPosterDimensions,
  recommendBoxForProduct,
} from './box-definitions'

export interface PackItem {
  // Product identification
  name: string
  productType?: string // business-cards, flyers, posters, etc.

  // Physical properties
  length: number // inches
  width: number // inches
  height: number // inches (thickness for flat items)
  weight: number // pounds

  // Quantity
  quantity: number

  // Special handling
  fragile?: boolean
  rollable?: boolean // For posters/banners
}

export interface PackedBox {
  box: FedExBox
  items: PackItem[]
  totalWeight: number // Including box weight
  usedVolume: number // Cubic inches used
  remainingWeight: number // Weight capacity remaining
  remainingVolume: number // Volume remaining
}

export interface PackingResult {
  boxes: PackedBox[]
  unpackedItems: PackItem[] // Items that couldn't fit
  totalBoxes: number
  totalWeight: number
  estimatedCost: number // Relative cost estimate
  warnings: string[]
}

/**
 * Main packing function
 * Uses first-fit decreasing algorithm with cost optimization
 */
export function packItems(items: PackItem[], options: PackingOptions = {}): PackingResult {
  const {
    allowCustomBoxes = true,
    preferFewerBoxes = false,
    maxBoxes = 50,
    customBoxDimensions,
  } = options

  const result: PackingResult = {
    boxes: [],
    unpackedItems: [],
    totalBoxes: 0,
    totalWeight: 0,
    estimatedCost: 0,
    warnings: [],
  }

  // Expand items by quantity (turn quantity:5 into 5 separate items)
  const expandedItems = expandItemsByQuantity(items)

  // Sort by volume (largest first) - First-Fit Decreasing algorithm
  const sortedItems = sortItemsByVolume(expandedItems)

  // Available box types
  const availableBoxes = getAllBoxes()

  // Try to pack each item
  for (const item of sortedItems) {
    // Check if item is rollable poster/banner
    if (item.rollable && isPosterDimensions(item.length, item.width, item.height)) {
      const tubeBox = availableBoxes.find((b) => b.type === FedExBoxType.TUBE)
      if (
        tubeBox &&
        item.length <= tubeBox.length &&
        item.weight + tubeBox.boxWeight <= tubeBox.maxWeight
      ) {
        addItemToNewBox(result, item, tubeBox)
        continue
      }
    }

    // Try to fit item in existing box
    const fittingBox = findBoxForItem(result.boxes, item)
    if (fittingBox) {
      addItemToBox(fittingBox, item)
      continue
    }

    // Find smallest new box that fits
    const newBox = findSmallestBox(item.length, item.width, item.height, item.weight)
    if (newBox) {
      addItemToNewBox(result, item, newBox)
      continue
    }

    // Try product-specific recommendation
    if (item.productType) {
      const recommendedBoxes = recommendBoxForProduct(item.productType, item.weight)
      if (recommendedBoxes.length > 0) {
        addItemToNewBox(result, item, recommendedBoxes[0])
        continue
      }
    }

    // Custom box as last resort
    if (allowCustomBoxes && customBoxDimensions) {
      const customBox = createCustomBox(customBoxDimensions, item)
      addItemToNewBox(result, item, customBox)
      result.warnings.push(
        `Using custom box for ${item.name} (${item.length}x${item.width}x${item.height})`
      )
      continue
    }

    // Item couldn't be packed
    result.unpackedItems.push(item)
    result.warnings.push(
      `Could not pack ${item.name}: dimensions ${item.length}x${item.width}x${item.height}, weight ${item.weight} lbs`
    )
  }

  // Calculate totals
  result.totalBoxes = result.boxes.length
  result.totalWeight = result.boxes.reduce((sum, box) => sum + box.totalWeight, 0)
  result.estimatedCost = estimateShippingCost(result.boxes)

  // Optimize if needed (consolidate boxes)
  if (preferFewerBoxes && result.boxes.length > 1) {
    optimizeBoxes(result)
  }

  // Check limits
  if (result.totalBoxes > maxBoxes) {
    result.warnings.push(`Exceeded maximum boxes (${maxBoxes}). Consider freight shipping.`)
  }

  return result
}

/**
 * Expand items by quantity
 * Turn {name: "Flyers", quantity: 5} into 5 separate items
 */
function expandItemsByQuantity(items: PackItem[]): PackItem[] {
  const expanded: PackItem[] = []

  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      expanded.push({
        ...item,
        quantity: 1, // Each expanded item is quantity 1
      })
    }
  }

  return expanded
}

/**
 * Sort items by volume (largest first)
 * First-Fit Decreasing algorithm performs better this way
 */
function sortItemsByVolume(items: PackItem[]): PackItem[] {
  return items.sort((a, b) => {
    const volA = a.length * a.width * a.height
    const volB = b.length * b.width * b.height
    return volB - volA // Descending
  })
}

/**
 * Find existing box that can fit this item
 */
function findBoxForItem(boxes: PackedBox[], item: PackItem): PackedBox | null {
  for (const box of boxes) {
    // Check weight capacity
    if (box.remainingWeight < item.weight) continue

    // Check volume capacity
    const itemVolume = item.length * item.width * item.height
    if (box.remainingVolume < itemVolume) continue

    // Check if item physically fits (3D bin packing check)
    if (itemFitsInBox(item, box)) {
      return box
    }
  }

  return null
}

/**
 * Check if item physically fits in box
 * Simplified 3D check - assumes items can be rotated
 */
function itemFitsInBox(item: PackItem, box: PackedBox): boolean {
  // Get item dimensions
  const itemDims = [item.length, item.width, item.height].sort((a, b) => b - a)

  // Get available box dimensions (accounting for already packed items)
  // Simplified: use remaining volume as indicator
  const usableVol = getUsableVolume(box.box)
  const currentUsedVol = box.usedVolume
  const availableVol = usableVol - currentUsedVol

  const itemVol = item.length * item.width * item.height

  // Must fit within volume
  if (itemVol > availableVol) return false

  // Must fit within box outer dimensions (in any rotation)
  const boxDims = [box.box.length, box.box.width, box.box.height].sort((a, b) => b - a)

  return itemDims.every((dim, i) => dim <= boxDims[i])
}

/**
 * Add item to existing box
 */
function addItemToBox(box: PackedBox, item: PackItem): void {
  box.items.push(item)
  box.totalWeight += item.weight
  box.remainingWeight -= item.weight

  const itemVolume = item.length * item.width * item.height
  box.usedVolume += itemVolume
  box.remainingVolume -= itemVolume
}

/**
 * Add item to new box
 */
function addItemToNewBox(result: PackingResult, item: PackItem, box: FedExBox): void {
  const packedBox: PackedBox = {
    box,
    items: [item],
    totalWeight: box.boxWeight + item.weight,
    usedVolume: item.length * item.width * item.height,
    remainingWeight: box.maxWeight - box.boxWeight - item.weight,
    remainingVolume: getUsableVolume(box) - item.length * item.width * item.height,
  }

  result.boxes.push(packedBox)
}

/**
 * Create custom box for oversized items
 */
function createCustomBox(
  baseDimensions: { length: number; width: number; height: number },
  item: PackItem
): FedExBox {
  return {
    id: 'CUSTOM_BOX',
    name: 'Custom Box',
    displayName: 'Custom Box',
    type: FedExBoxType.CUSTOM,
    length: Math.max(baseDimensions.length, item.length + 2),
    width: Math.max(baseDimensions.width, item.width + 2),
    height: Math.max(baseDimensions.height, item.height + 2),
    maxWeight: 150, // Standard max
    boxWeight: 2, // Assume heavier custom box
    oneRateMaxWeight: 0,
    oneRateEligible: false,
    packagingType: 'YOUR_PACKAGING',
    bestFor: ['oversized items'],
  }
}

/**
 * Estimate shipping cost for packed boxes
 * Uses box volume and weight as rough indicators
 */
function estimateShippingCost(boxes: PackedBox[]): number {
  return boxes.reduce((cost, box) => {
    // Cost factors: weight (primary) and volume (secondary)
    const weightCost = box.totalWeight * 0.5 // $0.50/lb estimate
    const dimWeight = (box.box.length * box.box.width * box.box.height) / 166 // Dimensional weight
    const dimCost = dimWeight * 0.3

    return cost + Math.max(weightCost, dimCost) + 5 // $5 base per box
  }, 0)
}

/**
 * Optimize boxes by consolidating
 * Try to fit items from smaller boxes into larger ones
 */
function optimizeBoxes(result: PackingResult): void {
  // Sort boxes by remaining capacity (most empty first)
  const sortedBoxes = result.boxes.sort((a, b) => b.remainingVolume - a.remainingVolume)

  // Try to consolidate smallest boxes
  for (let i = sortedBoxes.length - 1; i >= 0; i--) {
    const smallBox = sortedBoxes[i]

    // Try to fit all items from this box into other boxes
    const itemsFit = smallBox.items.every((item) => {
      for (let j = 0; j < i; j++) {
        const targetBox = sortedBoxes[j]
        if (
          targetBox.remainingWeight >= item.weight &&
          targetBox.remainingVolume >= item.length * item.width * item.height &&
          itemFitsInBox(item, targetBox)
        ) {
          return true
        }
      }
      return false
    })

    // If all items fit elsewhere, remove this box
    if (itemsFit) {
      // Move items
      for (const item of smallBox.items) {
        for (let j = 0; j < i; j++) {
          const targetBox = sortedBoxes[j]
          if (
            targetBox.remainingWeight >= item.weight &&
            targetBox.remainingVolume >= item.length * item.width * item.height &&
            itemFitsInBox(item, targetBox)
          ) {
            addItemToBox(targetBox, item)
            break
          }
        }
      }

      // Remove consolidated box
      sortedBoxes.splice(i, 1)
    }
  }

  result.boxes = sortedBoxes
}

/**
 * Packing options
 */
export interface PackingOptions {
  allowCustomBoxes?: boolean
  preferFewerBoxes?: boolean
  maxBoxes?: number
  customBoxDimensions?: {
    length: number
    width: number
    height: number
  }
}

/**
 * Format packing result for display
 */
export function formatPackingResult(result: PackingResult): string {
  const lines: string[] = []

  lines.push(`=== PACKING RESULT ===`)
  lines.push(`Total Boxes: ${result.totalBoxes}`)
  lines.push(`Total Weight: ${result.totalWeight.toFixed(2)} lbs`)
  lines.push(`Estimated Cost: $${result.estimatedCost.toFixed(2)}`)
  lines.push(``)

  result.boxes.forEach((box, index) => {
    lines.push(`Box ${index + 1}: ${box.box.displayName}`)
    lines.push(
      `  Weight: ${box.totalWeight.toFixed(2)} lbs (${box.remainingWeight.toFixed(2)} lbs remaining)`
    )
    lines.push(`  Items: ${box.items.length}`)
    box.items.forEach((item) => {
      lines.push(
        `    - ${item.name} (${item.length}x${item.width}x${item.height}, ${item.weight} lbs)`
      )
    })
    lines.push(``)
  })

  if (result.unpackedItems.length > 0) {
    lines.push(`UNPACKED ITEMS: ${result.unpackedItems.length}`)
    result.unpackedItems.forEach((item) => {
      lines.push(`  - ${item.name}`)
    })
    lines.push(``)
  }

  if (result.warnings.length > 0) {
    lines.push(`WARNINGS:`)
    result.warnings.forEach((warning) => {
      lines.push(`  ⚠️  ${warning}`)
    })
  }

  return lines.join('\n')
}

/**
 * Convert packed boxes to ShippingPackage format
 * For use with FedEx API
 */
export interface ShippingPackage {
  weight: number
  dimensions: {
    length: number
    width: number
    height: number
  }
  packagingType?: string
  value?: number
}

export function convertToShippingPackages(
  result: PackingResult,
  declaredValuePerBox?: number
): ShippingPackage[] {
  return result.boxes.map((box) => ({
    weight: box.totalWeight,
    dimensions: {
      length: box.box.length,
      width: box.box.width,
      height: box.box.height,
    },
    packagingType: box.box.packagingType,
    value: declaredValuePerBox,
  }))
}
