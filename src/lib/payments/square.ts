// Square Payment Processing Integration
// Story 1.3: Payment Processing Integration

import { Client, Environment } from 'square';
import { logger } from '@/lib/logger';

// Initialize Square client
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN || 'sandbox-token',
  environment: process.env.NODE_ENV === 'production' ? Environment.Production : Environment.Sandbox,
});

export interface PaymentRequest {
  amount: number; // in cents
  currency?: string;
  sourceId: string; // payment source token
  customerId?: string;
  referenceId?: string;
  note?: string;
  tipAmount?: number;
  appFeeAmount?: number; // Platform fee
}

export interface RefundRequest {
  paymentId: string;
  amount: number; // in cents
  reason?: string;
}

export interface CustomerData {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  referenceId?: string;
}

// Create a payment
export async function createPayment(request: PaymentRequest) {
  try {
    const { result } = await squareClient.paymentsApi.createPayment({
      sourceId: request.sourceId,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: BigInt(request.amount),
        currency: request.currency || 'USD',
      },
      customerId: request.customerId,
      referenceId: request.referenceId,
      note: request.note,
      tipMoney: request.tipAmount
        ? {
            amount: BigInt(request.tipAmount),
            currency: request.currency || 'USD',
          }
        : undefined,
      appFeeMoney: request.appFeeAmount
        ? {
            amount: BigInt(request.appFeeAmount),
            currency: request.currency || 'USD',
          }
        : undefined,
      autocomplete: true,
    });

    return {
      success: true,
      paymentId: result.payment?.id,
      status: result.payment?.status,
      amount: Number(result.payment?.amountMoney?.amount),
      createdAt: result.payment?.createdAt,
      receiptUrl: result.payment?.receiptUrl,
    };
  } catch (error: any) {
    logger.error('Square payment error:', error);
    return {
      success: false,
      error: error.message || 'Payment failed',
      errors: error.errors || [],
    };
  }
}

// Create Cash App Pay payment
export async function createCashAppPayment(request: PaymentRequest) {
  try {
    // First create a payment request
    const { result: paymentRequest } = await squareClient.checkoutApi.createPaymentLink({
      idempotencyKey: crypto.randomUUID(),
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        lineItems: [
          {
            name: 'Tax Advance',
            quantity: '1',
            basePriceMoney: {
              amount: BigInt(request.amount),
              currency: 'USD',
            },
          },
        ],
      },
      checkoutOptions: {
        acceptedPaymentMethods: {
          cashAppPay: true,
          applePay: false,
          googlePay: false,
          afterpayClearpay: false,
        },
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
        askForShippingAddress: false,
      },
      prePopulatedData: {
        buyerEmail: request.customerId,
      },
    });

    return {
      success: true,
      paymentLinkId: paymentRequest.paymentLink?.id,
      paymentUrl: paymentRequest.paymentLink?.url,
      expiresAt: paymentRequest.paymentLink?.createdAt,
    };
  } catch (error: any) {
    logger.error('Cash App Pay error:', error);
    return {
      success: false,
      error: error.message || 'Cash App Pay failed',
      errors: error.errors || [],
    };
  }
}

// Process refund
export async function processRefund(request: RefundRequest) {
  try {
    const { result } = await squareClient.refundsApi.refundPayment({
      idempotencyKey: crypto.randomUUID(),
      paymentId: request.paymentId,
      amountMoney: {
        amount: BigInt(request.amount),
        currency: 'USD',
      },
      reason: request.reason,
    });

    return {
      success: true,
      refundId: result.refund?.id,
      status: result.refund?.status,
      amount: Number(result.refund?.amountMoney?.amount),
      createdAt: result.refund?.createdAt,
    };
  } catch (error: any) {
    logger.error('Refund error:', error);
    return {
      success: false,
      error: error.message || 'Refund failed',
      errors: error.errors || [],
    };
  }
}

// Create or update customer
export async function createCustomer(customerData: CustomerData) {
  try {
    const { result } = await squareClient.customersApi.createCustomer({
      idempotencyKey: crypto.randomUUID(),
      givenName: customerData.firstName,
      familyName: customerData.lastName,
      emailAddress: customerData.email,
      phoneNumber: customerData.phone,
      referenceId: customerData.referenceId,
    });

    return {
      success: true,
      customerId: result.customer?.id,
      createdAt: result.customer?.createdAt,
    };
  } catch (error: any) {
    logger.error('Create customer error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create customer',
      errors: error.errors || [],
    };
  }
}

// Create payment card token (for secure card storage)
export async function createCardToken(cardData: {
  cardNumber: string;
  cvv: string;
  expirationMonth: string;
  expirationYear: string;
  postalCode: string;
}) {
  // Note: In production, this should be done client-side using Square Web Payments SDK
  // This is a server-side simulation for development
  return {
    success: true,
    token: `tok_${crypto.randomUUID()}`,
    last4: cardData.cardNumber.slice(-4),
    expirationMonth: cardData.expirationMonth,
    expirationYear: cardData.expirationYear,
    cardBrand: detectCardBrand(cardData.cardNumber),
  };
}

// Detect card brand from number
function detectCardBrand(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '');

  if (/^4/.test(cleaned)) return 'VISA';
  if (/^5[1-5]/.test(cleaned)) return 'MASTERCARD';
  if (/^3[47]/.test(cleaned)) return 'AMERICAN_EXPRESS';
  if (/^6(?:011|5)/.test(cleaned)) return 'DISCOVER';

  return 'OTHER';
}

// Verify webhook signature
export function verifyWebhookSignature(
  body: string,
  signature: string,
  webhookSignatureKey: string
): boolean {
  // Implement Square webhook signature verification
  // This is a placeholder - actual implementation requires crypto verification
  const crypto = require('crypto');
  const hash = crypto.createHmac('sha256', webhookSignatureKey).update(body).digest('base64');

  return hash === signature;
}

// Calculate platform and preparer fees
export function calculateFees(amount: number, preparerTier?: string) {
  const platformFeePercent = 0.05; // 5% platform fee
  const preparerCommissions = {
    junior: 0.1, // 10% for junior preparers
    senior: 0.15, // 15% for senior preparers
    master: 0.2, // 20% for master preparers
  };

  const platformFee = Math.round(amount * platformFeePercent);
  const preparerFee = preparerTier
    ? Math.round(
        amount * (preparerCommissions[preparerTier as keyof typeof preparerCommissions] || 0.1)
      )
    : 0;

  return {
    platformFee,
    preparerFee,
    totalFees: platformFee + preparerFee,
    netAmount: amount - platformFee - preparerFee,
  };
}

// Format amount for display
export function formatAmount(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

// Export Square client for direct access if needed
export { squareClient };
