import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Tax Genius Pro products...\n');

  const products = [
    // Apparel
    {
      name: 'Tax Genius Button Down Shirt',
      description: 'Professional button-down shirt with Tax Genius branding.',
      price: 29.99,
      type: 'MARKETING_MATERIAL',
      category: 'Apparel',
      imageUrl: '/images/products/button-down.jpg',
      isActive: true,
      stock: 100,
      sku: 'TGP-BUTTON-DOWN',
      availableFor: ['TAX_PREPARER', 'AFFILIATE'],
      metadata: { weight: 1.0, dimensions: { length: 12, width: 9, height: 2 } },
    },
    {
      name: 'Tax Genius T-Shirt',
      description: 'Comfortable cotton t-shirt with Tax Genius logo.',
      price: 29.99,
      type: 'MARKETING_MATERIAL',
      category: 'Apparel',
      imageUrl: '/images/products/t-shirt.jpg',
      isActive: true,
      stock: 100,
      sku: 'TGP-TSHIRT',
      availableFor: ['TAX_PREPARER', 'AFFILIATE'],
      metadata: { weight: 1.0, dimensions: { length: 12, width: 9, height: 2 } },
    },

    // Business Cards
    { name: 'Business Cards - 500 (2x3.5)', description: '500 premium business cards on 16pt cardstock.', price: 80.00, type: 'MARKETING_MATERIAL', category: 'Business Cards', imageUrl: '/images/products/business-cards.jpg', isActive: true, stock: 999, sku: 'BC-500', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 3.0, dimensions: { length: 3.5, width: 2, height: 2 }, material: '16pt cardstock' } },
    { name: 'Business Cards - 1000 (2x3.5)', description: '1000 premium business cards on 16pt cardstock.', price: 100.00, type: 'MARKETING_MATERIAL', category: 'Business Cards', imageUrl: '/images/products/business-cards.jpg', isActive: true, stock: 999, sku: 'BC-1000', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 5.0, dimensions: { length: 3.5, width: 2, height: 3 }, material: '16pt cardstock' } },
    { name: 'Business Cards - 2500 (2x3.5)', description: '2500 premium business cards on 16pt cardstock.', price: 125.00, type: 'MARKETING_MATERIAL', category: 'Business Cards', imageUrl: '/images/products/business-cards.jpg', isActive: true, stock: 999, sku: 'BC-2500', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 7.0, dimensions: { length: 3.5, width: 2, height: 5 }, material: '16pt cardstock' } },
    { name: 'Business Cards - 5000 (2x3.5)', description: '5000 premium business cards on 16pt cardstock.', price: 150.00, type: 'MARKETING_MATERIAL', category: 'Business Cards', imageUrl: '/images/products/business-cards.jpg', isActive: true, stock: 999, sku: 'BC-5000', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 15.0, dimensions: { length: 3.5, width: 2, height: 8 }, material: '16pt cardstock' } },

    // Flyers
    { name: 'Promotional Flyers - 500 (4x6)', description: '500 promotional flyers on 16pt cardstock.', price: 100.00, type: 'MARKETING_MATERIAL', category: 'Flyers', imageUrl: '/images/products/flyers.jpg', isActive: true, stock: 999, sku: 'FLYER-500', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 5.0, dimensions: { length: 6, width: 4, height: 2 }, material: '16pt cardstock' } },
    { name: 'Promotional Flyers - 1000 (4x6)', description: '1000 promotional flyers on 16pt cardstock.', price: 125.00, type: 'MARKETING_MATERIAL', category: 'Flyers', imageUrl: '/images/products/flyers.jpg', isActive: true, stock: 999, sku: 'FLYER-1000', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 8.0, dimensions: { length: 6, width: 4, height: 3 }, material: '16pt cardstock' } },
    { name: 'Promotional Flyers - 2500 (4x6)', description: '2500 promotional flyers on 16pt cardstock.', price: 150.00, type: 'MARKETING_MATERIAL', category: 'Flyers', imageUrl: '/images/products/flyers.jpg', isActive: true, stock: 999, sku: 'FLYER-2500', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 12.0, dimensions: { length: 6, width: 4, height: 5 }, material: '16pt cardstock' } },
    { name: 'Promotional Flyers - 5000 (4x6)', description: '5000 promotional flyers on 16pt cardstock.', price: 175.00, type: 'MARKETING_MATERIAL', category: 'Flyers', imageUrl: '/images/products/flyers.jpg', isActive: true, stock: 999, sku: 'FLYER-5000', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 20.0, dimensions: { length: 6, width: 4, height: 8 }, material: '16pt cardstock' } },

    // Palm Cards
    { name: 'Palm Cards - 500 (3x4)', description: '500 palm cards on 16pt cardstock.', price: 50.00, type: 'MARKETING_MATERIAL', category: 'Palm Cards', imageUrl: '/images/products/palm-cards.jpg', isActive: true, stock: 999, sku: 'PALM-500', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 9.0, dimensions: { length: 4, width: 3, height: 3 }, material: '16pt cardstock' } },
    { name: 'Palm Cards - 1000 (3x4)', description: '1000 palm cards on 16pt cardstock.', price: 75.00, type: 'MARKETING_MATERIAL', category: 'Palm Cards', imageUrl: '/images/products/palm-cards.jpg', isActive: true, stock: 999, sku: 'PALM-1000', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 15.0, dimensions: { length: 4, width: 3, height: 4 }, material: '16pt cardstock' } },
    { name: 'Palm Cards - 2500 (3x4)', description: '2500 palm cards on 16pt cardstock.', price: 109.00, type: 'MARKETING_MATERIAL', category: 'Palm Cards', imageUrl: '/images/products/palm-cards.jpg', isActive: true, stock: 999, sku: 'PALM-2500', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 25.0, dimensions: { length: 4, width: 3, height: 6 }, material: '16pt cardstock' } },
    { name: 'Palm Cards - 5000 (3x4)', description: '5000 palm cards on 16pt cardstock.', price: 157.00, type: 'MARKETING_MATERIAL', category: 'Palm Cards', imageUrl: '/images/products/palm-cards.jpg', isActive: true, stock: 999, sku: 'PALM-5000', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 35.0, dimensions: { length: 4, width: 3, height: 8 }, material: '16pt cardstock' } },

    // Posters
    { name: 'Posters - 10 (12x18)', description: '10 large format posters on 16pt cardstock.', price: 12.25, type: 'MARKETING_MATERIAL', category: 'Posters', imageUrl: '/images/products/posters.jpg', isActive: true, stock: 999, sku: 'POSTER-10', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 1.0, dimensions: { length: 18, width: 12, height: 0.5 }, material: '16pt cardstock' } },
    { name: 'Posters - 25 (12x18)', description: '25 large format posters on 16pt cardstock.', price: 24.00, type: 'MARKETING_MATERIAL', category: 'Posters', imageUrl: '/images/products/posters.jpg', isActive: true, stock: 999, sku: 'POSTER-25', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 2.0, dimensions: { length: 18, width: 12, height: 1 }, material: '16pt cardstock' } },
    { name: 'Posters - 100 (12x18)', description: '100 large format posters on 16pt cardstock.', price: 78.00, type: 'MARKETING_MATERIAL', category: 'Posters', imageUrl: '/images/products/posters.jpg', isActive: true, stock: 999, sku: 'POSTER-100', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 3.0, dimensions: { length: 18, width: 12, height: 2 }, material: '16pt cardstock' } },

    // Door Hangers
    { name: 'Door Hangers - 500', description: '500 door hangers on 9pt cardstock.', price: 250.00, type: 'MARKETING_MATERIAL', category: 'Door Hangers', imageUrl: '/images/products/door-hangers.jpg', isActive: true, stock: 999, sku: 'DOOR-500', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 15.0, dimensions: { length: 11, width: 4.25, height: 3 }, material: '9pt cardstock' } },
    { name: 'Door Hangers - 1000', description: '1000 door hangers on 9pt cardstock.', price: 350.00, type: 'MARKETING_MATERIAL', category: 'Door Hangers', imageUrl: '/images/products/door-hangers.jpg', isActive: true, stock: 999, sku: 'DOOR-1000', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 25.0, dimensions: { length: 11, width: 4.25, height: 5 }, material: '9pt cardstock' } },
    { name: 'Door Hangers - 2500', description: '2500 door hangers on 9pt cardstock.', price: 450.00, type: 'MARKETING_MATERIAL', category: 'Door Hangers', imageUrl: '/images/products/door-hangers.jpg', isActive: true, stock: 999, sku: 'DOOR-2500', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 45.0, dimensions: { length: 11, width: 4.25, height: 8 }, material: '9pt cardstock' } },
    { name: 'Door Hangers - 5000', description: '5000 door hangers on 9pt cardstock.', price: 500.00, type: 'MARKETING_MATERIAL', category: 'Door Hangers', imageUrl: '/images/products/door-hangers.jpg', isActive: true, stock: 999, sku: 'DOOR-5000', availableFor: ['TAX_PREPARER', 'AFFILIATE'], metadata: { weight: 50.0, dimensions: { length: 11, width: 4.25, height: 10 }, material: '9pt cardstock' } },
  ];

  console.log(`Creating ${products.length} products...\n`);

  for (const product of products) {
    const created = await prisma.product.create({ data: product });
    console.log(`✓ ${created.name} - $${created.price} (${(created.metadata as any).weight} lbs)`);
  }

  console.log(`\n✅ Successfully seeded ${products.length} products!`);
  console.log(`\n💡 Admin can update prices and weights at: /admin/products`);
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
