import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...\n')

  // Seed Training Materials for Academy (Story 4.4 AC: 25)
  console.log('📚 Seeding training materials...')

  // Delete existing materials first
  await prisma.trainingMaterial.deleteMany({})

  const materials = await Promise.all([
    // Required Material 1: Tax Basics PDF
    prisma.trainingMaterial.create({
      data: {
        id: 'tax-basics-pdf',
        title: 'Tax Preparation Basics',
        description: 'Comprehensive guide covering fundamental tax preparation concepts, filing statuses, standard deductions, and basic tax calculations. Essential reading for all new preparers.',
        resourceType: 'PDF',
        resourceUrl: 'https://www.irs.gov/pub/irs-pdf/p17.pdf', // IRS Publication 17
        orderIndex: 1,
        isRequired: true,
      }
    }),

    // Required Material 2: Platform Walkthrough Video
    prisma.trainingMaterial.create({
      data: {
        id: 'platform-walkthrough',
        title: 'Tax Genius Platform Walkthrough',
        description: 'Step-by-step video tutorial showing how to navigate the Tax Genius platform, access client documents, file returns, and communicate with clients.',
        resourceType: 'VIDEO',
        resourceUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder - replace with actual walkthrough
        orderIndex: 2,
        isRequired: true,
      }
    }),

    // Required Material 3: IRS Guidelines Article
    prisma.trainingMaterial.create({
      data: {
        id: 'irs-efiling-guidelines',
        title: 'IRS e-Filing Guidelines',
        description: 'Official IRS guidelines for electronic filing, including security requirements, submission standards, and best practices for tax professionals.',
        resourceType: 'ARTICLE',
        resourceUrl: 'https://www.irs.gov/e-file-providers/become-an-authorized-irs-e-file-provider',
        orderIndex: 3,
        isRequired: true,
      }
    }),

    // Optional Material 4: Advanced Deductions PDF
    prisma.trainingMaterial.create({
      data: {
        id: 'advanced-deductions',
        title: 'Advanced Tax Deductions & Credits',
        description: 'In-depth guide to complex deductions, credits, and strategies for maximizing client refunds. Recommended for preparers handling business returns or high-income clients.',
        resourceType: 'PDF',
        resourceUrl: 'https://www.irs.gov/pub/irs-pdf/p535.pdf', // IRS Publication 535 - Business Expenses
        orderIndex: 4,
        isRequired: false,
      }
    }),
  ])

  console.log(`✅ Created ${materials.length} training materials`)
  console.log('   - 3 required materials')
  console.log('   - 1 optional material\n')

  // Seed Products for E-commerce Store (Story 4.3 AC: 21)
  console.log('🛒 Seeding store products...')

  // Delete existing products first
  await prisma.product.deleteMany({})

  const products = await Promise.all([
    // Product 1: Tax Genius Pro T-Shirt
    prisma.product.create({
      data: {
        id: 'tshirt-tax-genius-pro',
        name: 'Tax Genius Pro T-Shirt',
        description: 'Premium quality cotton t-shirt with the Tax Genius Pro logo. Available in black. Perfect for representing the brand at events or daily wear.',
        price: 24.99,
        imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80', // Placeholder - replace with actual branded image
        category: 'Apparel',
        isActive: true,
      }
    }),

    // Product 2: Branded Business Cards
    prisma.product.create({
      data: {
        id: 'business-cards-500',
        name: 'Branded Business Cards (500 pack)',
        description: 'Professional business cards with Tax Genius Pro branding and your contact information. High-quality cardstock, full-color printing. Includes customization with your name and referral code.',
        price: 49.99,
        imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80', // Placeholder - replace with actual cards image
        category: 'Marketing Materials',
        isActive: true,
      }
    }),

    // Product 3: Referrer Welcome Kit
    prisma.product.create({
      data: {
        id: 'referrer-welcome-kit',
        name: 'Referrer Welcome Kit',
        description: 'Complete starter package for new referrers including: 500 business cards, branded t-shirt, flyers, promotional materials, and welcome guide. Everything you need to start referring clients successfully.',
        price: 79.99,
        imageUrl: '/placeholder-product.png', // Placeholder - replace with actual kit image
        category: 'Kits',
        isActive: true,
      }
    }),
  ])

  console.log(`✅ Created ${products.length} products`)
  console.log(`   - ${products[0].name} ($${products[0].price})`)
  console.log(`   - ${products[1].name} ($${products[1].price})`)
  console.log(`   - ${products[2].name} ($${products[2].price})\n`)

  // Seed Marketing Materials for Referrers (Story 5.4)
  console.log('📢 Seeding marketing materials...')

  // Delete existing marketing materials first
  await prisma.marketingMaterial.deleteMany({})

  const marketingMaterials = await Promise.all([
    // Material 1: Social Media Post - Tax Season Reminder
    prisma.marketingMaterial.create({
      data: {
        title: 'Tax Season is Here - Social Post',
        description: 'Ready-to-use social media post for tax season announcements',
        materialType: 'TEXT',
        adCopy: '🚨 Tax Season is HERE! 🚨\n\nDon\'t stress about filing your taxes. Our expert team makes it easy, fast, and affordable.\n\n✅ Maximum refunds guaranteed\n✅ Professional preparers\n✅ Fast e-filing\n\nGet started today!',
        tags: ['social-media', 'tax-season', 'announcement'],
        isActive: true,
      }
    }),

    // Material 2: Referral Bonus Promotion
    prisma.marketingMaterial.create({
      data: {
        title: 'Referral Bonus - Promotional Image',
        description: 'Eye-catching graphic promoting referral bonuses',
        materialType: 'IMAGE',
        imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80',
        adCopy: '💰 Earn $25-$75 for every person you refer! 💰\n\nHelp your friends save on taxes and earn cash. It\'s that simple.\n\nSign up as a referrer today!',
        tags: ['referral', 'bonus', 'earnings'],
        isActive: true,
      }
    }),

    // Material 3: Last Minute Filing
    prisma.marketingMaterial.create({
      data: {
        title: 'Last Minute Filing - Urgent Post',
        description: 'Urgent messaging for late-season filers',
        materialType: 'TEXT',
        adCopy: '⏰ DEADLINE APPROACHING! ⏰\n\nDon\'t wait until the last minute! File your taxes NOW and avoid penalties.\n\n⚡ Same-day filing available\n⚡ Expert help ready\n⚡ Maximum refunds\n\nLet\'s get it done!',
        tags: ['urgent', 'deadline', 'last-minute'],
        isActive: true,
      }
    }),

    // Material 4: Facebook Share Template
    prisma.marketingMaterial.create({
      data: {
        title: 'Facebook Share - Tax Tips',
        description: 'Educational post about tax deductions',
        materialType: 'TEXT',
        adCopy: '💡 TAX TIP: Did you know these are tax-deductible?\n\n✓ Home office expenses\n✓ Charitable donations\n✓ Student loan interest\n✓ Medical expenses\n\nMaximize your refund with Tax Genius Pro. Our experts know every deduction you deserve!',
        tags: ['facebook', 'tax-tips', 'educational'],
        isActive: true,
      }
    }),

    // Material 5: Email Template
    prisma.marketingMaterial.create({
      data: {
        title: 'Email Template - Personal Outreach',
        description: 'Professional email template for personal referrals',
        materialType: 'TEMPLATE',
        templateHtml: '<p>Hi [Name],</p><p>I wanted to share something that might help you this tax season. I\'ve been working with <strong>Tax Genius Pro</strong> and they\'ve made filing taxes so much easier.</p><p><strong>Why I recommend them:</strong></p><ul><li>Professional tax preparers</li><li>Maximum refund guarantee</li><li>Fast, secure e-filing</li><li>Affordable pricing</li></ul><p>If you\'re looking for a hassle-free tax experience, check them out!</p><p>Best,<br/>[Your Name]</p>',
        adCopy: 'Hi [Name],\n\nI wanted to share something that might help you this tax season. I\'ve been working with Tax Genius Pro and they\'ve made filing taxes so much easier.\n\nWhy I recommend them:\n- Professional tax preparers\n- Maximum refund guarantee\n- Fast, secure e-filing\n- Affordable pricing\n\nIf you\'re looking for a hassle-free tax experience, check them out!\n\nBest,\n[Your Name]',
        tags: ['email', 'template', 'personal'],
        isActive: true,
      }
    }),

    // Material 6: Instagram Story Template
    prisma.marketingMaterial.create({
      data: {
        title: 'Instagram Story - Quick Promo',
        description: 'Short, engaging story post for Instagram',
        materialType: 'TEXT',
        adCopy: '📱 Swipe up to file your taxes in minutes!\n\n✨ Easy process\n✨ Expert help\n✨ Max refund\n\nTap the link in bio! 👆',
        tags: ['instagram', 'story', 'social-media'],
        isActive: true,
      }
    }),

    // Material 7: Testimonial Template
    prisma.marketingMaterial.create({
      data: {
        title: 'Success Story - Client Testimonial',
        description: 'Template for sharing client success stories',
        materialType: 'TEXT',
        adCopy: '⭐⭐⭐⭐⭐ "I got $3,200 back!\n\nTax Genius Pro found deductions I didn\'t even know existed. The process was smooth and my preparer answered all my questions."\n\n- Sarah M., Atlanta\n\nReady for YOUR success story? Let\'s go!',
        tags: ['testimonial', 'success-story', 'social-proof'],
        isActive: true,
      }
    }),

    // Material 8: Promotional Banner
    prisma.marketingMaterial.create({
      data: {
        title: 'Promotional Banner - Special Offer',
        description: 'Eye-catching banner for limited-time promotions',
        materialType: 'IMAGE',
        imageUrl: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800&q=80',
        adCopy: '🎁 SPECIAL OFFER: $20 OFF your tax filing!\n\nUse code: TAXGENIUS20\n\nLimited time only. File now and save!',
        tags: ['promotion', 'discount', 'banner'],
        isActive: true,
      }
    }),
  ])

  console.log(`✅ Created ${marketingMaterials.length} marketing materials`)
  console.log(`   - ${marketingMaterials.filter(m => m.materialType === 'TEXT').length} text posts`)
  console.log(`   - ${marketingMaterials.filter(m => m.materialType === 'IMAGE').length} images`)
  console.log(`   - ${marketingMaterials.filter(m => m.materialType === 'TEMPLATE').length} templates\n`)

  // Seed Role Permission Templates
  console.log('🔐 Seeding role permission templates...')

  // Delete existing templates first
  await prisma.rolePermissionTemplate.deleteMany({})

  // Default permissions for each role
  const DEFAULT_PERMISSIONS = {
    super_admin: {
      dashboard: true,
      clientsStatus: true,
      referralsStatus: true,
      emails: true,
      calendar: true,
      addressBook: true,
      clientFileCenter: true,
      analytics: true,
      googleAnalytics: true,
      referralsAnalytics: true,
      learningCenter: true,
      marketingHub: true,
      contentGenerator: true,
      payouts: true,
      earnings: true,
      store: true,
      users: true,
      database: true,
      adminManagement: true,
      settings: true,
      quickShareLinks: true,
      academy: true,
      trackingCode: true,
      marketing: true,
    },
    admin: {
      dashboard: true,
      clientsStatus: true,
      referralsStatus: true,
      emails: true,
      calendar: true,
      addressBook: true,
      clientFileCenter: false,
      analytics: true,
      googleAnalytics: false,
      referralsAnalytics: true,
      learningCenter: true,
      marketingHub: true,
      contentGenerator: true,
      payouts: true,
      earnings: true,
      store: true,
      users: true,
      database: false,
      adminManagement: false,
      settings: true,
      quickShareLinks: true,
      academy: true,
      trackingCode: true,
      marketing: true,
    },
    tax_preparer: {
      dashboard: true,
      clientsStatus: true,
      emails: true,
      calendar: true,
      addressBook: true,
      clientFileCenter: false,
      analytics: true,
      learningCenter: true,
      earnings: true,
      store: true,
      settings: true,
      academy: true,
      trackingCode: true,
      referralsStatus: false,
      googleAnalytics: false,
      referralsAnalytics: false,
      marketingHub: false,
      contentGenerator: false,
      payouts: false,
      users: false,
      database: false,
      adminManagement: false,
      quickShareLinks: false,
      marketing: false,
    },
    affiliate: {
      dashboard: true,
      analytics: true,
      earnings: true,
      store: true,
      settings: true,
      academy: true,
      trackingCode: true,
      marketing: true,
      clientsStatus: false,
      referralsStatus: false,
      emails: false,
      calendar: false,
      addressBook: false,
      clientFileCenter: false,
      googleAnalytics: false,
      referralsAnalytics: false,
      learningCenter: false,
      marketingHub: false,
      contentGenerator: false,
      payouts: false,
      users: false,
      database: false,
      adminManagement: false,
      quickShareLinks: false,
    },
    lead: {
      dashboard: true,
      settings: true,
      clientsStatus: false,
      referralsStatus: false,
      emails: false,
      calendar: false,
      addressBook: false,
      clientFileCenter: false,
      analytics: false,
      googleAnalytics: false,
      referralsAnalytics: false,
      learningCenter: false,
      marketingHub: false,
      contentGenerator: false,
      payouts: false,
      earnings: false,
      store: false,
      users: false,
      database: false,
      adminManagement: false,
      quickShareLinks: false,
      academy: false,
      trackingCode: false,
      marketing: false,
    },
    client: {
      dashboard: true,
      settings: true,
      clientsStatus: false,
      referralsStatus: false,
      emails: false,
      calendar: false,
      addressBook: false,
      clientFileCenter: false,
      analytics: false,
      googleAnalytics: false,
      referralsAnalytics: false,
      learningCenter: false,
      marketingHub: false,
      contentGenerator: false,
      payouts: false,
      earnings: false,
      store: false,
      users: false,
      database: false,
      adminManagement: false,
      quickShareLinks: false,
      academy: false,
      trackingCode: false,
      marketing: false,
    },
  }

  const roleTemplates = await Promise.all([
    prisma.rolePermissionTemplate.create({
      data: {
        role: 'super_admin',
        permissions: DEFAULT_PERMISSIONS.super_admin,
        updatedBy: null,
      }
    }),
    prisma.rolePermissionTemplate.create({
      data: {
        role: 'admin',
        permissions: DEFAULT_PERMISSIONS.admin,
        updatedBy: null,
      }
    }),
    prisma.rolePermissionTemplate.create({
      data: {
        role: 'tax_preparer',
        permissions: DEFAULT_PERMISSIONS.tax_preparer,
        updatedBy: null,
      }
    }),
    prisma.rolePermissionTemplate.create({
      data: {
        role: 'affiliate',
        permissions: DEFAULT_PERMISSIONS.affiliate,
        updatedBy: null,
      }
    }),
    prisma.rolePermissionTemplate.create({
      data: {
        role: 'lead',
        permissions: DEFAULT_PERMISSIONS.lead,
        updatedBy: null,
      }
    }),
    prisma.rolePermissionTemplate.create({
      data: {
        role: 'client',
        permissions: DEFAULT_PERMISSIONS.client,
        updatedBy: null,
      }
    }),
  ])

  console.log(`✅ Created ${roleTemplates.length} role permission templates`)
  console.log('   - super_admin (full access)')
  console.log('   - admin (limited access)')
  console.log('   - tax_preparer (client management)')
  console.log('   - affiliate (referral focus)')
  console.log('   - lead (minimal access)')
  console.log('   - client (minimal access)\n')

  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
