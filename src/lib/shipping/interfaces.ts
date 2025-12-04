export interface ShippingAddress {
  street: string
  street2?: string
  city: string
  state: string
  zipCode: string
  country: string
  isResidential?: boolean
}

export interface ShippingDimensions {
  width: number // inches
  height: number // inches
  length?: number // inches (for packages)
}

export interface ShippingPackage {
  weight: number // pounds
  dimensions?: ShippingDimensions
  value?: number // declared value for insurance
}

export interface ShippingRate {
  carrier: Carrier
  serviceCode: string
  serviceName: string
  rateAmount: number
  currency: string
  estimatedDays: number
  deliveryDate?: Date
  isGuaranteed?: boolean
}

export interface ShippingLabel {
  trackingNumber: string
  labelUrl: string
  labelFormat: 'PDF' | 'PNG' | 'ZPL'
  carrier: Carrier
}

export interface TrackingInfo {
  trackingNumber: string
  carrier: Carrier
  status: 'pending' | 'in_transit' | 'delivered' | 'exception'
  currentLocation?: string
  estimatedDelivery?: Date
  actualDelivery?: Date
  events: TrackingEvent[]
}

export interface TrackingEvent {
  timestamp: Date
  location: string
  status: string
  description: string
}

export interface ShippingProvider {
  carrier: Carrier

  // Get available shipping rates
  getRates(
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress,
    packages: ShippingPackage[]
  ): Promise<ShippingRate[]>

  // Create a shipping label
  createLabel(
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress,
    packages: ShippingPackage[],
    serviceCode: string
  ): Promise<ShippingLabel>

  // Track a shipment
  track(trackingNumber: string): Promise<TrackingInfo>

  // Validate an address
  validateAddress(address: ShippingAddress): Promise<boolean>

  // Cancel a shipment
  cancelShipment?(trackingNumber: string): Promise<boolean>
}

export interface WeightCalculationParams {
  paperStockWeight: number // weight per square inch
  width: number // inches
  height: number // inches
  quantity: number // number of items
}

export interface ShippingConfiguration {
  enabled: boolean
  testMode: boolean
  defaultPackaging?: {
    weight: number // additional packaging weight in pounds
    dimensions?: ShippingDimensions
  }
  markupPercentage?: number // markup to add to carrier rates
}
