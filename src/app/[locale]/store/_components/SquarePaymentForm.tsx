'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';

interface SquarePaymentFormProps {
  amount: number;
  onSuccess: (paymentToken: string) => Promise<void>;
  onError: (error: string) => void;
}

export function SquarePaymentForm({ amount, onSuccess, onError }: SquarePaymentFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [squareConfig, setSquareConfig] = useState<{
    applicationId: string;
    locationId: string;
    environment: string;
  } | null>(null);

  const cardContainerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<any>(null);

  // Fetch Square configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/checkout/square-config');
        if (!response.ok) {
          throw new Error('Failed to load payment configuration');
        }
        const config = await response.json();
        setSquareConfig(config);
      } catch (err) {
        logger.error('Failed to fetch Square config', err);
        setError('Failed to load payment form. Please refresh the page.');
        onError('Failed to load payment configuration');
      }
    };

    fetchConfig();
  }, [onError]);

  // Initialize Square Web Payments SDK
  useEffect(() => {
    if (!squareConfig || !cardContainerRef.current) return;

    const initializeSquare = async () => {
      try {
        // Load Square Web Payments SDK script
        if (!(window as any).Square) {
          const script = document.createElement('script');
          script.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
          script.async = true;
          script.onload = () => initializeCard();
          document.body.appendChild(script);
        } else {
          initializeCard();
        }
      } catch (err) {
        logger.error('Failed to initialize Square', err);
        setError('Failed to initialize payment form');
        setIsLoading(false);
      }
    };

    const initializeCard = async () => {
      try {
        const payments = (window as any).Square.payments(
          squareConfig.applicationId,
          squareConfig.locationId
        );

        const card = await payments.card();
        await card.attach(cardContainerRef.current);
        cardRef.current = card;
        setIsLoading(false);
      } catch (err) {
        logger.error('Failed to attach card', err);
        setError('Failed to load card form');
        setIsLoading(false);
      }
    };

    initializeSquare();

    // Cleanup
    return () => {
      if (cardRef.current) {
        try {
          cardRef.current.destroy();
        } catch (err) {
          logger.error('Failed to destroy card', err);
        }
      }
    };
  }, [squareConfig]);

  const handlePayment = async () => {
    if (!cardRef.current) {
      setError('Payment form not initialized');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Tokenize card
      const result = await cardRef.current.tokenize();

      if (result.status === 'OK') {
        // Send token to server
        await onSuccess(result.token);
      } else {
        const errorMessage = result.errors?.[0]?.message || 'Payment failed';
        setError(errorMessage);
        onError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      logger.error('Payment error', err);
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Information</CardTitle>
        <CardDescription>Enter your card details to complete the purchase</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Amount to pay:</span>
              <span className="font-bold text-foreground">${amount.toFixed(2)}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div
              ref={cardContainerRef}
              id="card-container"
              className="min-h-[120px] border rounded-md p-4"
            />
          )}

          <Button
            onClick={handlePayment}
            disabled={isLoading || isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay $${amount.toFixed(2)}`
            )}
          </Button>

          <div className="text-xs text-muted-foreground text-center">
            Secured by Square. Your payment information is encrypted and secure.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
