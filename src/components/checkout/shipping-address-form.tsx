'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ShippingAddress {
  name: string
  street: string
  street2?: string
  city: string
  state: string
  zipCode: string
  country: string
  phone: string
  isResidential: boolean
}

interface ShippingAddressFormProps {
  onSubmit: (address: ShippingAddress) => void
  initialAddress?: Partial<ShippingAddress>
}

export function ShippingAddressForm({ onSubmit, initialAddress }: ShippingAddressFormProps) {
  const [address, setAddress] = useState<ShippingAddress>({
    name: initialAddress?.name || '',
    street: initialAddress?.street || '',
    street2: initialAddress?.street2 || '',
    city: initialAddress?.city || '',
    state: initialAddress?.state || '',
    zipCode: initialAddress?.zipCode || '',
    country: initialAddress?.country || 'US',
    phone: initialAddress?.phone || '',
    isResidential: initialAddress?.isResidential ?? true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!address.name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (!address.street.trim()) {
      newErrors.street = 'Street address is required'
    }
    if (!address.city.trim()) {
      newErrors.city = 'City is required'
    }
    if (!address.state.trim()) {
      newErrors.state = 'State is required'
    }
    if (!address.zipCode.trim()) {
      newErrors.zipCode = 'ZIP code is required'
    } else if (!/^\d{5}(-\d{4})?$/.test(address.zipCode)) {
      newErrors.zipCode = 'Invalid ZIP code format'
    }
    if (!address.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      onSubmit(address)
    }
  }

  const handleChange = (field: keyof ShippingAddress, value: string | boolean) => {
    setAddress((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping Address</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={address.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="John Doe"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Street Address */}
          <div>
            <Label htmlFor="street">Street Address *</Label>
            <Input
              id="street"
              value={address.street}
              onChange={(e) => handleChange('street', e.target.value)}
              placeholder="123 Main St"
              className={errors.street ? 'border-red-500' : ''}
            />
            {errors.street && <p className="text-sm text-red-500 mt-1">{errors.street}</p>}
          </div>

          {/* Apartment / Suite */}
          <div>
            <Label htmlFor="street2">Apartment / Suite (Optional)</Label>
            <Input
              id="street2"
              value={address.street2}
              onChange={(e) => handleChange('street2', e.target.value)}
              placeholder="Apt 4B"
            />
          </div>

          {/* City, State, ZIP */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={address.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Atlanta"
                className={errors.city ? 'border-red-500' : ''}
              />
              {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city}</p>}
            </div>

            <div className="col-span-1">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={address.state}
                onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
                placeholder="GA"
                maxLength={2}
                className={errors.state ? 'border-red-500' : ''}
              />
              {errors.state && <p className="text-sm text-red-500 mt-1">{errors.state}</p>}
            </div>

            <div className="col-span-1">
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                id="zipCode"
                value={address.zipCode}
                onChange={(e) => handleChange('zipCode', e.target.value)}
                placeholder="30315"
                className={errors.zipCode ? 'border-red-500' : ''}
              />
              {errors.zipCode && <p className="text-sm text-red-500 mt-1">{errors.zipCode}</p>}
            </div>
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={address.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+1 (404) 627-1015"
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
          </div>

          {/* Residential checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isResidential"
              checked={address.isResidential}
              onChange={(e) => handleChange('isResidential', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isResidential" className="font-normal cursor-pointer">
              This is a residential address
            </Label>
          </div>

          <Button type="submit" className="w-full">
            Continue to Shipping Options
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
