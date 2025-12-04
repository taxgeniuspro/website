/**
 * FedEx Integration Type Definitions
 * Comprehensive types for enhanced FedEx integration
 */

import { type Carrier } from '@prisma/client'
import type { FedExService } from './services'
import type { FedExBox } from './box-definitions'

// ============================================================================
// CORE TYPES (from existing interfaces.ts)
// ============================================================================

export interface ShippingAddress {
  street: string
  street2?: string
  city: string
  state: string
  zipCode: string
  country: string
  isResidential?: boolean
  company?: string
  name?: string
  phone?: string
  email?: string
}

export interface ShippingDimensions {
  width: number // inches
  height: number // inches
  length: number // inches
}

export interface ShippingPackage {
  weight: number // pounds
  dimensions?: ShippingDimensions
  value?: number // declared value for insurance
  packagingType?: string // FedEx packaging type
  items?: PackageItem[] // Individual items in package
}

export interface PackageItem {
  name: string
  quantity: number
  weight: number
  dimensions?: ShippingDimensions
  value?: number
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

  // Enhanced fields
  rateType?: 'LIST' | 'ACCOUNT' | 'PREFERRED'
  surcharges?: RateSurcharge[]
  serviceDetails?: FedExService
  negotiatedRate?: number // Account rate if available
}

export interface RateSurcharge {
  type: string
  description: string
  amount: number
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface FedExRateRequest {
  accountNumber: {
    value: string
  }
  rateRequestControlParameters?: {
    returnTransitTimes?: boolean
    servicesNeededOnRateFailure?: boolean
    rateSortOrder?: 'SERVICENAMETRADITIONAL' | 'COMMITASCENDING'
  }
  requestedShipment: {
    shipper: {
      address: FedExAddress
      contact?: FedExContact
    }
    recipient: {
      address: FedExAddress
      contact?: FedExContact
    }
    shipDateStamp: string // YYYY-MM-DD
    serviceType?: string // Specific service or leave blank for all
    packagingType?: string
    pickupType: 'DROPOFF_AT_FEDEX_LOCATION' | 'CONTACT_FEDEX_TO_SCHEDULE' | 'USE_SCHEDULED_PICKUP'
    rateRequestType?: Array<'LIST' | 'ACCOUNT' | 'PREFERRED'>
    requestedPackageLineItems: FedExPackageLineItem[]

    // SmartPost specific
    smartPostInfoDetail?: {
      ancillaryEndorsement?: string
      hubId?: string
      indicia: 'PARCEL_SELECT' | 'PRESORTED_STANDARD'
      specialServices?: string
    }

    // Freight specific
    freightShipmentDetail?: {
      role: 'SHIPPER' | 'THIRD_PARTY'
      freightClass?: string
      totalHandlingUnits?: number
      declaredValuePerUnit?: {
        amount: number
        currency: string
      }
    }
  }

  // Carrier codes for filtering
  carrierCodes?: Array<'FDXE' | 'FDXG' | 'FXSP' | 'FXFR'>
}

export interface FedExAddress {
  streetLines: string[]
  city: string
  stateOrProvinceCode: string
  postalCode: string
  countryCode: string
  residential?: boolean
}

export interface FedExContact {
  personName?: string
  phoneNumber?: string
  companyName?: string
  emailAddress?: string
}

export interface FedExPackageLineItem {
  sequenceNumber: number
  weight: {
    units: 'LB' | 'KG'
    value: number
  }
  dimensions?: {
    length: number
    width: number
    height: number
    units: 'IN' | 'CM'
  }
  groupPackageCount?: number
  itemDescription?: string
  declaredValue?: {
    amount: number
    currency: string
  }
}

export interface FedExRateResponse {
  transactionId?: string
  output?: {
    rateReplyDetails?: FedExRateReplyDetail[]
    alerts?: FedExAlert[]
  }
  errors?: FedExError[]
}

export interface FedExRateReplyDetail {
  serviceType: string
  serviceName?: string
  packagingType?: string
  commit?: {
    dateDetail?: {
      dayOfWeek?: string
      dayCxsFormat?: string
    }
  }
  deliveryTimestamp?: string
  ratedShipmentDetails?: Array<{
    rateType?: 'LIST' | 'ACCOUNT' | 'PREFERRED'
    totalNetCharge?: number
    totalNetFedExCharge?: number
    shipmentRateDetail?: {
      totalBaseCharge?: number
      totalNetCharge?: number
      currency?: string
      surcharges?: Array<{
        type: string
        description?: string
        amount: number
      }>
    }
  }>
  operationalDetail?: {
    originServiceArea?: string
    destinationServiceArea?: string
    deliveryDay?: string
    deliveryDate?: string
    transitTime?: string
    ineligibleForMoneyBackGuarantee?: boolean
  }
}

export interface FedExAlert {
  code: string
  message: string
  alertType: 'NOTE' | 'WARNING' | 'ERROR'
}

export interface FedExError {
  code: string
  message: string
  parameterList?: Array<{
    key: string
    value: string
  }>
}

// ============================================================================
// OAUTH & AUTHENTICATION
// ============================================================================

export interface FedExAuthToken {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

export interface FedExAuthConfig {
  clientId: string
  clientSecret: string
  accountNumber: string
  isProduction: boolean
}

// ============================================================================
// SHIPPING LABELS
// ============================================================================

export interface ShippingLabel {
  trackingNumber: string
  labelUrl: string
  labelFormat: 'PDF' | 'PNG' | 'ZPL'
  carrier: Carrier
  masterTrackingNumber?: string // For multi-package shipments
}

export interface FedExLabelRequest {
  accountNumber: {
    value: string
  }
  requestedShipment: {
    shipper: {
      address: FedExAddress
      contact: FedExContact
    }
    recipient: {
      address: FedExAddress
      contact: FedExContact
    }
    shipDateStamp: string
    serviceType: string
    packagingType: string
    pickupType: string
    blockInsightVisibility: boolean
    labelSpecification: {
      labelFormatType: 'COMMON2D' | 'LABEL_DATA_ONLY'
      imageType: 'PDF' | 'PNG' | 'ZPLII'
      labelStockType: 'PAPER_4X6' | 'PAPER_4X6.75' | 'PAPER_4X8' | 'PAPER_LETTER'
    }
    requestedPackageLineItems: FedExPackageLineItem[]
  }
}

// ============================================================================
// TRACKING
// ============================================================================

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

// ============================================================================
// ADDRESS VALIDATION
// ============================================================================

export interface AddressValidationRequest {
  addressesToValidate: Array<{
    address: FedExAddress
  }>
}

export interface AddressValidationResponse {
  output?: {
    resolvedAddresses?: Array<{
      classification?: 'BUSINESS' | 'RESIDENTIAL' | 'MIXED' | 'UNKNOWN'
      resolvedAddress?: FedExAddress
      changes?: Array<{
        key: string
        value: string
      }>
      attributes?: {
        dpv?: boolean
        cmra?: boolean
        residential?: boolean
      }
    }>
  }
  errors?: FedExError[]
}

// ============================================================================
// SMARTPOST
// ============================================================================

export interface SmartPostHub {
  id: string
  name: string
  city: string
  state: string
  zip: string
  servesStates: string[]
}

// ============================================================================
// FREIGHT
// ============================================================================

export interface FreightClass {
  code: string
  name: string
  description: string
  densityMin: number // lbs per cubic foot
  densityMax: number
}

export interface FreightShipmentDetail {
  role: 'SHIPPER' | 'THIRD_PARTY'
  totalHandlingUnits: number // Pallets
  freightClass?: string // NMFC class (50-500)
  declaredValue?: {
    amount: number
    currency: string
  }

