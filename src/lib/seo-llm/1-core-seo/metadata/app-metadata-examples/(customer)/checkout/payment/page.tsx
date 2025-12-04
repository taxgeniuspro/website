'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CreditCard, ArrowLeft, CheckCircle } from 'lucide-react'
import { SquareCardPayment } from '@/components/checkout/square-card-payment'
import { PayPalButton } from '@/components/checkout/paypal-button'
import { CashAppQRPayment } from '@/components/checkout/cashapp-qr-payment'
import { SavedPaymentMethods } from '@/components/checkout/saved-payment-methods'
import { useCart } from '@/contexts/cart-context'
import { useUser } from '@/hooks/use-user'
import toast from '@/lib/toast'

type PaymentMethod = 'square' | 'paypal' | 'cashapp' | null

interface PayPalOrderDetails {
  id: string
  status: string
  payer?: {
    name?: {
      given_name: string
      surname: string
    }
    email_address?: string
  }
}

export default function PaymentPage() {
  const router = useRouter()
  const { items, subtotal, clearCart, itemCount } = useCart()
  const { user } = useUser()
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null)
  const [selectedSavedPaymentMethod, setSelectedSavedPaymentMethod] = useState<any>(null)
  const [showManualPayment, setShowManualPayment] = useState(false)
  const [shippingAddress, setShippingAddress] = useState<any>(null)
  const [shippingMethod, setShippingMethod] = useState<any>(null)
  const [airportId, setAirportId] = useState<string | undefined>()
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load order data from session storage
  useEffect(() => {
    const loadOrderData = () => {
      try {
        // Load shipping information from new flow
        const shippingAddressData = sessionStorage.getItem('checkout_shipping_address')
        const shippingMethodData = sessionStorage.getItem('checkout_shipping_method')
        const airportIdData = sessionStorage.getItem('checkout_airport_id')
        const artworkFiles = sessionStorage.getItem('cart_artwork_files')

        // If no shipping data, redirect back to shipping page
        if (!shippingAddressData || !shippingMethodData) {
          toast.error('Please complete shipping information first.')
          router.push('/checkout/shipping')
          return
        }

        // Parse and set the state
        const parsedAddress = JSON.parse(shippingAddressData)
        const parsedMethod = JSON.parse(shippingMethodData)
        const parsedFiles = artworkFiles ? JSON.parse(artworkFiles) : []

        setShippingAddress(parsedAddress)
        setShippingMethod(parsedMethod)
        setAirportId(airportIdData || undefined)
        setUploadedFiles(parsedFiles)
        setIsLoading(false)
      } catch (error) {
        console.error('[Payment] Error loading order data:', error)
        toast.error('Error loading order data')
        router.push('/checkout/shipping')
      }
    }

    loadOrderData()
  }, [router])

  const handlePaymentSuccess = (result: Record<string, unknown>) => {
    try {
      // Clear cart
      clearCart()

      // Clear session storage
      sessionStorage.removeItem('checkout_shipping_address')
      sessionStorage.removeItem('checkout_shipping_method')
      sessionStorage.removeItem('checkout_airport_id')
      sessionStorage.removeItem('cart_artwork_files')

      toast.success('Payment successful!')

      // Redirect to success page
      router.push('/checkout/success')
    } catch (error) {
      console.error('[Payment] Error handling payment success:', error)
      toast.error('Payment succeeded but order creation failed. Please contact support.')
    }
  }

  const handleSavedPaymentMethodSelect = (paymentMethod: any) => {
    setSelectedSavedPaymentMethod(paymentMethod)
    setSelectedMethod('square') // Use Square for saved payment methods
    setShowManualPayment(false)
  }

  const handleNewPaymentMethod = () => {
    setShowManualPayment(true)
    setSelectedSavedPaymentMethod(null)
  }

  const handlePaymentError = (error: string) => {
    console.error('[Payment] Payment error:', error)
    toast.error(error)
  }

  const handleBackToShipping = () => {
    router.push('/checkout/shipping')
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payment options...</p>
        </div>
      </div>
    )
  }

  if (!shippingAddress || !shippingMethod || items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Incomplete Checkout</h1>
          <p className="text-muted-foreground mb-6">Please complete shipping information first</p>
          <Button onClick={() => router.push('/checkout/shipping')}>Go to Shipping</Button>
        </div>
      </div>
    )
  }

  const shippingCost = shippingMethod.rate.amount
  const tax = subtotal * 0.1
  const total = subtotal + shippingCost + tax

  // Get Square environment variables
  const squareAppId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
  const squareLocationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID
  const squareEnvironment = (process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT || 'sandbox') as
    | 'sandbox'
    | 'production'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button className="mb-4" variant="ghost" onClick={handleBackToShipping}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shipping
          </Button>
          <h1 className="text-3xl font-bold">Complete Your Payment</h1>
          <p className="text-muted-foreground mt-1">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} • ${total.toFixed(2)} total
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Payment Methods */}
          <div className="lg:col-span-2 space-y-6">
            {/* Saved Payment Methods (for logged-in users) */}
            {user && !showManualPayment && !selectedMethod && (
              <SavedPaymentMethods
                userId={user.id}
                onSelectPaymentMethod={handleSavedPaymentMethodSelect}
                onNewPaymentMethod={handleNewPaymentMethod}
              />
            )}

            {/* Payment Method Selection */}
            {(!user || showManualPayment) && !selectedMethod && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Square Card Payment */}
                  <button
                    className="w-full p-6 border-2 rounded-lg hover:border-primary hover:bg-accent transition-all text-left group"
                    onClick={() => setSelectedMethod('square')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-[#3E4348] flex items-center justify-center p-2">
                          <svg className="w-full h-full fill-white" viewBox="0 0 122.88 122.88">
                            <path d="M0,0h122.88v122.88H0V0z M19.31,103.57h84.26V19.31H19.31V103.57z M37.76,37.76h47.36v47.36H37.76V37.76z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">Credit/Debit Card</h3>
                          <p className="text-sm text-muted-foreground">
                            Visa, Mastercard, American Express, Discover
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Select →
                      </div>
                    </div>
                  </button>

                  {/* Cash App Pay - QR Code */}
                  <button
                    className="w-full p-6 border-2 rounded-lg hover:border-primary hover:bg-accent transition-all text-left group"
                    onClick={() => setSelectedMethod('cashapp')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-[#00D632] flex items-center justify-center p-2">
                          <svg className="w-full h-full fill-white" viewBox="0 0 24 24">
                            <path d="M23.59 3.47a5.11 5.11 0 0 0-3.05-3.05c-2.68-1-13.49-1-13.49-1S2.67.42 0 1.42A5.11 5.11 0 0 0-.53 4.47c-.16.8-.27 1.94-.33 3.06h.02A71.04 71.04 0 0 0-.81 12c.01 1.61.13 3.15.34 4.49a5.11 5.11 0 0 0 3.05 3.05c2.68 1 13.49 1 13.49 1s10.81.01 13.49-1a5.11 5.11 0 0 0 3.05-3.05c.16-.8.27-1.94.33-3.06h-.02a71.04 71.04 0 0 0 .03-4.47c-.01-1.61-.13-3.15-.34-4.49zM9.63 15.65V8.35L15.73 12l-6.1 3.65z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">Cash App - Scan QR Code</h3>
                          <p className="text-sm text-muted-foreground">
                            Scan with your phone to pay securely
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Select →
                      </div>
                    </div>
                  </button>

                  {/* PayPal */}
                  <button
                    className="w-full p-6 border-2 rounded-lg hover:border-primary hover:bg-accent transition-all text-left group"
                    onClick={() => setSelectedMethod('paypal')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-16 rounded-lg bg-[#0070BA] flex items-center justify-center px-2">
                          <svg className="w-full h-full fill-white" viewBox="0 0 124 33">
                            <path d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.972-1.142-2.696-1.746-4.985-1.746zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.704.359.42.469 1.044.332 1.906zM66.654 13.075h-3.275a.57.57 0 0 0-.563.481l-.145.916-.229-.332c-.709-1.029-2.29-1.373-3.868-1.373-3.619 0-6.71 2.741-7.312 6.586-.313 1.918.132 3.752 1.22 5.031.998 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .562.66h2.95a.95.95 0 0 0 .939-.803l1.77-11.209a.568.568 0 0 0-.561-.658zm-4.565 6.374c-.316 1.871-1.801 3.127-3.695 3.127-.951 0-1.711-.305-2.199-.883-.484-.574-.668-1.391-.514-2.301.295-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.499.589.697 1.411.554 2.317zM84.096 13.075h-3.291a.954.954 0 0 0-.787.417l-4.539 6.686-1.924-6.425a.953.953 0 0 0-.912-.678h-3.234a.57.57 0 0 0-.541.754l3.625 10.638-3.408 4.811a.57.57 0 0 0 .465.9h3.287a.949.949 0 0 0 .781-.408l10.946-15.8a.57.57 0 0 0-.468-.895z" />
                            <path d="M94.992 6.749h-6.84a.95.95 0 0 0-.938.802l-2.766 17.537a.569.569 0 0 0 .562.658h3.51a.665.665 0 0 0 .656-.562l.785-4.971a.95.95 0 0 1 .938-.803h2.164c4.506 0 7.105-2.18 7.785-6.5.307-1.89.012-3.375-.873-4.415-.971-1.142-2.694-1.746-4.983-1.746zm.789 6.405c-.373 2.454-2.248 2.454-4.062 2.454h-1.031l.725-4.583a.568.568 0 0 1 .562-.481h.473c1.234 0 2.4 0 3.002.704.359.42.468 1.044.331 1.906zM115.434 13.075h-3.273a.567.567 0 0 0-.562.481l-.145.916-.23-.332c-.709-1.029-2.289-1.373-3.867-1.373-3.619 0-6.709 2.741-7.311 6.586-.312 1.918.131 3.752 1.219 5.031 1 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .564.66h2.949a.95.95 0 0 0 .938-.803l1.771-11.209a.571.571 0 0 0-.565-.658zm-4.565 6.374c-.314 1.871-1.801 3.127-3.695 3.127-.949 0-1.711-.305-2.199-.883-.484-.574-.666-1.391-.514-2.301.297-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.501.589.699 1.411.554 2.317zM119.295 7.23l-2.807 17.858a.569.569 0 0 0 .562.658h2.822c.469 0 .867-.34.938-.803l2.768-17.536a.57.57 0 0 0-.562-.659h-3.16a.571.571 0 0 0-.561.482z" />
                            <path d="M7.266 29.154l.523-3.322-1.165-.027H1.061L4.927 1.292a.316.316 0 0 1 .314-.268h9.38c3.114 0 5.263.648 6.385 1.927.526.6.861 1.227 1.023 1.917.17.724.173 1.589.007 2.644l-.012.077v.676l.526.298a3.69 3.69 0 0 1 1.065.812c.45.513.741 1.165.864 1.938.127.795.085 1.741-.123 2.812-.24 1.232-.628 2.305-1.152 3.183a6.547 6.547 0 0 1-1.825 2c-.696.494-1.523.869-2.458 1.109-.906.236-1.939.355-3.072.355h-.73c-.522 0-1.029.188-1.427.525a2.21 2.21 0 0 0-.744 1.328l-.055.299-.924 5.855-.042.215c-.011.068-.03.102-.058.125a.155.155 0 0 1-.096.035H7.266z" />
                            <path d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132L6.596 26.83l-.399 2.533a.704.704 0 0 0 .695.814h4.881c.578 0 1.069-.42 1.16-.99l.048-.248.919-5.832.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.336-1.03z" />
                            <path d="M21.754 7.151a9.757 9.757 0 0 0-1.203-.267 15.284 15.284 0 0 0-2.426-.177h-7.352a1.172 1.172 0 0 0-1.159.992L8.05 17.605l-.045.289a1.336 1.336 0 0 1 1.321-1.132h2.752c5.405 0 9.637-2.195 10.874-8.545.037-.188.068-.371.096-.55a6.594 6.594 0 0 0-1.017-.429 9.045 9.045 0 0 0-.277-.087z" />
                            <path d="M9.614 7.699a1.169 1.169 0 0 1 1.159-.991h7.352c.871 0 1.684.057 2.426.177a9.757 9.757 0 0 1 1.481.353c.365.121.704.264 1.017.429.368-2.347-.003-3.945-1.272-5.392C20.378.682 17.853 0 14.622 0h-9.38c-.66 0-1.223.48-1.325 1.133L.01 25.898a.806.806 0 0 0 .795.932h5.791l1.454-9.225 1.564-9.906z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">PayPal</h3>
                          <p className="text-sm text-muted-foreground">
                            Pay securely with your PayPal account
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Select →
                      </div>
                    </div>
                  </button>

                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      All payments are secured with industry-standard encryption. Your payment
                      information is never stored on our servers.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Square Payment Component */}
            {selectedMethod === 'square' && squareAppId && squareLocationId && (
              <div>
                <SquareCardPayment
                  applicationId={squareAppId}
                  environment={squareEnvironment}
                  locationId={squareLocationId}
                  total={total}
                  savedPaymentMethod={selectedSavedPaymentMethod}
                  user={user}
                  onBack={() => setSelectedMethod(null)}
                  onPaymentError={handlePaymentError}
                  onPaymentSuccess={handlePaymentSuccess}
                />
              </div>
            )}

            {/* PayPal Payment Component */}
            {selectedMethod === 'paypal' && (
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-blue-600">P</span>
                      PayPal Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <PayPalButton
                      total={total}
                      onError={handlePaymentError}
                      onSuccess={handlePaymentSuccess}
                    />
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setSelectedMethod(null)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Choose Different Method
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Cash App QR Payment Component */}
            {selectedMethod === 'cashapp' && (
              <CashAppQRPayment
                total={total}
                onBack={() => setSelectedMethod(null)}
                onPaymentError={handlePaymentError}
                onPaymentSuccess={handlePaymentSuccess}
              />
            )}

            {/* Missing Configuration Warning */}
            {selectedMethod === 'square' && (!squareAppId || !squareLocationId) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Square payment is not configured. Please contact support.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items Count */}
                <div className="text-sm text-muted-foreground">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>${shippingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (estimated)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span className="text-lg">${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Security Badge */}
                <div className="border-t pt-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    🔒 Secure checkout • PCI DSS compliant
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
