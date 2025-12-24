'use client'

import { useState } from 'react'
import { ShippingAddressForm } from './shipping-address-form'
import { ShippingMethodSelector } from './shipping-method-selector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Package, Truck, CreditCard } from 'lucide-react'
import { logger } from '@/lib/logger'
import { useRouter } from 'next/navigation'

interface CartItem {
  productId: string
  name: string
  quantity: number
  price: number
  weight?: number // in pounds
  dimensions?: {
    length: number
    width: number
    height: number
  }
  customerImageUrl?: string
}

interface CheckoutFlowProps {
  items: CartItem[]
  userEmail?: string
}

type CheckoutStep = 'shipping-address' | 'shipping-method' | 'payment' | 'complete'

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

interface ShippingRate {
  serviceType: string
  serviceName: string
  deliveryDays?: number
  totalCharge: number
  currency: string
  description?: string
}

export function CompleteCheckoutFlow({ items, userEmail }: CheckoutFlowProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping-address')
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null)
  const [shippingMethod, setShippingMethod] = useState<ShippingRate | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Calculate totals (USD only)
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shippingCost = shippingMethod?.totalCharge || 0
  const tax = subtotal * 0.08 // 8% sales tax
  const total = subtotal + shippingCost + tax

  // Convert cart items to packages for shipping (uses actual product weights)
  const packages = items.map((item) => ({
    weight: item.weight || 1, // Product weight from metadata
    dimensions: item.dimensions || {
      length: 12,
      width: 9,
      height: 2,
    },
    value: item.price * item.quantity,
  }))

  const handleAddressSubmit = (address: ShippingAddress) => {
    setShippingAddress(address)
    setCurrentStep('shipping-method')
  }

  const handleShippingSelect = (rate: ShippingRate) => {
    setShippingMethod(rate)
    setCurrentStep('payment')
  }

  const handleStripeCheckout = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: items.map(item => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            imageUrl: item.customerImageUrl || '',
          })),
        }),
      })

      const data = await response.json()

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else if (data.orderId) {
        // Test mode - order created directly
        setOrderId(data.orderId)
        setCurrentStep('complete')
      } else {
        throw new Error(data.error || 'Failed to create checkout session')
      }
    } catch (error) {
      logger.error('Checkout error', { error })
      alert('Failed to process checkout. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const renderStepIndicator = () => {
    const steps = [
      { key: 'shipping-address', label: 'Shipping', icon: Package },
      { key: 'shipping-method', label: 'Delivery', icon: Truck },
      { key: 'payment', label: 'Payment', icon: CreditCard },
    ]

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = currentStep === step.key
          const isComplete =
            steps.findIndex((s) => s.key === currentStep) > steps.findIndex((s) => s.key === step.key)

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2
                  ${isComplete ? 'bg-green-500 border-green-500' : ''}
                  ${isActive ? 'bg-primary border-primary' : ''}
                  ${!isActive && !isComplete ? 'bg-gray-100 border-gray-300' : ''}
                `}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  ) : (
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  )}
                </div>
                <p
                  className={`text-xs mt-2 ${isActive || isComplete ? 'font-medium' : 'text-gray-500'}`}
                >
                  {step.label}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${isComplete ? 'bg-green-500' : 'bg-gray-300'}`}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderOrderSummary = () => (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground">Qty: {item.quantity}</p>
              </div>
              <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <p>Subtotal</p>
            <p>${subtotal.toFixed(2)}</p>
          </div>
          {shippingMethod && (
            <div className="flex justify-between text-sm">
              <p>Shipping ({shippingMethod.serviceName})</p>
              <p>${shippingCost.toFixed(2)}</p>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <p>Tax</p>
            <p>${tax.toFixed(2)}</p>
          </div>
          <div className="border-t pt-2 flex justify-between font-semibold">
            <p>Total</p>
            <p>${total.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (currentStep === 'complete') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">Order Complete!</h2>
              <p className="text-muted-foreground">
                Thank you for your purchase. Your order has been confirmed.
              </p>
              {orderId && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium">Order ID</p>
                  <p className="text-lg font-mono">{orderId}</p>
                </div>
              )}
              {shippingAddress && (
                <div className="text-left bg-gray-50 p-4 rounded-lg space-y-1">
                  <p className="text-sm font-medium">Shipping to:</p>
                  <p className="text-sm">{shippingAddress.name}</p>
                  <p className="text-sm">{shippingAddress.street}</p>
                  {shippingAddress.street2 && <p className="text-sm">{shippingAddress.street2}</p>}
                  <p className="text-sm">
                    {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
                  </p>
                </div>
              )}
              <div className="flex gap-3 justify-center pt-4">
                <Button onClick={() => router.push('/store')}>Continue Shopping</Button>
                <Button variant="outline" onClick={() => router.push('/dashboard/client')}>
                  View Orders
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {renderStepIndicator()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {currentStep === 'shipping-address' && (
            <ShippingAddressForm onSubmit={handleAddressSubmit} />
          )}

          {currentStep === 'shipping-method' && shippingAddress && (
            <>
              <ShippingMethodSelector
                destination={{
                  street: shippingAddress.street,
                  city: shippingAddress.city,
                  state: shippingAddress.state,
                  zipCode: shippingAddress.zipCode,
                  country: shippingAddress.country,
                  isResidential: shippingAddress.isResidential,
                }}
                packages={packages}
                onSelect={handleShippingSelect}
              />
              <Button variant="outline" onClick={() => setCurrentStep('shipping-address')}>
                Back to Shipping Address
              </Button>
            </>
          )}

          {currentStep === 'payment' && shippingAddress && shippingMethod && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    You will be redirected to our secure payment processor to complete your purchase.
                  </p>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleStripeCheckout}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
                  </Button>
                </CardContent>
              </Card>
              <Button variant="outline" onClick={() => setCurrentStep('shipping-method')}>
                Back to Shipping Options
              </Button>
            </>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">{renderOrderSummary()}</div>
      </div>
    </div>
  )
}
