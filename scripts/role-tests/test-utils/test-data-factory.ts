/**
 * Test Data Factory
 *
 * Provides utilities for creating test data in the database.
 * All test data is prefixed with 'TEST_' for easy identification and cleanup.
 */

import { PrismaClient, LeadStatus, PaymentStatus, AffiliateStatus, ReferralStatus } from '@prisma/client';

// ReferrerType is not an enum in schema, using string literal type
type ReferrerType = 'TAX_PREPARER' | 'AFFILIATE' | 'CLIENT';

const prisma = new PrismaClient();

export const TEST_PREFIX = 'TEST_';
export const TEST_EMAIL_DOMAIN = '@test-taxgeniuspro.local';

// Unique ID generator for test data
function generateTestId(): string {
  return `${TEST_PREFIX}${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate a unique tax year for test isolation.
 * Uses years 2015-2030 randomly to avoid (profileId, taxYear) unique constraint conflicts.
 */
export function getTestTaxYear(): number {
  return 2015 + Math.floor(Math.random() * 16);
}

/**
 * Create a test user with profile
 */
export async function createTestUser(options: {
  email?: string;
  role: 'admin' | 'tax_preparer' | 'client';
  firstName?: string;
  lastName?: string;
  affiliateStatus?: AffiliateStatus;
  shortLinkUsername?: string;
  hasFiledTaxes?: boolean;
}) {
  const testId = generateTestId();
  const email = options.email || `${testId.toLowerCase()}${TEST_EMAIL_DOMAIN}`;

  const user = await prisma.user.create({
    data: {
      email,
      name: `${options.firstName || 'Test'} ${options.lastName || 'User'}`,
    },
  });

  const profile = await prisma.profile.create({
    data: {
      userId: user.id,
      role: options.role,
      firstName: options.firstName || 'Test',
      lastName: options.lastName || 'User',
      affiliateStatus: options.affiliateStatus || 'NONE',
      shortLinkUsername: options.shortLinkUsername || testId.toLowerCase().replace('test_', ''),
      hasFiledTaxes: options.hasFiledTaxes ?? false,
      trackingCodeFinalized: true,
      customTrackingCode: options.shortLinkUsername || testId.toLowerCase().replace('test_', ''),
    },
  });

  return { user, profile, testId };
}

/**
 * Create a test lead
 */
export async function createTestLead(options: {
  referrerUsername?: string | null;
  referrerType?: ReferrerType;
  status?: LeadStatus;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}) {
  const testId = generateTestId();

  const lead = await prisma.lead.create({
    data: {
      firstName: options.firstName || `TestLead`,
      lastName: options.lastName || testId,
      email: options.email || `lead-${testId.toLowerCase()}${TEST_EMAIL_DOMAIN}`,
      phone: options.phone || `555-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      type: 'CUSTOMER',
      status: options.status || 'NEW',
      referrerUsername: options.referrerUsername,
      referrerType: options.referrerType,
      source: 'TEST',
    },
  });

  return { lead, testId };
}

/**
 * Create multiple test leads
 */
export async function createTestLeads(
  count: number,
  options: {
    referrerUsername?: string | null;
    referrerType?: ReferrerType;
    statusDistribution?: Partial<Record<LeadStatus, number>>;
  } = {}
) {
  const leads = [];
  const distribution = options.statusDistribution || { NEW: count };

  for (const [status, statusCount] of Object.entries(distribution)) {
    for (let i = 0; i < (statusCount || 0); i++) {
      const { lead } = await createTestLead({
        referrerUsername: options.referrerUsername,
        referrerType: options.referrerType,
        status: status as LeadStatus,
      });
      leads.push(lead);
    }
  }

  return leads;
}

/**
 * Create a test marketing link
 */
export async function createTestMarketingLink(options: {
  creatorId: string;
  creatorType?: 'TAX_PREPARER' | 'AFFILIATE';
  code?: string;
  clicks?: number;
  intakeStarts?: number;
  intakeCompletes?: number;
  returnsFiled?: number;
}) {
  const testId = generateTestId();
  const code = options.code || `test-link-${testId.toLowerCase().replace('test_', '')}`;

  const link = await prisma.marketingLink.create({
    data: {
      code,
      url: `https://taxgeniuspro.tax/contact?ref=${code}`,
      title: `Test Link ${testId}`,
      creatorId: options.creatorId,
      creatorType: options.creatorType || 'TAX_PREPARER',
      linkType: 'REFERRAL',
      targetPage: '/contact',
      clicks: options.clicks || 0,
      uniqueClicks: options.clicks || 0,
      conversions: options.intakeCompletes || 0,
      intakeStarts: options.intakeStarts || 0,
      intakeCompletes: options.intakeCompletes || 0,
      returnsFiled: options.returnsFiled || 0,
      isActive: true,
    },
  });

  return { link, testId, code };
}

/**
 * Create a test commission
 */
export async function createTestCommission(options: {
  referrerId: string;
  amount?: number;
  status?: PaymentStatus;
  referralId?: string;
}) {
  const testId = generateTestId();

  const commission = await prisma.commission.create({
    data: {
      referrerId: options.referrerId,
      amount: options.amount || 25,
      status: options.status || 'PENDING',
      referralId: options.referralId,
    },
  });

  return { commission, testId };
}

/**
 * Create test commissions with different statuses
 */
