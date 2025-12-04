/**
 * Start 3 Lead Generation Campaigns for All 200 Cities
 *
 * Creates AI-generated landing pages for:
 * 1. Tax Filing Customers (get-tax-filing)
 * 2. Tax Preparer Job Applications (become-tax-preparer)
 * 3. Affiliate/Referrer Recruitment (become-affiliate)
 *
 * Total: 600 landing pages (200 cities × 3 campaigns)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Campaign configurations for the 3 lead gen types
const LEAD_GEN_CAMPAIGNS = [
  {
    serviceType: 'get-tax-filing',
    serviceName: 'Get Your Taxes Done by TaxGeniusPro',
    description:
      'Professional tax preparation with IRS-certified tax preparers. Maximum refund guarantee, audit protection, and year-round support. Get your taxes done right the first time.',
    price: 199,
    features: [
      'IRS-certified tax preparers with 10+ years experience',
      'Maximum refund guarantee - we find every deduction',
      'Free audit protection and IRS representation included',
      'Year-round tax support and advice',
      'Fast e-filing with direct deposit refunds',
      'Secure document upload and storage',
      'Free prior year amendments if we find more deductions',
      'No hidden fees - transparent pricing',
      'Virtual or in-person consultations available',
      'Average refund: $3,200 for our clients',
    ],
    keywords: [
      'tax preparation',
      'tax filing',
      'tax preparer near me',
      'professional tax services',
      'irs certified tax preparer',
      'maximum refund',
      'file taxes online',
      'tax expert',
    ],
    leadType: 'customer',
  },
  {
    serviceType: 'become-tax-preparer',
    serviceName: 'Join Our Team - Tax Preparer Jobs',
    description:
      'Hiring experienced tax preparers and CPAs. Competitive compensation, flexible schedule, work from home options. Join a growing team serving clients nationwide.',
    price: null, // No price for job applications
    features: [
      'Competitive base salary plus performance bonuses',
      'Flexible schedule - set your own hours',
      'Work from home or office locations available',
      'Comprehensive training and continuing education',
      'IRS Enrolled Agent exam support and reimbursement',
      'Advanced tax software and tools provided',
      'Professional development and career advancement',
      'Health benefits for full-time positions',
      'Support from experienced tax professionals',
      'Seasonal or year-round positions available',
    ],
    keywords: [
      'tax preparer jobs',
      'tax professional careers',
      'cpa jobs',
      'enrolled agent jobs',
      'tax accountant positions',
      'remote tax preparer',
      'work from home tax jobs',
      'hiring tax preparers',
    ],
    leadType: 'preparer',
  },
  {
    serviceType: 'become-affiliate',
    serviceName: 'Earn Extra Money as a Tax Genius Affiliate',
    description:
      'Refer clients to TaxGeniusPro and earn generous commissions. No experience required, comprehensive training provided. Join thousands earning $500-$5,000+ per tax season.',
    price: null, // No price for affiliate signup
    features: [
      'Earn $50-$200 per successful client referral',
      'No experience required - we provide full training',
      'Free marketing materials and landing pages',
      'Real-time tracking of your referrals and earnings',
      'Weekly payouts via direct deposit or PayPal',
      'Dedicated affiliate support team',
      'Bonus incentives for top performers',
      'Lifetime commissions on repeat clients',
      'Exclusive promotions and special offers',
      'Average affiliates earn $2,500 per tax season',
    ],
    keywords: [
      'affiliate program',
      'referral income',
      'earn extra money',
      'work from home opportunities',
      'tax referral program',
      'make money referring clients',
      'passive income',
      'tax affiliate marketing',
    ],
    leadType: 'affiliate',
  },
];

async function createCampaigns() {
  console.log('🚀 Starting 3 Lead Generation Campaigns...\n');

  // Check if cities are seeded
  const cityCount = await prisma.city.count();
  if (cityCount === 0) {
    console.error('❌ No cities found! Please run seed-cities.ts first.');
    console.log('   Run: npx tsx scripts/seed-cities.ts\n');
    process.exit(1);
  }

  console.log(`✅ Found ${cityCount} cities in database\n`);

  const campaignResults = [];

  for (const campaignConfig of LEAD_GEN_CAMPAIGNS) {
    console.log(`\n📋 Creating campaign: ${campaignConfig.serviceName}`);
    console.log(`   Service Type: ${campaignConfig.serviceType}`);
    console.log(`   Lead Type: ${campaignConfig.leadType}`);

    try {
      // Check if campaign already exists
      const existing = await prisma.productCampaignQueue.findFirst({
        where: {
          serviceType: campaignConfig.serviceType,
          status: {
            in: ['PENDING', 'GENERATING', 'OPTIMIZING', 'COMPLETE'],
          },
        },
      });

      if (existing) {
        console.log(`   ⏭️  Campaign already exists (ID: ${existing.id})`);
        console.log(`   Status: ${existing.status}`);
        console.log(`   Cities Generated: ${existing.citiesGenerated}/${cityCount}`);
        campaignResults.push(existing);
        continue;
      }

      // Create new campaign
      const campaign = await prisma.productCampaignQueue.create({
        data: {
          campaignName: `${campaignConfig.serviceName} - ${cityCount} Cities`,
          serviceType: campaignConfig.serviceType,
          productSpec: {
            serviceName: campaignConfig.serviceName,
            description: campaignConfig.description,
            price: campaignConfig.price,
            features: campaignConfig.features,
            keywords: campaignConfig.keywords,
            leadType: campaignConfig.leadType,
            generateImages: false, // Set to true if you want AI images
          },
          status: 'PENDING',
          priority: campaignConfig.leadType === 'customer' ? 10 : 5, // Prioritize customer campaigns
          citiesGenerated: 0,
          citiesIndexed: 0,
          createdBy: 'system',
        },
      });

      console.log(`   ✅ Campaign created successfully!`);
      console.log(`   Campaign ID: ${campaign.id}`);
      console.log(`   Status: ${campaign.status}`);
      campaignResults.push(campaign);
    } catch (error) {
      console.error(`   ❌ Error creating campaign:`, error);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('✨ CAMPAIGN CREATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`\nTotal Campaigns Created: ${campaignResults.length}`);
  console.log(`Total Cities: ${cityCount}`);
  console.log(`Total Landing Pages (when complete): ${campaignResults.length * cityCount}\n`);

  console.log('📊 CAMPAIGN DETAILS:\n');
  campaignResults.forEach((campaign, index) => {
    console.log(`${index + 1}. ${campaign.campaignName}`);
    console.log(`   ID: ${campaign.id}`);
    console.log(`   Service Type: ${campaign.serviceType}`);
    console.log(`   Status: ${campaign.status}`);
    console.log(`   Priority: ${campaign.priority}`);
    console.log('');
  });

  console.log('='.repeat(70));
  console.log('\n🎯 NEXT STEPS:\n');
  console.log('1. Start the campaigns using the API:');
  console.log('   POST http://localhost:3005/api/seo-brain/start-campaign\n');
  console.log('2. Or use the provided helper script:');
  console.log('   npx tsx scripts/trigger-campaigns.ts\n');
  console.log('3. Monitor progress:');
  console.log('   GET http://localhost:3005/api/seo-brain/campaign-status?campaignId=CAMPAIGN_ID\n');
  console.log('⏱️  Estimated completion time: 6-7 hours per campaign');
  console.log('📈 Total pages when complete: ' + campaignResults.length * cityCount);
  console.log('💰 Total cost (using free Ollama): $0\n');
}

// Run
createCampaigns()
  .catch((e) => {
    console.error('Campaign creation failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
