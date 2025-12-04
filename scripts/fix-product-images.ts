import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🖼️  Fixing product image URLs...\n');

  // Update all products to use null images (will show placeholder)
  const result = await prisma.product.updateMany({
    where: {
      imageUrl: {
        startsWith: '/images/products/'
      }
    },
    data: {
      imageUrl: null
    }
  });

  console.log(`✓ Updated ${result.count} products to use placeholder images`);
  console.log('\n💡 Products will now show default placeholder instead of 400 errors\n');
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
