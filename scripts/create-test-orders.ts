import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🛒 Creating 5 test orders with random products...\n');

  // Get some random products
  const products = await prisma.product.findMany({
    take: 10,
    where: { isActive: true }
  });

  if (products.length === 0) {
    console.error('❌ No products found. Run seed-products.ts first!');
    process.exit(1);
  }

  // Get a real user (or use guest)
  const user = await prisma.profile.findFirst({
    where: { clerkUserId: { not: null } }
  });

  const defaultUserId = user?.clerkUserId || 'guest';

  const testOrders = [
    {
      userId: defaultUserId,
      email: 'customer1@example.com',
      paymentMethod: 'SQUARE',
      paymentSessionId: `test_payment_${Date.now()}_1`,
      status: 'COMPLETED',
      shippingMethod: 'FEDEX_GROUND',
      products: [products[0], products[1]], // Business cards + T-shirt
      shippingAddress: {
        name: 'John Doe',
        street: '123 Main St',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90210',
        country: 'US'
      }
    },
    {
      userId: defaultUserId,
      email: 'customer2@example.com',
      paymentMethod: 'CASHAPP',
      paymentSessionId: `test_payment_${Date.now()}_2`,
      status: 'COMPLETED',
      shippingMethod: 'FEDEX_2_DAY',
      products: [products[2]], // Flyers
      shippingAddress: {
        name: 'Jane Smith',
        street: '456 Oak Ave',
        city: 'Chicago',
        state: 'IL',
        zip: '60601',
        country: 'US'
      }
    },
    {
      userId: defaultUserId,
      email: 'customer3@example.com',
      paymentMethod: 'SQUARE',
      paymentSessionId: `test_payment_${Date.now()}_3`,
      status: 'PENDING',
      shippingMethod: 'GROUND_HOME_DELIVERY',
      products: [products[3], products[4], products[5]], // Palm cards + posters
      shippingAddress: {
        name: 'Bob Johnson',
        street: '789 Pine Rd',
        city: 'Miami',
        state: 'FL',
        zip: '33139',
        country: 'US'
      }
    },
    {
      userId: defaultUserId,
      email: 'customer4@example.com',
      paymentMethod: 'SQUARE',
      paymentSessionId: `test_payment_${Date.now()}_4`,
      status: 'COMPLETED',
      shippingMethod: 'STANDARD_OVERNIGHT',
      products: [products[6]], // Door hangers (heavy!)
      shippingAddress: {
        name: 'Alice Brown',
        street: '321 Elm St',
        city: 'New York',
        state: 'NY',
        zip: '10007',
        country: 'US'
      }
    },
    {
      userId: defaultUserId,
      email: 'customer5@example.com',
      paymentMethod: 'CASHAPP',
      paymentSessionId: `test_payment_${Date.now()}_5`,
      status: 'COMPLETED',
      shippingMethod: 'SMART_POST',
      products: [products[7], products[8]], // Mixed products
      shippingAddress: {
        name: 'Charlie Davis',
        street: '555 Maple Dr',
        city: 'Atlanta',
        state: 'GA',
        zip: '30315',
        country: 'US'
      }
    }
  ];

  for (let i = 0; i < testOrders.length; i++) {
    const order = testOrders[i];

    // Calculate total
    const items = order.products.map(p => ({
      productId: p.id,
      name: p.name,
      quantity: 1,
      price: Number(p.price)
    }));

    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
    const shipping = Math.random() * 50 + 10; // $10-$60 shipping
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;

    const created = await prisma.order.create({
      data: {
        userId: order.userId,
        email: order.email,
        paymentMethod: order.paymentMethod,
        paymentSessionId: order.paymentSessionId,
        status: order.status,
        shippingMethod: order.shippingMethod,
        shippingAddress: order.shippingAddress,
        items: items,
        total: total,
        trackingNumber: order.status === 'COMPLETED' ? `1Z999AA10123456${i + 1}84` : null,
      }
    });

    console.log(`✓ Order ${i + 1}: ${order.email} - $${total.toFixed(2)} (${order.shippingMethod})`);
    console.log(`  Products: ${items.map(i => i.name).join(', ')}`);
    console.log(`  Status: ${order.status}`);
    console.log('');
  }

  console.log('✅ Created 5 test orders successfully!\n');
  console.log('📊 Order Summary:');
  console.log('  - 4 Completed orders');
  console.log('  - 1 Pending order');
  console.log('  - 3 Square payments');
  console.log('  - 2 Cash App payments');
  console.log('  - Various shipping methods (Ground, 2-Day, Overnight, SmartPost)\n');
  console.log('🔍 View orders at: https://taxgeniuspro.tax/admin/orders\n');
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
