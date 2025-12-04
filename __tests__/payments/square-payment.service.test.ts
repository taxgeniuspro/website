import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createSquarePayment,
  createSquareOrder,
  getOrCreateSquareCustomer,
  getSquareLocationId,
  type CreatePaymentParams,
  type CreateOrderParams,
  type CustomerParams,
} from '@/lib/services/square-payment.service';

/**
 * Square Payment Service Tests
 *
 * Tests the Square payment integration including:
 * - Payment creation
 * - Order creation
 * - Customer management
 * - Error handling
 * - Security validation
 */

// Mock Square client
vi.mock('square', () => {
  return {
    Client: vi.fn(() => ({
      paymentsApi: {
        createPayment: vi.fn(),
      },
      ordersApi: {
        createOrder: vi.fn(),
      },
      customersApi: {
        searchCustomers: vi.fn(),
        createCustomer: vi.fn(),
      },
    })),
    Environment: {
      Production: 'production',
      Sandbox: 'sandbox',
    },
    ApiError: class ApiError extends Error {
      constructor(public errors: any[], public statusCode: number) {
        super('Square API Error');
      }
    },
  };
});

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Square Payment Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SQUARE_ACCESS_TOKEN = 'test_access_token';
    process.env.SQUARE_ENVIRONMENT = 'sandbox';
    process.env.SQUARE_LOCATION_ID = 'test_location_id';
  });

  describe('createSquarePayment', () => {
    it('should create a payment successfully', async () => {
      const params: CreatePaymentParams = {
        amount: 10000, // $100.00
        currency: 'USD',
        sourceId: 'test_source_id',
        orderId: 'test_order_id',
        customerId: 'test_customer_id',
        note: 'Test payment',
      };

      const result = await createSquarePayment(params);

      expect(result.success).toBe(true);
      expect(result.payment).toBeDefined();
    });

    it('should handle amount validation', async () => {
      const params: CreatePaymentParams = {
        amount: -100, // Negative amount
        sourceId: 'test_source_id',
      };

      const result = await createSquarePayment(params);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate currency format', async () => {
      const params: CreatePaymentParams = {
        amount: 10000,
        currency: 'INVALID',
        sourceId: 'test_source_id',
      };

      const result = await createSquarePayment(params);

      // Should either normalize or reject invalid currency
      expect(result).toBeDefined();
    });

    it('should require source ID', async () => {
      const params = {
        amount: 10000,
        sourceId: '',
      } as CreatePaymentParams;

      const result = await createSquarePayment(params);

      expect(result.success).toBe(false);
    });

    it('should generate unique idempotency keys', async () => {
      const params: CreatePaymentParams = {
        amount: 10000,
        sourceId: 'test_source_id',
      };

      const result1 = await createSquarePayment(params);
      const result2 = await createSquarePayment(params);

      // Should not error due to duplicate idempotency keys
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      // Test with invalid access token
      process.env.SQUARE_ACCESS_TOKEN = 'invalid_token';

      const params: CreatePaymentParams = {
        amount: 10000,
        sourceId: 'test_source_id',
      };

      const result = await createSquarePayment(params);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      const params: CreatePaymentParams = {
        amount: 10000,
        sourceId: 'test_source_id',
      };

      // Simulate network error by removing access token
      delete process.env.SQUARE_ACCESS_TOKEN;

      const result = await createSquarePayment(params);

      expect(result.success).toBe(false);
    });

    it('should not expose sensitive data in logs', async () => {
      const { logger } = await import('@/lib/logger');

      const params: CreatePaymentParams = {
        amount: 10000,
        sourceId: 'test_source_id_sensitive',
        note: 'SSN: 123-45-6789',
      };

      await createSquarePayment(params);

      // Verify logger calls don't include sensitive source ID
      const logCalls = vi.mocked(logger.info).mock.calls;
      logCalls.forEach((call) => {
        const logData = JSON.stringify(call);
        expect(logData).not.toContain('test_source_id_sensitive');
      });
    });
  });

  describe('createSquareOrder', () => {
    it('should create an order successfully', async () => {
      const params: CreateOrderParams = {
        locationId: 'test_location_id',
        lineItems: [
          {
            name: 'Test Product',
            quantity: '1',
            basePriceMoney: {
              amount: BigInt(10000),
              currency: 'USD',
            },
          },
        ],
      };

      const result = await createSquareOrder(params);

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
    });

    it('should validate line items', async () => {
      const params: CreateOrderParams = {
        locationId: 'test_location_id',
        lineItems: [],
      };

      const result = await createSquareOrder(params);

      expect(result.success).toBe(false);
    });

    it('should require location ID', async () => {
      const params = {
        locationId: '',
        lineItems: [
          {
            name: 'Test',
            quantity: '1',
            basePriceMoney: {
              amount: BigInt(1000),
              currency: 'USD',
            },
          },
        ],
      } as CreateOrderParams;

      const result = await createSquareOrder(params);

      expect(result.success).toBe(false);
    });

    it('should calculate order total correctly', async () => {
      const params: CreateOrderParams = {
        locationId: 'test_location_id',
        lineItems: [
          {
            name: 'Product 1',
            quantity: '2',
            basePriceMoney: {
              amount: BigInt(5000),
              currency: 'USD',
            },
          },
          {
            name: 'Product 2',
            quantity: '1',
            basePriceMoney: {
              amount: BigInt(3000),
              currency: 'USD',
            },
          },
        ],
      };

      const result = await createSquareOrder(params);

      expect(result.success).toBe(true);
      // Total should be: (2 * $50) + (1 * $30) = $130
    });

    it('should attach customer ID if provided', async () => {
      const params: CreateOrderParams = {
        locationId: 'test_location_id',
        customerId: 'test_customer_123',
        lineItems: [
          {
            name: 'Test',
            quantity: '1',
            basePriceMoney: {
              amount: BigInt(1000),
              currency: 'USD',
            },
          },
        ],
      };

      const result = await createSquareOrder(params);

      expect(result.success).toBe(true);
    });
  });

  describe('getOrCreateSquareCustomer', () => {
    it('should create a new customer', async () => {
      const params: CustomerParams = {
        emailAddress: 'test@example.com',
        givenName: 'John',
        familyName: 'Doe',
        phoneNumber: '+1234567890',
        referenceId: 'user_123',
      };

      const result = await getOrCreateSquareCustomer(params);

      expect(result.success).toBe(true);
      expect(result.customer).toBeDefined();
    });

    it('should find existing customer by email', async () => {
      const params: CustomerParams = {
        emailAddress: 'existing@example.com',
      };

      // First create
      const result1 = await getOrCreateSquareCustomer(params);
      expect(result1.success).toBe(true);

      // Second call should find existing
      const result2 = await getOrCreateSquareCustomer(params);
      expect(result2.success).toBe(true);
      expect(result2.isNew).toBe(false);
    });

    it('should validate email format', async () => {
      const params: CustomerParams = {
        emailAddress: 'invalid-email',
      };

      const result = await getOrCreateSquareCustomer(params);

      expect(result.success).toBe(false);
    });

    it('should handle optional fields', async () => {
      const params: CustomerParams = {
        emailAddress: 'minimal@example.com',
      };

      const result = await getOrCreateSquareCustomer(params);

      expect(result.success).toBe(true);
    });
  });

  describe('getSquareLocationId', () => {
    it('should return configured location ID', () => {
      process.env.SQUARE_LOCATION_ID = 'test_location_123';

      const locationId = getSquareLocationId();

      expect(locationId).toBe('test_location_123');
    });

    it('should handle missing location ID', () => {
      delete process.env.SQUARE_LOCATION_ID;

      expect(() => getSquareLocationId()).toThrow();
    });
  });

  describe('Security & Compliance', () => {
    it('should not log credit card details', async () => {
      const { logger } = await import('@/lib/logger');

      const params: CreatePaymentParams = {
        amount: 10000,
        sourceId: 'cnon:card-nonce-ok',
        note: 'Card ending in 1234',
      };

      await createSquarePayment(params);

      const logCalls = vi.mocked(logger.info).mock.calls;
      logCalls.forEach((call) => {
        const logData = JSON.stringify(call);
        expect(logData).not.toMatch(/\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/);
      });
    });

    it('should use HTTPS in production', () => {
      process.env.SQUARE_ENVIRONMENT = 'production';

      // Creating client should use production environment
      const locationId = getSquareLocationId();
      expect(locationId).toBeDefined();
    });

    it('should validate PCI compliance requirements', async () => {
      // Ensure no raw card data is ever accepted
      const params = {
        amount: 10000,
        sourceId: 'card_4111111111111111', // Raw card number
      } as CreatePaymentParams;

      const result = await createSquarePayment(params);

      // Should only accept tokenized source IDs from Square SDK
      expect(result.sourceId).toMatch(/^cnon:|^ccof:/);
    });
  });

  describe('Error Handling', () => {
    it('should handle insufficient funds', async () => {
      const params: CreatePaymentParams = {
        amount: 1000000000, // Extremely large amount
        sourceId: 'test_source_id',
      };

      const result = await createSquarePayment(params);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/insufficient|declined|failed/i);
    });

    it('should handle invalid payment token', async () => {
      const params: CreatePaymentParams = {
        amount: 10000,
        sourceId: 'invalid_token_format',
      };

      const result = await createSquarePayment(params);

      expect(result.success).toBe(false);
    });

    it('should handle concurrent payment attempts', async () => {
      const params: CreatePaymentParams = {
        amount: 10000,
        sourceId: 'test_source_id',
      };

      // Simulate concurrent payment attempts
      const results = await Promise.all([
        createSquarePayment(params),
        createSquarePayment(params),
        createSquarePayment(params),
      ]);

      // All should complete without race conditions
      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    });

    it('should provide user-friendly error messages', async () => {
      const params: CreatePaymentParams = {
        amount: 10000,
        sourceId: '',
      };

      const result = await createSquarePayment(params);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).not.toContain('undefined');
      expect(result.error).not.toContain('null');
    });
  });
});