export async function createTestCommissions(
  referrerId: string,
  distribution: { pending?: number; approved?: number; paid?: number },
  amountPerCommission: number = 25
) {
  const commissions = [];

  for (let i = 0; i < (distribution.pending || 0); i++) {
    const { commission } = await createTestCommission({
      referrerId,
      amount: amountPerCommission,
      status: 'PENDING',
    });
    commissions.push(commission);
  }

  for (let i = 0; i < (distribution.approved || 0); i++) {
    const { commission } = await createTestCommission({
      referrerId,
      amount: amountPerCommission,
      status: 'APPROVED',
    });
    commissions.push(commission);
  }

  for (let i = 0; i < (distribution.paid || 0); i++) {
    const { commission } = await createTestCommission({
      referrerId,
      amount: amountPerCommission,
      status: 'PAID',
    });
    commissions.push(commission);
  }

  return commissions;
}

/**
 * Create a test tax intake lead
 */
export async function createTestTaxIntakeLead(options: {
  assignedPreparerId?: string;
  referrerUsername?: string;
  completed?: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
}) {
  const testId = generateTestId();

  const intakeLead = await prisma.taxIntakeLead.create({
    data: {
      first_name: options.firstName || 'TestIntake',
      last_name: options.lastName || testId,
      email: options.email || `intake-${testId.toLowerCase()}${TEST_EMAIL_DOMAIN}`,
      phone: `555-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      completed: options.completed ?? false,
      assignedPreparerId: options.assignedPreparerId,
      referrerUsername: options.referrerUsername,
    },
  });

  return { intakeLead, testId };
}

/**
 * Create a test tax return
 * Note: Uses random tax year by default to avoid (profileId, taxYear) unique constraint conflicts
 */
export async function createTestTaxReturn(options: {
  profileId: string;
  taxYear?: number;
  status?: 'DRAFT' | 'IN_REVIEW' | 'FILED' | 'ACCEPTED' | 'REJECTED';
  refundAmount?: number;
}) {
  const testId = generateTestId();
  const taxYear = options.taxYear ?? getTestTaxYear();

  const taxReturn = await prisma.taxReturn.create({
    data: {
      profileId: options.profileId,
      taxYear,
      status: options.status || 'DRAFT',
      refundAmount: options.refundAmount,
      formData: {}, // Required field
    },
  });

  return { taxReturn, testId, taxYear };
}

/**
 * Create a test document
 * DocumentType: W2 | FORM_1099 | RECEIPT | TAX_RETURN | OTHER
 * Note: Uses random tax year by default for test isolation
 */
export async function createTestDocument(options: {
  profileId: string;
  taxReturnId?: string;
  type?: 'W2' | 'FORM_1099' | 'RECEIPT' | 'TAX_RETURN' | 'OTHER';
  fileName?: string;
  taxYear?: number;
}) {
  const testId = generateTestId();
  const taxYear = options.taxYear ?? getTestTaxYear();

  const document = await prisma.document.create({
    data: {
      profileId: options.profileId,
      taxReturnId: options.taxReturnId,
      type: options.type || 'W2',
      fileName: options.fileName || `test-document-${testId}.pdf`,
      fileUrl: `https://storage.test/documents/${testId}.pdf`,
      fileSize: 1024, // 1KB placeholder
      mimeType: 'application/pdf',
      status: 'REVIEWED',
      taxYear,
    },
  });

  return { document, testId, taxYear };
}

/**
 * Create a test preparer application
 */
export async function createTestPreparerApplication(options?: {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  firstName?: string;
  lastName?: string;
  email?: string;
}) {
  const testId = generateTestId();

  const application = await prisma.preparerApplication.create({
    data: {
      firstName: options?.firstName || 'TestApplicant',
      lastName: options?.lastName || testId,
      email: options?.email || `applicant-${testId.toLowerCase()}${TEST_EMAIL_DOMAIN}`,
      phone: `555-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      languages: 'English',
      smsConsent: true,
      status: options?.status || 'PENDING',
    },
  });

  return { application, testId };
}

/**
 * Create a test link click
 */
export async function createTestLinkClick(options: {
  linkId: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  converted?: boolean;
}) {
  const testId = generateTestId();

  const linkClick = await prisma.linkClick.create({
    data: {
      linkId: options.linkId,
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Test User Agent',
      utmSource: options.utmSource,
      utmMedium: options.utmMedium,
      utmCampaign: options.utmCampaign,
      converted: options.converted ?? false,
    },
  });

  return { linkClick, testId };
}

/**
 * Create client-preparer assignment
 */
export async function createTestClientPreparerAssignment(options: {
  preparerId: string;
  clientId: string;
}) {
  const assignment = await prisma.clientPreparer.create({
    data: {
      preparerId: options.preparerId,
      clientId: options.clientId,
      isActive: true,
    },
  });

  return { assignment };
}

/**
 * Create a test referral
 */
export async function createTestReferral(options: {
  referrerId: string;
  clientId: string;
  status?: ReferralStatus;
  commissionEarned?: number;
}) {
  const testId = generateTestId();
  const referralCode = `test-ref-${testId.toLowerCase().replace('test_', '')}`;

  const referral = await prisma.referral.create({
    data: {
      referrerId: options.referrerId,
      clientId: options.clientId,
      referralCode,
      status: options.status || 'PENDING',
      commissionEarned: options.commissionEarned || 0,
    },
  });

  return { referral, referralCode };
}

export { prisma };
