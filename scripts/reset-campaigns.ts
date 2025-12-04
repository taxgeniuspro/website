import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetCampaigns() {
  const result = await prisma.productCampaignQueue.updateMany({
    where: { status: 'GENERATING' },
    data: {
      status: 'PENDING',
      generationStartedAt: null
    }
  });

  console.log('✅ Reset', result.count, 'campaigns back to PENDING status');
  await prisma.$disconnect();
}

resetCampaigns();
