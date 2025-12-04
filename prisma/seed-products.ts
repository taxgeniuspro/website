import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Tax Genius Pro products...\n');

  // Clear existing products (optional - comment out to keep existing)
  // await prisma.product.deleteMany({});
  // console.log('✓ Cleared existing products\n');

  const products = [
    // ========================================
    // APPAREL
    // ========================================
    {
      name: 'Tax Genius Button Down Shirt',
      description: 'Professional button-down shirt with Tax Genius branding. High-quality fabric, comfortable fit.',
      price: 29.99,
      type: 'MARKETING_MATERIAL',
      category: 'Apparel',
      imageUrl: '/images/products/button-down.jpg',
      isActive: true,
      stock: 100,
      sku: 'TGP-BUTTON-DOWN',
      // Shipping info in metadata
      metadata: {
        weight: 1.0, // lbs
        dimensions: { length: 12, width: 9, height: 2 }, // inches
        material: '16pt cardstock',
      },
    },
    {
      name: 'Tax Genius T-Shirt',
      description: 'Comfortable cotton t-shirt with Tax Genius logo. Perfect for casual events and promotions.',
      price: 29.99,
      type: 'MARKETING_MATERIAL',
      category: 'Apparel',
      imageUrl: '/images/products/t-shirt.jpg',
      isActive: true,
      stock: 100,
      sku: 'TGP-TSHIRT',
      // Shipping info in metadata
      metadata: {
        weight: 1.0, // lbs
        dimensions: { length: 12, width: 9, height: 2 }, // inches
      },
    },

    // ========================================
    // BUSINESS CARDS (2x3.5) - 16pt Cardstock
    // ========================================
    {
      name: 'Business Cards - 500 (2x3.5)',
      description: '500 premium business cards on 16pt cardstock. Professional quality, full color.',
      price: 80.00,
      type: 'MARKETING_MATERIAL',
      category: 'Business Cards',
      imageUrl: '/images/products/business-cards.jpg',
      isActive: true,
      stock: 999,
      weight: 3.0, // 3 lbs
      dimensions: { length: 3.5, width: 2, height: 2 },
      sku: 'BC-500',
    },
    {
      name: 'Business Cards - 1000 (2x3.5)',
      description: '1000 premium business cards on 16pt cardstock. Professional quality, full color.',
      price: 100.00,
      type: 'MARKETING_MATERIAL',
      category: 'Business Cards',
      imageUrl: '/images/products/business-cards.jpg',
      isActive: true,
      stock: 999,
      weight: 5.0, // 5 lbs
      dimensions: { length: 3.5, width: 2, height: 3 },
      sku: 'BC-1000',
    },
    {
      name: 'Business Cards - 2500 (2x3.5)',
      description: '2500 premium business cards on 16pt cardstock. Professional quality, full color.',
      price: 125.00,
      type: 'MARKETING_MATERIAL',
      category: 'Business Cards',
      imageUrl: '/images/products/business-cards.jpg',
      isActive: true,
      stock: 999,
      weight: 7.0, // 7 lbs
      dimensions: { length: 3.5, width: 2, height: 5 },
      sku: 'BC-2500',
    },
    {
      name: 'Business Cards - 5000 (2x3.5)',
      description: '5000 premium business cards on 16pt cardstock. Professional quality, full color.',
      price: 150.00,
      type: 'MARKETING_MATERIAL',
      category: 'Business Cards',
      imageUrl: '/images/products/business-cards.jpg',
      isActive: true,
      stock: 999,
      weight: 15.0, // 15 lbs
      dimensions: { length: 3.5, width: 2, height: 8 },
      sku: 'BC-5000',
    },

    // ========================================
    // PROMOTIONAL FLYERS (4x6) - 16pt Cardstock
    // ========================================
    {
      name: 'Promotional Flyers - 500 (4x6)',
      description: '500 promotional flyers on 16pt cardstock. Eye-catching designs for your tax business.',
      price: 100.00,
      type: 'MARKETING_MATERIAL',
      category: 'Flyers',
      imageUrl: '/images/products/flyers.jpg',
      isActive: true,
      stock: 999,
      weight: 5.0, // Estimated weight
      dimensions: { length: 6, width: 4, height: 2 },
      sku: 'FLYER-500',
    },
    {
      name: 'Promotional Flyers - 1000 (4x6)',
      description: '1000 promotional flyers on 16pt cardstock. Eye-catching designs for your tax business.',
      price: 125.00,
      type: 'MARKETING_MATERIAL',
      category: 'Flyers',
      imageUrl: '/images/products/flyers.jpg',
      isActive: true,
      stock: 999,
      weight: 8.0, // Estimated weight
      dimensions: { length: 6, width: 4, height: 3 },
      sku: 'FLYER-1000',
    },
    {
      name: 'Promotional Flyers - 2500 (4x6)',
      description: '2500 promotional flyers on 16pt cardstock. Eye-catching designs for your tax business.',
      price: 150.00,
      type: 'MARKETING_MATERIAL',
      category: 'Flyers',
      imageUrl: '/images/products/flyers.jpg',
      isActive: true,
      stock: 999,
      weight: 12.0, // Estimated weight
      dimensions: { length: 6, width: 4, height: 5 },
      sku: 'FLYER-2500',
    },
    {
      name: 'Promotional Flyers - 5000 (4x6)',
      description: '5000 promotional flyers on 16pt cardstock. Eye-catching designs for your tax business.',
      price: 175.00,
      type: 'MARKETING_MATERIAL',
      category: 'Flyers',
      imageUrl: '/images/products/flyers.jpg',
      isActive: true,
      stock: 999,
      weight: 20.0, // Estimated weight
      dimensions: { length: 6, width: 4, height: 8 },
      sku: 'FLYER-5000',
    },

    // ========================================
    // PALM CARDS (3x4) - 16pt Cardstock
    // ========================================
    {
      name: 'Palm Cards - 500 (3x4)',
      description: '500 palm cards on 16pt cardstock. Perfect for handouts and direct mail.',
      price: 50.00,
      type: 'MARKETING_MATERIAL',
      category: 'Palm Cards',
      imageUrl: '/images/products/palm-cards.jpg',
      isActive: true,
      stock: 999,
      weight: 9.0, // 9 lbs
      dimensions: { length: 4, width: 3, height: 3 },
      sku: 'PALM-500',
    },
    {
      name: 'Palm Cards - 1000 (3x4)',
      description: '1000 palm cards on 16pt cardstock. Perfect for handouts and direct mail.',
      price: 75.00,
      type: 'MARKETING_MATERIAL',
      category: 'Palm Cards',
      imageUrl: '/images/products/palm-cards.jpg',
      isActive: true,
      stock: 999,
      weight: 15.0, // 15 lbs
      dimensions: { length: 4, width: 3, height: 4 },
      sku: 'PALM-1000',
    },
    {
      name: 'Palm Cards - 2500 (3x4)',
      description: '2500 palm cards on 16pt cardstock. Perfect for handouts and direct mail.',
      price: 109.00,
      type: 'MARKETING_MATERIAL',
      category: 'Palm Cards',
      imageUrl: '/images/products/palm-cards.jpg',
      isActive: true,
      stock: 999,
      weight: 25.0, // 25 lbs
      dimensions: { length: 4, width: 3, height: 6 },
      sku: 'PALM-2500',
    },
    {
      name: 'Palm Cards - 5000 (3x4)',
      description: '5000 palm cards on 16pt cardstock. Perfect for handouts and direct mail.',
      price: 157.00,
      type: 'MARKETING_MATERIAL',
      category: 'Palm Cards',
      imageUrl: '/images/products/palm-cards.jpg',
      isActive: true,
      stock: 999,
      weight: 35.0, // 35 lbs
      dimensions: { length: 4, width: 3, height: 8 },
      sku: 'PALM-5000',
    },

    // ========================================
    // POSTERS (12x18) - 16pt Cardstock
    // ========================================
    {
      name: 'Posters - 10 (12x18)',
      description: '10 large format posters on 16pt cardstock. Perfect for office displays.',
      price: 12.25,
      type: 'MARKETING_MATERIAL',
      category: 'Posters',
      imageUrl: '/images/products/posters.jpg',
      isActive: true,
      stock: 999,
      weight: 1.0, // 1 lb
      dimensions: { length: 18, width: 12, height: 0.5 },
      sku: 'POSTER-10',
    },
    {
      name: 'Posters - 25 (12x18)',
      description: '25 large format posters on 16pt cardstock. Perfect for office displays.',
      price: 24.00,
      type: 'MARKETING_MATERIAL',
      category: 'Posters',
      imageUrl: '/images/products/posters.jpg',
      isActive: true,
      stock: 999,
      weight: 2.0, // 2 lbs
      dimensions: { length: 18, width: 12, height: 1 },
      sku: 'POSTER-25',
    },
    {
      name: 'Posters - 100 (12x18)',
      description: '100 large format posters on 16pt cardstock. Perfect for office displays.',
      price: 78.00,
      type: 'MARKETING_MATERIAL',
      category: 'Posters',
      imageUrl: '/images/products/posters.jpg',
      isActive: true,
      stock: 999,
      weight: 3.0, // 3 lbs
      dimensions: { length: 18, width: 12, height: 2 },
      sku: 'POSTER-100',
    },

    // ========================================
    // DOOR HANGERS - 9pt Cardstock
    // ========================================
    {
      name: 'Door Hangers - 500',
      description: '500 door hangers on 9pt cardstock. Perfect for neighborhood marketing campaigns.',
      price: 250.00,
      type: 'MARKETING_MATERIAL',
      category: 'Door Hangers',
      imageUrl: '/images/products/door-hangers.jpg',
      isActive: true,
      stock: 999,
      weight: 15.0, // 15 lbs
      dimensions: { length: 11, width: 4.25, height: 3 },
      sku: 'DOOR-500',
    },
    {
      name: 'Door Hangers - 1000',
      description: '1000 door hangers on 9pt cardstock. Perfect for neighborhood marketing campaigns.',
      price: 350.00,
      type: 'MARKETING_MATERIAL',
      category: 'Door Hangers',
      imageUrl: '/images/products/door-hangers.jpg',
      isActive: true,
      stock: 999,
      weight: 25.0, // 25 lbs
      dimensions: { length: 11, width: 4.25, height: 5 },
      sku: 'DOOR-1000',
    },
    {
      name: 'Door Hangers - 2500',
      description: '2500 door hangers on 9pt cardstock. Perfect for neighborhood marketing campaigns.',
      price: 450.00,
      type: 'MARKETING_MATERIAL',
      category: 'Door Hangers',
      imageUrl: '/images/products/door-hangers.jpg',
      isActive: true,
      stock: 999,
      weight: 45.0, // 45 lbs
      dimensions: { length: 11, width: 4.25, height: 8 },
      sku: 'DOOR-2500',
    },
    {
      name: 'Door Hangers - 5000',
      description: '5000 door hangers on 9pt cardstock. Perfect for neighborhood marketing campaigns.',
      price: 500.00,
      type: 'MARKETING_MATERIAL',
      category: 'Door Hangers',
      imageUrl: '/images/products/door-hangers.jpg',
      isActive: true,
      stock: 999,
      weight: 50.0, // 50 lbs
      dimensions: { length: 11, width: 4.25, height: 10 },
      sku: 'DOOR-5000',
    },
  ];

  console.log(`Creating ${products.length} products...\n`);

  for (const product of products) {
    const created = await prisma.product.create({
      data: product,
    });

    console.log(`✓ Created: ${created.name} - $${created.price} (${created.weight} lbs)`);
  }

  console.log(`\n✅ Successfully seeded ${products.length} products!\n`);

  // Summary by category
  console.log('📊 Product Summary:');
  console.log('==================');
  console.log('• Apparel: 2 products');
  console.log('• Business Cards: 4 products');
  console.log('• Promotional Flyers: 4 products');
  console.log('• Palm Cards: 4 products');
  console.log('• Posters: 3 products');
  console.log('• Door Hangers: 4 products');
  console.log('==================');
  console.log(`Total: ${products.length} products\n`);

  console.log('💡 Notes:');
  console.log('• All products have accurate weights for shipping calculations');
  console.log('• Business cards, flyers, palm cards, posters: 16pt cardstock');
  console.log('• Door hangers: 9pt cardstock');
  console.log('• Dimensions optimized for FedEx box packing algorithm\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
