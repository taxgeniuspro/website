import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLinks() {
  const links = await prisma.marketingLink.findMany({
    select: {
      code: true,
      linkType: true,
      url: true,
      shortUrl: true,
      title: true,
    },
    take: 5,
  });

  console.log('Sample marketing links:');
  console.log(JSON.stringify(links, null, 2));
}

checkLinks()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
