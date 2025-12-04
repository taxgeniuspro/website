/**
 * Seed default booking services for TaxGeniusPro
 *
 * Run with: npx tsx prisma/seed-booking-services.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultServices = [
  {
    name: 'Initial Tax Consultation',
    slug: 'initial-consultation',
    description: 'Meet with a tax professional to discuss your tax situation, get questions answered, and understand your options. Perfect for first-time clients or complex tax situations.',
    duration: 60,
    price: 0, // Free consultation to attract clients
    requiresDeposit: false,
    requiresApproval: false,
    bufferAfter: 15,
    color: '#3B82F6', // Blue
    icon: 'Users',
    sortOrder: 1,
    isActive: true,
  },
  {
    name: 'Document Review Session',
    slug: 'document-review',
    description: 'Quick review of your tax documents to ensure everything is complete and accurate before filing. We\'ll identify any missing items and answer questions.',
    duration: 30,
    price: 75,
    requiresDeposit: true,
    depositAmount: 25,
    requiresApproval: false,
    bufferAfter: 10,
    color: '#10B981', // Green
    icon: 'FileCheck',
    sortOrder: 2,
    isActive: true,
  },
  {
    name: 'Tax Planning Strategy Session',
    slug: 'tax-planning',
    description: 'Comprehensive 90-minute session focused on tax planning strategies, deductions, and ways to minimize your tax liability for the current and upcoming tax years.',
    duration: 90,
    price: 225,
    requiresDeposit: true,
    depositAmount: 75,
    requiresApproval: true, // High-value service requires approval
    bufferAfter: 20,
    color: '#8B5CF6', // Purple
    icon: 'TrendingUp',
    sortOrder: 3,
    isActive: true,
  },
  {
    name: 'Quick Questions (Existing Clients)',
    slug: 'quick-questions',
    description: 'Short 15-minute session for existing clients who need quick answers or guidance. Free for current clients.',
    duration: 15,
    price: 0, // Free for existing clients
    requiresDeposit: false,
    requiresApproval: false,
    bufferAfter: 5,
    color: '#F59E0B', // Yellow
    icon: 'MessageCircle',
    sortOrder: 4,
    isActive: true,
  },
  {
    name: 'Business Tax Consultation',
    slug: 'business-tax',
    description: 'Specialized consultation for business owners, covering business deductions, quarterly taxes, payroll tax issues, and entity structure optimization.',
    duration: 75,
    price: 195,
    requiresDeposit: true,
    depositAmount: 50,
    requiresApproval: true,
    bufferAfter: 15,
    color: '#EC4899', // Pink
    icon: 'Briefcase',
    sortOrder: 5,
    isActive: true,
  },
  {
    name: 'IRS Issue Resolution',
    slug: 'irs-resolution',
    description: 'Expert guidance for handling IRS notices, audits, back taxes, or payment plans. We\'ll review your situation and develop an action plan.',
    duration: 60,
    price: 150,
    requiresDeposit: true,
    depositAmount: 75,
    requiresApproval: true, // Complex cases require approval
    bufferAfter: 15,
    color: '#EF4444', // Red
    icon: 'AlertCircle',
    sortOrder: 6,
    isActive: true,
  },
  {
    name: 'Follow-Up Appointment',
    slug: 'follow-up',
    description: 'Follow-up session to discuss updates, review filed returns, or continue previous discussions.',
    duration: 30,
    price: 50,
    requiresDeposit: false,
    requiresApproval: false,
    bufferAfter: 10,
    color: '#6B7280', // Gray
    icon: 'RefreshCw',
    sortOrder: 7,
    isActive: true,
  },
  {
    name: 'Tax Season Express (Peak Season)',
    slug: 'express-filing',
    description: 'Fast-track appointment during peak tax season (Feb-April). Priority scheduling with expedited service. Higher rate reflects urgency.',
    duration: 45,
    price: 175,
    requiresDeposit: true,
    depositAmount: 75,
    requiresApproval: false,
    bufferAfter: 10,
    color: '#DC2626', // Dark Red
    icon: 'Zap',
    sortOrder: 8,
    isActive: false, // Only activate during tax season
    seasonalOnly: true,
  },
];

async function main() {
  console.log('🌱 Seeding booking services...');

  for (const service of defaultServices) {
    const result = await prisma.bookingService.upsert({
      where: { slug: service.slug },
      update: service,
      create: service,
    });

    console.log(`✅ ${result.name} - $${result.price} (${result.duration} min)`);
  }

  // Create default availability for existing preparers (9am-5pm, Mon-Fri)
  const preparers = await prisma.profile.findMany({
    where: {
      role: {
        in: ['TAX_PREPARER', 'ADMIN', 'SUPER_ADMIN'],
      },
    },
  });

  console.log(`\n📅 Creating default availability for ${preparers.length} preparers...`);

  for (const preparer of preparers) {
    // Check if preparer already has availability
    const existingAvailability = await prisma.preparerAvailability.findFirst({
      where: { preparerId: preparer.id },
    });

    if (existingAvailability) {
      console.log(`⏭️  ${preparer.firstName} ${preparer.lastName} already has availability`);
      continue;
    }

    // Create Mon-Fri 9am-5pm availability
    for (let day = 1; day <= 5; day++) {
      await prisma.preparerAvailability.create({
        data: {
          preparerId: preparer.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          serviceIds: [], // All services available
          isActive: true,
        },
      });
    }

    console.log(`✅ ${preparer.firstName} ${preparer.lastName} - Mon-Fri 9am-5pm`);
  }

  console.log('\n✨ Booking services and availability seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding booking services:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
