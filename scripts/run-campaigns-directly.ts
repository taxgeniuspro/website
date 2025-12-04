/**
 * Directly Run Campaign Generation (Bypass API & Auth)
 *
 * This script directly calls the campaign generation function,
 * bypassing the API and authentication requirements.
 */

import { PrismaClient } from '@prisma/client';
import { generate200CityPages } from '../src/lib/seo-llm/campaign-generator/city-page-generator';
import { OllamaClient } from '../src/lib/seo-llm/integrations/ollama/ollama-client';

const prisma = new PrismaClient();

async function runCampaignsDirect() {
  console.log('🚀 Starting Direct Campaign Generation...\n');

  // Get all PENDING campaigns
  const campaigns = await prisma.productCampaignQueue.findMany({
    where: {
      status: 'PENDING',
    },
    orderBy: {
      priority: 'desc',
    },
  });

  if (campaigns.length === 0) {
    console.log('✅ No pending campaigns found.');
    return;
  }

  console.log(`Found ${campaigns.length} pending campaigns\n`);

  for (const campaign of campaigns) {
    const spec = campaign.productSpec as any;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`📋 Campaign: ${campaign.campaignName}`);
    console.log(`   ID: ${campaign.id}`);
    console.log(`   Service Type: ${campaign.serviceType}`);
    console.log(`   Priority: ${campaign.priority}`);
    console.log('='.repeat(70));

    try {
      // Update status to GENERATING
      await prisma.productCampaignQueue.update({
        where: { id: campaign.id },
        data: {
          status: 'GENERATING',
          generationStartedAt: new Date(),
        },
      });

      console.log('\n✅ Status updated to GENERATING');

      // Initialize Ollama client
      const ollamaClient = new OllamaClient();

      // Test connection
      console.log('🔌 Testing Ollama connection...');
      const connectionTest = await ollamaClient.testConnection();

      if (!connectionTest.success) {
        throw new Error(`Ollama connection failed: ${connectionTest.error}`);
      }

      console.log(`✅ Ollama connected successfully`);
      console.log(`   Model: ${connectionTest.model}\n`);

      // Generate 200 city pages
      console.log('🎨 Starting page generation (this will take 6-7 hours)...\n');

      const result = await generate200CityPages(
        campaign.id,
        {
          serviceType: campaign.serviceType,
          serviceName: spec.serviceName,
          description: spec.description,
          price: spec.price,
          features: spec.features || [],
          keywords: spec.keywords || [],
        },
        ollamaClient,
        {
          generateImages: spec.generateImages || false,
          batchSize: 10,
        }
      );

      console.log(`\n✅ Campaign ${campaign.id} completed!`);
      console.log(`   Generated: ${result.generated}`);
      console.log(`   Failed: ${result.failed}`);

      // Mark as complete
      await prisma.productCampaignQueue.update({
        where: { id: campaign.id },
        data: {
          status: 'COMPLETE',
          generationCompletedAt: new Date(),
        },
      });

      console.log('✅ Campaign marked as COMPLETE\n');
    } catch (error) {
      console.error(`\n❌ Campaign ${campaign.id} failed:`, error);

      // Update campaign status to FAILED
      await prisma.productCampaignQueue.update({
        where: { id: campaign.id },
        data: {
          status: 'FAILED',
        },
      });

      console.log('⚠️  Campaign marked as FAILED\n');
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✨ All campaigns processed!');
  console.log('='.repeat(70));
}

// Run
runCampaignsDirect()
  .catch((e) => {
    console.error('Direct campaign execution failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
