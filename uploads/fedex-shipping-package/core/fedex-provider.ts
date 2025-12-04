/**
 * Enhanced FedEx Provider - Production Ready
 * Based on WooCommerce FedEx Plugin 4.4.6 with Next.js optimizations
 *
 * Features:
 * - 30+ service types (Express, Ground, Freight, SmartPost, International)
 * - Intelligent box packing (14 FedEx box types, 3D bin packing)
 * - Enterprise error handling (retry, token refresh, exponential backoff)
 * - Freight support (LTL, NMFC classes, pallet calculations)
 * - SmartPost support (27 US hubs, USPS last-mile)
 * - Multi-rate-type support (LIST/ACCOUNT/PREFERRED)
 */

import axios, { type AxiosInstance } from 'axios'
import { Carrier } from '@prisma/client'
import {
  type ShippingAddress,
  type ShippingPackage,
  type ShippingRate,
  type ShippingLabel,
  type ShippingProvider,
  type TrackingInfo,
  type TrackingEvent,
} from '../interfaces'
import { roundWeight } from '../weight-calculator'

// Enhanced modules
import {
  FEDEX_SERVICES,
  getServiceByCode,
  getDomesticServices,
  getInternationalServices,
  getServicesForWeight,
  type FedExService,
} from '../fedex/services'
import { packItems, convertToShippingPackages, type PackItem } from '../fedex/box-packer'
import { FedExErrorHandler, FedExError, withRetry } from '../fedex/error-handler'
import {
  findNearestHub,
  isStateServedBySmartPost,
  type SmartPostHub,
} from '../fedex/smartpost-hubs'
import {
  requiresFreight,
  buildFreightShipmentDetail,
  getFreightClassForPackage,
  calculatePallets,
  estimateFreightCost,
  isResidentialFreightAvailable,
  calculateResidentialFreightSurcharge,
} from '../fedex/freight'
import type {
  FedExAuthToken,
  FedExRateRequest,
  FedExRateResponse,
  RateCalculationOptions,
} from '../fedex/types'

interface FedExProviderConfig {
  clientId: string
  clientSecret: string
  accountNumber: string
  testMode: boolean
  markupPercentage: number
  useIntelligentPacking: boolean
  enabledServices?: string[] // Specific services to enable
  rateTypes?: Array<'LIST' | 'ACCOUNT' | 'PREFERRED'>
}

export class FedExProviderEnhanced implements ShippingProvider {
  carrier = Carrier.FEDEX
  private client: AxiosInstance
  private authToken: FedExAuthToken | null = null
  private tokenExpiry: Date | null = null
  private errorHandler: FedExErrorHandler
  private config: FedExProviderConfig

  constructor(config?: Partial<FedExProviderConfig>) {
    // Load configuration from environment or provided config
    this.config = {
      clientId: config?.clientId || process.env.FEDEX_API_KEY || '',
      clientSecret: config?.clientSecret || process.env.FEDEX_SECRET_KEY || '',
      accountNumber: config?.accountNumber || process.env.FEDEX_ACCOUNT_NUMBER || '',
      testMode:
        config?.testMode ?? (process.env.FEDEX_TEST_MODE === 'true' || !process.env.FEDEX_API_KEY),
      markupPercentage: config?.markupPercentage ?? 0,
      useIntelligentPacking: config?.useIntelligentPacking ?? true,
      enabledServices: config?.enabledServices,
      rateTypes: config?.rateTypes || ['LIST', 'ACCOUNT'],
    }

    const baseURL = this.config.testMode
      ? 'https://apis-sandbox.fedex.com'
      : 'https://apis.fedex.com'

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.errorHandler = new FedExErrorHandler({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      useExponentialBackoff: true,
      useJitter: true,
    })
  }

