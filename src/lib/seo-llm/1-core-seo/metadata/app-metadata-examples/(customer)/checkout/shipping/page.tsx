'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/contexts/cart-context'
import {
  ShippingAddressForm,
  type ShippingAddress,
} from '@/components/checkout/shipping-address-form'
import {
  ShippingMethodSelector,
  type ShippingRate,
} from '@/components/checkout/shipping-method-selector'
import { AirportSelector } from '@/components/checkout/airport-selector'
import { SavedAddresses } from '@/components/checkout/saved-addresses'
import { useUser } from '@/hooks/use-user'
import toast from '@/lib/toast'
import Link from 'next/link'

export default function ShippingPage() {
  const router = useRouter()
  const { items, subtotal, itemCount } = useCart()
  const { user } = useUser()

  const [shippingAddress, setShippingAddress] = useState<Partial<ShippingAddress>>({
    country: 'US',
  })
  const [showManualForm, setShowManualForm] = useState(false)
  const [shouldSaveAddress, setShouldSaveAddress] = useState(false)
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<ShippingRate | undefined>()
  const [selectedAirportId, setSelectedAirportId] = useState<string | undefined>()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isProcessing, setIsProcessing] = useState(false)

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push('/checkout')
    }
  }, [items, router])

  // Load previously entered shipping data from sessionStorage (if customer navigates back)
  useEffect(() => {
    const loadSavedData = () => {
      try {
        const savedAddress = sessionStorage.getItem('checkout_shipping_address')
        const savedMethod = sessionStorage.getItem('checkout_shipping_method')
        const savedAirport = sessionStorage.getItem('checkout_airport_id')

        if (savedAddress) {
          const parsed = JSON.parse(savedAddress)
          setShippingAddress(parsed)
        }

        if (savedMethod) {
          const parsed = JSON.parse(savedMethod)
          setSelectedShippingMethod(parsed)
        }

        if (savedAirport) {
          setSelectedAirportId(savedAirport)
        }
      } catch (error) {
        console.error('[Shipping] Error loading saved data:', error)
        // Don't show error to user - just start fresh
      }
    }

    loadSavedData()
  }, []) // Run only once on mount

  // ============================================================================
  // 🚨 WEIGHT CALCULATION: Send cart items to backend for accurate calculation
  // ============================================================================
  // Backend /api/shipping/calculate handles weight calculation using the formula:
  // weight = paperStockWeight × (width × height) × quantity
  // We send raw cart item data (quantity, width, height, paperStockWeight) to backend
  // ============================================================================
  const shippingItems = items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    width: item.dimensions?.width || 3.5, // Default business card width
    height: item.dimensions?.height || 2, // Default business card height
    paperStockId: item.options.paperStockId,
    paperStockWeight: item.paperStockWeight,
  }))

  const handleSavedAddressSelect = (address: any) => {
    setShippingAddress({
      firstName: address.name.split(' ')[0] || '',
      lastName: address.name.split(' ').slice(1).join(' ') || '',
      email: user?.email || '',
      phone: address.phone || user?.phoneNumber || '',
      company: address.company || '',
      street: address.street,
      street2: address.street2 || '',
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country || 'US',
    })
    setShowManualForm(true)
    setErrors({}) // Clear any previous errors
  }

  const handleNewAddress = () => {
    setShowManualForm(true)
  }

  const validateAddress = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!shippingAddress.firstName) newErrors.firstName = 'First name is required'
    if (!shippingAddress.lastName) newErrors.lastName = 'Last name is required'
    if (!shippingAddress.email) newErrors.email = 'Email is required'
    if (!shippingAddress.phone) newErrors.phone = 'Phone is required'
    if (!shippingAddress.street) newErrors.street = 'Street address is required'
    if (!shippingAddress.city) newErrors.city = 'City is required'
    if (!shippingAddress.state) newErrors.state = 'State is required'
    if (!shippingAddress.zipCode) newErrors.zipCode = 'ZIP code is required'

    // Email format validation
    if (shippingAddress.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingAddress.email)) {
      newErrors.email = 'Invalid email format'
    }

    // ZIP code format validation
    if (shippingAddress.zipCode && !/^\d{5}(-\d{4})?$/.test(shippingAddress.zipCode)) {
      newErrors.zipCode = 'Invalid ZIP code format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinueToPayment = async () => {
    if (!validateAddress()) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!selectedShippingMethod) {
      toast.error('Please select a shipping method')
      return
    }

    // Check if Southwest Cargo selected but no airport chosen
    if (selectedShippingMethod.carrier === 'SOUTHWEST_CARGO' && !selectedAirportId) {
      toast.error('Please select a pickup airport for Southwest Cargo')
      return
    }

    setIsProcessing(true)

    try {
      // Save address if user requested it
      if (user && shouldSaveAddress && shippingAddress.firstName) {
        await fetch('/api/user/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: 'Shipping Address',
            name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
            company: '',
            street: shippingAddress.street,
            street2: shippingAddress.street2 || '',
            city: shippingAddress.city,
            state: shippingAddress.state,
            zipCode: shippingAddress.zipCode,
            country: shippingAddress.country || 'US',
            phone: shippingAddress.phone,
            isDefault: false,
          }),
        })
        toast.success('Address saved to your account')
      }

      // Store shipping information in sessionStorage
      sessionStorage.setItem('checkout_shipping_address', JSON.stringify(shippingAddress))
      sessionStorage.setItem('checkout_shipping_method', JSON.stringify(selectedShippingMethod))
      if (selectedAirportId) {
        sessionStorage.setItem('checkout_airport_id', selectedAirportId)
      }

      // Navigate to payment page
      router.push('/checkout/payment')
    } catch (error) {
      console.error('Error saving address:', error)
      toast.error('Failed to save address, but continuing to payment')
      // Continue to payment even if saving address fails
      router.push('/checkout/payment')
    } finally {
      setIsProcessing(false)
    }
  }

  if (items.length === 0) {
    return null // Will redirect
  }

  const shippingCost = selectedShippingMethod?.rate.amount || 0
  const tax = subtotal * 0.1 // 10% tax rate
  const total = subtotal + shippingCost + tax

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
            href="/checkout"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Cart
          </Link>
          <h1 className="text-3xl font-bold">Shipping Information</h1>
          <p className="text-muted-foreground mt-1">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} in your order
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Saved Addresses (for logged-in users) */}
            {user && !showManualForm && (
              <SavedAddresses
                userId={user.id}
                onSelectAddress={handleSavedAddressSelect}
                onNewAddress={handleNewAddress}
              />
            )}

            {/* Shipping Address Form */}
            {(!user || showManualForm) && (
              <ShippingAddressForm
                address={shippingAddress}
                errors={errors}
                onChange={setShippingAddress}
                user={user}
                onSaveAddressChange={setShouldSaveAddress}
                shouldSaveAddress={shouldSaveAddress}
              />
            )}

            {/* Airport Selector (appears BEFORE shipping methods if state has Southwest airports) */}
            {shippingAddress.state && (
              <AirportSelector
                state={shippingAddress.state}
                selectedAirportId={selectedAirportId ?? null}
                onAirportSelected={(airportId) => setSelectedAirportId(airportId ?? undefined)}
              />
            )}

            {/* Shipping Method Selector */}
            {shippingAddress.zipCode && shippingAddress.state && shippingAddress.city && (
              <ShippingMethodSelector
                destination={{
                  street: shippingAddress.street,
                  city: shippingAddress.city,
                  state: shippingAddress.state,
                  zipCode: shippingAddress.zipCode,
                }}
                items={shippingItems}
                selectedMethod={selectedShippingMethod}
                selectedAirportId={selectedAirportId}
                onSelect={setSelectedShippingMethod}
              />
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-lg">Order Summary</h3>

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal ({itemCount} items)</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{selectedShippingMethod ? `$${shippingCost.toFixed(2)}` : 'TBD'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (estimated)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <Separator />

                {/* Continue Button */}
                <Button
                  className="w-full"
                  disabled={isProcessing || !selectedShippingMethod}
                  size="lg"
                  onClick={handleContinueToPayment}
                >
                  Continue to Payment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                {/* Trust Badge */}
                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    🔒 Secure checkout powered by Square
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
