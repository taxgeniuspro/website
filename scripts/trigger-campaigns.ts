/**
 * Trigger Campaign Generation via API
 *
 * Starts the actual generation process for all pending campaigns
 * This will call the API endpoint to begin generating landing pages
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005';

async function triggerCampaigns() {
  console.log('🚀 Triggering Campaign Generation...\n');

  // Get all pending campaigns
  const pendingCampaigns = await prisma.productCampaignQueue.findMany({
    where: {
      status: 'PENDING',
    },
    orderBy: {
      priority: 'desc', // Higher priority first
    },
  });

  if (pendingCampaigns.length === 0) {
    console.log('ℹ️  No pending campaigns found.');
    console.log('   Run: npx tsx scripts/start-lead-gen-campaigns.ts first\n');
    return;
  }

  console.log(`Found ${pendingCampaigns.length} pending campaigns:\n`);

  for (const campaign of pendingCampaigns) {
    const spec = campaign.productSpec as any;

    console.log(`📋 ${campaign.campaignName}`);
    console.log(`   ID: ${campaign.id}`);
    console.log(`   Service Type: ${campaign.serviceType}`);
    console.log(`   Priority: ${campaign.priority}`);

    try {
      // Call the API to start generation
      const response = await fetch(`${API_BASE_URL}/api/seo-brain/start-campaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceType: campaign.serviceType,
          serviceName: spec.serviceName,
          description: spec.description,
          price: spec.price,
          features: spec.features || [],
          keywords: spec.keywords || [],
          generateImages: spec.generateImages || false,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log(`   ✅ Campaign started successfully!`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Message: ${result.message}\n`);
      } else {
        console.log(`   ❌ Failed to start campaign`);
        console.log(`   Error: ${result.error || 'Unknown error'}\n`);
      }
    } catch (error) {
      console.error(`   ❌ API call failed:`, error);
      console.log('   Make sure the server is running on port 3005\n');
    }

    // Small delay between campaigns
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log('='.repeat(70));
  console.log('\n✅ All campaigns triggered!\n');
  console.log('📊 Monitor progress with:');
  console.log(`   curl ${API_BASE_URL}/api/seo-brain/campaign-status?campaignId=CAMPAIGN_ID\n`);
  console.log('⏱️  Estimated completion: 6-7 hours per campaign');
  console.log('💡 Campaigns run in the background - you can close this script\n');
}

// Run
triggerCampaigns()
  .catch((e) => {
    console.error('Failed to trigger campaigns:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