  // Special services
  liftgateRequired?: boolean
  insideDelivery?: boolean
  appointmentRequired?: boolean
}

// ============================================================================
// CARRIER SETTINGS (DATABASE)
// ============================================================================

export interface FedExCarrierSettings {
  // Core settings
  enabled: boolean
  testMode: boolean
  markupPercentage: number

  // API credentials
  clientId: string
  clientSecret: string
  accountNumber: string
  meterNumber?: string

  // Service configuration
  enabledServices: string[] // Service codes to offer
  rateTypes: Array<'LIST' | 'ACCOUNT' | 'PREFERRED'>

  // Box settings
  defaultPackagingType: string
  customBoxes: FedExBox[]
  useIntelligentPacking: boolean

  // Freight settings
  freightEnabled: boolean
  freightClasses: Record<string, string> // Product category → freight class

  // SmartPost settings
  smartPostEnabled: boolean
  smartPostHubId?: string
  smartPostIndicia: 'PARCEL_SELECT' | 'PRESORTED_STANDARD'

  // Surcharges
  residentialSurcharge: number
  fuelSurchargeMultiplier: number

  // Features
  addressValidationEnabled: boolean
  signatureRequired: boolean
  saturdayDeliveryEnabled: boolean

  // Markup by service type
  markupByCategory?: {
    express: number
    ground: number
    freight: number
    international: number
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export interface FedExApiError extends Error {
  code: string
  statusCode?: number
  response?: FedExRateResponse
  retryable: boolean
}

export enum FedExErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_DIMENSIONS = 'INVALID_DIMENSIONS',
  WEIGHT_EXCEEDED = 'WEIGHT_EXCEEDED',
  UNSUPPORTED_SERVICE = 'UNSUPPORTED_SERVICE',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

// ============================================================================
// RATE CALCULATOR OPTIONS
// ============================================================================

export interface RateCalculationOptions {
  // Rate types to request
  rateTypes?: Array<'LIST' | 'ACCOUNT' | 'PREFERRED'>

  // Services to filter
  includeServices?: string[] // Only these services
  excludeServices?: string[] // Exclude these services

  // Special handling
  saturdayDelivery?: boolean
  signatureRequired?: boolean
  holdAtLocation?: boolean

  // International
  dutiesPaid?: boolean // DDP vs DDU
  customsValue?: number

  // Freight
  freightClass?: string
  liftgateRequired?: boolean
  insideDelivery?: boolean

  // SmartPost
  useSmartPost?: boolean
  smartPostHub?: string

  // Optimization
  preferFewerBoxes?: boolean
  useIntelligentPacking?: boolean
}
