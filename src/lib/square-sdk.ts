/**
 * Square SDK Integration for Tax Genius Pro
 * Handles payments, orders, and customer management
 */

import { SquareClient, SquareEnvironment, SquareError } from 'square';
import * as crypto from 'crypto';
import { logger } from '@/lib/logger';

// Initialize Square client
const client = new SquareClient({
  squareVersion: '2024-10-17',
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
  environment:
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
} as any);

export const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID!;
export const SQUARE_APPLICATION_ID = process.env.SQUARE_APPLICATION_ID!;

/**
 * Create a payment using nonce from Square Web SDK
 */
export async function createSquarePayment(paymentData: {
  sourceId: string; // Nonce from Square Web SDK
  amount: number; // Amount in cents
  currency?: string;
  customerId?: string;
  orderId?: string;
  locationId?: string;
  idempotencyKey: string;
  note?: string;
}) {
  try {
    const { result } = await client.paymentsApi.createPayment({
      sourceId: paymentData.sourceId,
      idempotencyKey: paymentData.idempotencyKey,
      amountMoney: {
        amount: BigInt(paymentData.amount),
        currency: paymentData.currency || 'USD',
      },
      customerId: paymentData.customerId,
      orderId: paymentData.orderId,
      locationId: paymentData.locationId || SQUARE_LOCATION_ID,
      note: paymentData.note,
      autocomplete: true,
    });

    logger.info('Square payment created', {
      paymentId: result.payment?.id,
      orderId: paymentData.orderId,
    });

    return {
      id: result.payment?.id || '',
      status: result.payment?.status,
      receiptUrl: result.payment?.receiptUrl,
      orderId: result.payment?.orderId,
      amount: result.payment?.totalMoney?.amount
        ? Number(result.payment.totalMoney.amount)
        : 0,
      createdAt: result.payment?.createdAt,
    };
  } catch (error) {
    if (error instanceof SquareError) {
      logger.error('Square payment failed', {
        error: error.message,
        errors: error.result?.errors,
      });
      throw new Error(
        error.result?.errors?.[0]?.detail || 'Payment processing failed'
      );
    }
    throw error;
  }
}

/**
 * Retrieve payment details
 */
export async function retrieveSquarePayment(paymentId: string) {
  try {
    const { result } = await client.paymentsApi.getPayment(paymentId);

    return {
      id: result.payment?.id,
      status: result.payment?.status,
      amount: result.payment?.amountMoney?.amount
        ? Number(result.payment.amountMoney.amount)
        : 0,
      receiptUrl: result.payment?.receiptUrl,
      orderId: result.payment?.orderId,
      customerId: result.payment?.customerId,
      createdAt: result.payment?.createdAt,
    };
  } catch (error) {
    if (error instanceof SquareError) {
      logger.error('Failed to retrieve payment', {
        paymentId,
        error: error.message,
      });
      throw new Error(`Failed to retrieve payment: ${error.message || 'Unknown error'}`);
    }
    throw error;
  }
}

/**
 * Create or update Square customer
 */
export async function createOrUpdateSquareCustomer(
  email: string,
  name?: string,
  phone?: string
) {
  try {
    // First, try to find existing customer by email
    const searchResult = await client.customersApi.searchCustomers({
      query: {
        filter: {
          emailAddress: {
            exact: email,
          },
        },
      },
    });

    let customerId: string | undefined;

    if (searchResult.result.customers && searchResult.result.customers.length > 0) {
      // Update existing customer
      customerId = searchResult.result.customers[0].id;

      await client.customersApi.updateCustomer(customerId, {
        emailAddress: email,
        ...(name && {
          givenName: name.split(' ')[0],
          familyName: name.split(' ').slice(1).join(' '),
        }),
        ...(phone && { phoneNumber: phone }),
      });

      logger.info('Square customer updated', { customerId, email });
    } else {
      // Create new customer
      const createResult = await client.customersApi.createCustomer({
        emailAddress: email,
        ...(name && {
          givenName: name.split(' ')[0],
          familyName: name.split(' ').slice(1).join(' '),
        }),
        ...(phone && { phoneNumber: phone }),
      });

      customerId = createResult.result.customer?.id;
      logger.info('Square customer created', { customerId, email });
    }

    return {
      id: customerId || '',
      email,
      name,
      phone,
    };
  } catch (error) {
    if (error instanceof SquareError) {
      logger.error('Customer operation failed', {
        email,
        error: error.message,
      });
      throw new Error(`Customer operation failed: ${error.message || 'Unknown error'}`);
    }
    throw error;
  }
}

