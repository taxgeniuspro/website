import { Client, Environment, ApiError, type Payment, type Refund } from 'square';
import { prisma } from '@/lib/db';
import { cache, cacheKeys } from '@/lib/redis';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { EmailService } from '@/lib/services/email.service';

// Initialize Square client
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
  environment:
    process.env.SQUARE_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox,
});

export interface PaymentRequest {
  amount: number; // in cents
  currency?: string;
  sourceId: string; // payment source (card nonce, etc.)
  profileId: string;
  taxReturnId?: string;
  description?: string;
}

export interface CommissionData {
  referrerId: string;
  referralId: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export class PaymentService {
  /**
   * Create a payment
   */
  static async createPayment(request: PaymentRequest): Promise<{
    success: boolean;
    paymentId?: string;
    error?: string;
  }> {
    try {
      const idempotencyKey = crypto.randomUUID();

      // Create Square payment
      const response = await squareClient.paymentsApi.createPayment({
        sourceId: request.sourceId,
        idempotencyKey,
        amountMoney: {
          amount: BigInt(request.amount),
          currency: request.currency || 'USD',
        },
        locationId: process.env.SQUARE_LOCATION_ID!,
        note: request.description,
        appFeeMoneyMoney: {
          amount: BigInt(Math.floor(request.amount * 0.029 + 30)), // 2.9% + 30¢
          currency: request.currency || 'USD',
        },
      });

      if (!response.result.payment) {
        throw new Error('Payment creation failed');
      }

      const payment = response.result.payment;

      // Save payment record to database
      const dbPayment = await prisma.payment.create({
        data: {
          profileId: request.profileId,
          taxReturnId: request.taxReturnId,
          amount: request.amount / 100, // Convert to dollars
          type: 'TAX_PREP_FEE',
          status: payment.status === 'COMPLETED' ? 'COMPLETED' : 'PROCESSING',
          squarePaymentId: payment.id,
          squareOrderId: payment.orderId,
          metadata: {
            sourceId: request.sourceId,
            currency: request.currency || 'USD',
            description: request.description,
          },
          processedAt: payment.status === 'COMPLETED' ? new Date() : null,
        },
      });

      // Calculate and create commission if applicable
      await this.calculateCommission(request.profileId, request.amount / 100);

      return {
        success: true,
        paymentId: dbPayment.id,
      };
    } catch (error) {
      logger.error('Payment error:', error);

      if (error instanceof ApiError) {
        return {
          success: false,
          error: error.errors?.[0]?.detail || 'Payment failed',
        };
      }

      return {
        success: false,
        error: 'Payment processing failed',
      };
    }
  }

  /**
   * Create a checkout link
   */
  static async createCheckoutLink(
    profileId: string,
    amount: number,
    description: string,
    redirectUrl?: string
  ): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> {
    try {
      const locationId = process.env.SQUARE_LOCATION_ID!;

      // Create checkout
      const response = await squareClient.checkoutApi.createPaymentLink({
        idempotencyKey: crypto.randomUUID(),
        quickPay: {
          name: description,
          priceMoney: {
            amount: BigInt(amount),
            currency: 'USD',
          },
          locationId,
        },
        checkoutOptions: {
          redirectUrl: redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
          askForShippingAddress: false,
          merchantSupportEmail: process.env.SUPPORT_EMAIL,
        },
        prePopulatedData: {
          buyerEmail: await this.getProfileEmail(profileId),
        },
      });

      if (!response.result.paymentLink) {
        throw new Error('Failed to create checkout link');
      }

      return {
        success: true,
        checkoutUrl: response.result.paymentLink.url,
      };
    } catch (error) {
      logger.error('Checkout link error:', error);
      return {
        success: false,
        error: 'Failed to create checkout link',
      };
    }
  }

  /**
   * Get payment details
   */
  static async getPayment(paymentId: string): Promise<Payment | null> {
    try {
      const response = await squareClient.paymentsApi.getPayment(paymentId);
      return response.result.payment || null;
    } catch (error) {
      logger.error('Get payment error:', error);
      return null;
    }
  }

  /**
   * Refund a payment
   */
  static async refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      // Get payment from database
      const dbPayment = await prisma.payment.findFirst({
        where: { squarePaymentId: paymentId },
      });

      if (!dbPayment) {
        return {
          success: false,
          error: 'Payment not found',
        };
      }

      const refundAmount = amount || Number(dbPayment.amount) * 100; // Convert to cents

      const response = await squareClient.refundsApi.refundPayment({
        idempotencyKey: crypto.randomUUID(),
        paymentId,
        amountMoney: {
          amount: BigInt(refundAmount),
          currency: 'USD',
        },
        reason: reason || 'Customer requested refund',
      });

      if (!response.result.refund) {
        throw new Error('Refund failed');
      }

      // Update payment status
      await prisma.payment.update({
        where: { id: dbPayment.id },
        data: {
          status: 'REFUNDED',
          metadata: {
            ...(typeof dbPayment.metadata === 'object' && dbPayment.metadata !== null
              ? (dbPayment.metadata as Record<string, unknown>)
              : {}),
            refundId: response.result.refund.id,
            refundedAt: new Date().toISOString(),
            refundReason: reason,
          },
        },
      });

      return {
        success: true,
        refundId: response.result.refund.id,
      };
    } catch (error) {
      logger.error('Refund error:', error);
      return {
        success: false,
        error: 'Refund failed',
      };
    }
  }

  /**
   * Calculate commission for referrers
   */
  static async calculateCommission(clientProfileId: string, paymentAmount: number): Promise<void> {
    try {
      // Find referral for this client
      const referral = await prisma.referral.findFirst({
        where: {
          clientId: clientProfileId,
          status: 'ACTIVE',
        },
      });

      if (!referral) {
        return; // No referral, no commission
      }

      // Commission rates
      const commissionRate = 0.2; // 20% commission
      const commissionAmount = paymentAmount * commissionRate;

      // Create commission record
      await prisma.commission.create({
        data: {
          referrerId: referral.referrerId,
          referralId: referral.id,
          amount: commissionAmount,
          status: 'PENDING',
        },
      });

      // Update referral with commission earned
      await prisma.referral.update({
        where: { id: referral.id },
        data: {
          commissionEarned: {
            increment: commissionAmount,
          },
          status: 'COMPLETED',
          returnFiledDate: new Date(),
        },
      });

      // Invalidate referrer stats cache
      await cache.del(cacheKeys.referrerStats(referral.referrerId));

      // Send commission notification email
      try {
        const referrerProfile = await prisma.profile.findUnique({
          where: { id: referral.referrerId },
          select: { email: true, firstName: true, lastName: true },
        });

        const clientProfile = await prisma.profile.findUnique({
          where: { id: clientProfileId },
          select: { firstName: true, lastName: true },
        });

        if (referrerProfile?.email) {
          const referrerName = referrerProfile.firstName || 'there';
          const clientName = clientProfile
            ? `${clientProfile.firstName || ''} ${clientProfile.lastName || ''}`.trim() ||
              'a client'
            : 'a client';

          await EmailService.sendCommissionEmail(
            referrerProfile.email,
            referrerName,
            commissionAmount,
            clientName
          );
        }
      } catch (emailError) {
        logger.error('Failed to send commission email:', emailError);
        // Don't throw - email failure shouldn't block commission creation
      }
    } catch (error) {
      logger.error('Commission calculation error:', error);
    }
  }

  /**
   * Process commission payout
   */
  static async processCommissionPayout(
    referrerId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get pending commissions
      const pendingCommissions = await prisma.commission.findMany({
        where: {
          referrerId,
          status: 'PENDING',
        },
      });

      if (pendingCommissions.length === 0) {
        return {
          success: false,
          message: 'No pending commissions',
        };
      }

      const totalAmount = pendingCommissions.reduce(
        (sum, commission) => sum + Number(commission.amount),
        0
      );

      // Minimum payout threshold
      if (totalAmount < 50) {
        return {
          success: false,
          message: `Minimum payout is $50. Current balance: $${totalAmount.toFixed(2)}`,
        };
      }

      // Get referrer bank details
      const profile = await prisma.profile.findUnique({
        where: { id: referrerId },
      });

      if (!profile?.bankDetails) {
        return {
          success: false,
          message: 'Bank details not configured',
        };
      }

      // TODO: Integrate with Square Payouts API or ACH transfer
      // For now, mark as processing

      const commissionIds = pendingCommissions.map((c) => c.id);

      await prisma.commission.updateMany({
        where: {
          id: { in: commissionIds },
        },
        data: {
          status: 'PROCESSING',
        },
      });

      return {
        success: true,
        message: `Payout of $${totalAmount.toFixed(2)} initiated`,
      };
    } catch (error) {
      logger.error('Payout error:', error);
      return {
        success: false,
        message: 'Payout processing failed',
      };
    }
  }

  /**
   * Helper to get profile email
   */
  private static async getProfileEmail(profileId: string): Promise<string | undefined> {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });
    return profile?.user.email;
  }

  /**
   * Webhook handler for Square events
   */
  static async handleWebhook(signature: string, body: string): Promise<{ success: boolean }> {
    try {
      // Verify webhook signature
      const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

      if (webhookSignatureKey) {
        const hash = crypto.createHmac('sha256', webhookSignatureKey).update(body).digest('base64');

        if (hash !== signature) {
          logger.error('Invalid webhook signature');
          return { success: false };
        }
      }

      const event = JSON.parse(body);

      switch (event.type) {
        case 'payment.created':
        case 'payment.updated':
          await this.handlePaymentEvent(event.data.object.payment);
          break;

        case 'refund.created':
        case 'refund.updated':
          await this.handleRefundEvent(event.data.object.refund);
          break;

        default:
          logger.info('Unhandled webhook event type:', event.type);
      }

      return { success: true };
    } catch (error) {
      logger.error('Webhook error:', error);
      return { success: false };
    }
  }

  /**
   * Handle payment webhook events
   */
  private static async handlePaymentEvent(payment: Payment): Promise<void> {
    try {
      const dbPayment = await prisma.payment.findFirst({
        where: { squarePaymentId: payment.id },
      });

      if (!dbPayment) {
        logger.info('Payment not found in database:', payment.id);
        return;
      }

      // Update payment status
      await prisma.payment.update({
        where: { id: dbPayment.id },
        data: {
          status: payment.status === 'COMPLETED' ? 'COMPLETED' : 'PROCESSING',
          processedAt: payment.status === 'COMPLETED' ? new Date() : null,
        },
      });
    } catch (error) {
      logger.error('Handle payment event error:', error);
    }
  }

  /**
   * Handle refund webhook events
   */
  private static async handleRefundEvent(refund: Refund): Promise<void> {
    try {
      const dbPayment = await prisma.payment.findFirst({
        where: { squarePaymentId: refund.payment_id },
      });

      if (!dbPayment) {
        logger.info('Payment not found for refund:', refund.payment_id);
        return;
      }

      // Update payment status
      await prisma.payment.update({
        where: { id: dbPayment.id },
        data: {
          status: 'REFUNDED',
          metadata: {
            ...(typeof dbPayment.metadata === 'object' && dbPayment.metadata !== null
              ? (dbPayment.metadata as Record<string, unknown>)
              : {}),
            refundId: refund.id,
            refundStatus: refund.status,
            refundedAt: refund.created_at,
          },
        },
      });
    } catch (error) {
      logger.error('Handle refund event error:', error);
    }
  }
}
