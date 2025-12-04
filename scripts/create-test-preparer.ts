import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function generateUniqueTrackingCode(baseCode: string): Promise<string> {
  let code = baseCode;
  let attempt = 1;

  while (attempt <= 20) {
    const existing = await prisma.profile.findFirst({
      where: {
        OR: [
          { trackingCode: code },
          { customTrackingCode: code },
          { shortLinkUsername: code },
        ],
      },
    });

    if (!existing) {
      return code;
    }

    attempt++;
    code = `${baseCode}${attempt}`;
  }

  throw new Error('Could not generate unique tracking code');
}

async function main() {
  const email = 'appvillagellc@gmail.com';

  console.log('Creating test tax preparer:', email);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log('❌ User already exists with email:', email);
    console.log('Please delete first using: npm run delete-test-preparer');
    process.exit(1);
  }

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      name: 'App Village LLC',
      emailVerified: new Date(),
    },
  });

  console.log('✓ Created user:', user.id);

  // Generate unique tracking code
  const trackingCode = await generateUniqueTrackingCode('appvillage');

  console.log('✓ Generated tracking code:', trackingCode);

  // Create profile
  const profile = await prisma.profile.create({
    data: {
      userId: user.id,
      role: 'tax_preparer',
      firstName: 'App',
      middleName: 'Village',
      lastName: 'LLC',
      trackingCode,
      trackingCodeFinalized: true,
    },
  });

  console.log('✓ Created profile:', profile.id);

  console.log('\n✅ Tax preparer created successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Email:', email);
  console.log('Tracking Code:', trackingCode);
  console.log('User ID:', user.id);
  console.log('Profile ID:', profile.id);
  console.log('Intake Form URL:', `https://taxgeniuspro.tax/start-filing?ref=${trackingCode}`);
  console.log('Contact Form URL:', `https://taxgeniuspro.tax/contact?ref=${trackingCode}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