/**
 * Create an order in Square
 */
export async function createSquareOrder(orderData: {
  referenceId: string;
  customerId?: string;
  lineItems: Array<{
    name: string;
    quantity: string;
    basePriceMoney: {
      amount: bigint;
      currency: string;
    };
  }>;
  taxes?: Array<{
    name: string;
    percentage: string;
  }>;
}) {
  try {
    const { result } = await client.ordersApi.createOrder({
      order: {
        locationId: SQUARE_LOCATION_ID,
        referenceId: orderData.referenceId,
        customerId: orderData.customerId,
        lineItems: orderData.lineItems,
        taxes: orderData.taxes,
      },
    });

    logger.info('Square order created', {
      orderId: result.order?.id,
      referenceId: orderData.referenceId,
    });

    return {
      id: result.order?.id || '',
      referenceId: result.order?.referenceId,
      totalMoney: result.order?.totalMoney?.amount
        ? Number(result.order.totalMoney.amount)
        : 0,
      state: result.order?.state,
    };
  } catch (error) {
    if (error instanceof SquareError) {
      logger.error('Order creation failed', {
        referenceId: orderData.referenceId,
        error: error.message,
      });
      throw new Error(`Order creation failed: ${error.message || 'Unknown error'}`);
    }
    throw error;
  }
}

/**
 * Retrieve an order
 */
export async function retrieveSquareOrder(orderId: string) {
  try {
    const { result } = await client.ordersApi.retrieveOrder(orderId);

    return {
      id: result.order?.id,
      referenceId: result.order?.referenceId,
      state: result.order?.state,
      totalMoney: result.order?.totalMoney?.amount
        ? Number(result.order.totalMoney.amount)
        : 0,
      lineItems: result.order?.lineItems,
      fulfillments: result.order?.fulfillments,
    };
  } catch (error) {
    if (error instanceof SquareError) {
      logger.error('Failed to retrieve order', {
        orderId,
        error: error.message,
      });
      throw new Error(`Failed to retrieve order: ${error.message || 'Unknown error'}`);
    }
    throw error;
  }
}

/**
 * Update order fulfillment
 */
export async function updateSquareFulfillment(
  orderId: string,
  fulfillmentUid: string,
  state: 'PROPOSED' | 'RESERVED' | 'PREPARED' | 'COMPLETED' | 'CANCELED' | 'FAILED'
) {
  try {
    const { result } = await client.ordersApi.updateOrder(orderId, {
      order: {
        locationId: SQUARE_LOCATION_ID,
        fulfillments: [
          {
            uid: fulfillmentUid,
            state: state,
          },
        ],
      },
    });

    logger.info('Square fulfillment updated', {
      orderId,
      fulfillmentUid,
      state,
    });

    return {
      success: true,
      order: result.order,
    };
  } catch (error) {
    if (error instanceof SquareError) {
      logger.error('Fulfillment update failed', {
        orderId,
        fulfillmentUid,
        error: error.message,
      });
      throw new Error(
        `Fulfillment update failed: ${error.result.errors?.[0]?.detail || 'Unknown error'}`
      );
    }
    throw error;
  }
}

/**
 * Calculate order amount including taxes
 */
export async function calculateOrderAmount(
  subtotal: number,
  taxRate: number = 0.0 // No tax by default, can be configured per state
): Promise<{
  subtotal: number;
  tax: number;
  total: number;
}> {
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;

  return {
    subtotal,
    tax,
    total,
  };
}

/**
 * Verify webhook signature from Square
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  signatureKey: string,
  requestUrl: string
): boolean {
  const hmac = crypto.createHmac('sha256', signatureKey);
  hmac.update(requestUrl + body);
  const hash = hmac.digest('base64');
  return hash === signature;
}

/**
 * Generate idempotency key for payment
 */
export function generateIdempotencyKey(): string {
  return crypto.randomBytes(16).toString('hex');
}