  /**
   * OAuth2 authentication with automatic refresh
   */
  private async authenticate(): Promise<void> {
    if (this.authToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return // Token still valid
    }

    await withRetry(
      async () => {
        const response = await axios.post(
          `${this.client.defaults.baseURL}/oauth/token`,
          new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        )

        this.authToken = response.data
        // Set token expiry with 5-minute buffer
        this.tokenExpiry = new Date(Date.now() + (this.authToken!.expires_in - 300) * 1000)

        // Update authorization header
        this.client.defaults.headers.common['Authorization'] =
          `Bearer ${this.authToken!.access_token}`
      },
      undefined, // No token refresh callback for authentication itself
      'FedEx OAuth2 Authentication'
    )
  }

  /**
   * Get shipping rates with intelligent box packing
   */
  async getRates(
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress,
    packages: ShippingPackage[],
    options?: RateCalculationOptions
  ): Promise<ShippingRate[]> {
    // PERFORMANCE: If test mode enabled, return instant test rates (< 50ms)
    if (this.config.testMode) {
      const testRates = this.getTestRates(
        packages,
        fromAddress.zipCode,
        toAddress.zipCode,
        toAddress.isResidential
      )
      const filteredRates = this.filterByEnabledServices(testRates)
      return this.applyMarkup(filteredRates)
    }

    // If no API credentials, return test rates
    if (!this.config.clientId || !this.config.accountNumber) {
      console.warn('[FedEx] No API credentials, returning test rates')
      const testRates = this.getTestRates(
        packages,
        fromAddress.zipCode,
        toAddress.zipCode,
        toAddress.isResidential
      )
      const filteredRates = this.filterByEnabledServices(testRates)
      return this.applyMarkup(filteredRates)
    }

    try {
      await this.authenticate()

      // Determine if freight is needed
      const needsFreight = requiresFreight(packages)

      // Use intelligent box packing for parcel shipments
      let optimizedPackages = packages
      if (this.config.useIntelligentPacking && !needsFreight) {
        optimizedPackages = this.optimizePackaging(packages)
      }

      // Determine which service types to request
      const isInternational = toAddress.country && toAddress.country !== 'US'
      const serviceCategories = this.determineServiceCategories(
        needsFreight,
        isInternational,
        toAddress.state!
      )

      // Fetch rates for each category in parallel
      const ratePromises = serviceCategories.map((category) =>
        this.getRatesForCategory(category, fromAddress, toAddress, optimizedPackages, options)
      )

      const results = await Promise.allSettled(ratePromises)

      // Combine successful results
      const allRates: ShippingRate[] = []
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allRates.push(...result.value)
        } else {
          console.warn(
            `[FedEx] Failed to get rates for ${serviceCategories[index]}:`,
            result.reason
          )
        }
      })

      // Filter by enabled services
      const filteredRates = this.filterByEnabledServices(allRates)

      // Apply markup
      return this.applyMarkup(filteredRates)
    } catch (error) {
      console.error('[FedEx] Rate fetch failed:', error)
      // Fallback to test rates with filtering
      const testRates = this.getTestRates(
        packages,
        fromAddress.zipCode,
        toAddress.zipCode,
        toAddress.isResidential
      )
      const filteredRates = this.filterByEnabledServices(testRates)
      return this.applyMarkup(filteredRates)
    }
  }

  /**
   * Optimize packaging using intelligent box packer
   */
  private optimizePackaging(packages: ShippingPackage[]): ShippingPackage[] {
    // Convert to PackItem format
    const items: PackItem[] = packages.flatMap(
      (pkg, index) =>
        pkg.items?.map((item) => ({
          name: item.name,
          length: item.dimensions?.length || pkg.dimensions?.length || 12,
          width: item.dimensions?.width || pkg.dimensions?.width || 12,
          height: item.dimensions?.height || pkg.dimensions?.height || 2,
          weight: item.weight,
          quantity: item.quantity,
        })) || [
          {
            name: `Package ${index + 1}`,
            length: pkg.dimensions?.length || 12,
            width: pkg.dimensions?.width || 12,
            height: pkg.dimensions?.height || 2,
            weight: pkg.weight,
            quantity: 1,
          },
        ]
    )

    // Pack items intelligently
    const packingResult = packItems(items, {
      allowCustomBoxes: true,
      preferFewerBoxes: false, // Optimize for cost, not box count
      maxBoxes: 50,
    })

    // Convert back to ShippingPackage format
    const optimizedPackages = convertToShippingPackages(packingResult, packages[0]?.value)

    //   `[FedEx] Optimized ${packages.length} packages → ${optimizedPackages.length} boxes (estimated savings: ${((1 - optimizedPackages.length / packages.length) * 100).toFixed(0)}%)`
    // )

    return optimizedPackages
  }

  /**
   * Determine which service categories to request
   */
  private determineServiceCategories(
    needsFreight: boolean,
    isInternational: boolean,
    destinationState: string
  ): Array<'express' | 'ground' | 'freight' | 'smartpost' | 'international'> {
    const categories: Array<'express' | 'ground' | 'freight' | 'smartpost' | 'international'> = []

    if (isInternational) {
      categories.push('international')
    } else {
      // Domestic shipment
      categories.push('express', 'ground')

      // Add freight if needed
      if (needsFreight) {
        categories.push('freight')
      }

      // Add SmartPost if destination is served
      if (isStateServedBySmartPost(destinationState)) {
        categories.push('smartpost')
      }
    }

    return categories
  }

  /**
   * Get rates for specific service category
   */
  private async getRatesForCategory(
    category: 'express' | 'ground' | 'freight' | 'smartpost' | 'international',
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress,
    packages: ShippingPackage[],
    options?: RateCalculationOptions
  ): Promise<ShippingRate[]> {
    const requestBody = this.buildRateRequest(category, fromAddress, toAddress, packages, options)

    return withRetry(
      async () => {
        const endpoint =
          category === 'freight' ? '/rate/v1/freight/rates/quotes' : '/rate/v1/rates/quotes'

        const response = await this.client.post<FedExRateResponse>(endpoint, requestBody)

        if (
          !response.data.output?.rateReplyDetails ||
          response.data.output.rateReplyDetails.length === 0
        ) {
          return []
        }

        return this.parseRateResponse(response.data, toAddress.isResidential)
      },
      () => this.authenticate(), // Token refresh callback
      `FedEx ${category} rates`
    )
  }

  /**
   * Build FedEx API rate request
   */
  private buildRateRequest(
    category: 'express' | 'ground' | 'freight' | 'smartpost' | 'international',
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress,
    packages: ShippingPackage[],
    options?: RateCalculationOptions
  ): FedExRateRequest {
    const baseRequest: FedExRateRequest = {
      accountNumber: {
        value: this.config.accountNumber,
      },
      rateRequestControlParameters: {
        returnTransitTimes: true,
        servicesNeededOnRateFailure: true,
        rateSortOrder: 'SERVICENAMETRADITIONAL',
      },
      requestedShipment: {
        shipper: {
          address: this.formatAddress(fromAddress),
        },
        recipient: {
          address: this.formatAddress(toAddress),
        },
        shipDateStamp: new Date().toISOString().split('T')[0],
        pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
        rateRequestType: options?.rateTypes || this.config.rateTypes,
        requestedPackageLineItems: packages.map((pkg, index) => ({
          sequenceNumber: index + 1,
          weight: {
            units: 'LB',
            value: roundWeight(pkg.weight),
          },
          dimensions: pkg.dimensions
            ? {
                length: Math.ceil(pkg.dimensions.length),
                width: Math.ceil(pkg.dimensions.width),
                height: Math.ceil(pkg.dimensions.height),
                units: 'IN',
              }
            : undefined,
        })),
      },
    }

    // Add carrier codes based on category
    if (category === 'express') {
      baseRequest.carrierCodes = ['FDXE']
    } else if (category === 'ground') {
      baseRequest.carrierCodes = ['FDXG']
    } else if (category === 'smartpost') {
      baseRequest.carrierCodes = ['FXSP']
      // Add SmartPost-specific details
      const hubId = findNearestHub(toAddress.state!)
      baseRequest.requestedShipment.smartPostInfoDetail = {
        indicia: 'PARCEL_SELECT',
        hubId: hubId || undefined,
      }
    } else if (category === 'freight') {
      // Add freight-specific details
      baseRequest.requestedShipment.freightShipmentDetail = buildFreightShipmentDetail(
        packages,
        options?.customsValue || 1000
      )
    }

    return baseRequest
  }

  /**
   * Parse FedEx API rate response
   */
  private parseRateResponse(response: FedExRateResponse, isResidential?: boolean): ShippingRate[] {
    if (!response.output?.rateReplyDetails) {
      return []
    }

    const allRates = response.output.rateReplyDetails
      .map((detail) => {
        const serviceCode = detail.serviceType
        const serviceInfo = getServiceByCode(serviceCode)

        if (!serviceInfo) {
          console.warn(`[FedEx] Unknown service type: ${serviceCode}`)
          return null
        }

        // Get rate amounts
        const ratedShipmentDetail = detail.ratedShipmentDetails?.[0]
        if (!ratedShipmentDetail) return null

        const accountRate = ratedShipmentDetail.totalNetCharge
        const listRate = detail.ratedShipmentDetails?.find(
          (d) => d.rateType === 'LIST'
        )?.totalNetCharge

        // Parse delivery date
        let estimatedDays = serviceInfo.estimatedDaysMin
        let deliveryDate: Date | undefined
        if (detail.deliveryTimestamp) {
          deliveryDate = new Date(detail.deliveryTimestamp)
          const today = new Date()
          estimatedDays = Math.ceil(
            (deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          )
        }

        // Adjust service name for residential ground
        let serviceName = serviceInfo.displayName
        if (serviceCode === 'FEDEX_GROUND' && isResidential) {
          serviceName = 'FedEx Ground Home Delivery'
        }

        return {
          carrier: this.carrier,
          serviceCode,
          serviceName,
          rateAmount: accountRate || listRate || 0,
          currency: 'USD',
          estimatedDays: Math.max(estimatedDays, 1),
          deliveryDate,
          isGuaranteed: serviceInfo.isGuaranteed,
        } as ShippingRate
      })
      .filter((rate): rate is ShippingRate => rate !== null)

    // Deduplicate by serviceCode, keeping the lowest price for each service
    // This fixes React key duplicate warnings and ensures clean UI display
    const deduplicatedRates = allRates.reduce((unique, rate) => {
      const existing = unique.find((r) => r.serviceCode === rate.serviceCode)
      if (!existing) {
        // New service code, add it
        return [...unique, rate]
      } else if (rate.rateAmount < existing.rateAmount) {
        // Found cheaper rate for same service, replace existing
        return [...unique.filter((r) => r.serviceCode !== rate.serviceCode), rate]
      }
      // Keep existing (cheaper or same price)
      return unique
    }, [] as ShippingRate[])

    return deduplicatedRates
  }

  /**
   * Filter rates by enabled services configuration
   */
  private filterByEnabledServices(rates: ShippingRate[]): ShippingRate[] {
    if (!this.config.enabledServices || this.config.enabledServices.length === 0) {
      return rates // All services enabled
    }

    return rates.filter((rate) => this.config.enabledServices!.includes(rate.serviceCode))
  }

  /**
   * Apply markup to rates
   */
  private applyMarkup(rates: ShippingRate[]): ShippingRate[] {
    if (this.config.markupPercentage === 0) {
      return rates
    }

    const markup = 1 + this.config.markupPercentage / 100

    return rates.map((rate) => ({
      ...rate,
      rateAmount: roundWeight(rate.rateAmount * markup, 2),
    }))
  }

  /**
   * Create shipping label (existing implementation)
   */
  async createLabel(
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress,
    packages: ShippingPackage[],
    serviceCode: string
  ): Promise<ShippingLabel> {
    await this.authenticate()

    return withRetry(
      async () => {
        const requestBody = {
          accountNumber: {
            value: this.config.accountNumber,
          },
          requestedShipment: {
            shipper: {
              address: this.formatAddress(fromAddress),
              contact: {
                personName: 'Shipping Department',
                phoneNumber: '1234567890',
                companyName: 'GangRun Printing',
              },
            },
            recipient: {
              address: this.formatAddress(toAddress),
              contact: {
                personName: toAddress.name || 'Recipient',
                phoneNumber: toAddress.phone || '1234567890',
              },
            },
            shipDateStamp: new Date().toISOString().split('T')[0],
            serviceType: serviceCode,
            packagingType: packages[0].packagingType || 'YOUR_PACKAGING',
            pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
            blockInsightVisibility: false,
            labelSpecification: {
              labelFormatType: 'COMMON2D',
              imageType: 'PDF',
              labelStockType: 'PAPER_4X6',
            },
            requestedPackageLineItems: packages.map((pkg, index) => ({
              sequenceNumber: index + 1,
              weight: {
                units: 'LB',
                value: roundWeight(pkg.weight),
              },
              dimensions: pkg.dimensions
                ? {
                    length: Math.ceil(pkg.dimensions.length),
                    width: Math.ceil(pkg.dimensions.width),
                    height: Math.ceil(pkg.dimensions.height),
                    units: 'IN',
                  }
                : undefined,
            })),
          },
        }

        const response = await this.client.post('/ship/v1/shipments', requestBody)

        const output = response.data.output
        const completedPackage =
          output.transactionShipments[0].completedShipmentDetail.completedPackageDetails[0]

        return {
          trackingNumber: completedPackage.trackingIds[0].trackingNumber,
          labelUrl: completedPackage.label.url || '',
          labelFormat: 'PDF',
          carrier: this.carrier,
        }
      },
      () => this.authenticate(),
      'FedEx label creation'
    )
  }

  /**
   * Track shipment (existing implementation)
   */
  async track(trackingNumber: string): Promise<TrackingInfo> {
    await this.authenticate()

    return withRetry(
      async () => {
        const requestBody = {
          trackingInfo: [
            {
              trackingNumberInfo: {
                trackingNumber,
              },
            },
          ],
          includeDetailedScans: true,
        }

        const response = await this.client.post('/track/v1/trackingnumbers', requestBody)

        const trackResult = response.data.output.completeTrackResults[0].trackResults[0]

        interface FedExScanEvent {
          date: string
          scanLocation: {
            city: string
            stateOrProvinceCode: string
          }
          eventDescription: string
          derivedStatusCode: string
        }

        const events: TrackingEvent[] = (trackResult.scanEvents || []).map(
          (event: FedExScanEvent) => ({
            timestamp: new Date(event.date),
            location: `${event.scanLocation.city}, ${event.scanLocation.stateOrProvinceCode}`,
            status: event.derivedStatus || event.eventType,
            description: event.eventDescription,
          })
        )

        const status = this.mapTrackingStatus(trackResult.latestStatusDetail?.code)

        return {
          trackingNumber,
          carrier: this.carrier,
          status,
          currentLocation: trackResult.latestStatusDetail?.scanLocation?.city,
          estimatedDelivery: trackResult.estimatedDeliveryTimestamp
            ? new Date(trackResult.estimatedDeliveryTimestamp)
            : undefined,
          actualDelivery: trackResult.actualDeliveryTimestamp
            ? new Date(trackResult.actualDeliveryTimestamp)
            : undefined,
          events,
        }
      },
      () => this.authenticate(),
      'FedEx tracking'
    )
  }

  /**
   * Validate address
   */
  async validateAddress(address: ShippingAddress): Promise<boolean> {
    await this.authenticate()

    try {
      const requestBody = {
        addressesToValidate: [
          {
            address: this.formatAddress(address),
          },
        ],
      }

      const response = await this.client.post('/address/v1/addresses/resolve', requestBody)

      const result = response.data.output.resolvedAddresses[0]
      return result.classification === 'BUSINESS' || result.classification === 'RESIDENTIAL'
    } catch (error) {
      return false
    }
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(trackingNumber: string): Promise<boolean> {
    await this.authenticate()

    try {
      const requestBody = {
        accountNumber: {
          value: this.config.accountNumber,
        },
        trackingNumber,
      }

      await this.client.put('/ship/v1/shipments/cancel', requestBody)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Format address for FedEx API
   */
  private formatAddress(address: ShippingAddress): {
    streetLines: string[]
    city: string
    stateOrProvinceCode: string
    postalCode: string
    countryCode: string
    residential: boolean
  } {
    return {
      streetLines: [address.street, address.street2].filter(Boolean),
      city: address.city,
      stateOrProvinceCode: address.state,
      postalCode: address.zipCode,
      countryCode: address.country || 'US',
      residential: address.isResidential || false,
    }
  }

  /**
   * Map FedEx tracking status
   */
  private mapTrackingStatus(fedexStatus: string): TrackingInfo['status'] {
    const statusMap: Record<string, TrackingInfo['status']> = {
      PU: 'in_transit',
      OD: 'in_transit',
      DE: 'in_transit',
      DL: 'delivered',
      RS: 'exception',
      CA: 'exception',
    }
    return statusMap[fedexStatus] || 'pending'
  }

  /**
   * Get test/estimated rates (enhanced with more services)
   * DEBUG: Added Oct 21 2025 - Should return exactly 4 rates
   */
  private getTestRates(
    packages: ShippingPackage[],
    fromZip?: string,
    toZip?: string,
    isResidential?: boolean
  ): ShippingRate[] {
    const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0)
    const needsFreight = requiresFreight(packages)

    const rates: ShippingRate[] = []

    if (!needsFreight) {
      // Standard parcel services - MUST be exactly 4
      const services = [
        {
          code: 'STANDARD_OVERNIGHT',
          name: 'FedEx Standard Overnight',
          base: 45,
          perLb: 2.0,
          days: 1,
        },
        { code: 'FEDEX_2_DAY', name: 'FedEx 2Day', base: 25, perLb: 1.5, days: 2 },
        // FIX: Use GROUND_HOME_DELIVERY for residential, FEDEX_GROUND for business (only ONE ground service based on address type)
        {
          code: isResidential ? 'GROUND_HOME_DELIVERY' : 'FEDEX_GROUND',
          name: isResidential ? 'FedEx Home Delivery' : 'FedEx Ground',
          base: 12,
          perLb: 0.85,
          days: 3,
        },
      ]

      services.forEach((svc) => {
        rates.push({
          carrier: this.carrier,
          serviceCode: svc.code,
          serviceName: svc.name,
          rateAmount: roundWeight(svc.base + totalWeight * svc.perLb, 2),
          currency: 'USD',
          estimatedDays: svc.days,
          // STANDARD_OVERNIGHT is not guaranteed (user request October 21, 2025)
          isGuaranteed: svc.days === 1 && svc.code !== 'STANDARD_OVERNIGHT',
        })
      })
    } else {
      // Freight services
      const freightCost = estimateFreightCost(packages, fromZip || '60173', toZip || '90001', {
        liftgateRequired: isResidential,
      })

      rates.push({
        carrier: this.carrier,
        serviceCode: 'FEDEX_FREIGHT_ECONOMY',
        serviceName: 'FedEx Freight Economy',
        rateAmount: roundWeight(freightCost, 2),
        currency: 'USD',
        estimatedDays: 5,
        isGuaranteed: false,
      })
    }

    return rates
  }
}
