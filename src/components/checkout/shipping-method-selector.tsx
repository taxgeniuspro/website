'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Truck, Clock, Zap } from 'lucide-react'
import { logger } from '@/lib/logger'

interface ShippingRate {
  serviceType: string
  serviceName: string
  deliveryDays?: number
  totalCharge: number
  currency: string
  description?: string
}

interface ShippingMethodSelectorProps {
  destination: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
    isResidential: boolean
  }
  packages: Array<{
    weight: number
    dimensions: {
      length: number
      width: number
      height: number
    }
    value: number
  }>
  onSelect: (rate: ShippingRate) => void
}

export function ShippingMethodSelector({
  destination,
  packages,
  onSelect,
}: ShippingMethodSelectorProps) {
  const [rates, setRates] = useState<ShippingRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null)

  useEffect(() => {
    fetchRates()
  }, [destination, packages])

  const fetchRates = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination,
          packages,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch shipping rates')
      }

      const data = await response.json()
      setRates(data.rates || [])

      // Auto-select cheapest option
      if (data.rates && data.rates.length > 0) {
        const cheapest = data.rates.reduce((min: ShippingRate, rate: ShippingRate) =>
          rate.totalCharge < min.totalCharge ? rate : min
        )
        setSelectedRate(cheapest)
      }
    } catch (err: any) {
      logger.error('Error fetching shipping rates', { error: err.message })
      setError('Failed to load shipping options. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getServiceIcon = (serviceType: string) => {
    if (serviceType.includes('OVERNIGHT') || serviceType.includes('EXPRESS')) {
      return <Zap className="h-5 w-5 text-yellow-500" />
    }
    if (serviceType.includes('2_DAY')) {
      return <Clock className="h-5 w-5 text-blue-500" />
    }
    return <Truck className="h-5 w-5 text-gray-500" />
  }

  const handleContinue = () => {
    if (selectedRate) {
      onSelect(selectedRate)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Calculating shipping rates...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <p className="text-red-500">{error}</p>
            <Button onClick={fetchRates} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (rates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">
            No shipping options available for this address.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Shipping Method</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Shipping Options */}
        <div className="space-y-3">
          {rates.map((rate) => (
            <div
              key={rate.serviceType}
              onClick={() => setSelectedRate(rate)}
              className={`
                border rounded-lg p-4 cursor-pointer transition-all
                ${
                  selectedRate?.serviceType === rate.serviceType
                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                    : 'border-gray-200 hover:border-primary/50'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getServiceIcon(rate.serviceType)}
                  <div>
                    <h4 className="font-medium">{rate.serviceName}</h4>
                    {rate.deliveryDays && (
                      <p className="text-sm text-muted-foreground">
                        {rate.deliveryDays} business day{rate.deliveryDays !== 1 ? 's' : ''}
                      </p>
                    )}
                    {rate.description && (
                      <p className="text-xs text-muted-foreground mt-1">{rate.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    ${rate.totalCharge.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">{rate.currency}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Continue Button */}
        <Button onClick={handleContinue} disabled={!selectedRate} className="w-full">
          Continue to Payment
        </Button>

        {/* Destination Summary */}
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Shipping to:{' '}
            <span className="font-medium text-foreground">
              {destination.city}, {destination.state} {destination.zipCode}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
