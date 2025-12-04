'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { logger } from '@/lib/logger'

interface CashAppQRPaymentProps {
  total: number
  onPaymentSuccess: (result: Record<string, unknown>) => void
  onPaymentError: (error: string) => void
  onBack: () => void
}

declare global {
  interface Window {
    Square?: any
  }
}

export function CashAppQRPayment({
  total,
  onPaymentSuccess,
  onPaymentError,
  onBack,
}: CashAppQRPaymentProps) {
  const [isInitializing, setIsInitializing] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cashAppPay, setCashAppPay] = useState<any>(null)
  const [payments, setPayments] = useState<any>(null)
  const initAttempted = useRef(false)

  // Get Square credentials from environment
  const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID
  const environment = (process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT || 'sandbox') as
    | 'sandbox'
    | 'production'

  useEffect(() => {
    if (initAttempted.current) return
    initAttempted.current = true

    const initializeCashAppPay = async () => {
      try {
        logger.info('[Cash App Pay] Initializing...', { appId, locationId, environment })

        // Validate credentials
        if (!appId || !locationId) {
          throw new Error(
            'Square credentials not configured. Please add NEXT_PUBLIC_SQUARE_APPLICATION_ID and NEXT_PUBLIC_SQUARE_LOCATION_ID to .env'
          )
        }

        // Load Square SDK script
        await loadSquareScript()

        // Wait for Square SDK to be available
        let attempts = 0
        const maxAttempts = 50
        while (!window.Square && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 100))
          attempts++
        }

        if (!window.Square) {
          throw new Error('Square SDK failed to load. Please refresh the page.')
        }

        logger.info('[Cash App Pay] Square SDK loaded')

        // Initialize payments
        const paymentsInstance = window.Square.payments(appId, locationId)
        setPayments(paymentsInstance)

        logger.info('[Cash App Pay] Payments initialized')

        // Create payment request
        // IMPORTANT: Amount must be in dollars (not cents) as decimal string
        const amountInDollars = total.toFixed(2)
        const paymentRequest = paymentsInstance.paymentRequest({
          countryCode: 'US',
          currencyCode: 'USD',
          total: {
            amount: amountInDollars,
            label: 'Total',
            pending: false,
          },
        })

        logger.info('[Cash App Pay] Payment request created', { amountInDollars })

        // Create Cash App Pay options
        const options = {
          redirectURL: window.location.href,
          referenceId: `order-${Date.now()}`,
        }

        logger.info('[Cash App Pay] Options', { options })

        // Initialize Cash App Pay
        const cashAppPayInstance = await paymentsInstance.cashAppPay(paymentRequest, options)

        logger.info('[Cash App Pay] Instance created')

        // Add tokenization event listener
        cashAppPayInstance.addEventListener('ontokenization', async (event: any) => {
          logger.info('[Cash App Pay] Tokenization event', { event })
          const { tokenResult } = event.detail
          const tokenStatus = tokenResult.status

          if (tokenStatus === 'OK') {
            const token = tokenResult.token
            logger.info('[Cash App Pay] Token received', { token })

            // Process payment with backend
            await handlePayment(token)
          } else {
            const errorMessages = tokenResult.errors?.map((error: any) => error.message).join(', ')
            throw new Error(errorMessages || 'Cash App tokenization failed')
          }
        })

        logger.info('[Cash App Pay] Event listener added')

        // Set isInitializing to false so the container div renders
        setIsInitializing(false)

        // Give React time to render the container
        await new Promise((resolve) => setTimeout(resolve, 200))

        // Wait for container to be available
        let container = document.getElementById('cash-app-pay')
        let containerAttempts = 0
        while (!container && containerAttempts < 30) {
          await new Promise((resolve) => setTimeout(resolve, 100))
          container = document.getElementById('cash-app-pay')
          containerAttempts++
        }

        if (!container) {
          throw new Error('Cash App Pay container not found')
        }

        logger.info('[Cash App Pay] Container found')

        // Attach Cash App Pay button
        const buttonOptions = {
          shape: 'semiround',
          width: 'full',
        }

        await cashAppPayInstance.attach('#cash-app-pay', buttonOptions)

        logger.info('[Cash App Pay] Button attached successfully')

        setCashAppPay(cashAppPayInstance)
      } catch (err) {
        logger.error('[Cash App Pay] Initialization error', { error: err })
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize Cash App Pay'
        setError(errorMsg)
        onPaymentError(errorMsg)
        setIsInitializing(false)
      }
    }

    // Safety timeout - 30 seconds
    const timeout = setTimeout(() => {
      if (isInitializing) {
        logger.error('[Cash App Pay] Initialization timeout after 30 seconds')
        setError('Cash App Pay initialization timeout. Please refresh the page.')
        setIsInitializing(false)
      }
    }, 30000)

    // Wait for DOM to be ready
    const initTimer = setTimeout(() => {
      initializeCashAppPay()
    }, 300)

    return () => {
      clearTimeout(timeout)
      clearTimeout(initTimer)
      if (cashAppPay) {
        try {
          cashAppPay.destroy()
        } catch (e) {
          logger.error('[Cash App Pay] Cleanup error', { error: e })
        }
      }
    }
  }, [appId, locationId, total])

  const loadSquareScript = () => {
    return new Promise((resolve, reject) => {
      if (window.Square) {
        resolve(true)
        return
      }

      const script = document.createElement('script')
      const sdkUrl =
        environment === 'production'
          ? 'https://web.squarecdn.com/v1/square.js'
          : 'https://sandbox.web.squarecdn.com/v1/square.js'

      logger.info('[Cash App Pay] Loading Square SDK', { sdkUrl })

      script.src = sdkUrl
      script.async = true

      script.onload = () => {
        logger.info('[Cash App Pay] Square SDK script loaded')
        resolve(true)
      }

      script.onerror = (error) => {
        logger.error('[Cash App Pay] Failed to load Square SDK', { error })
        reject(new Error('Failed to load Square SDK. Please check your internet connection.'))
      }

      document.head.appendChild(script)
    })
  }

  const handlePayment = async (token: string) => {
    setIsProcessing(true)
    setError(null)

    try {
      logger.info('[Cash App Pay] Processing payment', { token })

      const response = await fetch('/api/checkout/process-square-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceId: token,
          amount: Math.round(total * 100), // Convert to cents
          currency: 'USD',
        }),
      })

      const result = await response.json()

      if (result.success) {
        logger.info('[Cash App Pay] Payment successful', { result })
        onPaymentSuccess(result)
      } else {
        throw new Error(result.error || 'Payment failed')
      }
    } catch (err) {
      logger.error('[Cash App Pay] Payment processing error', { error: err })
      const errorMsg = err instanceof Error ? err.message : 'Payment processing failed'
      setError(errorMsg)
      onPaymentError(errorMsg)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#00D632] flex items-center justify-center p-1.5">
            <svg className="w-full h-full fill-white" viewBox="0 0 24 24">
              <path d="M23.59 3.47a5.11 5.11 0 0 0-3.05-3.05c-2.68-1-13.49-1-13.49-1S2.67.42 0 1.42A5.11 5.11 0 0 0-.53 4.47c-.16.8-.27 1.94-.33 3.06h.02A71.04 71.04 0 0 0-.81 12c.01 1.61.13 3.15.34 4.49a5.11 5.11 0 0 0 3.05 3.05c2.68 1 13.49 1 13.49 1s10.81.01 13.49-1a5.11 5.11 0 0 0 3.05-3.05c.16-.8.27-1.94.33-3.06h-.02a71.04 71.04 0 0 0 .03-4.47c-.01-1.61-.13-3.15-.34-4.49zM9.63 15.65V8.35L15.73 12l-6.1 3.65z" />
            </svg>
          </div>
          Pay with Cash App
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isInitializing ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading Cash App Pay...</p>
          </div>
        ) : (
          <>
            {/* Cash App Pay Button Container */}
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-2">Pay ${total.toFixed(2)}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Click the button below to complete your payment with Cash App
                </p>
              </div>

              {/* Square Cash App Pay Button will be inserted here */}
              <div className="min-h-[50px]" id="cash-app-pay"></div>

              {isProcessing && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mr-3"></div>
                  <span className="text-sm font-medium">Processing payment...</span>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">How it works:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-xs mt-0.5">
                    1
                  </span>
                  <span>Click the Cash App Pay button above</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-xs mt-0.5">
                    2
                  </span>
                  <span>Log in to your Cash App account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-xs mt-0.5">
                    3
                  </span>
                  <span>Confirm the payment amount</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-xs mt-0.5">
                    4
                  </span>
                  <span>You'll be redirected back here after payment</span>
                </li>
              </ul>
            </div>

            {/* Payment Amount Display */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">Total Amount</span>
                <span className="text-lg font-semibold text-green-600">${total.toFixed(2)}</span>
              </div>

              <Button className="w-full" disabled={isProcessing} variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Choose Different Method
              </Button>
            </div>
          </>
        )}

        <div className="text-center text-xs text-muted-foreground">
          Powered by Square • Secure Payment Processing
        </div>
      </CardContent>
    </Card>
  )
}
