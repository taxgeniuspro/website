const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixProductImage() {
  try {
    // Update the Referrer Welcome Kit product image
    const result = await prisma.product.updateMany({
      where: {
        OR: [
          { id: 'referrer-welcome-kit' },
          { imageUrl: { contains: '1513415277222-37a0b660c5f4' } }
        ]
      },
      data: {
        imageUrl: '/placeholder-product.png'
      }
    });

    console.log(`✅ Updated ${result.count} product(s) with new image URL`);
  } catch (error) {
    console.error('❌ Error updating product:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixProductImage();
