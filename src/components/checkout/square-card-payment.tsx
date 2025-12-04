'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AlertCircle, Lock, CreditCard } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { logger } from '@/lib/logger'

interface SquareCardPaymentProps {
  applicationId: string
  locationId: string
  total: number
  environment?: 'sandbox' | 'production'
  billingContact?: {
    givenName?: string
    familyName?: string
    email?: string
    phone?: string
    addressLines?: string[]
    city?: string
    state?: string
    countryCode?: string
    postalCode?: string
  }
  savedPaymentMethod?: {
    id: string
    squareCardId: string
    maskedNumber: string
    cardBrand: string
  } | null
  user?: { id: string; email: string; name?: string | null } | null
  onPaymentSuccess: (result: Record<string, unknown>) => void
  onPaymentError: (error: string) => void
  onBack: () => void
}

declare global {
  interface Window {
    Square?: Record<string, unknown>
  }
}

export function SquareCardPayment({
  applicationId,
  locationId,
  total,
  environment = 'sandbox',
  billingContact,
  savedPaymentMethod,
  user,
  onPaymentSuccess,
  onPaymentError,
  onBack,
}: SquareCardPaymentProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [card, setCard] = useState<any>(null)
  const [payments, setPayments] = useState<any>(null)
  const [shouldSavePaymentMethod, setShouldSavePaymentMethod] = useState(false)
  const initAttempted = useRef(false)

  useEffect(() => {
    if (initAttempted.current) return
    initAttempted.current = true

    // Set isLoading to false immediately so containers render
    setIsLoading(false)

    const initializeSquare = async () => {
      try {
        // Load Square.js script dynamically
        await loadSquareScript()

        // Wait for Square SDK
        let attempts = 0
        const maxAttempts = 50
        while (!window.Square && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 100))
          attempts++
        }

        if (!window.Square) {
          throw new Error('Square Web Payments SDK failed to load - please refresh the page')
        }

        const paymentsInstance = (window.Square as any).payments(applicationId, locationId)
        setPayments(paymentsInstance)

        // Initialize card
        const cardInstance = await paymentsInstance.card({
          style: {
            '.input-container': {
              borderRadius: '6px',
              borderColor: '#D1D5DB',
              borderWidth: '1px',
            },
            '.input-container.is-focus': {
              borderColor: '#3B82F6',
            },
            '.input-container.is-error': {
              borderColor: '#EF4444',
            },
            input: {
              fontSize: '14px',
              color: '#374151',
            },
            'input::placeholder': {
              color: '#9CA3AF',
            },
          },
        })

        let containerAttempts = 0
        let container = document.getElementById('square-card-container')
        while (!container && containerAttempts < 30) {
          await new Promise((resolve) => setTimeout(resolve, 100))
          container = document.getElementById('square-card-container')
          containerAttempts++
        }

        if (!container) {
          throw new Error('Card container element not found after 3 seconds')
        }

        await cardInstance.attach('#square-card-container')
        setCard(cardInstance)

        setIsInitializing(false)
      } catch (err) {
        logger.error('[Square] Initialization error', { error: err })
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        setError(`Failed to initialize payment form: ${errorMsg}`)
        setIsInitializing(false)
      }
    }

    // Safety timeout - increased to 30 seconds for slower connections
    const timeout = setTimeout(() => {
      if (isInitializing) {
        logger.error('[Square] Initialization timeout after 30 seconds')
        setError('Payment form initialization timeout. Please refresh the page or contact support.')
        setIsInitializing(false)
      }
    }, 30000)

    // Wait for DOM to be ready before initializing
    const initTimer = setTimeout(() => {
      initializeSquare()
    }, 300)

    return () => {
      clearTimeout(timeout)
      clearTimeout(initTimer)
      if (card) {
        card.destroy()
      }
    }
  }, [applicationId, locationId])

  const loadSquareScript = () => {
    return new Promise((resolve, reject) => {
      if (window.Square) {
        resolve(true)
        return
      }

      const script = document.createElement('script')
      // Use correct environment URL based on SQUARE_ENVIRONMENT
      const sdkUrl =
        environment === 'production'
          ? 'https://web.squarecdn.com/v1/square.js'
          : 'https://sandbox.web.squarecdn.com/v1/square.js'
      script.src = sdkUrl
      script.async = true

      script.onload = () => {
        resolve(true)
      }

      script.onerror = (error) => {
        logger.error('[Square] Failed to load Square.js', { error })
        reject(new Error('Failed to load Square.js. Please check your internet connection.'))
      }

      document.head.appendChild(script)
    })
  }

  const handleCardPayment = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      let sourceId: string
      let paymentResult: any

      if (savedPaymentMethod) {
        // Use saved payment method
        const response = await fetch('/api/checkout/process-square-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cardId: savedPaymentMethod.squareCardId,
            amount: Math.round(total * 100),
            currency: 'USD',
            useSavedCard: true,
          }),
        })

        paymentResult = await response.json()
      } else {
        // Process new card
        if (!card || !payments) {
          throw new Error('Payment form not initialized')
        }

        const verificationDetails = {
          intent: 'CHARGE',
          amount: Math.round(total * 100).toString(),
          currencyCode: 'USD',
          billingContact: billingContact || {
            givenName: 'Customer',
            familyName: '',
          },
          customerInitiated: true,
          sellerKeyedIn: false,
        }

        const result = await card.tokenize(verificationDetails)

        if (result.status === 'OK') {
          sourceId = result.token

          // Save payment method if requested
          if (user && shouldSavePaymentMethod) {
            try {
              await fetch('/api/user/payment-methods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sourceId,
                  nickname: 'Card from checkout',
                  isDefault: false,
                }),
              })
            } catch (saveError) {
              logger.warn('Failed to save payment method', { error: saveError })
              // Don't fail the payment if saving fails
            }
          }

          const response = await fetch('/api/checkout/process-square-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sourceId,
              amount: Math.round(total * 100),
              currency: 'USD',
            }),
          })

          paymentResult = await response.json()
        } else {
          const errorMessages = result.errors
            ?.map((error: Record<string, unknown>) => error.message)
            .join(', ')
          throw new Error(errorMessages || 'Card validation failed')
        }
      }

      if (paymentResult.success) {
        onPaymentSuccess(paymentResult)
      } else {
        throw new Error(paymentResult.error || 'Payment failed')
      }
    } catch (err) {
      logger.error('[Square] Payment error', { error: err })
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed'
      setError(errorMessage)
      onPaymentError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-green-600" />
            Secure Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-lg font-bold text-red-900 mb-1">Payment Declined</h3>
                    <p className="text-sm text-red-700 leading-relaxed">{error}</p>
                  </div>

                  <div className="bg-white/80 rounded-lg p-4 border border-red-200">
                    <p className="text-sm font-semibold text-gray-900 mb-2">What you can do:</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold mt-0.5">→</span>
                        <span>Double-check your card number, expiration date, and CVV</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold mt-0.5">→</span>
                        <span>Try a different payment method</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold mt-0.5">→</span>
                        <span>Contact your bank if the problem continues</span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex justify-center pt-2">
                    <button
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                      onClick={() => setError(null)}
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method Section */}
          {savedPaymentMethod ? (
            <div>
              <label className="block text-sm font-medium mb-2">Using Saved Payment Method</label>
              <div className="p-4 border rounded-md bg-muted/50">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{savedPaymentMethod.maskedNumber}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {savedPaymentMethod.cardBrand.replace('_', ' ').toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">Card Details</label>
              <div
                className="min-h-[60px] p-3 border rounded-md bg-background relative"
                id="square-card-container"
              >
                {isInitializing && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-3 text-sm text-muted-foreground">
                      Loading payment form...
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Your card information is secure and encrypted by Square
              </p>

              {/* Save Payment Method Option */}
              {user && (
                <div className="flex items-center space-x-2 mt-3 pt-3 border-t">
                  <Checkbox
                    checked={shouldSavePaymentMethod}
                    id="savePaymentMethod"
                    onCheckedChange={(checked) => setShouldSavePaymentMethod(checked as boolean)}
                  />
                  <Label className="text-sm cursor-pointer" htmlFor="savePaymentMethod">
                    Save this payment method to my account for faster checkout
                  </Label>
                </div>
              )}
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">Total Amount</span>
              <span className="text-lg font-semibold">${total.toFixed(2)}</span>
            </div>

            <div className="flex gap-3">
              <Button className="flex-1" disabled={isProcessing} variant="outline" onClick={onBack}>
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={isProcessing || (!card && !savedPaymentMethod)}
                onClick={handleCardPayment}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  `Pay $${total.toFixed(2)}`
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Powered by Square • PCI DSS Level 1 Compliant
        </p>
      </div>
    </div>
  )
}
