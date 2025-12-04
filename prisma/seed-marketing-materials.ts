import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Tax Preparer Marketing Materials...\n');

  const marketingProducts = [
    // ========================================
    // BUSINESS CARDS
    // ========================================
    {
      name: 'Professional Business Cards',
      description: '500 premium business cards with your photo, QR code, and contact information. High-quality 16pt cardstock with glossy finish.',
      price: 29.99,
      type: 'MARKETING_MATERIAL',
      category: 'Print Materials',
      imageUrl: '/images/products/business-card-preview.jpg',
      isActive: true,
      printable: true,
      stock: null, // Unlimited digital product
      sku: 'TGP-BIZCARD-500',
      availableFor: ['tax_preparer'],
      metadata: {
        productType: 'business_card',
        quantity: 500,
        dimensions: { width: 3.5, height: 2, unit: 'inches' },
        material: '16pt cardstock',
        finish: 'Glossy',
        printingTime: '3-5 business days',
        customizable: true,
        includesQRCode: true,
        includesPhoto: true,
      },
    },

    // ========================================
    // 4x6 POSTCARDS
    // ========================================
    {
      name: '4x6 Marketing Postcards',
      description: '250 professional 4x6 postcards perfect for direct mail campaigns. Features your photo, QR code, and contact information.',
      price: 49.99,
      type: 'MARKETING_MATERIAL',
      category: 'Print Materials',
      imageUrl: '/images/products/postcard-preview.jpg',
      isActive: true,
      printable: true,
      stock: null, // Unlimited
      sku: 'TGP-POSTCARD-250',
      availableFor: ['tax_preparer'],
      metadata: {
        productType: 'postcard',
        quantity: 250,
        dimensions: { width: 6, height: 4, unit: 'inches' },
        material: '14pt cardstock',
        finish: 'Glossy',
        printingTime: '3-5 business days',
        customizable: true,
        includesQRCode: true,
        includesPhoto: true,
        useCases: ['Direct mail', 'Leave behinds', 'Event handouts'],
      },
    },

    // ========================================
    // DOOR HANGERS
    // ========================================
    {
      name: 'Door Hanger Marketing Materials',
      description: '100 eye-catching door hangers for neighborhood marketing. Features your photo, services, QR code, and contact information.',
      price: 89.99,
      type: 'MARKETING_MATERIAL',
      category: 'Print Materials',
      imageUrl: '/images/products/door-hanger-preview.jpg',
      isActive: true,
      printable: true,
      stock: null, // Unlimited
      sku: 'TGP-DOORHANGER-100',
      availableFor: ['tax_preparer'],
      metadata: {
        productType: 'door_hanger',
        quantity: 100,
        dimensions: { width: 3.5, height: 8.5, unit: 'inches' },
        material: '16pt cardstock',
        finish: 'UV coated',
        printingTime: '5-7 business days',
        customizable: true,
        includesQRCode: true,
        includesPhoto: true,
        features: ['Die-cut door knob hole', 'Durable coating', 'Weather resistant'],
        useCases: ['Door-to-door marketing', 'Neighborhood campaigns', 'Community outreach'],
      },
    },

    // ========================================
    // POSTERS
    // ========================================
    {
      name: 'Marketing Poster 18x24',
      description: '10 professional 18x24 posters for office display or community events. Features your photo, services, QR code, and contact information.',
      price: 59.99,
      type: 'MARKETING_MATERIAL',
      category: 'Print Materials',
      imageUrl: '/images/products/poster-preview.jpg',
      isActive: true,
      printable: true,
      stock: null, // Unlimited
      sku: 'TGP-POSTER-18X24-10',
      availableFor: ['tax_preparer'],
      metadata: {
        productType: 'poster',
        quantity: 10,
        dimensions: { width: 18, height: 24, unit: 'inches' },
        material: '100lb gloss text',
        finish: 'Glossy',
        printingTime: '5-7 business days',
        customizable: true,
        includesQRCode: true,
        includesPhoto: true,
        features: ['High-resolution printing', 'Vibrant colors', 'Professional quality'],
        useCases: ['Office display', 'Community boards', 'Tax season promotions', 'Event marketing'],
      },
    },
  ];

  console.log('Creating marketing material products...\n');

  for (const product of marketingProducts) {
    const created = await prisma.product.upsert({
      where: { sku: product.sku },
      update: product,
      create: product,
    });

    console.log(`✓ Created/Updated: ${created.name} (${created.sku})`);
  }

  console.log('\n✅ Marketing materials seeding complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding marketing materials:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
