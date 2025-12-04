import { Client, Environment, ApiError } from 'square';
import { logger } from '@/lib/logger';

/**
 * Square Payment Service
 * Handles payment processing through Square API
 */

// Initialize Square client
const getSquareClient = () => {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const environment =
    process.env.SQUARE_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox;

  if (!accessToken) {
    throw new Error('Square access token not configured');
  }

  return new Client({
    accessToken,
    environment,
  });
};

export interface CreatePaymentParams {
  amount: number; // in cents
  currency?: string;
  sourceId: string; // Payment token from Square Web SDK
  orderId?: string;
  customerId?: string;
  note?: string;
  metadata?: Record<string, string>;
}

export interface CreateOrderParams {
  locationId: string;
  lineItems: Array<{
    name: string;
    quantity: string;
    basePriceMoney: {
      amount: bigint;
      currency: string;
    };
    note?: string;
    catalogObjectId?: string;
  }>;
  customerId?: string;
  metadata?: Record<string, string>;
}

/**
 * Create a payment with Square
 */
export async function createSquarePayment(params: CreatePaymentParams) {
  try {
    const client = getSquareClient();
    const { paymentsApi } = client;

    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const response = await paymentsApi.createPayment({
      sourceId: params.sourceId,
      idempotencyKey,
      amountMoney: {
        amount: BigInt(params.amount),
        currency: params.currency || 'USD',
      },
      orderId: params.orderId,
      customerId: params.customerId,
      note: params.note,
      appFeeMoney: undefined,
      autocomplete: true,
    });

    logger.info('Square payment created', {
      paymentId: response.result.payment?.id,
      amount: params.amount,
      orderId: params.orderId,
    });

    return {
      success: true,
      payment: response.result.payment,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      logger.error('Square API error', {
        errors: error.errors,
        statusCode: error.statusCode,
      });
      return {
        success: false,
        error: error.errors?.[0]?.detail || 'Payment failed',
      };
    }

    logger.error('Square payment error', error);
    return {
      success: false,
      error: 'Payment processing failed',
    };
  }
}

/**
 * Create an order with Square
 */
export async function createSquareOrder(params: CreateOrderParams) {
  try {
    const client = getSquareClient();
    const { ordersApi } = client;

    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const response = await ordersApi.createOrder({
      idempotencyKey,
      order: {
        locationId: params.locationId,
        lineItems: params.lineItems,
        customerId: params.customerId,
        metadata: params.metadata,
      },
    });

    logger.info('Square order created', {
      orderId: response.result.order?.id,
      lineItems: params.lineItems.length,
    });

    return {
      success: true,
      order: response.result.order,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      logger.error('Square order API error', {
        errors: error.errors,
        statusCode: error.statusCode,
      });
      return {
        success: false,
        error: error.errors?.[0]?.detail || 'Order creation failed',
      };
    }

    logger.error('Square order error', error);
    return {
      success: false,
      error: 'Order creation failed',
    };
  }
}

/**
 * Get payment details
 */
export async function getSquarePayment(paymentId: string) {
  try {
    const client = getSquareClient();
    const { paymentsApi } = client;

    const response = await paymentsApi.getPayment(paymentId);

    return {
      success: true,
      payment: response.result.payment,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      logger.error('Square get payment error', {
        errors: error.errors,
        statusCode: error.statusCode,
      });
      return {
        success: false,
        error: error.errors?.[0]?.detail || 'Failed to retrieve payment',
      };
    }

    logger.error('Square payment retrieval error', error);
    return {
      success: false,
      error: 'Failed to retrieve payment',
    };
  }
}

/**
 * Refund a payment
 */
export async function refundSquarePayment(
  paymentId: string,
  amountMoney?: { amount: bigint; currency: string },
  reason?: string
) {
  try {
    const client = getSquareClient();
    const { refundsApi } = client;

    const idempotencyKey = `refund-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const response = await refundsApi.refundPayment({
      idempotencyKey,
      paymentId,
      amountMoney,
      reason,
    });

    logger.info('Square refund created', {
      refundId: response.result.refund?.id,
      paymentId,
    });

    return {
      success: true,
      refund: response.result.refund,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      logger.error('Square refund error', {
        errors: error.errors,
        statusCode: error.statusCode,
      });
      return {
        success: false,
        error: error.errors?.[0]?.detail || 'Refund failed',
      };
    }

    logger.error('Square refund error', error);
    return {
      success: false,
      error: 'Refund failed',
    };
  }
}

/**
 * Create or retrieve a Square customer
 */
export async function getOrCreateSquareCustomer(params: {
  emailAddress?: string;
  givenName?: string;
  familyName?: string;
  phoneNumber?: string;
  referenceId?: string; // Your internal user ID
}) {
  try {
    const client = getSquareClient();
    const { customersApi } = client;

    // Search for existing customer by email or reference ID
    if (params.emailAddress || params.referenceId) {
      const searchResponse = await customersApi.searchCustomers({
        query: {
          filter: {
            emailAddress: params.emailAddress
              ? {
                  exact: params.emailAddress,
                }
              : undefined,
            referenceId: params.referenceId
              ? {
                  exact: params.referenceId,
                }
              : undefined,
          },
        },
      });

      if (searchResponse.result.customers && searchResponse.result.customers.length > 0) {
        logger.info('Found existing Square customer', {
          customerId: searchResponse.result.customers[0].id,
        });
        return {
          success: true,
          customer: searchResponse.result.customers[0],
          isNew: false,
        };
      }
    }

    // Create new customer
    const idempotencyKey = `customer-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const createResponse = await customersApi.createCustomer({
      idempotencyKey,
      emailAddress: params.emailAddress,
      givenName: params.givenName,
      familyName: params.familyName,
      phoneNumber: params.phoneNumber,
      referenceId: params.referenceId,
    });

    logger.info('Created new Square customer', {
      customerId: createResponse.result.customer?.id,
    });

    return {
      success: true,
      customer: createResponse.result.customer,
      isNew: true,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      logger.error('Square customer error', {
        errors: error.errors,
        statusCode: error.statusCode,
      });
      return {
        success: false,
        error: error.errors?.[0]?.detail || 'Customer operation failed',
      };
    }

    logger.error('Square customer error', error);
    return {
      success: false,
      error: 'Customer operation failed',
    };
  }
}

/**
 * Get Square application ID for Web SDK
 */
export function getSquareApplicationId(): string {
  const appId = process.env.SQUARE_APPLICATION_ID;
  if (!appId) {
    throw new Error('Square application ID not configured');
  }
  return appId;
}

/**
 * Get Square location ID
 */
export function getSquareLocationId(): string {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) {
    throw new Error('Square location ID not configured');
  }
  return locationId;
}
